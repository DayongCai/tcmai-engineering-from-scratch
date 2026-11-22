#!/usr/bin/env node
/**
 * 医学细胞生物学 · 第 1 章 细胞学说与四个隔间：把正文当数据读，重建判据链
 * 正文: departments/09-jichu/03-yixue-xibao-shengwu-xue/chapters/01-xibao-shengwuxue-gailun/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 两条表（四个隔间、五种坏法）都从正文里现抓，抓不到就报错；判据与算例由抓到的行推出。
 * 正文改一行，这里的结论就跟着改——没有一处结论是抄在代码里的常量。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

function readDoc() {
  return fs.readFileSync(DOC, 'utf8');
}

/** 抓表头含全部关键词的那张表，返回单元格二维数组（去掉表头与分隔行） */
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
  if (!rows.length) throw new Error('表头之后没有数据行: ' + keys.join(' / '));
  return rows;
}

/** 汉字 n 元组，用于「同一说法」的粗匹配 */
function grams(text, n = 4) {
  const out = new Set();
  for (const seg of String(text).replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

function overlap(a, b, n = 4) {
  const gb = grams(b, n);
  let hit = 0;
  for (const g of grams(a, n)) if (gb.has(g)) hit += 1;
  return hit;
}

/** 四个隔间：次序即正文表里的行列顺序（界 → 架 → 库 → 厂） */
function compartments(doc) {
  return tableRows(doc, ['隔间', '一句话职责', '判据']).map((r) => ({
    name: r[0],
    duty: r[1],
    test: r[2],
    firstFailure: r[3],
  }));
}

/** 五种坏法：坏法 → 细胞层面的实质 → 对应章 */
function failureModes(doc) {
  return tableRows(doc, ['坏法', '细胞层面的实质']).map((r) => ({
    mode: r[0],
    essence: r[1],
    chapters: r[2],
  }));
}

/** 反查：给一个病理描述，按与「先坏时的表现」的重合度落位到隔间 */
function locate(symptom, doc) {
  const list = (doc ? compartments(doc) : compartments(readDoc()));
  let best = null;
  for (const c of list) {
    const score = overlap(symptom, c.firstFailure + c.duty);
    if (!best || score > best.score) best = { ...c, score };
  }
  if (!best || best.score === 0) throw new Error('这句描述落不到任一隔间，先确认它是不是细胞层面的现象: ' + symptom);
  return best;
}

/** 光镜下限（μm）与「纳米量级」下限的换算倍数：只做单位换算，不加实验推断 */
function resolutionGain(doc) {
  const m = doc.match(/约\s*([0-9.]+)\s*μm/);
  if (!m) throw new Error('正文里没有光镜分辨下限');
  const um = Number(m[1]);
  const nmFloor = 1; // 1 nm 是「纳米量级」的下限，取它为分母是换算假设，不是观测值
  return { um, times: Math.round((um * 1000) / nmFloor) };
}

/** 用不到十种形态模型覆盖 10^13 个细胞：每个模型要摊到多少个个体 */
function cellsPerModel(doc, models = 10) {
  const m = doc.match(/10\^13[–-]10\^14/);
  if (!m) throw new Error('正文里没有细胞总数的量级');
  return { perModel: 1e13 / models, models };
}

/** 链条上任意一环先坏，后面各环按序崩解——顺序由隔间表决定 */
function collapseOrder(doc) {
  return (doc ? compartments(doc) : compartments(readDoc())).map((c) => c.name);
}

function main() {
  const doc = readDoc();
  const cs = compartments(doc);
  const fs5 = failureModes(doc);
  const rg = resolutionGain(doc);
  const cm = cellsPerModel(doc);

  console.log('医学细胞生物学 · 第 1 章 细胞学说与四个隔间');
  console.log('');
  console.log(`正文里读到 ${cs.length} 个隔间、${fs5.length} 类坏法。`);
  console.log('');
  console.log('隔间与判据（照正文表）：');
  for (const [i, c] of cs.entries()) {
    console.log(`  ${i + 1}. ${c.name} ｜ ${c.duty}`);
    console.log(`     先坏时：${c.firstFailure}`);
  }
  console.log('');
  console.log('崩解次序（由表推出，不是背下来的）：' + collapseOrder(doc).join(' → '));
  console.log('');
  console.log('反查示例（拿症状找位置）：');
  for (const s of ['梯度失守、水肿', '分裂失败、迁移不能', '增殖失控、分化丧失']) {
    const hit = locate(s, doc);
    console.log(`  「${s}」→ ${hit.name}（判据：${hit.test}）`);
  }
  console.log('');
  console.log(`分辨率换算：光镜 ${rg.um} μm 与纳米量级下限（1 nm）相差约 ${rg.times} 倍——这是单位换算，不是观测。`);
  console.log(`规模对照：10^13 个细胞摊到 ${cm.models} 种形态模型，每个模型约 ${cm.perModel.toExponential(1)} 个个体，所以只能讲分类与判据。`);
  console.log('');
  console.log('※ 隔间、坏法、次序均由本章正文表格现抓现推；换教材后重跑即可复现。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = {
  readDoc,
  tableRows,
  grams,
  overlap,
  compartments,
  failureModes,
  locate,
  resolutionGain,
  cellsPerModel,
  collapseOrder,
};
