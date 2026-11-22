#!/usr/bin/env node
/**
 * 骨科影像诊断学 · 第 2 章 正常不是"没有异常"，是知道什么算正常
 * 课程: departments/04-gushang/09-guke-yingxiang-zhenduan/chapters/02-zhengchang-jiepou/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 输出全部从本章 docs/zh.md 现算：汉字数、节数与逐节字数、表格数、《》引文、
 * 加粗判断条数、引言行、代价与边界条数，以及本章判据词在正文里的出现次数。
 * 正文改一个字这里就跟着变；手打的数字会在改稿后静默过期。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 2;
const TITLE = '正常不是"没有异常"，是知道什么算正常';
/** 本章的判据词（判据：先判片能否用，再认骨是否正常）。 */
const KEYWORDS = ['变异', '副骨', '骺板', '对侧', '关节间隙'];

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

/** 读正文。文件不在就报错，不静默兜底。 */
function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

/**
 * 从正文里数：
 *   hanzi     汉字总数（不含标点、数字、拉丁字母）
 *   sections  二级标题（## 开头）及其汉字量、bullet 条数 —— 正文的「节」
 *   tables    Markdown 表格（分隔行 |---| 计一张）
 *   cites     《》引文出现的次数与去重清单
 *   claims    **加粗** 的判断句
 *   quote     以 > 开头的引言行
 *   bounds    「代价与边界」一节的条目数，本章自陈的限界
 */
function analyze(text) {
  const body = String(text || '').replace(/\r\n/g, '\n');
  const lines = body.split('\n');
  const hanzi = (body.match(HANZI) || []).length;

  const sections = [];
  let cur = null;
  for (const line of lines) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) {
      cur = { title: h[1], hanzi: 0, bullets: 0 };
      sections.push(cur);
      continue;
    }
    if (cur) {
      cur.hanzi += (line.match(HANZI) || []).length;
      if (/^-\s+\S/.test(line.trim())) cur.bullets += 1;
    }
  }

  const tables = (body.match(/^\s*\|[\s:|-]+\|\s*$/gm) || []).length;
  const citeHits = [...body.matchAll(/《([^》\n]+)》/g)].map((m) => m[1]);
  const cites = [...new Set(citeHits)];
  const claims = (body.match(/\*\*[^*\n]+\*\*/g) || []).length;
  const quote = lines.filter((l) => /^>\s*\S/.test(l)).length;
  const bounds = sections
    .filter((s) => s.title === '代价与边界')
    .reduce((n, s) => n + s.bullets, 0);

  const keywords = KEYWORDS.map((k) => ({ word: k, hits: body.split(k).length - 1 }));

  return { hanzi, sections, tables, cites, citeCount: citeHits.length, claims, quote, bounds, keywords };
}

/** 标题可能很长，打印时截到固定宽度，免得逐节表错位。 */
function brief(t, w) {
  const width = w || 18;
  return t.length > width ? t.slice(0, width - 1) + '…' : t;
}

/** 汉字按两格宽算，逐节表才对得齐。 */
function dw(s) {
  return [...String(s)].reduce((n, c) => n + (c.charCodeAt(0) > 0x2e7f ? 2 : 1), 0);
}

function main() {
  const a = analyze(read());
  const pick = (fn) =>
    a.sections.reduce((m, s) => (fn(s, m) ? s : m), a.sections[0] || { title: '—', hanzi: 0 });
  const fattest = pick((s, m) => s.hanzi > m.hanzi);
  const thinnest = pick((s, m) => s.hanzi < m.hanzi);
  const kwTop = a.keywords.slice().sort((x, y) => y.hits - x.hits)[0] || { word: '—', hits: 0 };

  console.log('骨科影像诊断学 · 第 ' + CHAPTER + ' 章 ' + TITLE);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log('汉字 ' + a.hanzi + ' 字 · 节 ' + a.sections.length + ' 节 · 表格 ' + a.tables +
    ' 张 · 引文 ' + a.citeCount + ' 条（去重 ' + a.cites.length + ' 部）');
  console.log('');
  console.log('逐节字数：');
  for (const s of a.sections) {
    const share = a.hanzi ? ((s.hanzi / a.hanzi) * 100).toFixed(1) : '0.0';
    const pad = brief(s.title);
    console.log('  ' + pad + ' '.repeat(Math.max(2, 34 - dw(pad))) + String(s.hanzi).padStart(5) + ' 字（' + share + '%）');
  }
  console.log('');
  console.log('最长一节：' + fattest.title + '（' + fattest.hanzi + ' 字）；最短一节：' +
    thinnest.title + '（' + thinnest.hanzi + ' 字）');
  console.log('');
  console.log('判据词出现次数（判据：先判片能否用，再认骨是否正常）：');
  for (const k of a.keywords) console.log('  ' + k.word + '：' + k.hits);
  console.log('  → 命中最多的词：' + kwTop.word + '（' + kwTop.hits + ' 次）');
  console.log('');
  console.log('加粗判断 ' + a.claims + ' 处 · 引言行 ' + a.quote + ' 行 · 代价与边界 ' + a.bounds + ' 条');
  if (a.cites.length) console.log('引文清单：' + a.cites.map((c) => '《' + c + '》').join('、'));
  else console.log('引文清单：（本章正文未引书名）');
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即随之变化；本章讲判据，不构成诊断或治疗意见。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, KEYWORDS, read, analyze };
