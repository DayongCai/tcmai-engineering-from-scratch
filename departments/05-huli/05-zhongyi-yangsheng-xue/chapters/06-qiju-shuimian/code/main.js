#!/usr/bin/env node
/**
 * 中医养生学 · 第 6 章 起居作息与睡眠：正文结构自检
 * 正文: departments/05-huli/05-zhongyi-yangsheng-xue/chapters/06-qiju-shuimian/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 起居条目、五劳所伤、分档、失效类型与相位差算术，全部由脚本从正文读入后现算。
 * 手打的数字会在正文修订后静默过期。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 6;
const SLUG = '06-qiju-shuimian';
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
  const tiers = rowsOf(ts, '档');
  const fails = rowsOf(ts, '失效');
  const acts = doc.match(/第[一二三四五六]条，/g) || [];
  const lao = ['久视伤血', '久卧伤气', '久坐伤肉', '久立伤骨', '久行伤筋'];
  const weekly = 2 * 2;
  const yearly = 52 * weekly;
  return {
    hanzi: hanzi(doc),
    sections: sections(doc).length,
    tables: ts.length,
    tiers: tiers.map((r) => r[0]),
    tiersWithBoundary: tiers.filter((r) => r[3] && r[3].length > 0).length,
    fails: fails.length,
    acts: acts.length,
    lao: lao.filter((w) => doc.includes(w)),
    weekly,
    yearly,
    days: (yearly / 24).toFixed(1),
  };
}

function main() {
  const s = analyze();
  console.log('中医养生学 · 第 ' + CHAPTER + ' 章 起居作息与睡眠');
  console.log('');
  console.log('正文 ' + s.hanzi + ' 汉字 · ' + s.sections + ' 节 · ' + s.tables + ' 张表');
  console.log('');
  console.log('起居动作条目：' + s.acts + ' 条');
  console.log('五劳所伤：' + s.lao.join(' / ') + '（' + s.lao.length + ' / 5）');
  console.log('判据分档：' + s.tiers.join(' / '));
  console.log('  每档都写「不能做」：' + s.tiersWithBoundary + ' / ' + s.tiers.length);
  console.log('失效模式：' + s.fails + ' 类');
  console.log('');
  console.log('周末补觉的相位差：每次来回 ' + s.weekly + ' 小时 × 52 周 = ' + s.yearly + ' 小时');
  console.log('折合 ' + s.yearly + ' ÷ 24 ≈ ' + s.days + ' 天');
  console.log('');
  console.log('※ 数字由本章正文现算，正文改动后重跑即可复现。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { analyze, readDoc, CHAPTER, SLUG };
