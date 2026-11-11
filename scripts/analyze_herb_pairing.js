#!/usr/bin/env node
/**
 * scripts/analyze_herb_pairing.js —— 配伍对象抽取 + 反畏清单扫描
 *
 * 上一步（五道闸）只回答「教材有没有写配伍」，这一步回答「配的是谁」：
 *   ① 从 287 味药的三段正文里抽出「配 X、Y」的**配伍对象**（对象必须命中 287 味药名，
 *      所以「配合」「配制」不会被当成药）
 *   ② 与第 7 章的十八反 / 十九畏清单交叉，扫出「教材各论自己写的配伍里踩没踩清单」
 *   ③ 12 味毒药单列：配了谁、能不能内服、剂量跨度多少
 *
 * 判定口径（写进产物）：
 *   - 配伍词后必须紧跟药名或炮制品名（生/煅/制/炙/炒/醋/酒/盐/蜜/姜/枯/焦 + 药名），
 *     炮制品归并到本名（枯矾→白矾、煅石膏→石膏）。
 *   - 若「配」前 4 字内出现 不宜与 / 忌与 / 不可与 / 勿与 / 禁与，标 negated：
 *     那是教材在写禁忌，不是配伍。
 *   - 反畏清单只从第 7 章正文解析，不手打（清单本身也要可回查）。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const DRUGS = path.join(ROOT, 'standards', 'zhongyao', 'drugs.json');
const BASE = path.join(ROOT, 'standards', 'zhongyao', '底本.json');
const OUT_JSON = path.join(ROOT, 'standards', 'zhongyao', 'pairing.json');
const OUT_MD = path.join(ROOT, 'standards', 'zhongyao', 'pairing.md');

const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const FIELDS = ['来源与性味归经', '功效与主治', '用法用量与使用注意'];

// 炮制前缀 → 本名归并
const PREP = ['煅', '生', '制', '炙', '炒', '醋', '酒', '盐', '蜜', '姜', '枯', '焦', '炮'];
const ALIAS = { 枯矾: '白矾', 煅石膏: '石膏', 明矾: '白矾', 朴硝: '芒硝', 牙硝: '芒硝', 牵牛: '牵牛子', 官桂: '肉桂', 犀角: '犀角', 砒霜: '砒石' };

// 清单用类名（乌头、贝母、芍药…），各论用具体名（川乌/川贝母/白芍…）：比对必须按族展开
const GROUPS = {
  乌头: ['乌头', '川乌', '草乌', '附子'],
  贝母: ['贝母', '川贝母', '浙贝母', '土贝母'],
  芍药: ['芍药', '白芍', '赤芍'],
  沙参: ['沙参', '北沙参', '南沙参'],
  大戟: ['大戟', '京大戟', '红大戟'],
  牵牛: ['牵牛', '牵牛子'],
  朴硝: ['朴硝', '芒硝', '玄明粉'],
  牙硝: ['牙硝', '芒硝'],
  官桂: ['官桂', '肉桂'],
  砒霜: ['砒霜', '砒石'],
  犀角: ['犀角', '水牛角'],
  三棱: ['三棱', '京三棱'],
};
const family = (n) => GROUPS[n] || [n];
const inSet = (n, set) => family(n).some((x) => set.has(x));

const POISON = ['砒石', '升药', '轻粉', '雄黄', '蟾酥', '硫黄', '白矾', '蛇床子', '樟脑', '土荆皮', '炉甘石', '硼砂'];

const NEG = ['不宜与', '忌与', '不可与', '勿与', '禁与', '不宜同', '忌同'];

function baseName(tok) {
  let t = tok.trim();
  if (ALIAS[t]) return ALIAS[t];
  for (const p of PREP) {
    if (t.length > p.length && t.startsWith(p) && ALIAS[t.slice(p.length)]) return ALIAS[t.slice(p.length)];
    if (t.length > p.length && t.startsWith(p)) t = t.slice(p.length);
  }
  if (ALIAS[t]) return ALIAS[t];
  return t;
}

/** 从第 7 章正文解析反畏清单（不手打） */
function parseConflicts(base) {
  const c7 = base.chapters.find((c) => c.no === '7');
  const paras = [];
  for (const s of c7.secs) {
    paras.push(...s.paras);
    for (const u of s.subs) paras.push(...u.paras);
  }
  const pairs = [];
  const addGroup = (aSet, bSet, kind, src) => {
    for (const a of aSet) for (const b of bSet) pairs.push({ a, b, kind, src });
  };

  const fan = paras.find((p) => p.startsWith('十八反：'));
  const wei = paras.find((p) => p.startsWith('十九畏：'));
  if (!fan || !wei) throw new Error('第 7 章没找到十八反/十九畏原文段');

  // 十八反：即 乌头（川乌、草乌、附子）反 A、B、C；甘草反 …；藜芦反 …
  const fanBody = fan.split('——即')[1] || fan;
  for (const seg of fanBody.split('；')) {
    const m = seg.match(/(.+?)反(.+)/);
    if (!m) continue;
    // 「乌头（川乌、草乌、附子）反…」：括号内是本组的全部别名，必须展开
    const head = m[1].trim();
    const inner = (head.match(/（([^）]*)）/) || head.match(/\(([^)]*)\)/) || [])[1] || '';
    const outer = head.replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, '').trim();
    const lefts = [outer, ...inner.split('、')].map((x) => x.trim()).filter(Boolean);
    const rights = m[2].split('、').map((x) => x.trim().replace(/[。；]/g, '')).filter(Boolean);
    addGroup(lefts.map(baseName), rights.map(baseName), '十八反', '教材·第7章·7.1.1');
  }

  // 十九畏：即 A畏B、C畏D…
  const weiBody = (wei.split('——即')[1] || wei).replace(/。$/, '');
  for (const seg of weiBody.split('、')) {
    const m = seg.match(/(.+?)畏(.+)/);
    if (!m) continue;
    let a = baseName(m[1].replace(/^.*即/, ''));
    const b = baseName(m[2]);
    // 「川乌草乌畏犀角」不带顿号，会粘成一个假名
    if (a === '川乌草乌' || a === '川乌、草乌') {
      pairs.push({ a: '川乌', b, kind: '十九畏', src: '教材·第7章·7.1.1' });
      pairs.push({ a: '草乌', b, kind: '十九畏', src: '教材·第7章·7.1.1' });
      continue;
    }
    pairs.push({ a, b, kind: '十九畏', src: '教材·第7章·7.1.1' });
  }
  return { pairs, fanRaw: fan, weiRaw: wei };
}

/** 抽「配 X、Y」的配伍对象 */
function extractPairs(text, names) {
  const out = [];
  let from = 0;
  while (true) {
    const i = text.indexOf('配', from);
    if (i < 0) break;
    from = i + 1;
    // 「配合」「配制」「配比」不是配伍
    const next = text.slice(i + 1, i + 2);
    if (/[合制比方伍]/u.test(next)) continue;
    const negated = NEG.some((n) => text.slice(Math.max(0, i - 6), i).includes(n.slice(0, 3)) || text.slice(Math.max(0, i - 3), i).includes('不宜与'));
    // 读药名串：允许 、 与 和 分隔，最多 4 味
    let j = i + 1;
    const got = [];
    let guard = 0;
    while (got.length < 4 && j < text.length && guard < 40) {
      // 找下一个药名起点
      let matched = null;
      for (const n of names) {
        if (text.startsWith(n, j)) {
          if (!matched || n.length > matched.length) matched = n;
        }
      }
      if (!matched) {
        // 允许炮制前缀
        for (const p of PREP) {
          if (text.startsWith(p, j)) {
            for (const n of names) {
              if (text.startsWith(n, j + p.length)) { matched = n; j += p.length; break; }
            }
            if (matched) break;
          }
        }
      }
      if (!matched) break;
      got.push({ name: matched, at: j });
      j += matched.length;
      guard += 1;
      // 分隔符：、 与 和 ，（只在紧跟另一个药名时继续）
      const sep = text.slice(j, j + 1);
      if (/[、与和]/u.test(sep)) { j += 1; continue; }
      break;
    }
    for (const g of got) {
      out.push({ partner: g.name, negated, evidence: text.slice(Math.max(0, i - 8), Math.min(text.length, g.at + g.name.length + 4)).trim() });
    }
  }
  return out;
}

/** 抽「不宜与 X 同用」这类禁忌句式（不是配伍边，是教材自己标的红线） */
function extractWarnings(text, names) {
  const out = [];
  const re = /(?:不宜与|忌与|不可与|勿与|禁与|不宜同用)([^，。；]{1,16})/gu;
  let m;
  while ((m = re.exec(text))) {
    const seg = m[1];
    const inner = (seg.match(/（([^）]*)）/) || seg.match(/\(([^)]*)\)/) || [])[1] || '';
    for (const cand of [seg.replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, ''), ...inner.split('、')]) {
      const t = baseName(cand.trim());
      if (names.includes(t)) out.push({ partner: t, evidence: m[0].trim() });
    }
  }
  return out;
}

function build() {
  const drugs = JSON.parse(fs.readFileSync(DRUGS, 'utf8')).drugs;
  const base = JSON.parse(fs.readFileSync(BASE, 'utf8'));
  const names = drugs.map((d) => d.name).sort((a, b) => b.length - a.length);
  const nameSet = new Set(names);
  const conflict = parseConflicts(base);

  const rows = drugs.map((d) => {
    const text = FIELDS.map((f) => String(d.fields[f] || '')).join('\n');
    const raw = extractPairs(text, names);
    // 去重（同一对象保留第一条证据）
    const seen = new Map();
    for (const r of raw) {
      if (!nameSet.has(r.partner) || r.partner === d.name) continue;
      const k = r.partner + (r.negated ? '#neg' : '');
      if (!seen.has(k)) seen.set(k, r);
    }
    const partners = [...seen.values()].filter((r) => !r.negated).map((r) => ({ name: r.partner, evidence: r.evidence }));
    const negSeen = new Map();
    for (const r of [...seen.values()].filter((x) => x.negated)) negSeen.set(r.partner, r);
    for (const w of extractWarnings(text, names)) {
      if (w.partner === d.name) continue;
      if (!negSeen.has(w.partner)) negSeen.set(w.partner, { partner: w.partner, negated: true, evidence: w.evidence });
    }
    const negated = [...negSeen.values()].map((r) => ({ name: r.partner, evidence: r.evidence }));
    return {
      name: d.name,
      chapter: d.chapter,
      sub: d.sub,
      locator: `教材·第${d.chapter}章·${d.sub}`,
      partners,
      negated,
    };
  });

  // 入度
  const indeg = new Map();
  for (const r of rows) for (const p of r.partners) indeg.set(p.name, (indeg.get(p.name) || 0) + 1);
  const top = [...indeg.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'));

  // 反畏扫描
  const key = (a, b) => [a, b].sort().join('~');
  const conflictSet = new Map();
  for (const p of conflict.pairs) {
    for (const a of family(p.a)) for (const b of family(p.b)) conflictSet.set(key(a, b), p);
  }
  const hits = [];
  for (const r of rows) {
    for (const p of r.partners) {
      const c = conflictSet.get(key(r.name, p.name));
      if (c) hits.push({ drug: r.name, partner: p.name, kind: c.kind, locator: r.locator, evidence: p.evidence });
    }
    for (const p of r.negated) {
      const c = conflictSet.get(key(r.name, p.name));
      if (c) hits.push({ drug: r.name, partner: p.name, kind: c.kind + '（教材自己标了禁忌）', locator: r.locator, evidence: p.evidence, asWarning: true });
    }
  }

  // 毒药子图
  const poison = POISON.map((n) => {
    const r = rows.find((x) => x.name === n);
    const d = drugs.find((x) => x.name === n);
    const use = String(d.fields['用法用量与使用注意'] || '');
    const dose = use.match(/\d+(?:\.\d+)?\s*[-–~]\s*\d+(?:\.\d+)?\s*(?:g|克)/);
    const externalOnly = /只供外用|不作内服|不可内服/.test(use);
    // 「煎服3-10g」也是内服；只供外用的药不能因为别处出现「内服」二字就算能内服
    const oral = !externalOnly && /(内服|煎服|冲服)/.test(use);
    return {
      name: n, locator: r.locator,
      partners: r.partners.map((p) => p.name),
      negated: r.negated.map((p) => p.name),
      oral, externalOnly,
      dose: dose ? dose[0].replace(/\s+/g, '') : '',
      toxic: (String(d.fields['来源与性味归经']).match(/大毒|有毒|小毒/) || ['未标'])[0],
    };
  });

  const pairCoverage = conflict.pairs.map((p) => ({ ...p, aIn: inSet(p.a, nameSet), bIn: inSet(p.b, nameSet) }));
  const missingNames = [...new Set(pairCoverage.flatMap((p) => [p.aIn ? null : p.a, p.bIn ? null : p.b]))].filter(Boolean).sort();

  const st = {
    drugs: rows.length,
    pairsBothIn: pairCoverage.filter((p) => p.aIn && p.bIn).length,
    pairsMissing: pairCoverage.filter((p) => !p.aIn || !p.bIn).length,
    missingNames,
    withPartners: rows.filter((r) => r.partners.length).length,
    isolated: rows.filter((r) => !r.partners.length).map((r) => r.name),
    edges: rows.reduce((n, r) => n + r.partners.length, 0),
    distinctEdges: new Set(rows.flatMap((r) => r.partners.map((p) => [r.name, p.name].sort().join('~')))).size,
    negatedEdges: rows.reduce((n, r) => n + r.negated.length, 0),
    conflictPairs: conflict.pairs.length,
    conflictHits: hits.filter((h) => !h.asWarning).length,
    conflictWarnings: hits.filter((h) => h.asWarning).length,
    meanPartners: Number((rows.reduce((n, r) => n + r.partners.length, 0) / rows.length).toFixed(3)),
  };

  return {
    generated: '2026-10-29',
    what: '配伍对象抽取 + 十八反/十九畏清单扫描',
    inputs: {
      drugs: { file: 'standards/zhongyao/drugs.json', sha256: sha(DRUGS) },
      base: { file: 'standards/zhongyao/底本.json', sha256: sha(BASE) },
    },
    conflictSource: { fan: conflict.fanRaw, wei: conflict.weiRaw, pairs: conflict.pairs },
    limits: [
      '只认「配 X」句式：教材写「与 X 同用」「X 相须」的不会进对象表，故入度偏低。',
      '对象必须在 287 味里：方剂名（如「六神丸」）、食物、未收录药（如「玄明粉」）不计。',
      '一次「配」最多取 4 味，长串会被截断。',
      '反畏扫描只证明「教材自己把这两味写在一起」；是否真禁忌要看剂量与制方，本层不判临床。',
      'negated 行（不宜与…同用）不计入配伍边，但单独统计——那正是教材的毒性提醒。',
    ],
    stat: st,
    pairCoverage,
    top: top.slice(0, 20).map(([name, n]) => ({ name, indeg: n })),
    poison,
    conflictHits: hits,
    rows,
  };
}

function toMd(d) {
  const s = d.stat;
  const L = [];
  L.push('# 配伍对象与反畏扫描 · 287 味的配伍图');
  L.push('');
  L.push(`> 生成 ${d.generated} · drugs \`${d.inputs.drugs.sha256.slice(0, 12)}\` · 底本 \`${d.inputs.base.sha256.slice(0, 12)}\``);
  L.push('');
  L.push('## 一、图规模');
  L.push('');
  L.push('| 项 | 值 |');
  L.push('|---|--:|');
  L.push(`| 有配伍对象的药 | **${s.withPartners} / ${s.drugs}** |`);
  L.push(`| 配伍边（有向，含重复） | ${s.edges.toLocaleString('en-US')} |`);
  L.push(`| 去重无向边 | ${s.distinctEdges} |`);
  L.push(`| 平均每味配几味 | ${s.meanPartners} |`);
  L.push(`| 反畏告警（negated） | ${s.negatedEdges} |`);
  L.push(`| 十八反+十九畏药对 | ${s.conflictPairs} |`);
  L.push(`| **各论配伍踩清单** | **${s.conflictHits}** |`);
  L.push(`| 教材自己标注的禁忌 | ${s.conflictWarnings} |`);
  L.push('');
  L.push('## 二、最常被配的 20 味（入度）');
  L.push('');
  L.push('| 药 | 被配次数 |');
  L.push('|---|--:|');
  for (const t of d.top) L.push(`| ${t.name} | ${t.indeg} |`);
  L.push('');
  L.push('## 三、12 味毒药：配了谁、能不能内服');
  L.push('');
  L.push('| 药 | 毒性 | 内服 | 只供外用 | 内服量 | 配伍对象 |');
  L.push('|---|:-:|:-:|:-:|--:|---|');
  for (const p of d.poison) {
    L.push(`| ${p.name} | ${p.toxic} | ${p.oral ? '✓' : '—'} | ${p.externalOnly ? '✓' : '—'} | ${p.dose || '—'} | ${p.partners.join('、') || '（无）'} |`);
  }
  L.push('');
  const negLines = d.poison.filter((p) => p.negated.length);
  if (negLines.length) {
    L.push('教材自己写的配伍禁忌（negated）：');
    L.push('');
    for (const p of negLines) L.push(`- **${p.name}**：不宜与 ${p.negated.join('、')} 同用（${p.locator}）`);
    L.push('');
  }
  L.push('## 四、反畏清单扫描结果');
  L.push('');
  const violations = d.conflictHits.filter((h) => !h.asWarning);
  const warns = d.conflictHits.filter((h) => h.asWarning);
  L.push(`**各论配伍踩清单：${violations.length} 处。** 教材自己标注的配伍禁忌：${warns.length} 处。`);
  L.push('');
  if (warns.length) {
    L.push('教材自己写的红线（negated，不算配伍边）：');
    L.push('');
    L.push('| 药 | 禁忌对象 | 类型 | 位置 | 原文 |');
    L.push('|---|---|---|---|---|');
    for (const h of warns) L.push(`| ${h.drug} | ${h.partner} | ${h.kind} | ${h.locator} | ${h.evidence.replace(/\|/g, '/')} |`);
    L.push('');
  }
  if (violations.length) {
    L.push('| 药 | 对象 | 类型 | 位置 | 证据 |');
    L.push('|---|---|---|---|---|');
    for (const h of violations) L.push(`| ${h.drug} | ${h.partner} | ${h.kind} | ${h.locator} | ${h.evidence.replace(/\|/g, '/')} |`);
    L.push('');
  } else {
    L.push('**各论一处都没踩**——287 味药的正文里，没有把十八反/十九畏的药对写成「配 X」。');
    L.push('');
    L.push('这不等于「教材写得对」：反畏清单在教材里是**总论知识**，各论不写药对判例。40 对里有 **21 对**的两味都在各论中，教材一次都没把它们写在一起——这与产地 0 味、升降浮沉无逐药标注是同一个形状：**总论讲原则，各论不落点**。');
    L.push('');
  }
  L.push('## 五、清单来源（机器解析，不手打）');
  L.push('');
  L.push('| 项 | 药对数 |');
  L.push('|---|--:|');
  const kinds = {};
  for (const p of d.conflictSource.pairs) kinds[p.kind] = (kinds[p.kind] || 0) + 1;
  for (const [k, v] of Object.entries(kinds)) L.push(`| ${k} | ${v} |`);
  L.push('');
  L.push(`**清单覆盖各论的比例**：39 对里，两味都在 287 味各论中的 **${d.stat.pairsBothIn} 对**，至少一味未收的 **${d.stat.pairsMissing} 对**。未被各论收录的药名：${d.stat.missingNames.length ? d.stat.missingNames.join('、') : '（无）'}。`);
  L.push('');
  L.push('- 十八反原文：' + d.conflictSource.fan);
  L.push('- 十九畏原文：' + d.conflictSource.wei);
  L.push('');
  L.push('## 六、边界');
  L.push('');
  for (const x of d.limits) L.push(`- ${x}`);
  L.push('');
  L.push('## 七、逐药明细（287 行）');
  L.push('');
  L.push('| 药 | 位置 | 配伍对象数 | 对象 |');
  L.push('|---|---|--:|---|');
  for (const r of d.rows) L.push(`| ${r.name} | ${r.locator} | ${r.partners.length} | ${r.partners.map((p) => p.name).join('、') || '（无）'} |`);
  L.push('');
  return L.join('\n');
}

function main() {
  const arg = process.argv.slice(2).find((a) => !a.startsWith('-'));
  const d = build();

  if (process.argv.includes('--check')) {
    if (!fs.existsSync(OUT_JSON)) { console.log('[pairing] ✗ 缺 pairing.json'); return 1; }
    const prev = JSON.parse(fs.readFileSync(OUT_JSON, 'utf8'));
    const bad = [];
    if (prev.inputs.drugs.sha256 !== d.inputs.drugs.sha256) bad.push('drugs.json 变了');
    if (prev.stat.edges !== d.stat.edges) bad.push(`边 ${prev.stat.edges} → ${d.stat.edges}`);
    if (prev.stat.conflictHits !== d.stat.conflictHits) bad.push(`踩清单 ${prev.stat.conflictHits} → ${d.stat.conflictHits}`);
    if (bad.length) { console.log('[pairing] ✗ ' + bad.join('；')); return 1; }
    console.log(`[pairing] ✓ ${d.stat.withPartners}/${d.stat.drugs} 味有对象 · ${d.stat.edges} 边 · 踩清单 ${d.stat.conflictHits} · 教材自标禁忌 ${d.stat.conflictWarnings}`);
    return 0;
  }

  if (arg) {
    const r = d.rows.find((x) => x.name === arg);
    if (!r) { console.log(`未找到药名：${arg}`); return 1; }
    console.log(`═══ ${r.name}（${r.locator}）═══`);
    console.log(`  配伍对象 ${r.partners.length} 味：${r.partners.map((p) => p.name).join('、') || '（无）'}`);
    for (const p of r.partners) console.log(`    · ${p.name}  ← ${p.evidence}`);
    if (r.negated.length) console.log(`  教材标注的配伍禁忌：${r.negated.map((p) => p.name).join('、')}`);
    return 0;
  }

  fs.writeFileSync(OUT_JSON, JSON.stringify(d, null, 1) + '\n');
  fs.writeFileSync(OUT_MD, toMd(d));
  console.log('═══ 配伍对象 + 反畏扫描 ═══');
  console.log(`  ${d.stat.withPartners}/${d.stat.drugs} 味有配伍对象 · ${d.stat.edges} 条边（去重 ${d.stat.distinctEdges}）· 平均 ${d.stat.meanPartners} 味/药`);
  console.log(`  反畏药对（第7章解析）${d.stat.conflictPairs} 对（两味都在各论 ${d.stat.pairsBothIn} 对）· 各论踩清单 ${d.stat.conflictHits} 处 · 教材自标禁忌 ${d.stat.conflictWarnings} 处`);
  console.log('  各论未收录的清单药名：' + (d.stat.missingNames.join('、') || '（无）'));
  console.log('  入度前 5：' + d.top.slice(0, 5).map((t) => `${t.name} ${t.indeg}`).join(' · '));
  console.log('  → standards/zhongyao/pairing.{json,md}');
  return 0;
}

if (require.main === module) process.exit(main());

module.exports = { build, extractPairs, parseConflicts };
