#!/usr/bin/env node
/**
 * 医学细胞生物学 · 第 3 章 细胞连接与黏附：四类连接按「力往哪传」归类
 * 正文: departments/09-jichu/03-yixue-xibao-shengwu-xue/chapters/03-xibao-lianjie-yu-nianfu/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 连接表与外渗级联表都从正文现抓。分类不靠背名字，只问一句「力往哪传」——答案在表里，
 * 表一改，分类就跟着改。
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

/** 四类连接：位置 / 跨膜分子 / 胞内接的骨架 / 功能 / 通透性 */
function junctions(doc) {
  return tableRows(doc, ['连接', '跨膜分子', '胞内接的骨架']).map((r) => ({
    name: r[0],
    where: r[1],
    crossMembrane: r[2],
    skeleton: r[3],
    duty: r[4],
    permeability: r[5],
  }));
}

/** 判据：问「力往哪传」，返回接到这种骨架上的连接 */
function forceTo(skeletonWord, doc) {
  const hits = (doc ? junctions(doc) : junctions(readDoc())).filter((j) => j.skeleton.includes(skeletonWord));
  if (!hits.length) throw new Error('没有连接接到这种骨架上: ' + skeletonWord);
  return hits.map((j) => j.name);
}

/** 允许小分子直接穿过的连接（通透性一列里带「可通」） */
function permeable(doc) {
  return (doc ? junctions(doc) : junctions(readDoc())).filter((j) => j.permeability.includes('可通')).map((j) => j.name);
}

/** 归纳：接到肌动蛋白的几类、接到中间丝的几类、不接骨架的几类 */
function tally(doc) {
  const list = doc ? junctions(doc) : junctions(readDoc());
  return {
    actin: list.filter((j) => j.skeleton.includes('肌动蛋白')).length,
    intermediate: list.filter((j) => j.skeleton.includes('中间丝')).length,
    none: list.filter((j) => j.skeleton.trim() === '无').length,
  };
}

/** 白细胞外渗的级联：顺序即表里的行序 */
function cascade(doc) {
  return tableRows(doc, ['步骤', '分子', '力学行为']).map((r) => ({
    step: r[0],
    molecule: r[1],
    mechanics: r[2],
    result: r[3],
  }));
}

/** 级联的设计原则：先用弱而快降速，再用强而慢定位 */
function designRule(doc) {
  const d = String(doc);
  const slow = d.includes('先用弱而快的键把速度降下来');
  const fix = d.includes('再用强而慢的键把位置固定住');
  if (!slow || !fix) throw new Error('正文里找不到级联的设计原则');
  return { slowFirst: slow, strongSecond: fix };
}

function main() {
  const doc = readDoc();
  const js = junctions(doc);
  const t = tally(doc);
  const cs = cascade(doc);

  console.log('医学细胞生物学 · 第 3 章 细胞连接与黏附');
  console.log('');
  console.log(`正文里读到 ${js.length} 类连接；接到肌动蛋白 ${t.actin} 类、接到中间丝 ${t.intermediate} 类、不接骨架 ${t.none} 类。`);
  console.log('');
  console.log('按「力往哪传」分：');
  console.log('  接到肌动蛋白（形状可变而不断）：' + forceTo('肌动蛋白', doc).join('、'));
  console.log('  接到中间丝（反复受剪切而不裂）：' + forceTo('中间丝', doc).join('、'));
  console.log('  小分子可直接过的：' + permeable(doc).join('、'));
  console.log('');
  console.log('紧密连接的功能：' + js[0].duty);
  console.log('');
  console.log('白细胞外渗级联（表内顺序）：');
  for (const [i, c] of cs.entries()) console.log(`  ${i + 1}. ${c.step} ｜ ${c.molecule} ｜ ${c.mechanics}`);
  console.log(`  设计原则：先弱而快降速 ${designRule(doc).slowFirst}，再强而慢定位 ${designRule(doc).strongSecond}。`);
  console.log('');
  console.log('※ 连接分类、骨架归属与级联顺序都从本章正文现抓；换教材后重跑即可复现。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { readDoc, tableRows, junctions, forceTo, permeable, tally, cascade, designRule };
