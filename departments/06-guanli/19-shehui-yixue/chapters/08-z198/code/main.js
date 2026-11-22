#!/usr/bin/env node
/**
 * 社会医学 · 第 8 章 政策不是文件：从议程到街头的一千次改写
 * 课程: departments/06-guanli/19-shehui-yixue/chapters/08-z198/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 输出全部从本章正文现算：汉字数、节数、表格数、引文条数（《》）、加粗论点条数，
 * 以及每一节的汉字量。改一个字这里就跟着变，手打的数字会在改稿后静默过期。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 8;
const TITLE = '政策不是文件：从议程到街头的一千次改写';

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

/** 读正文。找不到文件就报错，不静默兜底。 */
function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

/**
 * 从正文里数四件事：
 *   hanzi    汉字总数（不含标点、数字、拉丁字母）
 *   sections 二级标题（## ...）及其汉字量 —— 正文的「节」
 *   tables   Markdown 表格（以 |---| 分隔行计，一张表一行）
 *   cites    《》书名引文，去重后给条数与清单
 * 另附 claims（**加粗** 的判断句）与 quote（以 > 开头的引言行）两笔辅助量。
 */
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
  const quote = lines.filter((l) => /^>\s*\S/.test(l)).length;

  return { hanzi, sections, tables, cites, claims, quote };
}

function main() {
  const a = analyze(read());
  const fattest = a.sections.reduce((m, s) => (s.hanzi > m.hanzi ? s : m), a.sections[0] || { title: '—', hanzi: 0 });
  const thinnest = a.sections.reduce((m, s) => (s.hanzi < m.hanzi ? s : m), a.sections[0] || { title: '—', hanzi: 0 });

  console.log(`社会医学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 表格 ${a.tables} 张 · 引文 ${a.cites.length} 条 · 加粗判断 ${a.claims} 处`);
  console.log('');
  console.log('逐节字数：');
  for (const s of a.sections) {
    const share = a.hanzi ? ((s.hanzi / a.hanzi) * 100).toFixed(1) : '0.0';
    console.log(`  ${s.title.padEnd(24, '　')} ${String(s.hanzi).padStart(5)} 字（${share}%）`);
  }
  console.log('');
  console.log(`最长一节：${fattest.title}（${fattest.hanzi} 字）；最短一节：${thinnest.title}（${thinnest.hanzi} 字）`);
  if (a.cites.length) console.log(`引文清单：${a.cites.map((c) => `《${c}》`).join('、')}`);
  else console.log('引文清单：（本章正文未引书名）');
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即随之变化；不构成诊疗意见，也不构成任何地区卫生决策依据。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, analyze };
