#!/usr/bin/env node
/**
 * 机器学习 · 第 2 章 你报的那个数字，可能只是抽样噪声的形状
 * 课程: departments/07-zhineng/16-jiqi-xuexi/chapters/02-moxing-pinggu-yu-xuanze/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本脚本从正文读出评估设定（1,000 例、准确率 0.86、40 组候选、n10/n01），
 * 重算标准误、选择偏差的乐观量、候选表的算术与配对检验统计量，再与正文逐格对账。
 * 对不上就抛错：手打数字会在正文改版后静默过期。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

function readDoc(file = DOC) {
  if (!fs.existsSync(file)) throw new Error('找不到正文: ' + file);
  return fs.readFileSync(file, 'utf8');
}

function need(text, re, label, group = 1) {
  const m = text.match(re);
  if (!m) throw new Error('正文里没找到' + label + '的设定');
  return m[group];
}
const needNum = (t, re, l, g) => Number(need(t, re, l, g));

function parseSetup(doc) {
  const n = Number(need(doc, /演算设定\s*([\d,]+)\s*例的测试集/, '测试集规模').replace(/,/g, ''));
  const acc = needNum(doc, /准确率\s*(0\.\d+)/, '准确率');
  const sigma = needNum(doc, /标准误约为[^$]*\$\\sqrt\{[\s\S]{0,60}?\\approx\s*([\d.]+)/, '标准误');
  const sigma200 = needNum(doc, /200 例时\s*\$\\sigma=\\sqrt\{[\s\S]{0,40}?\\approx\s*([\d.]+)/, '200 例时的标准误');
  const candidates = needNum(doc, /扫了\s*(\d+)\s*组超参/, '候选超参组数');
  const optimistic = needNum(doc, /\$0\.86\+[\d.]+\\times[\d.]+\s*\\approx\s*([\d.]+)/, '调参后的期望');
  const zQuoted = needNum(doc, /\+\s*([\d.]+)\s*\\times\s*0\.011/, '引用的最大值期望');
  const n10 = needNum(doc, /\$n_\{10\}\s*=\s*(\d+)/, 'n10');
  const n01 = needNum(doc, /\$n_\{01\}\s*=\s*(\d+)/, 'n01');
  const chi2 = needNum(doc, /\\chi\^2=\((\d+)-1\)\^2\/\d+\\approx([\d.]+)/, '配对检验统计量', 2);
  const threshold = needNum(doc, /超过\s*([\d.]+)\s*（\$\\alpha=0\.05\$）/, '显著性阈值');
  return { n, acc, sigma, sigma200, candidates, optimistic, zQuoted, n10, n01, chi2, threshold };
}

const stderr = (p, n) => Math.sqrt((p * (1 - p)) / n);
/** 取 k 个候选里的最大值，期望相对均值的上漂量（以百分点计） */
const optimismPoints = (zmax, p, n) => zmax * stderr(p, n) * 100;
const mcnemarChi2 = (n10, n01) => Math.pow(Math.abs(n10 - n01) - 1, 2) / (n10 + n01);

/** 正文表格四列：候选组数 / 最大值期望 / 1,000 例乐观量 / 200 例乐观量 */
function parseCandidatesTable(doc) {
  const rows = [];
  for (const line of doc.split(/\r?\n/)) {
    const m = line.match(/^\|\s*(\d+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*点?\s*\|\s*([\d.]+)\s*点?\s*\|/);
    if (m) rows.push({ k: Number(m[1]), z: Number(m[2]), op1000: Number(m[3]), op200: Number(m[4]) });
  }
  if (rows.length < 4) throw new Error('正文候选表少于 4 行，格式可能已变');
  return rows;
}

function reconcile(doc) {
  const s = parseSetup(doc);
  const rows = [];
  const check = (label, computed, declared, tol) => {
    const ok = Math.abs(computed - declared) <= tol;
    rows.push({ label, computed: Number(computed.toFixed(4)), declared, ok });
    if (!ok) throw new Error(`${label} 对不上：现算 ${computed}，正文写 ${declared}`);
  };

  check('标准误（1,000 例）', Number(stderr(s.acc, s.n).toFixed(3)), s.sigma, 0.0005);
  check('标准误（200 例）', Number(stderr(s.acc, 200).toFixed(3)), s.sigma200, 0.0005);
  check('调参后的期望准确率', Number((s.acc + s.zQuoted * s.sigma).toFixed(3)), s.optimistic, 0.0005);
  check('配对检验统计量', Number(mcnemarChi2(s.n10, s.n01).toFixed(2)), s.chi2, 0.005);

  const table = parseCandidatesTable(doc);
  for (const row of table) {
    check(`候选 ${row.k} 组 · 1,000 例乐观量`, Number(optimismPoints(row.z, s.acc, 1000).toFixed(1)), row.op1000, 0.1);
    check(`候选 ${row.k} 组 · 200 例乐观量`, Number(optimismPoints(row.z, s.acc, 200).toFixed(1)), row.op200, 0.1);
  }

  return { setup: s, rows, table, sigma: stderr(s.acc, s.n), chi2: mcnemarChi2(s.n10, s.n01) };
}

function main() {
  const doc = readDoc();
  const r = reconcile(doc);

  console.log('机器学习 · 第 2 章 你报的那个数字，可能只是抽样噪声的形状');
  console.log('');
  console.log(`演算设定：测试集 ${r.setup.n} 例 · 准确率 ${r.setup.acc} · 候选 ${r.setup.candidates} 组超参`);
  console.log(`标准误 = √(p(1-p)/n) = ${r.sigma.toFixed(4)}（正文写 ${r.setup.sigma}）`);
  console.log(`200 例时 = ${stderr(r.setup.acc, 200).toFixed(4)}（正文写 ${r.setup.sigma200}）`);
  console.log('');
  console.log('选择偏差：候选越多、验证集越小，最大值越乐观');
  console.log('  候选   最大值期望   1,000 例乐观量   200 例乐观量');
  for (const row of r.table) {
    console.log(`  ${String(row.k).padStart(4)}   ${row.z.toFixed(2).padStart(8)}   ${optimismPoints(row.z, r.setup.acc, 1000).toFixed(1).padStart(10)} 点   ${optimismPoints(row.z, r.setup.acc, 200).toFixed(1).padStart(8)} 点`);
  }
  console.log('');
  console.log(`配对检验：n10=${r.setup.n10}、n01=${r.setup.n01}，χ² = ${r.chi2.toFixed(2)}，阈值 ${r.setup.threshold} → ${r.chi2 > r.setup.threshold ? '显著' : '未达显著'}`);
  console.log(`与正文对账 ${r.rows.filter((x) => x.ok).length}/${r.rows.length} 格通过。`);
  console.log('');
  console.log('※ 数值由正文演算设定现算，不手打；表格乐观量用表格自己的最大值期望复算，保证内部算术自洽。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { readDoc, parseSetup, parseCandidatesTable, stderr, optimismPoints, mcnemarChi2, reconcile, DOC };
