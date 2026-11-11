#!/usr/bin/env node
/**
 * scripts/analyze_zhenduan_tm1_landing.js
 *   反方向：ICD-11 TM1 的证候单元，在中医诊断学教材里有没有落点？
 *
 * 为什么要反着查：
 *   coverage.js 只回答「教材的证 → ICD-11 有没有单元」；这一支回答「ICD-11 的单元 → 教材讲没讲」，
 *   得到的数字才是「ICD-11 比这本教材多讲了多少证」。
 *
 * 口径（四档，写死可复核）：
 *   exact     单元名（或去掉「证」的名字）在教材正文里原样出现
 *   covered   病位词 + 病性词在**同一段**里共现（教材讲了这个组合，但没给它这个证名）
 *   fragment  只有 ≥2 字的词面片段出现（如「肝脾」），不构成「讲了这个证」
 *   none      连 2 字片段都没有
 *
 * 前置：TM1 的 254 条 pattern 里 58 条是「其他特指的/未特指的」残余类目，先剔除 → 196 条实单元。
 * 输出：standards/zhenduan/tm1-landing.json / tm1-landing.md
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const BASE = path.join(ROOT, 'standards', 'zhenduan', '底本.json');
const ZH = path.join(ROOT, 'standards', 'icd11', 'zh-names.json');
const OUT_JSON = path.join(ROOT, 'standards', 'zhenduan', 'tm1-landing.json');
const OUT_MD = path.join(ROOT, 'standards', 'zhenduan', 'tm1-landing.md');

const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

/** 病位词表：脏腑、形体、部位、六经、奇经。词表是判定的一部分，改它必须重跑并复核数字。 */
const POS = [
  '心包', '三焦', '上焦', '中焦', '下焦', '膀胱', '大肠', '小肠', '胞宫', '肌肤', '筋骨', '经络',
  '胸胁', '半表半里', '任脉', '督脉', '冲脉', '带脉', '阴维', '阳维', '阴跷', '阳跷', '阴蹻', '阳蹻',
  '少阳', '太阳', '阳明', '太阴', '少阴', '厥阴',
  '胃', '胆', '脾', '肺', '肾', '肝', '心', '肠', '表', '里', '头', '腰', '膈', '营', '卫',
];

/** 病性词表：气血阴阳、痰湿水食、六淫、虚实、以及常见复合语（不和/不宁/上逆/两虚/血亏/水泛） */
const NAT = [
  '气滞血瘀', '气虚血瘀', '气血两虚', '气阴两虚', '阴虚火旺', '津亏', '液脱',
  '气虚', '血虚', '阴虚', '阳虚', '气滞', '血瘀', '气逆', '气陷', '气脱', '血热', '血寒', '血燥',
  '水停', '食积', '气郁', '精虚', '神气',
  '不和', '不宁', '上逆', '两虚', '血亏', '水泛',
  '痰', '湿', '风', '寒', '热', '燥', '火', '毒', '脓',
];

function longestIn(name, lex) {
  let best = '';
  for (const t of lex) if (name.includes(t) && t.length > best.length) best = t;
  return best;
}

function lcs(a, b) {
  let best = '';
  for (let i = 0; i < a.length; i += 1) {
    for (let j = i + best.length + 1; j <= a.length; j += 1) {
      const s = a.slice(i, j);
      if (b.includes(s) && s.length > best.length) best = s;
    }
  }
  return best;
}

/** 教材段落（可定位到 教材·第N章·M.M） */
function textbookParas() {
  const doc = JSON.parse(fs.readFileSync(BASE, 'utf8'));
  const out = [];
  for (const c of doc.chapters) {
    for (const p of c.paras || []) out.push({ loc: `教材·第${c.no}章`, no: `${c.no}.0`, text: p });
    for (const s of c.secs || []) {
      for (const p of s.paras || []) out.push({ loc: `教材·第${c.no}章·${s.no}`, no: s.no, text: p });
      for (const u of s.subs || []) {
        for (const p of u.paras || []) out.push({ loc: `教材·第${c.no}章·${u.no}`, no: u.no, text: p });
      }
    }
  }
  return out;
}

function build() {
  const paras = textbookParas();
  const text = paras.map((p) => p.text).join('');
  const doc = JSON.parse(fs.readFileSync(BASE, 'utf8'));

  const all = JSON.parse(fs.readFileSync(ZH, 'utf8')).names.filter((n) => n.module === 'TM1' && /pattern/i.test(n.en || ''));
  const residual = all.filter((n) => n.isResidual);
  const real = all.filter((n) => !n.isResidual);

  const rows = real.map((u) => {
    const name = String(u.zh || '').trim();
    const core = name.replace(/证$/, '');
    const r = { code: u.code, zh: name, en: u.en };

    if (text.includes(name) || (core.length >= 2 && text.includes(core))) {
      const probe = text.includes(name) ? name : core;
      const hit = paras.find((p) => p.text.includes(probe));
      return { ...r, bucket: 'exact', probe, lcs: probe, loc: hit ? hit.loc : '', pos: '', nat: '' };
    }

    const pos = longestIn(core, POS);
    const nat = longestIn(core, NAT);
    if (pos && nat) {
      const hit = paras.find((p) => p.text.includes(pos) && p.text.includes(nat));
      if (hit) return { ...r, bucket: 'covered', probe: `${pos}+${nat}`, lcs: '', loc: hit.loc, pos, nat };
    }

    const l = lcs(core, text);
    if (l.length >= 2) {
      const hit = paras.find((p) => p.text.includes(l));
      return { ...r, bucket: 'fragment', probe: l, lcs: l, loc: hit ? hit.loc : '', pos, nat };
    }

    return { ...r, bucket: 'none', probe: '', lcs: '', loc: '', pos, nat };
  });

  const tally = { exact: 0, covered: 0, fragment: 0, none: 0 };
  for (const r of rows) tally[r.bucket] += 1;

  return {
    generated: '2026-10-28',
    inputs: {
      base: { file: 'standards/zhenduan/底本.json', sha256: sha(BASE), chapters: doc.chapters.length, chars: doc.counts.chars },
      zhNames: { file: 'standards/icd11/zh-names.json', sha256: sha(ZH) },
    },
    method: {
      question: 'ICD-11 TM1 的证候单元，在这本教材里讲了吗？',
      unitScope: `TM1 pattern ${all.length} 条，剔除残余类目 ${residual.length} 条 → 实单元 ${real.length} 条`,
      exact: '单元名（或去掉「证」的核心名，≥2 字）在教材正文原样出现',
      covered: '病位词 + 病性词在**同一段**共现（教材讲了这个组合，但没给它这个证名）',
      fragment: '只有 ≥2 字的词面片段出现（如「肝脾」），不构成「讲了这个证」',
      none: '连 2 字片段都没有',
      lexicon: { POS, NAT },
      limits: [
        '这是词面/词表法，不做语义归并：教材用「痰浊」的段落不会自动算成 TM1 的「痰湿」',
        'covered 只证明「这两个词在一段里同时出现」，不等于教材把它们当证候名讲；引用时不得据此声称教材讲过该证',
        '教材正文 22,215 字，是一门课的教材口径，不是中医文献全库；本表只对这本教材下结论',
      ],
    },
    stat: { patterns: all.length, residual: residual.length, real: real.length, tally },
    rows,
  };
}

function toMd(d) {
  const s = d.stat;
  const t = s.tally;
  const none = d.rows.filter((r) => r.bucket === 'none');
  const frag = d.rows.filter((r) => r.bucket === 'fragment');
  const cov = d.rows.filter((r) => r.bucket === 'covered');
  const L = [];
  L.push('# 反方向对账：ICD-11 TM1 的证候单元，这本教材讲了多少');
  L.push('');
  L.push(`> 生成 ${d.generated} · 教材 \`${d.inputs.base.sha256.slice(0, 12)}\`（${d.inputs.base.chapters} 章 / ${d.inputs.base.chars.toLocaleString('en-US')} 字）· TM1 ${s.patterns} 条 pattern`);
  L.push('');
  L.push('## 一、结论数字');
  L.push('');
  L.push('| 项 | 值 |');
  L.push('|---|--:|');
  L.push(`| TM1 证候单元（英文含 pattern） | ${s.patterns} |`);
  L.push(`| 剔除残余类目（其他特指的/未特指的） | ${s.residual} |`);
  L.push(`| **实单元** | **${s.real}** |`);
  L.push(`| ① 教材原样出现（exact，含去「证」的核心名） | **${t.exact}**（${(t.exact / s.real * 100).toFixed(1)}%） |`);
  L.push(`| ② 病位+病性同段共现（covered） | ${t.covered}（${(t.covered / s.real * 100).toFixed(1)}%） |`);
  L.push(`| ③ 只有词面片段（fragment） | ${t.fragment}（${(t.fragment / s.real * 100).toFixed(1)}%） |`);
  L.push(`| ④ **教材完全没有（none）** | **${t.none}**（${(t.none / s.real * 100).toFixed(1)}%） |`);
  L.push('');
  L.push('## 二、④ 教材完全没有的证（全部列出）');
  L.push('');
  if (none.length) {
    L.push('| TM1 码 | 证名 | 英文题名 | 拆出的病位/病性 |');
    L.push('|---|---|---|---|');
    for (const r of none) L.push(`| ${r.code} | ${r.zh} | ${r.en} | ${r.pos || '—'} / ${r.nat || '—'} |`);
  } else {
    L.push('（无）');
  }
  L.push('');
  L.push(`这 ${none.length} 条才是「ICD-11 有、这本教材没有」的部分。数量比预期小，原因写在第三节。`);
  L.push('');
  L.push('## 三、②③ 两档为什么不能算「讲过了」');
  L.push('');
  L.push(`- **covered ${t.covered} 条**：教材同一段里出现了该证的病位词与病性词，但没有给它这个证名。例：`);
  for (const r of cov.slice(0, 6)) L.push(`  - ${r.zh}（${r.code}）← 教材 ${r.loc}「${r.pos}…${r.nat}」`);
  L.push(`- **fragment ${t.fragment} 条**：只有 2 字以上的词面片段重合，连病位+病性都没凑齐。例：`);
  for (const r of frag.slice(0, 6)) L.push(`  - ${r.zh}（${r.code}）← 片段「${r.lcs}」（${r.loc || '—'}）`);
  L.push('');
  L.push('这两档只能说明「教材有相近的语言材料」，不能说明教材讲过这个证。判据写死在 `method` 里。');
  L.push('');
  L.push('## 四、逐条结果（196 条，按档排序）');
  L.push('');
  L.push('| TM1 码 | 证名 | 档 | 命中内容 | 教材位置 |');
  L.push('|---|---|---|---|---|');
  const order = { exact: 0, covered: 1, fragment: 2, none: 3 };
  for (const r of [...d.rows].sort((a, b) => order[a.bucket] - order[b.bucket] || a.code.localeCompare(b.code))) {
    L.push(`| ${r.code} | ${r.zh} | ${r.bucket} | ${r.probe || '—'} | ${r.loc || '—'} |`);
  }
  L.push('');
  L.push('## 五、口径与边界');
  L.push('');
  L.push(`- ${d.method.unitScope}`);
  L.push(`- ${d.method.exact}`);
  L.push(`- ${d.method.covered}`);
  L.push(`- ${d.method.fragment}`);
  L.push(`- ${d.method.none}`);
  L.push(`- 词表：病位 ${d.method.lexicon.POS.length} 个、病性 ${d.method.lexicon.NAT.length} 个（见 \`tm1-landing.json\` 的 \`method.lexicon\`）`);
  for (const x of d.method.limits) L.push(`- ${x}`);
  return L.join('\n') + '\n';
}

function main() {
  const d = build();
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(OUT_JSON)) {
      console.log('[tm1-landing] ✗ 缺 tm1-landing.json');
      return 1;
    }
    const prev = JSON.parse(fs.readFileSync(OUT_JSON, 'utf8'));
    const bad = [];
    if (prev.inputs.base.sha256 !== d.inputs.base.sha256) bad.push('底本.json 变了');
    for (const k of Object.keys(d.stat.tally)) {
      if ((prev.stat.tally[k] || 0) !== d.stat.tally[k]) bad.push(`${k} ${prev.stat.tally[k]} → ${d.stat.tally[k]}`);
    }
    if (bad.length) {
      console.log('[tm1-landing] ✗ ' + bad.join('；'));
      return 1;
    }
    const t = d.stat.tally;
    console.log(`[tm1-landing] ✓ 实单元 ${d.stat.real}：exact ${t.exact} · covered ${t.covered} · fragment ${t.fragment} · none ${t.none}`);
    return 0;
  }
  fs.writeFileSync(OUT_JSON, JSON.stringify(d, null, 1) + '\n');
  fs.writeFileSync(OUT_MD, toMd(d));
  const t = d.stat.tally;
  console.log('═══ 反方向对账（TM1 → 教材）═══');
  console.log(`  TM1 pattern ${d.stat.patterns} − 残余 ${d.stat.residual} = 实单元 ${d.stat.real}`);
  console.log(`  exact ${t.exact} · covered ${t.covered} · fragment ${t.fragment} · none ${t.none}`);
  for (const r of d.rows.filter((x) => x.bucket === 'none')) console.log(`    ✗ ${r.code} ${r.zh}（${r.en}）`);
  console.log('  → standards/zhenduan/tm1-landing.{json,md}');
  return 0;
}

if (require.main === module) process.exit(main());

module.exports = { build, toMd, POS, NAT, lcs, longestIn };
