#!/usr/bin/env node
/**
 * 中医多模态融合 · 第 6 章：融合的难点不在拼，而在对齐
 * 正文: departments/07-zhineng/13-zhongyi-duomotai-ronghe/chapters/06-u6/docs/zh.md
 * 取数: 解析正文开篇的全模态与缺失条件两组 AUROC，以及模态数与组合数
 * 依赖: 仅 Node.js 标准库
 *
 * 现算：两种条件下的排名、排序是否翻转、缺失造成的跌幅、非空组合数。
 * 排序翻转这个结论由数组比较得出，不是写死的字符串。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

function parseDoc(text) {
  const lines = String(text).split(/\r?\n/);
  const titleLine = lines.find((l) => /^#\s+/.test(l)) || '';
  const heading = titleLine.replace(/^#\s+/, '').trim();
  const chapterNo = Number((heading.match(/第\s*(\d+)\s*章/) || [])[1]) || null;
  const title = heading.replace(/^第\s*\d+\s*章\s*·?\s*/, '');
  const problem = (text.match(/\*\*PROBLEM:\*\*\s*([\s\S]*?)\r?\n\r?\n/) || [])[1] || '';
  const sections = lines.filter((l) => /^##\s+/.test(l)).map((l) => l.replace(/^##\s+/, '').trim());
  const tables = [];
  let cur = null;
  for (const line of lines) {
    const t = line.trim();
    if (!t.startsWith('|')) { cur = null; continue; }
    const cells = t.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;
    if (!cur) { cur = []; tables.push(cur); }
    cur.push(cells);
  }
  const hanzi = (text.match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
  return { text, title, chapterNo, problem, sections, tables, hanzi };
}

const ARMS = ['早期', '中期', '晚期'];

function analyze(doc) {
  const full = doc.problem.match(/早期融合 AUROC\s*([\d.]+)，中期融合\s*([\d.]+)，晚期融合\s*([\d.]+)/);
  const miss = doc.problem.match(/早期融合掉到\s*([\d.]+)，中期掉到\s*([\d.]+)，晚期\s*([\d.]+)/);
  const fullScores = full ? [Number(full[1]), Number(full[2]), Number(full[3])] : [];
  const missScores = miss ? [Number(miss[1]), Number(miss[2]), Number(miss[3])] : [];
  const byLabel = (arr) => Object.fromEntries(ARMS.map((n, i) => [n, arr[i]]));

  const argmax = (arr) => arr.reduce((best, v, i) => (v > arr[best] ? i : best), 0);
  const fullBest = argmax(fullScores);
  const missBest = argmax(missScores);

  const drop = fullScores.map((v, i) => v - missScores[i]);
  const modMatch = doc.text.match(/(\d+)\s*个模态有\s*(\d+)\s*种非空组合/);
  const modalities = modMatch ? Number(modMatch[1]) : NaN;
  const combosStated = modMatch ? Number(modMatch[2]) : NaN;
  const combos = Math.pow(2, modalities) - 1;

  const missingRate = Number((doc.problem.match(/缺失率按演算设定是\s*(\d+)%/) || [])[1]) || NaN;

  return {
    fullScores, missScores,
    full: byLabel(fullScores), miss: byLabel(missScores),
    fullRanking: ARMS.slice().sort((a, b) => byLabel(fullScores)[b] - byLabel(fullScores)[a]),
    missRanking: ARMS.slice().sort((a, b) => byLabel(missScores)[b] - byLabel(missScores)[a]),
    flipped: fullBest !== missBest,
    bestFull: ARMS[fullBest],
    bestMiss: ARMS[missBest],
    drop,
    modalities, combos, combosStated,
    missingRate,
  };
}

function main() {
  const doc = parseDoc(fs.readFileSync(DOC, 'utf8'));
  const a = analyze(doc);

  console.log(`中医多模态融合 · 第 ${doc.chapterNo} 章 ${doc.title}`);
  console.log('');
  console.log(`正文 ${doc.hanzi.toLocaleString('en-US')} 汉字 · ${doc.sections.length} 节 · ${doc.tables.length} 张表`);
  console.log('');
  console.log('全模态：' + ARMS.map((n) => `${n} ${a.full[n]}`).join(' · '));
  console.log('缺失  ' + (Number.isNaN(a.missingRate) ? '' : `(${a.missingRate}%)：`) + ARMS.map((n) => `${n} ${a.miss[n]}`).join(' · '));
  console.log(`  排名：全模态 ${a.fullRanking.join(' > ')}；缺失条件 ${a.missRanking.join(' > ')}`);
  console.log(`  排序是否翻转：${a.flipped ? '是（' + a.bestFull + ' → ' + a.bestMiss + '）' : '否'}`);
  console.log(`  跌幅：` + ARMS.map((n, i) => `${n} −${a.drop[i].toFixed(2)}`).join(' · '));
  console.log('');
  console.log(`${a.modalities} 路模态的非空组合 ${a.combosStated} 种（现算 2^${a.modalities}−1 = ${a.combos}，一致：${a.combos === a.combosStated ? '是' : '否'}）。`);
  console.log('※ 教学样例：数字由本章正文现算，不手打；改正文后重跑即可复现。');
  console.log('※ 本输出不构成临床决策模型的设计规范。');
}

if (require.main === module) main();

module.exports = { DOC, parseDoc, analyze, ARMS };
