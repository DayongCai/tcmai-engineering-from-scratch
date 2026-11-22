#!/usr/bin/env node
/**
 * 医学细胞生物学 · 第 5 章 细胞骨架与运动：三种纤维，三种经济
 * 正文: departments/09-jichu/03-yixue-xibao-shengwu-xue/chapters/05-xibao-gujia-yu-yundong/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 纤维表与迁移四步表都从正文现抓。「能不能当轨道」这个判据不背答案，直接读表里的极性与马达两列：
 * 有极性且有马达才当轨道，两端对称的只能当绳索。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const readDoc = () => fs.readFileSync(DOC, 'utf8');

function tableRows(doc, keys) {
  const lines = doc.split(/\r?\n/);
  const head = lines.findIndex((l) => l.trim().startsWith('|') && keys.every((k) => l.includes(k)));
  if (head < 0) throw new Error('正文里找不到表头: ' + keys.join(' / '));
  const rows = [];
  for (let i = head + 2; i < lines.length; i += 1) {
    const l = lines[i].trim();
    if (!l.startsWith('|')) break;
    rows.push(l.split('|').slice(1, -1).map((c) => c.trim()));
  }
  if (!rows.length) throw new Error('表头之后没有数据行');
  return rows;
}

/** 三种纤维：单体 / 直径 / 极性 / 核苷酸 / 马达 / 周转 / 主责 */
function fibers(doc) {
  return tableRows(doc, ['纤维', '单体', '极性']).map((r) => ({
    name: r[0],
    monomer: r[1],
    diameter: r[2],
    polarity: r[3],
    nucleotide: r[4],
    motor: r[5],
    turnover: r[6],
    duty: r[7],
  }));
}

/** 能不能当轨道：有极性（两端不一样）并且上面有马达 */
function canBeTrack(name, doc) {
  const f = (doc ? fibers(doc) : fibers(readDoc())).find((x) => x.name.includes(name));
  if (!f) throw new Error('表里没有这种纤维: ' + name);
  const hasPolarity = f.polarity.includes('有');
  const hasMotor = f.motor.trim() !== '无';
  return hasPolarity && hasMotor;
}

/** 从直径一列里取数（「约 7 nm」→ 7），只做数字抽取，不做推断 */
function diameterOf(name, doc) {
  const f = (doc ? fibers(doc) : fibers(readDoc())).find((x) => x.name.includes(name));
  if (!f) throw new Error('表里没有这种纤维: ' + name);
  const m = f.diameter.match(/(\d+(?:\.\d+)?)\s*nm/);
  if (!m) throw new Error('直径一列里没有数: ' + f.diameter);
  return Number(m[1]);
}

/** 粗细比：管子比绳子粗多少（正文只给量级，这里给出表内数字的比值） */
function diameterRatio(doc) {
  const tube = diameterOf('微管', doc);
  const filament = diameterOf('微丝', doc);
  return { tube, filament, ratio: Number((tube / filament).toFixed(2)) };
}

/** 迁移四步：表内顺序即时间顺序 */
function migration(doc) {
  return tableRows(doc, ['步骤', '骨架事件', '关键分子']).map((r) => ({
    step: r[0],
    event: r[1],
    molecule: r[2],
    blocked: r[3],
  }));
}

/** 要变形就用快的、要抗拉就用慢的：按周转一列归组 */
function byTurnover(doc) {
  const list = doc ? fibers(doc) : fibers(readDoc());
  return {
    fast: list.filter((f) => f.turnover.includes('快')).map((f) => f.name),
    slow: list.filter((f) => f.turnover.includes('慢')).map((f) => f.name),
  };
}

function main() {
  const doc = readDoc();
  const fsList = fibers(doc);
  const r = diameterRatio(doc);

  console.log('医学细胞生物学 · 第 5 章 细胞骨架与运动');
  console.log('');
  console.log(`正文里读到 ${fsList.length} 种纤维。`);
  for (const f of fsList) {
    console.log(`  ${f.name} ｜ ${f.diameter} ｜ 极性：${f.polarity} ｜ 马达：${f.motor} ｜ 主责：${f.duty}`);
  }
  console.log('');
  console.log('能不能当轨道（有极性 + 有马达）：');
  for (const n of ['微丝', '微管', '中间丝']) console.log(`  ${n} → ${canBeTrack(n, doc)}`);
  console.log('');
  console.log(`粗细比：微管 ${r.tube} nm / 微丝 ${r.filament} nm = ${r.ratio}；最细的反而产生最大收缩力，因为它能成束。`);
  console.log(`按周转分：快的 ${byTurnover(doc).fast.join('、')}；慢的 ${byTurnover(doc).slow.join('、')}。`);
  console.log('');
  console.log('迁移四步：');
  for (const [i, s] of migration(doc).entries()) console.log(`  ${i + 1}. ${s.step} ｜ ${s.event} ｜ ${s.molecule}`);
  console.log('');
  console.log('※ 分类、直径与步骤都从本章正文现抓现算；换教材后重跑即可复现。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { readDoc, tableRows, fibers, canBeTrack, diameterOf, diameterRatio, migration, byTurnover };
