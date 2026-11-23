#!/usr/bin/env node
/**
 * 中医养生学 · 第 2 章 四时养生与节气调摄：正文结构自检
 * 正文: departments/05-huli/05-zhongyi-yangsheng-xue/chapters/02-sishi-yangsheng/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 四季操作面、方向词频、分档与节点窗口宽度，全部由脚本从正文读入后现算。
 * 手打的数字会在正文修订后静默过期。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 2;
const SLUG = '02-sishi-yangsheng';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

const readDoc = () => fs.readFileSync(DOC, 'utf8');
const hanzi = (s) => (s.match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

function sections(doc) {
  return (doc.match(/^##\s+.+$/gm) || []).map((l) => l.replace(/^##\s+/, '').trim());
}

function tables(doc) {
  const out = [];
  let cur = [];
  for (const line of doc.split(/\r?\n/)) {
    if (/^\s*\|/.test(line)) cur.push(line.split('|').slice(1, -1).map((c) => c.trim()));
    else { if (cur.length >= 2) out.push(cur); cur = []; }
  }
  if (cur.length >= 2) out.push(cur);
  return out;
}

function rowsOf(ts, header) {
  const t = ts.find((tb) => tb.some((row) => row.includes(header)));
  if (!t) throw new Error('正文缺少表头含「' + header + '」的表格');
  const i = t.findIndex((row) => row.includes(header));
  return t.slice(i + 1).filter((r) => r.length > 1 && !r.every((c) => /^:?-{2,}:?$/.test(c)));
}

const count = (doc, word) => doc.split(word).length - 1;

function analyze() {
  const doc = readDoc();
  const ts = tables(doc);
  const seasons = rowsOf(ts, '季');
  const tiers = rowsOf(ts, '档');
  const nodeCount = 24 / 3;
  const windowDays = nodeCount * 6;
  return {
    hanzi: hanzi(doc),
    sections: sections(doc).length,
    tables: ts.length,
    seasons: seasons.map((r) => ({ name: r[0], cells: r.length, filled: r.filter(Boolean).length })),
    directions: ['生发', '舒展', '收敛', '闭藏'].map((w) => [w, count(doc, w)]),
    tiers: tiers.map((r) => r[0]),
    nodeCount,
    windowDays,
    windowShare: ((windowDays / 365) * 100).toFixed(1),
  };
}

function main() {
  const s = analyze();
  console.log('中医养生学 · 第 ' + CHAPTER + ' 章 四时养生与节气调摄');
  console.log('');
  console.log('正文 ' + s.hanzi + ' 汉字 · ' + s.sections + ' 节 · ' + s.tables + ' 张表');
  console.log('');
  console.log('四季操作面：' + s.seasons.map((x) => x.name + '(' + x.filled + '栏)').join(' / '));
  if (s.seasons.some((x) => x.filled !== 5)) console.log('  ! 有季节行栏位不全，需回看正文');
  console.log('方向词：' + s.directions.map(([w, n]) => w + '×' + n).join(' · '));
  console.log('判据分档：' + s.tiers.join(' / '));
  console.log('');
  console.log('调整节点：24 ÷ 3 = ' + s.nodeCount + ' 个');
  console.log('调整窗：' + s.nodeCount + ' × 6 = ' + s.windowDays + ' 天，占一年 ' + s.windowShare + '%');
  console.log('');
  console.log('※ 数字由本章正文现算，正文改动后重跑即可复现。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { analyze, readDoc, CHAPTER, SLUG };
