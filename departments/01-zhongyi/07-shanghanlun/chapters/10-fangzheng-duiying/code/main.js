'use strict';
/**
 * 方证对应：症状群 → 方剂候选（带支持条数与出处）
 *
 *   node code/main.js
 *
 * 口径：
 *   · 「方证」= 该方在同条出现的症状词集合；支持度 support = 含该方的条文数。
 *   · 打分用 Jaccard（命中症状 / 并集），并强制 support ≥ 3，否则不给候选 —— 
 *     支持度太低的方，命中的一两个词只是巧合。
 *   · 只报候选与出处，不给剂量、不判主次、不替代辨证。
 *   · 症状词表是手工的（26 词），覆盖不全；未收录的症状不会参与打分。
 */

const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.resolve(__dirname, '../../../../../..');
const BOOK = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/shanghan/底本.json'), 'utf8'));

const ITEMS = [];
for (const p of BOOK.pian) for (const it of p.items) {
  ITEMS.push({ pian: p.no, no: it.no, text: it.text, norm: it.text.split('𤍠').join('热') });
}

/** 手工症状词表（归一后形式） */
const SYMPTOMS = ['发热', '恶寒', '汗出', '无汗', '头痛', '身疼', '脉浮', '脉沉', '口苦', '咽干', '目眩',
  '往来寒热', '胸胁苦满', '心烦', '喜呕', '腹满', '潮热', '谵语', '下利', '厥', '小便不利', '烦躁', '咳', '喘'];

/** 方名：先剥「宜/属/与/服/本云/作」等前缀，避免把「宜大承气汤」算成另一个方 */
const FORMULAS = ['桂枝汤', '麻黄汤', '小柴胡汤', '大承气汤', '小承气汤', '调胃承气汤', '四逆汤', '五苓散', '理中丸', '白虎汤', '栀子豉汤', '葛根汤'];
const PREFIX = /^(宜|属|与|服|本云|作|用|进|更|复与)+/;

function formulasIn(text) {
  const out = new Set();
  for (const f of FORMULAS) if (text.includes(f)) out.add(f);
  return out;
}

/** 建方-症矩阵 */
function buildMatrix() {
  const m = new Map();
  for (const f of FORMULAS) m.set(f, { support: 0, symptoms: new Map(), pians: new Set() });
  for (const it of ITEMS) {
    const fs_ = formulasIn(it.norm);
    for (const f of fs_) {
      const rec = m.get(f);
      rec.support += 1;
      rec.pians.add(it.pian);
      for (const s of SYMPTOMS) if (it.norm.includes(s)) rec.symptoms.set(s, (rec.symptoms.get(s) || 0) + 1);
    }
  }
  return m;
}

/** 症状群 → 候选方（Jaccard + 支持度门槛） */
function match(signs, { minSupport = 3, top = 3 } = {}) {
  const q = [...new Set(signs)].filter((s) => SYMPTOMS.includes(s));
  const matrix = buildMatrix();
  const rows = [];
  for (const [f, rec] of matrix) {
    if (rec.support < minSupport) continue;
    const fsyms = [...rec.symptoms.keys()];
    const hit = q.filter((s) => fsyms.includes(s));
    if (hit.length === 0) continue;
    const union = new Set([...q, ...fsyms]).size;
    rows.push({
      formula: f,
      score: Number((hit.length / union).toFixed(3)),
      hit,
      support: rec.support,
      pians: [...rec.pians].sort((a, b) => a - b),
    });
  }
  return rows.sort((a, b) => b.score - a.score || b.support - a.support).slice(0, top);
}

/**
 * lift 版匹配：score = 平均提升度
 *   lift(s, f) = (s 在方 f 条文里的占比) / (s 在全库的占比)
 * 目的：纠正 Jaccard 对「大支持度方」的偏袒 —— 桂枝汤 134 条几乎覆盖任何症状组合，
 * 不加权就会把泻下类方排到「寒利」第一位（见 code/main.js 的输出对比）。
 */
function matchLift(signs, { minSupport = 3, top = 3 } = {}) {
  const q = [...new Set(signs)].filter((s) => SYMPTOMS.includes(s));
  const N = ITEMS.length;
  const df = new Map();
  for (const s of SYMPTOMS) df.set(s, ITEMS.filter((it) => it.norm.includes(s)).length || 1);
  const matrix = buildMatrix();
  const rows = [];
  for (const [f, rec] of matrix) {
    if (rec.support < minSupport) continue;
    const hits = q.filter((s) => rec.symptoms.has(s));
    if (!hits.length) continue;
    const lifts = hits.map((s) => (rec.symptoms.get(s) / rec.support) / (df.get(s) / N));
    const score = lifts.reduce((a, b) => a + b, 0) / lifts.length;
    rows.push({
      formula: f,
      score: Number(score.toFixed(2)),
      hit: hits,
      support: rec.support,
      pians: [...rec.pians].sort((a, b) => a - b),
    });
  }
  return rows.sort((a, b) => b.score - a.score).slice(0, top);
}

/**
 * 混合版：覆盖率门槛 × 平均提升度
 *   coverage = 查询症状中被该方覆盖的比例（≥ 0.5 才有资格）
 *   support ≥ 10（少于此的方，症状共现属偶然）
 *   score = meanLift × coverage
 * 前两版各自失败（见 main.js 输出）：Jaccard 偏袒大支持度方，纯 lift 偏袒小样本方。
 */
function matchHybrid(signs, { minSupport = 10, minCoverage = 0.5, top = 3 } = {}) {
  const q = [...new Set(signs)].filter((s) => SYMPTOMS.includes(s));
  const N = ITEMS.length;
  const df = new Map();
  for (const s of SYMPTOMS) df.set(s, ITEMS.filter((it) => it.norm.includes(s)).length || 1);
  const matrix = buildMatrix();
  const rows = [];
  for (const [f, rec] of matrix) {
    if (rec.support < minSupport) continue;
    const hits = q.filter((s) => rec.symptoms.has(s));
    const coverage = hits.length / q.length;
    if (coverage < minCoverage) continue;
    const lifts = hits.map((s) => (rec.symptoms.get(s) / rec.support) / (df.get(s) / N));
    const meanLift = lifts.reduce((a, b) => a + b, 0) / lifts.length;
    rows.push({
      formula: f,
      score: Number((meanLift * coverage).toFixed(2)),
      coverage: Number(coverage.toFixed(2)),
      meanLift: Number(meanLift.toFixed(2)),
      hit: hits,
      support: rec.support,
      pians: [...rec.pians].sort((a, b) => a - b),
    });
  }
  return rows.sort((a, b) => b.score - a.score).slice(0, top);
}

/** 给一条候选方找原文出处（最多 2 条） */
function evidence(formula, syms) {
  return ITEMS.filter((it) => it.text.includes(formula) && syms.some((s) => it.norm.includes(s)))
    .slice(0, 2)
    .map((it) => ({ pian: it.pian, no: it.no, text: it.text.slice(0, 60) }));
}

/**
 * 支持条数的成色拆分：把「含该方名的条」分成
 *   证治条  = 条文主体讲证讲治（本章打分真正想要的）
 *   方名行  = 整条只有「某汤方」三个字
 *   方后注  = 组成/煎服法/异文互见（右N味、本云、一云、用前、用后、煮取、温服…）
 * 为什么要拆：按方名子串计数，煎服法条文也会被算进支持度，支持数因此系统性虚高。
 * @param {string} f 方名
 */
const NOTE_LIKE = /(右.{1,3}味|本云|一云|用前|用后|煮取|温服|去滓|㕮咀|上.{1,3}味)/;

function supportBreakdown(f) {
  if (!FORMULAS.includes(f)) throw new Error(`不在本章方名表内：${f}`);
  const hits = ITEMS.filter((it) => it.norm.includes(f));
  const title = hits.filter((it) => it.text.trim() === f || it.text.trim() === `${f}方`);
  const rest = hits.filter((it) => !title.includes(it));
  const note = rest.filter((it) => NOTE_LIKE.test(it.text) && !it.text.includes(`${f}主之`));
  return {
    formula: f,
    total: hits.length,
    title: title.length,
    noteLike: note.length,
    zhengzhi: hits.length - title.length - note.length,
  };
}

function main() {
  const matrix = buildMatrix();
  console.log('方-症矩阵（支持数 = 含该方的条文数）\n');
  const top = [...matrix].sort((a, b) => b[1].support - a[1].support).slice(0, 8);
  for (const [f, rec] of top) {
    const s = [...rec.symptoms].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k}×${v}`).join(' ');
    console.log(`  ${f.padEnd(6, '　')} 支持 ${String(rec.support).padStart(3)} 条｜篇 ${[...rec.pians].join('/')}｜高频症 ${s}`);
  }

  const cases = [
    { name: '表实无汗', signs: ['无汗', '脉浮', '头痛', '喘'] },
    { name: '半表半里', signs: ['往来寒热', '胸胁苦满', '口苦', '心烦'] },
    { name: '腑实', signs: ['腹满', '潮热', '谵语'] },
    { name: '寒利', signs: ['下利', '厥', '恶寒'] },
  ];
  for (const c of cases) {
    const r = match(c.signs);
    const rl = matchLift(c.signs);
    const rh = matchHybrid(c.signs);
    console.log(`\n【${c.name}】${c.signs.join('+')}`);
    if (!r.length) { console.log('  无候选（支持度门槛 3 未达成或症状未命中）'); continue; }
    for (const x of r) {
      console.log(`  [Jaccard] ${x.formula}｜${x.score}｜命中 ${x.hit.join('/')}｜支持 ${x.support} 条`);
    }
    console.log('  ── lift 加权后 ──');
    for (const x of rl) {
      console.log(`  [lift] ${x.formula}｜提升 ${x.score}｜命中 ${x.hit.join('/')}｜支持 ${x.support} 条`);
    }
    console.log('  ── 混合（覆盖率门槛 × 平均提升）──');
    for (const x of rh) {
      console.log(`  [混合] ${x.formula}｜${x.score}（覆盖 ${x.coverage} × 提升 ${x.meanLift}）｜支持 ${x.support} 条`);
      for (const e of evidence(x.formula, x.hit)) console.log(`      篇${e.pian}：${e.text}…`);
    }
  }
  console.log('\n口径：候选≠处方；Jaccard 只衡量词面重合，不含辨证逻辑；症状表 24 词，覆盖不全。');
  console.log('本输出为文本统计演示，不构成诊疗建议。');
}

if (require.main === module) main();
module.exports = { buildMatrix, match, matchLift, matchHybrid, evidence, supportBreakdown, SYMPTOMS, FORMULAS, ITEMS, PREFIX };
