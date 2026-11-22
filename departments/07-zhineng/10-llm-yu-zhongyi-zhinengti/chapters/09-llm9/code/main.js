#!/usr/bin/env node
/**
 * 大模型与中医智能体 · 第 9 章 测不出幻觉率的模型，不该进临床流程
 * 课程: departments/07-zhineng/10-llm-yu-zhongyi-zhinengti/chapters/09-llm9/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文现读并复算三件事：
 *   ① Cohen's kappa：观察一致率、期望一致率、扣除机会后的一致率；
 *      并演示同一观察一致率在不同边缘分布下可以给出完全不同的结论；
 *   ② 题量与分辨率：总体与分层的区间半宽、想分辨 5 个点所需题量；
 *   ③ 答案分级表：五级的计分与越权单独统计。
 * 不引用任何实测评分结果。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const readDoc = () => fs.readFileSync(DOC, 'utf8');

/** 「观察一致率 $p_o=0.80$；甲 0.50／0.30／0.20，乙 0.55／0.28／0.17」 */
function parseKappaCase(text) {
  const po = text.match(/观察一致率\s*\$p_o=([\d.]+)\$/);
  const mg = text.match(/评分者甲的分布为\s*([\d.]+)／([\d.]+)／([\d.]+)，乙为\s*([\d.]+)／([\d.]+)／([\d.]+)/);
  const kq = text.match(/\\approx(0\.\d+)\$\$/);
  if (!po || !mg || !kq) throw new Error('正文里没找到 kappa 算例的三组数');
  return {
    po: Number(po[1]),
    raterA: [Number(mg[1]), Number(mg[2]), Number(mg[3])],
    raterB: [Number(mg[4]), Number(mg[5]), Number(mg[6])],
    quotedKappa: Number(kq[1]),
  };
}

/** 「按二项比例的标准误…演算设定 $p=0.85$」「总量 300 题」「分层后每类 75 题」 */
function parseResolutionCase(text) {
  const p = text.match(/演算设定\s*\$p=([\d.]+)\$/);
  const n = text.match(/总量\s*(\d+)\s*题/);
  const per = text.match(/分层后每类\s*(\d+)\s*题/);
  const d = text.match(/想分辨\s*\$d=([\d.]+)\$/);
  const need = text.match(/即\s*\$n\\approx p\(1-p\)\/([\d.]+)\^2\\approx(\d+)\$/);
  const total = text.match(/总量就要\s*(\d+)\s*题以上/);
  if (!p || !n || !per || !d || !need || !total) throw new Error('正文里没找到题量与分辨率的算例');
  return {
    p: Number(p[1]),
    n: Number(n[1]),
    perClass: Number(per[1]),
    delta: Number(d[1]),
    seTarget: Number(need[1]),
    neededPerClass: Number(need[2]),
    totalNeeded: Number(total[1]),
  };
}

/** 答案分级表：等级 / 定义 / 计分 */
function parseGradeTable(text) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => l.startsWith('|') && l.includes('等级'));
  if (start < 0) throw new Error('正文里没找到答案分级表');
  const rows = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    if (!lines[i].startsWith('|')) break;
    const cells = lines[i].split('|').map((c) => c.trim());
    cells.shift();
    cells.pop();
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;
    if (cells.length >= 3) rows.push({ grade: cells[0], definition: cells[1], score: cells[2] });
  }
  return rows;
}

const seBinom = (p, n) => Math.sqrt((p * (1 - p)) / n);
const peOf = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const kappaOf = (po, pe) => (po - pe) / (1 - pe);

function main() {
  const doc = readDoc();
  const k = parseKappaCase(doc);
  const res = parseResolutionCase(doc);
  const grades = parseGradeTable(doc);

  const pe = peOf(k.raterA, k.raterB);
  const kappa = kappaOf(k.po, pe);

  console.log('═══ 测不出幻觉率的模型，不该进临床流程 ═══');
  console.log('');
  console.log('一、观察一致率不等于一致性');
  console.log(`  观察一致率 p_o = ${k.po}`);
  console.log(`  期望一致率 p_e = Σ 甲_i × 乙_i = ${k.raterA.map((x, i) => `${x}×${k.raterB[i]}`).join(' + ')} = ${pe.toFixed(3)}`);
  console.log(`  kappa = (${k.po} − ${pe.toFixed(3)}) / (1 − ${pe.toFixed(3)}) = ${kappa.toFixed(3)}（正文 ${k.quotedKappa}）`);
  console.log(`  0.61–0.80 属「较好」：足以支持排序，不足以支持「差 3 个点即更优」。`);
  console.log('');
  console.log('  同一个 p_o 在不同边缘分布下的结论（对照分布为教学构造）：');
  const extremes = [[0.9, 0.05, 0.05], [0.9, 0.05, 0.05]];
  const peEx = peOf(extremes[0], extremes[1]);
  console.log(`    甲/乙均为 0.90／0.05／0.05 ⇒ p_e = ${peEx.toFixed(3)}，kappa = ${kappaOf(k.po, peEx).toFixed(3)}`);
  console.log(`    也就是说：评分高度集中于同一类时，0.80 的观察一致率可能比碰巧一致还差。`);
  console.log('');

  console.log('二、三百题能回答多细（p = ' + res.p + '）');
  const seAll = seBinom(res.p, res.n);
  const sePer = seBinom(res.p, res.perClass);
  console.log(`  总量 ${res.n} 题：SE ${seAll.toFixed(3)}，95% 半宽 ±${(1.96 * seAll).toFixed(3)}`);
  console.log(`  每类 ${res.perClass} 题：SE ${sePer.toFixed(3)}，95% 半宽 ±${(1.96 * sePer).toFixed(3)}`);
  console.log(`  可答：总体在 ${(res.p - 1.96 * seAll).toFixed(2)}–${(res.p + 1.96 * seAll).toFixed(2)}；不可答：这一类比那一类好 ${(res.delta * 100).toFixed(0)} 个点。`);
  const nNeed = (res.p * (1 - res.p)) / res.seTarget ** 2;
  console.log(`  想分辨 ${(res.delta * 100).toFixed(0)} 个点：SE 需 ≈${res.seTarget} ⇒ 每类 n ≈ ${Math.round(nNeed)}（正文 ${res.neededPerClass}）`);
  console.log(`  四类分开报数 ⇒ 总量 ${Math.ceil(nNeed) * 4} 题（正文「${res.totalNeeded} 题以上」）`);
  console.log(`  中间没有第三条路：要么接受只能报总体，要么把题量做够。`);
  console.log('');

  console.log(`三、答案分级（${grades.length} 级，正文表原样读出）`);
  for (const g of grades) console.log(`  ${g.grade}：${g.definition} → ${g.score}`);
  console.log('  D 与 E 必须分开：越权若算作「错」，就与答错一个知识点同权，而后者是教学损失、前者是合规事故。');
  console.log('');
  console.log('※ 本章数字均从 docs/zh.md 现读现算；对照分布为教学构造；输出仅用于教学演示，不构成诊疗或产品准入建议。');
}

if (require.main === module) main();

module.exports = {
  DOC,
  readDoc,
  parseKappaCase,
  parseResolutionCase,
  parseGradeTable,
  seBinom,
  peOf,
  kappaOf,
  main,
};
