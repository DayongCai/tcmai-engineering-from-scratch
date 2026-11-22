#!/usr/bin/env node
/**
 * 卫生法学 · 第 8 章 谁主张谁举证，可病历在谁手里
 * 课程: departments/06-guanli/20-weisheng-fa-xue/chapters/08-f8/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 全部数字从本章正文现算：汉字数、节数与逐节字数、表格数、书名引文、加粗判断，
 * 本章五个判据词的出现次数，以及「义务句 / 宣示句 / 软责任句」三类句式计数。
 * 正文改一个字，这里就跟着变；手打的数字会在改稿后静默过期。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 8;
const TITLE = '谁主张谁举证，可病历在谁手里';

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

/** 本章五个判据词 */
const TERMS = ['举证', '病历', '封存', '过错', '鉴定'];

/** 三类句式：义务句、宣示句、软责任句 */
const MODALS = {
  义务句: ['应当', '不得', '须经'],
  宣示句: ['鼓励', '支持', '推动', '探索'],
  软责任句: ['依法处理'],
};

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

const count = (text, needle) => {
  let n = 0;
  let i = text.indexOf(needle);
  while (i !== -1) {
    n += 1;
    i = text.indexOf(needle, i + needle.length);
  }
  return n;
};

function analyze(text) {
  const body = String(text || '').replace(/\r\n/g, '\n');
  const hanzi = (body.match(HANZI) || []).length;

  const sections = [];
  const lines = body.split('\n');
  let cur = null;
  for (const line of lines) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) {
      cur = { title: h[1], hanzi: 0 };
      sections.push(cur);
      continue;
    }
    if (cur) cur.hanzi += (line.match(HANZI) || []).length;
  }

  const tables = (body.match(/^\s*\|[\s:|-]+\|\s*$/gm) || []).length;
  const cites = [...new Set([...body.matchAll(/《([^》\n]+)》/g)].map((m) => m[1]))];
  const claims = (body.match(/\*\*[^*\n]+\*\*/g) || []).length;

  const terms = {};
  for (const t of TERMS) terms[t] = count(body, t);

  const modals = {};
  for (const [k, arr] of Object.entries(MODALS)) {
    modals[k] = arr.reduce((s, w) => s + count(body, w), 0);
  }

  return { hanzi, sections, tables, cites, claims, terms, modals };
}

/** 判据自检：五词里最高频的那一个，以及它占全篇的密度 */
function keyTerm(a) {
  const sorted = Object.entries(a.terms).sort((x, y) => y[1] - x[1]);
  const [term, times] = sorted[0] || ['—', 0];
  const total = Object.values(a.terms).reduce((s, v) => s + v, 0);
  return { term, times, total, sorted };
}

function main() {
  const a = analyze(read());
  const k = keyTerm(a);
  const per = a.hanzi ? (n) => ((n / a.hanzi) * 1000).toFixed(2) : () => '0.00';
  const first = a.sections[0] || { title: '—', hanzi: 0 };
  const fattest = a.sections.reduce((m, s) => (s.hanzi > m.hanzi ? s : m), first);
  const thinnest = a.sections.reduce((m, s) => (s.hanzi < m.hanzi ? s : m), first);

  console.log(`卫生法学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 表格 ${a.tables} 张 · 书名引文 ${a.cites.length} 条 · 加粗判断 ${a.claims} 处`);
  console.log('');
  console.log('逐节字数：');
  for (const s of a.sections) {
    console.log(`  ${s.title.padEnd(22, '　')} ${String(s.hanzi).padStart(5)} 字（${((s.hanzi / a.hanzi) * 100).toFixed(1)}%）`);
  }
  console.log(`  最长一节：${fattest.title}（${fattest.hanzi} 字）；最短一节：${thinnest.title}（${thinnest.hanzi} 字）`);
  console.log('');
  console.log('本章判据词频（每千汉字）：');
  for (const [t, v] of k.sorted) {
    console.log(`  ${t.padEnd(6, '　')} ${String(v).padStart(3)} 次 · ${per(v)}‰`);
  }
  console.log(`  → 最高频：${k.term}（${k.times} 次，五词合计 ${k.total} 次）`);
  console.log('');
  console.log('句式分布：');
  console.log(`  义务句（应当/不得/须经）      ${a.modals.义务句} 处`);
  console.log(`  宣示句（鼓励/支持/推动/探索）${a.modals.宣示句} 处`);
  console.log(`  软责任句（依法处理）          ${a.modals.软责任句} 处`);
  console.log('  义务句多于宣示句 = 这一章在讲约束；反之在讲方向。');
  console.log('');
  console.log(`引文清单：${a.cites.length ? a.cites.map((x) => `《${x}》`).join('、') : '（本章未引书名）'}`);
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即随之变化；本章讲分析框架，不构成法律意见。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, TERMS, MODALS, read, analyze, keyTerm };
