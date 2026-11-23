#!/usr/bin/env node
/**
 * 中医养生学 · 第 5 章 运动养生与传统功法：正文结构自检
 * 正文: departments/05-huli/05-zhongyi-yangsheng-xue/chapters/05-yundong-gongfa/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 功法清单、三个运动量、三条动作规矩与分档，全部由脚本从正文读入后现算。
 * 手打的数字会在正文修订后静默过期。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 5;
const SLUG = '05-yundong-gongfa';
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
  const gong = rowsOf(ts, '功法');
  const tiers = rowsOf(ts, '档');
  return {
    hanzi: hanzi(doc),
    sections: sections(doc).length,
    tables: ts.length,
    gong: gong.map((r) => ({ name: r[0], who: r[2] || '', avoid: r[3] || '' })),
    amounts: ['总量', '强度', '频率'].map((w) => [w, count(doc, w)]),
    rules: ['不憋气', '不弹振', '不痛练'].map((w) => [w, count(doc, w)]),
    tiers: tiers.map((r) => r[0]),
    stop: count(doc, '立即停止'),
  };
}

function main() {
  const s = analyze();
  console.log('中医养生学 · 第 ' + CHAPTER + ' 章 运动养生与传统功法');
  console.log('');
  console.log('正文 ' + s.hanzi + ' 汉字 · ' + s.sections + ' 节 · ' + s.tables + ' 张表');
  console.log('');
  console.log('功法清单（' + s.gong.length + ' 套，只排类型不排高低）：');
  for (const g of s.gong) console.log('  ' + g.name + '｜适合：' + g.who);
  const noAvoid = s.gong.filter((g) => !g.avoid).length;
  console.log('  缺「要避开的动作与情形」的行：' + noAvoid);
  console.log('');
  console.log('三个运动量：' + s.amounts.map(([w, n]) => w + '×' + n).join(' · '));
  console.log('三条硬规矩：' + s.rules.map(([w, n]) => w + '×' + n).join(' · '));
  console.log('判据分档：' + s.tiers.join(' / '));
  console.log('停止并就医的表述出现：' + s.stop + ' 处');
  console.log('');
  console.log('※ 数字由本章正文现算，正文改动后重跑即可复现。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { analyze, readDoc, CHAPTER, SLUG };
