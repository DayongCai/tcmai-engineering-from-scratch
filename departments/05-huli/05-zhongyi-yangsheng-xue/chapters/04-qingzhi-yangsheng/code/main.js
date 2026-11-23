#!/usr/bin/env node
/**
 * 中医养生学 · 第 4 章 情志养生与疏泄：正文结构自检
 * 正文: departments/05-huli/05-zhongyi-yangsheng-xue/chapters/04-qingzhi-yangsheng/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 六气方向出现次数、疏泄四步的实际顺序与分档，全部由脚本从正文读入后现算。
 * 手打的数字会在正文修订后静默过期。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 4;
const SLUG = '04-qingzhi-yangsheng';
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
const byFirstSeen = (doc, words) =>
  words.map((w) => ({ w, at: doc.indexOf(w) })).sort((a, b) => a.at - b.at);

function analyze() {
  const doc = readDoc();
  const ts = tables(doc);
  const qiWords = ['怒则气上', '喜则气缓', '悲则气消', '恐则气下', '惊则气乱', '思则气结'];
  const steps = ['第一步，觉察', '第二步，接纳', '第三步，表达', '第四步，调节'];
  const tiers = rowsOf(ts, '档');
  return {
    hanzi: hanzi(doc),
    sections: sections(doc).length,
    tables: ts.length,
    qi: byFirstSeen(doc, qiWords),
    qiMissing: qiWords.filter((w) => !doc.includes(w)),
    stepOrder: byFirstSeen(doc, steps).map((x) => x.w.replace(/^第.步，/, '')),
    stepMissing: steps.filter((w) => !doc.includes(w)),
    tiers: tiers.map((r) => r[0]),
    tiersWithBoundary: tiers.filter((r) => r[3] && r[3].length > 0).length,
    mention: {
      疏泄: count(doc, '疏泄'),
      转介: count(doc, '转介'),
      自伤: count(doc, '自伤'),
    },
  };
}

function main() {
  const s = analyze();
  console.log('中医养生学 · 第 ' + CHAPTER + ' 章 情志养生与疏泄');
  console.log('');
  console.log('正文 ' + s.hanzi + ' 汉字 · ' + s.sections + ' 节 · ' + s.tables + ' 张表');
  console.log('');
  console.log('六气方向（按正文首次出现排序）：');
  console.log('  ' + s.qi.map((x) => x.w).join(' → '));
  if (s.qiMissing.length) console.log('  ! 缺少：' + s.qiMissing.join('、'));
  console.log('');
  console.log('疏泄四步：' + s.stepOrder.join(' → '));
  if (s.stepMissing.length) console.log('  ! 缺少：' + s.stepMissing.join('、'));
  console.log('判据分档：' + s.tiers.join(' / '));
  console.log('  每档都写「不能做」：' + s.tiersWithBoundary + ' / ' + s.tiers.length);
  console.log('');
  console.log('关键词：疏泄×' + s.mention.疏泄 + ' · 转介×' + s.mention.转介 + ' · 自伤×' + s.mention.自伤);
  console.log('');
  console.log('※ 数字由本章正文现算，正文改动后重跑即可复现。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { analyze, readDoc, CHAPTER, SLUG };
