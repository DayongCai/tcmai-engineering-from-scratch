#!/usr/bin/env node
/**
 * 创伤急救学 · 第 8 章 灾难现场最稀缺的不是技术，是"谁先走"的决定
 * 课程: departments/04-gushang/04-chuangshang-jijiu-xue/chapters/08-zainan-zhuanyun/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 全部数字从本章正文现算：汉字数、节数与逐节字数、表格张数、引文（《》）条数与去重、
 * 加粗判断条数、编号条目数，以及本章赖以立论的几个判断词各出现多少次。
 * 正文改一个字，这里的输出就跟着变；手打的数字会在改稿后静默过期。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 8;
const TITLE = "灾难现场最稀缺的不是技术，是\"谁先走\"的决定";
const FOCUS = ['检伤分类', '转运', '交接', '复盘', '秩序'];

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

/** 读正文。文件不在就报错，不静默兜底。 */
function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

/** 某个词在正文里出现几次（重叠也各算一次）。 */
function countOf(text, term) {
  if (!term) return 0;
  return String(text).split(term).length - 1;
}

/**
 * 从正文里数八组量：
 *   hanzi     汉字总数（不含标点、数字、拉丁字母）
 *   sections  二级标题（## 开头）及其汉字量 —— 正文的「节」
 *   tables    Markdown 表格（分隔行 |---| 计一张）
 *   cites     《》引文条数与去重清单
 *   claims    加粗判断（**…**）条数
 *   numbered  编号条目（1. 2. 3.）条数
 *   quote     以 > 开头的引言行数
 *   focus     本章判断词的词频
 */
function analyze(text) {
  const body = String(text || '').replace(/\r\n/g, '\n');
  const hanzi = (body.match(HANZI) || []).length;

  const lines = body.split('\n');
  const sections = [];
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
  const citeHits = [...body.matchAll(/《([^》\n]+)》/g)].map((m) => m[1]);
  const cites = [...new Set(citeHits)];
  const claims = (body.match(/\*\*[^*\n]+\*\*/g) || []).length;
  const numbered = (body.match(/^\s*\d+\.\s+\S/gm) || []).length;
  const quote = lines.filter((l) => /^>\s*\S/.test(l)).length;

  const focus = {};
  for (const t of FOCUS) focus[t] = countOf(body, t);

  return { hanzi, sections, tables, cites, citeCount: citeHits.length, claims, numbered, quote, focus };
}

/** 词频排序，用于找本章的中心词。 */
function rank(focus) {
  return Object.entries(focus).sort((a, b) => b[1] - a[1]);
}

function main() {
  const a = analyze(read());
  const sorted = rank(a.focus);
  const top = sorted[0] || ['—', 0];
  const thin = a.sections.reduce((m, s) => (s.hanzi < m.hanzi ? s : m), a.sections[0] || { title: '—', hanzi: 0 });

  console.log(`创伤急救学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 表格 ${a.tables} 张 · 引文 ${a.citeCount} 条（去重 ${a.cites.length} 部）`);
  console.log(`加粗判断 ${a.claims} 处 · 编号条目 ${a.numbered} 条 · 引言行 ${a.quote} 行`);
  console.log('');
  console.log('逐节字数：');
  for (const s of a.sections) {
    const share = a.hanzi ? ((s.hanzi / a.hanzi) * 100).toFixed(1) : '0.0';
    console.log(`  ${s.title.padEnd(24, '　')} ${String(s.hanzi).padStart(5)} 字（${share}%）`);
  }
  console.log('');
  console.log(`最短一节：${thin.title}（${thin.hanzi} 字）`);
  console.log('本章判断词词频：');
  for (const [k, v] of sorted) console.log(`  ${k}：${v}`);
  console.log(`  → 出现最多：${top[0]}（${top[1]} 次）`);
  if (a.cites.length) console.log(`引文清单：${a.cites.map((x) => '《' + x + '》').join('、')}`);
  else console.log('引文清单：（本章正文未引书名）');
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即随之变化；不构成急救操作指南，具体处置以所在地区院前规范与接诊机构流程为准。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, FOCUS, read, analyze, rank, countOf };
