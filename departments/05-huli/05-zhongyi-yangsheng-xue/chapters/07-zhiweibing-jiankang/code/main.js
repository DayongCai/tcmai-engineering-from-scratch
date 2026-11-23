#!/usr/bin/env node
/**
 * 中医养生学 · 第 7 章 治未病与健康管理：正文结构自检
 * 正文: departments/05-huli/05-zhongyi-yangsheng-xue/chapters/07-zhiweibing-jiankang/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 三个层次、人群分层、风险分档与转介信号，全部由脚本从正文读入后现算。
 * 手打的数字会在正文修订后静默过期。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 7;
const SLUG = '07-zhiweibing-jiankang';
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

function analyze() {
  const doc = readDoc();
  const ts = tables(doc);
  const layers = ['未病先防', '既病防变', '瘥后防复'];
  const groups = rowsOf(ts, '人群');
  const tiers = rowsOf(ts, '档');
  const signals = ['体重下降', '持续发热', '夜间痛醒', '吞咽困难', '便血', '硬块'];
  return {
    hanzi: hanzi(doc),
    sections: sections(doc).length,
    tables: ts.length,
    layers: layers
      .map((w) => ({ w, at: doc.indexOf(w) }))
      .sort((a, b) => a.at - b.at)
      .map((x) => x.w),
    groups: groups.map((r) => r[0]),
    tiers: tiers.map((r) => r[0]),
    signals: signals.filter((w) => doc.includes(w)),
    grid: 3 * groups.length * 3,
  };
}

function main() {
  const s = analyze();
  console.log('中医养生学 · 第 ' + CHAPTER + ' 章 治未病与健康管理');
  console.log('');
  console.log('正文 ' + s.hanzi + ' 汉字 · ' + s.sections + ' 节 · ' + s.tables + ' 张表');
  console.log('');
  console.log('三个层次：' + s.layers.join(' → '));
  console.log('人群分层：' + s.groups.join(' / ') + '（' + s.groups.length + ' 类）');
  console.log('风险分档：' + s.tiers.join(' / '));
  console.log('每类人群三步：3 × ' + s.groups.length + ' × 3 = ' + s.grid + ' 个动作');
  console.log('');
  console.log('转介信号命中：' + s.signals.length + ' / 6 · ' + s.signals.join(' / '));
  console.log('低风险档只做生活方式维护，不加补益。');
  console.log('');
  console.log('※ 数字由本章正文现算，正文改动后重跑即可复现。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { analyze, readDoc, CHAPTER, SLUG };
