#!/usr/bin/env node
/**
 * scripts/evidence_quality.js —— 外部证据的「特指 / 通用」分级
 *
 * 为什么需要它：`external_batch.js` 按 label 去重，**入库即沉没**。若某条检索串
 * 有缺陷（例如括注被削掉），取回的就是通用证据，而且系统不会自己发现。
 * 光靠"每批人工看一眼"不可靠 —— 需要把它变成**可复算的数字**。
 *
 * 分级口径（三级，全部基于**来源文本里出现了什么**，不做语义推断）：
 *
 *   · **特指 specific** —— 证名带括注，且至少一个来源命中了括注所指的语境。
 *     例：`气滞血瘀证(颈部)` ← 来源含「颈肩臂」「项痹」，说明证据确实落在颈部。
 *   · **仅证名 label-only** —— 至少一个来源出现了证名本体，但**没有**命中括注语境。
 *     对带括注的证名来说，这就是"证据是通用的"信号 → 应当 `--requery`。
 *   · **通用 generic** —— 连证名本体都没出现。
 *     例：`寒凝血瘀证` ← 来源是《血瘀是百病之源》这类泛论。
 *
 * 括注语境的取词规则（**尽量不靠手写词表**）：
 *   · 括注本身是**病名**（消渴/鼓胀/乳岩/痿证…，全表 39 个里 36 个如此）
 *     → 语境词就是它自己（按 `/` 切开逐个试），不需要额外知识
 *   · 括注是**部位**（颈部/腰部/头部）→ 需要展开成同义语境词，**只有这 3 个**，
 *     且展开表写在本文件里、来源可查。**没被映射的部位词会被列出来，不猜。**
 *
 * 用法：
 *   node scripts/evidence_quality.js               # 分级 + 分布
 *   node scripts/evidence_quality.js --json        # 只出 JSON
 *   node scripts/evidence_quality.js --list generic  # 只列某一级
 */

const fs = require('node:fs');
const path = require('node:path');
const B = require('./external_batch.js');

const ROOT = path.resolve(__dirname, '..');
const EXT = path.join(ROOT, 'standards/semtensor/descriptions/external.json');
const OUT = path.join(ROOT, 'standards/semtensor/descriptions/evidence-quality.json');

/**
 * **部位类**括注的同义语境词（手写，只有这 3 个）。
 * 为什么手写：括注里 36/39 是病名，语境词即自身；只有部位需要展开，展开不了就列出来。
 */
const PLACE_CONTEXT = {
  颈部: ['颈', '项痹', '颈椎'],
  腰部: ['腰', '腰椎', '腰腿'],
  头部: ['头', '头痛', '眩晕', '脑'],
};

/** 一个括注 → 用来判定的语境词（病名类返回它自己，按 / 切开） */
function contextTerms(qualifier, unmapped) {
  if (PLACE_CONTEXT[qualifier]) return PLACE_CONTEXT[qualifier];
  const parts = qualifier.split('/').map((s) => s.trim()).filter(Boolean);
  // 病名类：直接把括注（及其 / 分隔的各名）当语境词
  if (parts.length) return parts;
  unmapped.push(qualifier);
  return [];
}

function textOf(source) {
  return `${source.title || ''} ${source.snippet || ''} ${source.url || ''}`;
}

/**
 * 证名在正文里的**可能写法**。
 * 踩过的坑：`气虚便秘证` 在来源里写作「气虚便秘」——**不带"证"字**。
 * 原来只拿整串去比，于是这条明明有对口的病机/主症/舌脉，却被判成"通用"。
 * 所以尾部「证/病」可省；其余一律不猜（不造同义名）。
 */
function labelTerms(base) {
  const t = [base];
  const stripped = base.replace(/[证病]$/, '');
  if (stripped && stripped !== base) t.push(stripped);
  return t;
}

/** 从来源文本里提出所有「…证」形态的词，作为**启发式线索**（不是判定） */
function syndromeTokens(text) {
  // **函数词过滤**：贪婪匹配会把前面的散文一起吞进来（实测拿到过
  // 「气不摄血证是中医病证」「一般认为湿热病证」「含温热夹湿所致的多种证」这种碎片）。
  // 含这些字的候选一律丢掉 —— 宁可少给线索，也不要给脏线索。
  const JUNK = /[是的为等所及与今含在对其此凡故则亦皆辩认一种多致夹已而何如或]|认为|一般|所致/;
  return [...new Set(text.match(/[\u4e00-\u9fa5]{2,10}证/g) || [])].filter((t) => !JUNK.test(t));
}

// ── 异名表（不是证据无关，是写法不同 —— 但不同写法的关系不同）──────

let ALIAS_TABLE = null;
function aliasTable() {
  if (ALIAS_TABLE) return ALIAS_TABLE;
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/semtensor/descriptions/aliases.json'), 'utf8'));
    ALIAS_TABLE = new Map(raw.entries.map((e) => [e.label, e.aliases]));
  } catch { ALIAS_TABLE = new Map(); }   // 表不存在就当没有（不报错、不编造）
  return ALIAS_TABLE;
}

/** 该证名在异名表里登记的别名 */
function aliasesFor(label) {
  return aliasTable().get(label) || [];
}

/** 共享 ≥2 个汉字的写法 —— 仅作提示，**不据此改判** */
function variantHints(texts, base) {
  const chars = [...base.replace(/[证病]$/, '')];
  const hints = new Set();
  for (const t of texts) {
    for (const tok of syndromeTokens(t)) {
      if (tok === base || [...tok.replace(/[证病]$/, '')].length < 2) continue;
      let shared = 0;
      for (const c of chars) if (tok.includes(c)) shared += 1;
      if (shared >= 2) hints.add(tok);
    }
  }
  return [...hints];
}

/** 给一条记录定级 */
function assess(entry, collected = { unmapped: [] }) {
  const { base, context: brackets } = B.splitLabel(entry.label);
  // 括注有两种：
  //   ① 病名/部位限定（`气滞血瘀证(颈部)`）—— 决定证据**是否对题**，当硬条件；
  //   ② 证名自带的病性（`真心痛（阳衰血瘀）证`）—— 它就是证名的一部分，不是语境限定。
  // 第 ② 种若也当硬条件，会要求来源逐字出现「阳衰血瘀」，把「心肾阳虚…亡阳厥脱」的好证据
  // 判成"通用证据"（2026-10-19 实测：那份 3 条来源全被判 label-only）。用 bracketKind:'pattern' 显式标出，
  // 不靠猜 —— 没标的仍按 ① 处理。
  const context = entry.bracketKind === 'pattern' ? [] : brackets;
  const terms = labelTerms(base);
  const texts = (entry.sources || []).map(textOf);
  const labelHit = texts.filter((t) => terms.some((w) => t.includes(w)));
  const qualifierHits = [];
  for (const q of context) {
    const qterms = contextTerms(q, collected.unmapped);
    for (const t of texts) {
      if (qterms.some((w) => t.includes(w))) { qualifierHits.push(q); break; }
    }
  }
  const hints = variantHints(texts, base);
  // 表里登记过的别名：命中即记下**关系**（synonym 才算同一概念）
  const viaAlias = aliasesFor(entry.label)
    .filter((a) => texts.some((t) => t.includes(a.name)))
    .map((a) => ({ name: a.name, relation: a.relation }));
  const hasSynonym = viaAlias.some((v) => v.relation === 'synonym');
  // 未进表的写法（去掉表里那些，免得重复计）
  const tableNames = new Set(aliasesFor(entry.label).map((a) => a.name));
  const rawHints = hints.filter((h) => !tableNames.has(h));

  let tier;
  if (context.length) {
    // 带括注：括注语境是硬条件。命中语境才算特指；只命中证名/别名仍是"沉没证据"
    tier = qualifierHits.length ? 'specific'
      : (labelHit.length || viaAlias.length) ? 'label-only'
        : rawHints.length ? 'variant-unconfirmed' : 'generic';
  } else if (labelHit.length || hasSynonym) {
    // **同义异名可当同一概念** → 升为特指，并标出来源是异名
    tier = 'specific';
  } else if (viaAlias.length) {
    // composition / qualified / broader：**只能作部分证据/旁证，不许升格**
    tier = 'partial';
  } else {
    tier = rawHints.length ? 'variant-unconfirmed' : 'generic';
  }
  return {
    label: entry.label,
    base,
    labelTerms: terms,
    qualifiers: context,
    tier,
    sources: texts.length,
    labelHitSources: labelHit.length,
    qualifierHitSources: qualifierHits.length,
    qualifiersMissed: context.filter((q) => !qualifierHits.includes(q)),
    viaAlias,
    variantHints: rawHints,
  };
}

const TIER_CN = {
  specific: '特指', partial: '部分(异名·非同一概念)', 'variant-unconfirmed': '待确认异名',
  'label-only': '仅证名', generic: '通用',
};

function main() {
  const argv = process.argv.slice(2);
  const onlyJson = argv.includes('--json');
  const only = argv.includes('--list') ? argv[argv.indexOf('--list') + 1] : null;

  const ext = JSON.parse(fs.readFileSync(EXT, 'utf8'));
  const collected = { unmapped: [] };
  const rows = ext.entries.map((e) => assess(e, collected));

  const dist = { specific: 0, partial: 0, 'variant-unconfirmed': 0, 'label-only': 0, generic: 0 };
  for (const r of rows) dist[r.tier] += 1;

  const totalLabels = B.allLabels().length;
  const withQualifier = rows.filter((r) => r.qualifiers.length);

  const out = {
    $generated: 'node scripts/evidence_quality.js',
    coverage: { fetched: rows.length, total: totalLabels, pending: totalLabels - rows.length },
    distribution: {
      specific: dist.specific,
      viaSynonymAlias: rows.filter((r) => r.viaAlias.some((v) => v.relation === 'synonym')).length,
      partial: dist.partial,
      variantUnconfirmed: dist['variant-unconfirmed'],
      labelOnly: dist['label-only'],
      generic: dist.generic,
    },
    distributionNote: 'specific=证名字面命中，或命中**同义异名**（本项目主张"不是证据无关、是写法不同"，但只有 synonym 才算同一概念）；partial=命中**非同一概念**的异名（composition 复合证名的组成部分 / qualified 病名限定 / broader 上位），只能作部分证据或旁证；variant-unconfirmed=正文出现未登记的近名写法，待人工确认，工具不擅自判同义；label-only=证名命中但括注语境未命中（应 --requery）；generic=连近名都没有，是泛论。',
    qualifierStats: {
      entriesWithQualifier: withQualifier.length,
      ofWhichSpecific: withQualifier.filter((r) => r.tier === 'specific').length,
    },
    placeContext: PLACE_CONTEXT,
    unmappedQualifiers: [...new Set(collected.unmapped)],
    entries: rows,
  };

  fs.writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`, 'utf8');

  if (only) {
    for (const r of rows.filter((x) => x.tier === only)) console.log(`${TIER_CN[r.tier]}\t${r.label}`);
    return;
  }

  if (!onlyJson) {
    console.log('═══ 外部证据质量分级 ═══\n');
    console.log(`  覆盖 ${rows.length}/${totalLabels}（余 ${totalLabels - rows.length} 待检索）`);
    console.log(`  特指 ${dist.specific}（其中来自同义异名 ${out.distribution.viaSynonymAlias}）· 部分(非同一概念) ${dist.partial} · 待确认异名 ${dist['variant-unconfirmed']} · 仅证名 ${dist['label-only']} · 通用 ${dist.generic}`);
    console.log(`  带括注的 ${withQualifier.length} 条里，特指 ${out.qualifierStats.ofWhichSpecific} 条`);
    if (out.unmappedQualifiers.length) {
      console.log(`  ⚠ 未能映射的部位词（未展开，按病名处理）：${out.unmappedQualifiers.join(' · ')}`);
    }
    console.log('\n  ── 需要 --requery 的（括注语境未命中）──');
    const miss = rows.filter((r) => r.tier === 'label-only');
    if (!miss.length) console.log('  （无）');
    for (const r of miss) console.log(`  ${r.label}  ← 漏掉 ${r.qualifiersMissed.join('、')}`);

    const gen = rows.filter((r) => r.tier !== 'specific');
    if (gen.length) {
      console.log('\n  ── 非「特指」的（附线索，**不据此改判**）──');
      for (const r of gen) {
        const al = r.viaAlias.length ? `  ｜ 已登记异名：${r.viaAlias.map((v) => `${v.name}(${v.relation})`).join(' ')}` : '';
        const hint = r.variantHints.length ? `  ｜ 未登记写法：${r.variantHints.join(' ')}` : '';
        const tail = (!al && !hint) ? '  ｜ 无近名线索 → 泛论' : '';
        console.log(`  [${TIER_CN[r.tier]}] ${r.label}${al}${hint}${tail}`);
      }
    }
    console.log(`\n  → ${path.relative(ROOT, OUT)}`);
  }
}

if (require.main === module) {
  try { main(); } catch (e) { console.error(`\n✗ ${e.message}`); process.exit(1); }
}

module.exports = { assess, contextTerms, PLACE_CONTEXT, TIER_CN, labelTerms, syndromeTokens, variantHints, aliasesFor };
