#!/usr/bin/env node
/**
 * 中医养生学 · 第 8 章 养生干预的效果测量：正文结构自检
 * 正文: departments/05-huli/05-zhongyi-yangsheng-xue/chapters/08-xiaoguo-celiang/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 四类指标、分档、动作条数、失效类型与测量点算术，全部由脚本从正文读入后现算。
 * 手打的数字会在正文修订后静默过期。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 8;
const SLUG = '08-xiaoguo-celiang';
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
  const metrics = rowsOf(ts, '类');
  const tiers = rowsOf(ts, '档');
  const fails = rowsOf(ts, '失效');
  const acts = doc.match(/第[一二三四五]条，/g) || [];
  const times = ['基线', '中途', '终点'].filter((w) => doc.includes(w));
  const points = times.length * metrics.length;
  return {
    hanzi: hanzi(doc),
    sections: sections(doc).length,
    tables: ts.length,
    metrics: metrics.map((r) => r[0]),
    tiers: tiers.map((r) => r[0]),
    fails: fails.length,
    acts: acts.length,
    times,
    points,
    lone: 1,
  };
}

function main() {
  const s = analyze();
  console.log('中医养生学 · 第 ' + CHAPTER + ' 章 养生干预的效果测量');
  console.log('');
  console.log('正文 ' + s.hanzi + ' 汉字 · ' + s.sections + ' 节 · ' + s.tables + ' 张表');
  console.log('');
  console.log('四类指标：' + s.metrics.join(' / ') + '（' + s.metrics.length + ' 类）');
  console.log('三个时点：' + s.times.join(' / ') + '（' + s.times.length + ' 个）');
  console.log('数据点：' + s.times.length + ' × ' + s.metrics.length + ' = ' + s.points + ' 个');
  console.log('只凭一句「感觉不错」：' + s.lone + ' 个点，差 ' + (s.points - s.lone) + ' 个');
  console.log('');
  console.log('判据分档：' + s.tiers.join(' / '));
  console.log('测量动作：' + s.acts + ' 条');
  console.log('失效模式：' + s.fails + ' 类');
  console.log('');
  console.log('※ 数字由本章正文现算，正文改动后重跑即可复现。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { analyze, readDoc, CHAPTER, SLUG };
