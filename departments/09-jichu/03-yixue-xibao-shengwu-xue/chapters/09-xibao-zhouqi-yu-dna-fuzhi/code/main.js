#!/usr/bin/env node
/**
 * 医学细胞生物学 · 第 9 章 细胞周期与 DNA 复制：三道闸门加一套计时器
 * 正文: departments/09-jichu/03-yixue-xibao-shengwu-xue/chapters/09-xibao-zhouqi-yu-dna-fuzhi/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 四时期表、CDK–cyclin 表、三道闸门表全从正文现抓。两处算术：
 * 一、周期的可调部分几乎全在 G1——给定周期总长与非 G1 之和，G1 就是差；
 * 二、复制的不对称来自「聚合酶只能单向延伸」，所以两条链必须一条连续、一条分段。
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

/** 四个时期：主要事件 / 长度特征 / 关键判据 */
function phases(doc) {
  return tableRows(doc, ['时期', '主要事件', '长度特征']).map((r) => ({
    phase: r[0],
    event: r[1],
    length: r[2],
    test: r[3],
  }));
}

/** CDK–cyclin 复合物：作用 / 底物 / 被什么抑制 */
function complexes(doc) {
  return tableRows(doc, ['复合物', '主要作用', '底物举例']).map((r) => ({
    complex: r[0],
    role: r[1],
    substrate: r[2],
    inhibitedBy: r[3],
  }));
}

/** 三道闸门：位置 / 问的问题 / 失败后果 */
function gates(doc) {
  return tableRows(doc, ['闸门', '位置', '问的问题']).map((r) => ({
    gate: r[0],
    where: r[1],
    question: r[2],
    failure: r[3],
  }));
}

/** 给一个时期或一句话，找它对应的闸门 */
function gateFor(word, doc) {
  const list = doc ? gates(doc) : gates(readDoc());
  const hit = list.find((g) => g.gate.includes(word) || g.where.includes(word) || g.question.includes(word));
  if (!hit) throw new Error('找不到对应的闸门: ' + word);
  return hit;
}

/** 给一个要进的状态，找驱动它的复合物（按「主要作用」一列匹配） */
function complexFor(roleWord, doc) {
  const list = doc ? complexes(doc) : complexes(readDoc());
  const hit = list.find((c) => c.role.includes(roleWord));
  if (!hit) throw new Error('表里没有这个作用: ' + roleWord);
  return hit;
}

/** G1 = 周期总长 − 非 G1 之和。可调部分几乎全在 G1，所以这个差值才是被信号改写的地方 */
function g1Length(totalHours, nonG1Hours) {
  if (!(totalHours > 0) || !(nonG1Hours >= 0)) throw new Error('时长必须为非负数');
  const g1 = Number((totalHours - nonG1Hours).toFixed(2));
  if (g1 < 0) throw new Error('非 G1 之和超过了周期总长');
  return { total: totalHours, nonG1: nonG1Hours, g1 };
}

/** 复制的三条不可改事实，以及由它们推出的两个后果 */
function replication(doc) {
  const d = String(doc);
  const check = ['半保留', '双向', 'DNA 聚合酶只能沿一个方向延伸'];
  for (const c of check) if (!d.includes(c)) throw new Error('正文里缺复制事实: ' + c);
  return {
    facts: check,
    leadingContinuous: d.includes('前导链可以连续合成'),
    laggingFragmented: d.includes('后随链只能分段合成再连接'),
    okazaki: d.includes('冈崎片段'),
    endProblem: d.includes('线性染色体末端无法被完整复制'),
  };
}

/** p53 的双决定：轻损伤阻滞，重损伤凋亡——同一个分子的两种输出 */
function p53Decision(doc) {
  const d = String(doc);
  if (!d.includes('p53 在 DNA 损伤时转录 p21')) throw new Error('正文里没有 p53–p21 那条线');
  return {
    mild: '停在 G1',
    severe: '启动凋亡',
    switchLike: d.includes('同一个分子在轻度与重度损伤下给出相反的决定'),
  };
}

function main() {
  const doc = readDoc();
  const ph = phases(doc);
  const gs = gates(doc);
  const cs = complexes(doc);
  const g = g1Length(24, 13);

  console.log('医学细胞生物学 · 第 9 章 细胞周期与 DNA 复制');
  console.log('');
  console.log(`正文里读到 ${ph.length} 个时期、${gs.length} 道闸门、${cs.length} 个 CDK–cyclin 复合物。`);
  console.log('');
  console.log('三道闸门各问一个问题：');
  for (const x of gs) console.log(`  ${x.gate}（${x.where}）：${x.question} ｜ 失败：${x.failure}`);
  console.log('');
  console.log('驱动顺序（照表）：');
  for (const c of cs) console.log(`  ${c.complex} ｜ ${c.role} ｜ 抑制：${c.inhibitedBy}`);
  console.log('');
  console.log(`G1 的算法：周期 ${g.total} h、S+G2+M 合计 ${g.nonG1} h，则 G1 = ${g.g1} h——可调的部分几乎全在这里。`);
  console.log(`复制：${replication(doc).facts.join(' / ')}；前导连续 ${replication(doc).leadingContinuous}、后随分段 ${replication(doc).laggingFragmented}；末端复制不全 ${replication(doc).endProblem}`);
  console.log(`p53 的双决定：轻损伤 ${p53Decision(doc).mild}、重损伤 ${p53Decision(doc).severe}；开关式行为 ${p53Decision(doc).switchLike}`);
  console.log('');
  console.log('※ 时期、闸门与复合物都从本章正文现抓；G1 只是减法，不含任何测得的期长。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = {
  readDoc,
  tableRows,
  phases,
  complexes,
  gates,
  gateFor,
  complexFor,
  g1Length,
  replication,
  p53Decision,
};
