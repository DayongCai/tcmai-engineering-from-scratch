#!/usr/bin/env node
/**
 * 医学细胞生物学 · 第 10 章 蛋白合成与细胞功能：按图纸装配，再一路过安检
 * 正文: departments/09-jichu/03-yixue-xibao-shengwu-xue/chapters/10-danbaizhi-hecheng-yu-xibao-gongneng/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 密码的分配（64 = 61 + 3）与氨基酸种类从正文取出，再算冗余比——这个比值是「沉默突变」与
 * 「密码子优化」之所以成立的算术基础。核糖体三部位表与分选表也从正文现抓。
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

/** 密码的分配：64 个三联体 = 61 个编码 + 3 个终止；20 种氨基酸 */
function geneticCode(doc) {
  const d = String(doc);
  const total = d.match(/共\s*(\d+)\s*个三联体/);
  const sense = d.match(/(\d+)\s*个编码氨基酸/);
  const stop = d.match(/(\d+)\s*个是终止信号/);
  const aa = d.match(/(\d+)\s*种氨基酸/);
  if (!total || !sense || !stop || !aa) throw new Error('正文里密码分配的数字不全');
  const t = Number(total[1]);
  const s = Number(sense[1]);
  const st = Number(stop[1]);
  const a = Number(aa[1]);
  if (s + st !== t) throw new Error('编码与终止之和不等于总数');
  return {
    codons: t,
    sense: s,
    stop: st,
    aminoAcids: a,
    redundancy: Number((s / a).toFixed(2)),
    stopShare: Number(((st / t) * 100).toFixed(2)),
  };
}

/** 核糖体的三个位点：A 位进、P 位成键、E 位出 */
function ribosomeSites(doc) {
  return tableRows(doc, ['位点', '结合对象', '事件']).map((r) => ({ site: r[0], binds: r[1], event: r[2] }));
}

/** 分选表：目的地 / 地址信号 / 识别机器 / 结果 */
function sorting(doc) {
  return tableRows(doc, ['目的地', '地址信号', '识别机器']).map((r) => ({
    destination: r[0],
    signal: r[1],
    machine: r[2],
    result: r[3],
  }));
}

/** 给目的地查地址信号 */
function signalFor(destination, doc) {
  const list = doc ? sorting(doc) : sorting(readDoc());
  const hit = list.find((s) => s.destination.includes(destination));
  if (!hit) throw new Error('分选表里没有这个目的地: ' + destination);
  return hit;
}

/** 保真度的位置：在合成酶，不在配对规则 */
function fidelity(doc) {
  const d = String(doc);
  return {
    atSynthetase: d.includes('保真度主要靠酶，不靠配对规则'),
    secondCode: d.includes('第二遗传密码'),
    ribozyme: d.includes('肽键形成由 RNA 催化'),
    signalPeptideCleaved: d.includes('信号肽在 N 端，进入 ER 后被切除'),
  };
}

/** 两条降解路的尺度差：一个数量级，处理对象不同 */
function degradation(doc) {
  const d = String(doc);
  return {
    proteasome: d.includes('泛素—蛋白酶体'),
    autophagy: d.includes('自噬—溶酶体'),
    autophagyBasal: d.includes('不是「饿的时候才启动」'),
  };
}

function main() {
  const doc = readDoc();
  const gc = geneticCode(doc);
  const sites = ribosomeSites(doc);
  const table = sorting(doc);

  console.log('医学细胞生物学 · 第 10 章 蛋白合成与细胞功能');
  console.log('');
  console.log(`密码：${gc.codons} 个三联体 = ${gc.sense} 个编码 + ${gc.stop} 个终止；${gc.aminoAcids} 种氨基酸。`);
  console.log(`冗余比：${gc.sense} / ${gc.aminoAcids} = ${gc.redundancy} 倍，终止信号占 ${gc.stopShare}%。`);
  console.log('');
  console.log('核糖体三位点：');
  for (const s of sites) console.log(`  ${s.site} ｜ ${s.binds} ｜ ${s.event}`);
  console.log('');
  console.log('分选（地址写在序列里）：');
  for (const s of table) console.log(`  → ${s.destination} ｜ ${s.signal} ｜ ${s.machine} ｜ ${s.result}`);
  console.log('');
  console.log(`保真度靠合成酶：${fidelity(doc).atSynthetase}；第二遗传密码：${fidelity(doc).secondCode}；肽键由 rRNA 催化：${fidelity(doc).ribozyme}`);
  console.log(`降解两条路：蛋白酶体 ${degradation(doc).proteasome}、自噬 ${degradation(doc).autophagy}、自噬在基础状态也运行 ${degradation(doc).autophagyBasal}`);
  console.log('');
  console.log('※ 密码分配、位点与分选表都从本章正文现抓现算；冗余比只是除法，不含任何测得的速率。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { readDoc, tableRows, geneticCode, ribosomeSites, sorting, signalFor, fidelity, degradation };
