#!/usr/bin/env node
/**
 * 医学细胞生物学 · 第 7 章 细胞核与染色质：一份随时被翻开的活页
 * 正文: departments/09-jichu/03-yixue-xibao-shengwu-xue/chapters/07-xibaohe-yu-ransezhi/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 核小体的两个数（碱基对数、绕几圈）从正文取出，再算一圈摊到多少碱基对——这一步把「压缩」变成可估算的量。
 * 三级折叠、两种关闭方式的表、Ran 梯度的方向，也都从正文现抓。
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

/** 核小体：缠住多少碱基对、绕几圈 → 一圈摊多少 */
function nucleosome(doc) {
  const d = String(doc);
  const bp = d.match(/约\s*(\d+)\s*个碱基对/);
  const turns = d.match(/绕它约\s*([\d.]+)\s*圈/);
  if (!bp) throw new Error('正文里没有核小体的碱基对数');
  if (!turns) throw new Error('正文里没有绕几圈');
  const basePairs = Number(bp[1]);
  const wraps = Number(turns[1]);
  return { basePairs, wraps, perTurn: Number((basePairs / wraps).toFixed(2)) };
}

/** 三级折叠：正文用「一级：…」「二级：…」「三级：…」标记 */
function tiers(doc) {
  const out = [];
  for (const m of String(doc).matchAll(/\*\*([一二三]级)：([^。*]+)。\*\*/g)) out.push({ level: m[1], name: m[2].trim() });
  if (out.length !== 3) throw new Error('折叠层级不是三级: ' + out.length);
  return out;
}

/** 常染色质与两种异染色质：标志与可逆性 */
function chromatinKinds(doc) {
  return tableRows(doc, ['类型', '状态', '标志', '可逆性']).map((r) => ({
    kind: r[0],
    state: r[1],
    mark: r[2],
    reversible: r[3],
    example: r[4],
  }));
}

/** 可逆的那一类是分化的核心 */
function reversibleKinds(doc) {
  const list = doc ? chromatinKinds(doc) : chromatinKinds(readDoc());
  return list.filter((k) => k.reversible.includes('可逆') && !k.reversible.includes('不可逆')).map((k) => k.kind);
}

/** Ran 梯度：方向不是靠「推」，靠两侧不同的化学状态——谁在哪一侧浓度高 */
function ranGradient(doc) {
  const d = String(doc);
  const inNucleus = d.includes('核内 Ran-GTP 浓度高');
  const inCytoplasm = d.includes('胞质 Ran-GDP 浓度高');
  const releases = d.includes('Ran-GTP 结合输入蛋白使其释放货物');
  if (!inNucleus || !inCytoplasm || !releases) throw new Error('正文里的 Ran 梯度描述不完整');
  return { gtpInNucleus: inNucleus, gdpInCytoplasm: inCytoplasm, releasesCargo: releases };
}

/** 端粒不是「寿命时钟」，它是复制缺陷的补偿装置——因果方向要摆对 */
function telomereLogic(doc) {
  const d = String(doc);
  const m = d.match(/端粒不是「([^」]+)」这种浪漫说法，它是一个具体的([^的]+)的(补偿装置)/);
  if (!m) throw new Error('正文里没有端粒的定性');
  return { notThis: m[1], cause: m[2].trim(), patch: m[3], patchNotCap: d.includes('补偿装置') };
}

/** 核仁三分区：没有膜，靠反应顺序分区 */
function nucleolusZones(doc) {
  const m = String(doc).match(/纤维中心（([^）]*)）、致密纤维组分（([^）]*)）、颗粒组分（([^）]*)）/);
  if (!m) throw new Error('正文里没有核仁的三层');
  return [
    { zone: '纤维中心', duty: m[1] },
    { zone: '致密纤维组分', duty: m[2] },
    { zone: '颗粒组分', duty: m[3] },
  ];
}

function main() {
  const doc = readDoc();
  const n = nucleosome(doc);
  const ts = tiers(doc);
  const ks = chromatinKinds(doc);
  const zones = nucleolusZones(doc);

  console.log('医学细胞生物学 · 第 7 章 细胞核与染色质');
  console.log('');
  console.log(`核小体：${n.basePairs} 个碱基对绕 ${n.wraps} 圈，平均一圈摊到 ${n.perTurn} 个碱基对——压缩比因此可以估算。`);
  console.log('');
  console.log('三级折叠：' + ts.map((t) => `${t.level}（${t.name}）`).join(' → '));
  console.log('');
  console.log('染色质的三种状态：');
  for (const k of ks) console.log(`  ${k.kind} ｜ ${k.mark} ｜ 可逆：${k.reversible} ｜ 例：${k.example}`);
  console.log(`  可逆的那类是分化的核心：${reversibleKinds(doc).join('、')}`);
  console.log('');
  console.log(`Ran 梯度：核内 GTP 高 ${ranGradient(doc).gtpInNucleus}、胞质 GDP 高 ${ranGradient(doc).gdpInCytoplasm}、GTP 结合输入蛋白即释放货物 ${ranGradient(doc).releasesCargo}`);
  console.log(`端粒不是「${telomereLogic(doc).notThis}」，它是${telomereLogic(doc).cause}的补偿装置——补丁，不是设计出来的保护帽。`);
  console.log('');
  console.log('核仁的三层（没有膜，靠反应顺序分区）：');
  for (const z of zones) console.log(`  ${z.zone}：${z.duty}`);
  console.log('');
  console.log('※ 碱基对数、圈数、层级与表格都从本章正文现抓现算；换教材后重跑即可复现。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = {
  readDoc,
  tableRows,
  nucleosome,
  tiers,
  chromatinKinds,
  reversibleKinds,
  ranGradient,
  telomereLogic,
  nucleolusZones,
};
