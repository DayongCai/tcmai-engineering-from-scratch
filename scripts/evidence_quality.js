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
  return [...new Set(text.match(/[\u4e00-\u9fa5]{2,10}证/g) || [])];
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
  const { base, context } = B.splitLabel(entry.label);
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
  let tier;
  if (context.length) {
    tier = qualifierHits.length ? 'specific' : (labelHit.length ? 'label-only' : (hints.length ? 'variant-only' : 'generic'));
  } else if (labelHit.length) {
    tier = 'specific';
  } else {
    // **必须把「写法不同」和「真是泛论」分开。**
    // 「肝阳上亢证 ← 正文写高血压病肝热阳亢证」和「寒凝血瘀证 ← 泛论血瘀」是两回事，
    // 混成一个"通用"会把有证据的条目说成没证据。
    tier = hints.length ? 'variant-only' : 'generic';
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
    variantHints: hints,
  };
}

const TIER_CN = { specific: '特指', 'label-only': '仅证名', 'variant-only': '异名', generic: '通用' };

function main() {
  const argv = process.argv.slice(2);
  const onlyJson = argv.includes('--json');
  const only = argv.includes('--list') ? argv[argv.indexOf('--list') + 1] : null;

  const ext = JSON.parse(fs.readFileSync(EXT, 'utf8'));
  const collected = { unmapped: [] };
  const rows = ext.entries.map((e) => assess(e, collected));

  const dist = { specific: 0, 'label-only': 0, 'variant-only': 0, generic: 0 };
  for (const r of rows) dist[r.tier] += 1;

  const totalLabels = B.allLabels().length;
  const withQualifier = rows.filter((r) => r.qualifiers.length);

  const out = {
    $generated: 'node scripts/evidence_quality.js',
    coverage: { fetched: rows.length, total: totalLabels, pending: totalLabels - rows.length },
    distribution: {
      specific: dist.specific,
      labelOnly: dist['label-only'],
      variantOnly: dist['variant-only'],
      generic: dist.generic,
    },
    distributionNote: 'specific=证名字面命中（或括注语境命中）；label-only=证名命中但括注语境未命中（应 --requery）；variant-only=证名未字面命中，但正文出现**写法不同的近名证候**（证据可能对同一概念，需人工确认，**工具不擅自判同义**）；generic=连近名都没有，是泛论。',
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
    console.log(`  特指 ${dist.specific} · 异名（写法不同）${dist['variant-only']} · 仅证名（应退回）${dist['label-only']} · 通用 ${dist.generic}`);
    console.log(`  带括注的 ${withQualifier.length} 条里，特指 ${out.qualifierStats.ofWhichSpecific} 条`);
    if (out.unmappedQualifiers.length) {
      console.log(`  ⚠ 未能映射的部位词（未展开，按病名处理）：${out.unmappedQualifiers.join(' · ')}`);
    }
    console.log('\n  ── 需要 --requery 的（括注语境未命中）──');
    const miss = rows.filter((r) => r.tier === 'label-only');
    if (!miss.length) console.log('  （无）');
    for (const r of miss) console.log(`  ${r.label}  ← 漏掉 ${r.qualifiersMissed.join('、')}`);

    const gen = rows.filter((r) => r.tier === 'variant-only' || r.tier === 'generic');
    if (gen.length) {
      console.log('\n  ── 非「特指」的（附线索，**不据此改判**）──');
      for (const r of gen) {
        const hint = r.variantHints.length ? `  ｜ 正文里的其他写法：${r.variantHints.join(' ')}` : '  ｜ 无近名线索 → 泛论';
        console.log(`  [${TIER_CN[r.tier]}] ${r.label}  ｜ 找过：${r.labelTerms.join(' / ')}${hint}`);
      }
    }
    console.log(`\n  → ${path.relative(ROOT, OUT)}`);
  }
}

if (require.main === module) {
  try { main(); } catch (e) { console.error(`\n✗ ${e.message}`); process.exit(1); }
}

module.exports = { assess, contextTerms, PLACE_CONTEXT, TIER_CN, labelTerms, syndromeTokens, variantHints };
