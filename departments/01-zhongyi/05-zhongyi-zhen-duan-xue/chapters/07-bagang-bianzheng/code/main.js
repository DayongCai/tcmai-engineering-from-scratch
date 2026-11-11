#!/usr/bin/env node
/**
 * 中医诊断学 · 第 7 章 八纲辨证：4 对轴 8 纲，16 格组合只点名 2 格
 * 课程: departments/01-zhongyi/05-zhongyi-zhen-duan-xue/chapters/07-bagang-bianzheng/docs/zh.md
 * 出处: 教材·第6章 八纲辨证（5 节 10 小节 20 段 1,823 字）
 * 依赖: 仅 Node.js 标准库 + 读教材 JSON
 *
 * 本章量三件事：
 *   1. 五节字数 412 / 408 / 385 / 332 / 286，逐节递减，越靠后越薄；
 *   2. 教材点名 13 个具体证候，四对轴合起来是 8 纲；
 *   3. 组合空间 2^4 = 16，但「阴阳」两名本身是复合定义（阴证=里虚寒、阳证=表实热），
 *      四轴并不独立；教材点名到「四轴全定」的组合只有 2 格。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..', '..', '..', '..', '..');
const BOOK = path.join(ROOT, 'standards', 'zhenduan', '底本.json');
const doc = JSON.parse(fs.readFileSync(BOOK, 'utf8'));
const CH_NO = '6';
const ch = doc.chapters.find((c) => c.no === CH_NO);

function sec(no) {
  return ch.secs.find((s) => s.no === no);
}

function sub(no) {
  for (const s of ch.secs) {
    const hit = (s.subs || []).find((x) => x.no === no);
    if (hit) return hit;
  }
  return undefined;
}

function text() {
  return ch.secs
    .flatMap((s) => [...(s.paras || []), ...s.subs.flatMap((x) => x.paras)])
    .join('\n');
}

function secChars(no) {
  const s = sec(no);
  return (s.paras || []).join('').length + s.subs.reduce((n, x) => n + x.paras.join('').length, 0);
}

function shape() {
  const rows = ch.secs.map((s) => ({
    no: s.no,
    title: s.title,
    subs: s.subs.length,
    paras: (s.paras || []).length + s.subs.reduce((n, x) => n + x.paras.length, 0),
    chars: secChars(s.no),
  }));
  const total = rows.reduce((n, r) => n + r.chars, 0);
  const thick = rows.reduce((a, b) => (b.chars > a.chars ? b : a));
  const thin = rows.reduce((a, b) => (b.chars < a.chars ? b : a));
  return { rows, total, share: total / doc.counts.chars, thick, thin, secs: ch.counts.secs, subs: ch.counts.subs, paras: ch.counts.paras };
}

// 四对轴 = 8 纲
function axes() {
  const pairs = [
    { axis: '表里', pair: ['表', '里'] },
    { axis: '寒热', pair: ['寒', '热'] },
    { axis: '虚实', pair: ['虚', '实'] },
    { axis: '阴阳', pair: ['阴', '阳'] },
  ];
  const gang = pairs.flatMap((p) => p.pair);
  return { pairs, gang, n: gang.length, axes: pairs.length };
}

const SYNDROMES = [
  '表证', '里证', '半表半里证',
  '寒证', '热证',
  '虚证', '实证',
  '阴证', '阳证',
  '阴虚证', '阳虚证',
  '亡阴证', '亡阳证',
];

// 教材点名的具体证候：逐个回原文数出现次数
function syndromes() {
  const t = text();
  const rows = SYNDROMES.map((name) => ({ name, hits: t.split(name).length - 1 }));
  return { rows, n: rows.length, allPresent: rows.every((r) => r.hits > 0), missing: rows.filter((r) => r.hits === 0).map((r) => r.name) };
}

// 三轴网格（阴阳是复合轴，故不独立乘 2）
const GRID_AXES = [
  ['表', '里'],
  ['寒', '热'],
  ['虚', '实'],
];

function gridCells() {
  const out = [];
  for (const a of GRID_AXES[0]) for (const b of GRID_AXES[1]) for (const c of GRID_AXES[2]) out.push([a, b, c]);
  return out;
}

// 教材把阴证/阳证直接定义为四轴里三轴的固定组合
const COMPOSITE = [
  { name: '阴证', fixed: ['里', '寒', '虚'], quote: '里虚寒证的总称', cite: '6.4.1.1' },
  { name: '阳证', fixed: ['表', '热', '实'], quote: '表实热证的总称', cite: '6.4.1.1' },
];

const EXAMPLES = [
  { group: '两轴配对', items: ['表寒', '表热', '表虚', '表实', '里寒', '里热', '里虚', '里实'] },
  { group: '部位轴（上下）', items: ['上热下寒', '上寒下热'] },
  { group: '真假', items: ['真寒假热', '真热假寒', '真实假虚', '真虚假实'] },
  { group: '夹杂', items: ['虚中夹实', '实中夹虚'] },
];

function examples() {
  const t = text();
  return EXAMPLES.map((g) => ({
    group: g.group,
    items: g.items.map((s) => ({ name: s, hits: t.split(s).length - 1, present: t.includes(s) })),
    n: g.items.length,
  }));
}

function combos() {
  const cells = gridCells();
  const covered = [];
  for (const c of COMPOSITE) {
    const hit = cells.find((cell) => cell.every((v, i) => v === c.fixed[i]));
    if (hit) covered.push({ cell: hit.join('·'), by: c.name });
  }
  const naive = 2 ** 4;
  const effective = cells.length;
  const threeValued = 3 * 2 * 2; // 表/半表半里/里 × 寒热 × 虚实
  return {
    naive,
    effective,
    threeValued,
    covered,
    coveredN: covered.length,
    ratioEffective: covered.length / effective,
    ratioNaive: covered.length / naive,
    cells: cells.map((c) => c.join('·')),
    composite: COMPOSITE,
  };
}

function citation(no) {
  return `教材·第${CH_NO}章·${no}`;
}

function resolve(no) {
  const parts = String(no).split('.');
  if (parts.length === 2) return ch.secs.some((s) => s.no === no);
  if (parts.length === 3) return Boolean(sub(no));
  const parent = sub(parts.slice(0, 3).join('.'));
  return Boolean(parent && (parent.items || []).some((i) => i.no === no));
}

function main() {
  const s = shape();
  const a = axes();
  const syn = syndromes();
  const ex = examples();
  const co = combos();

  console.log('═══ 五节（教材·第6章）═══');
  for (const r of s.rows) console.log(`  ${r.no} ${r.title}：${r.subs} 小节 · ${r.paras} 段 · ${r.chars} 字`);
  console.log(`  合计 ${s.total} 字 = 全书 ${(s.share * 100).toFixed(1)}%；最厚 ${s.thick.no}（${s.thick.chars}）、最薄 ${s.thin.no}（${s.thin.chars}）`);
  console.log('');

  console.log(`═══ 四对轴 = ${a.n} 纲（教材·第6章·6.5.1）═══`);
  for (const p of a.pairs) console.log(`  ${p.axis}：${p.pair.join(' / ')}`);
  console.log(`  ${a.axes} 对轴 × 2 = ${a.n} 纲`);
  console.log('');

  console.log(`═══ 教材点名的具体证候：${syn.n} 个 ═══`);
  console.log('  ' + syn.rows.map((r) => `${r.name}(${r.hits})`).join('  '));
  console.log(`  全部可在教材原文找到：${syn.allPresent}` + (syn.missing.length ? `；缺 ${syn.missing.join('、')}` : ''));
  console.log('');

  console.log('═══ 组合空间与举例 ═══');
  console.log(`  朴素空间 2^4 = ${co.naive} 格；表里轴实际三值（含半表半里证）→ 上界 ${co.threeValued} 格`);
  console.log(`  阴阳两名是复合定义：` + co.composite.map((c) => `${c.name} = ${c.fixed.join('')}（${c.quote}）`).join('；'));
  console.log(`  故独立轴只有 3 对 → 有效网格 ${co.effective} 格：${co.cells.join(' / ')}`);
  console.log(`  教材点名且四轴全定的组合：${co.coveredN} 格（${co.covered.map((x) => x.cell + '←' + x.by).join('、')}）= 有效格 ${(co.ratioEffective * 100).toFixed(1)}% / 朴素 16 格 ${(co.ratioNaive * 100).toFixed(1)}%`);
  for (const g of ex) console.log(`  ${g.group} ${g.n} 例：${g.items.map((i) => i.name + (i.present ? '' : '（未找到）')).join('、')}`);
  console.log('  → 其余组合（如里虚寒以外的里虚热、表实寒）教材未举例，属未覆盖，不代补。');
  console.log('');

  console.log('教学边界：本章只做八纲四轴的结构清点与举例覆盖统计，不据八纲辨任何人的证候；不构成诊断依据。');
}

if (require.main === module) main();

module.exports = { shape, axes, syndromes, combos, examples, secChars, citation, resolve, gridCells, doc, ch };
