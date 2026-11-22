#!/usr/bin/env node
/**
 * 医学细胞生物学 · 第 11 章 细胞分化与器官发生：把已有的本事关掉大部分
 * 正文: departments/09-jichu/03-yixue-xibao-shengwu-xue/chapters/11-xibao-fenhua-yu-qiguan-fasheng/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 潜能层级表、干细胞来源表从正文现抓；两个数量（细胞类型数、蛋白编码基因数）也现抓，
 * 再算「类型数比基因数少一个数量级」这句话到底差多少——这个比值是「组合而非专有基因」的算术依据。
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

/** 潜能的四个层级：定义 / 典型细胞 / 能否形成完整个体 */
function potency(doc) {
  return tableRows(doc, ['层级', '定义', '典型细胞']).map((r, i) => ({
    order: i + 1,
    level: r[0],
    definition: r[1],
    examples: r[2],
    wholeOrganism: r[3],
  }));
}

/** 干细胞三种来源：获得方式 / 多能性 / 主要问题 */
function stemCells(doc) {
  return tableRows(doc, ['来源', '获得方式', '多能性']).map((r) => ({
    source: r[0],
    how: r[1],
    potency: r[2],
    problem: r[3],
  }));
}

/** 分化的三条判据：形态、标志物、功能——只有功能不能被染色伪造 */
function criteria(doc) {
  const d = String(doc);
  const a = d.indexOf('判断一个细胞「分化了没有」');
  const b = d.indexOf('三条同时成立');
  if (a < 0 || b < 0) throw new Error('正文里没有分化判据那一段');
  const seg = d.slice(a, b);
  const out = [];
  for (const m of seg.matchAll(/\d\.\s*\*\*([^*]+)\*\*/g)) out.push(m[1].trim());
  if (out.length !== 3) throw new Error('判据不是三条: ' + out.length);
  return out;
}

/** 类型数与基因数的比值：组合空间是分化的主要手段 */
function combinatorics(doc) {
  const d = String(doc);
  const types = d.match(/人体细胞类型常引(两百余)种/);
  const genes = d.match(/蛋白编码基因约(两万)个/);
  if (!types || !genes) throw new Error('正文里没有类型数与基因数');
  const nTypes = 200;
  const nGenes = 20000;
  return {
    types: nTypes,
    genes: nGenes,
    genesPerType: Number((nGenes / nTypes).toFixed(1)),
    typesAreFewer: nTypes < nGenes,
  };
}

/** 表观遗传锁定的四层：甲基化、组蛋白修饰、高级结构、转录因子网络 */
function locks(doc) {
  const d = String(doc);
  const items = ['DNA 甲基化', '组蛋白修饰', '染色质高级结构', '转录因子网络'];
  for (const it of items) if (!d.includes(it)) throw new Error('正文里缺一层锁定: ' + it);
  return { layers: items, ratchet: d.includes('棘轮效应') };
}

/** 器官发生的四件事：分支与腔化、上皮—间充质转化、程序性死亡塑形、血管与神经并入 */
function organSteps(doc) {
  const d = String(doc);
  const a = d.indexOf('一个器官从一团细胞长成有功能的立体结构');
  const b = d.indexOf('## 五、再生与类器官');
  if (a < 0 || b < 0) throw new Error('正文里没有器官发生那一段');
  const seg = d.slice(a, b);
  const out = [];
  for (const m of seg.matchAll(/\d\.\s*\*\*([^*]+)\*\*/g)) out.push(m[1].trim());
  if (out.length !== 4) throw new Error('器官发生的步骤不是四件: ' + out.length);
  return out;
}

function main() {
  const doc = readDoc();
  const p = potency(doc);
  const sc = stemCells(doc);
  const c = combinatorics(doc);

  console.log('医学细胞生物学 · 第 11 章 细胞分化与器官发生');
  console.log('');
  console.log('潜能的四个层级（承诺一次，不再回头）：');
  for (const x of p) console.log(`  ${x.order}. ${x.level} ｜ ${x.examples} ｜ 能形成完整个体：${x.wholeOrganism}`);
  console.log('');
  console.log('分化的三条判据：' + criteria(doc).join(' / ') + '——功能是唯一不能被染色伪造的那一条。');
  console.log('');
  console.log('干细胞的三种来源：');
  for (const s of sc) console.log(`  ${s.source} ｜ ${s.potency} ｜ 主要问题：${s.problem}`);
  console.log('');
  console.log(`算术：细胞类型 ${c.types} 余种、蛋白编码基因约 ${c.genes} 个，基因比类型多约 ${c.genesPerType} 倍——所以靠组合，不靠专有基因。`);
  console.log(`表观锁定的四层：${locks(doc).layers.join('、')}；叠加成棘轮效应：${locks(doc).ratchet}`);
  console.log('');
  console.log('器官发生的四件事：' + organSteps(doc).join(' / '));
  console.log('');
  console.log('※ 层级、来源、判据与步骤都从本章正文现抓；比值只是除法，不含精确计数。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { readDoc, tableRows, potency, stemCells, criteria, combinatorics, locks, organSteps };
