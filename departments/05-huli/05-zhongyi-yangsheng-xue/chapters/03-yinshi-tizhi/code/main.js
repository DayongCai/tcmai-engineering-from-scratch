#!/usr/bin/env node
/**
 * 中医养生学 · 第 3 章 饮食养生与体质配膳：正文结构自检
 * 正文: departments/05-huli/05-zhongyi-yangsheng-xue/chapters/03-yinshi-tizhi/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 九种体质的配膳方向、食忌分类与失效类型，全部由脚本从正文表格读入后现算。
 * 手打的数字会在正文修订后静默过期。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 3;
const SLUG = '03-yinshi-tizhi';
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
  const consts = rowsOf(ts, '体质');
  const taboos = rowsOf(ts, '类别');
  const fails = rowsOf(ts, '失效');
  return {
    hanzi: hanzi(doc),
    sections: sections(doc).length,
    tables: ts.length,
    consts: consts.map((r) => ({ name: r[0], direction: r[2] || '', pit: r[3] || '' })),
    taboos: taboos.map((r) => r[0]),
    fails: fails.length,
  };
}

function main() {
  const s = analyze();
  console.log('中医养生学 · 第 ' + CHAPTER + ' 章 饮食养生与体质配膳');
  console.log('');
  console.log('正文 ' + s.hanzi + ' 汉字 · ' + s.sections + ' 节 · ' + s.tables + ' 张表');
  console.log('');
  console.log('体质配膳方向（' + s.consts.length + ' 种）：');
  for (const c of s.consts) console.log('  ' + c.name + ' → ' + c.direction);
  const noPit = s.consts.filter((c) => !c.pit).length;
  console.log('  缺「最容易踩的坑」的行：' + noPit);
  console.log('');
  console.log('食忌分三类：' + s.taboos.join(' / '));
  console.log('失效模式：' + s.fails + ' 类');
  console.log('');
  console.log('※ 数字由本章正文现算，正文改动后重跑即可复现。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { analyze, readDoc, CHAPTER, SLUG };
