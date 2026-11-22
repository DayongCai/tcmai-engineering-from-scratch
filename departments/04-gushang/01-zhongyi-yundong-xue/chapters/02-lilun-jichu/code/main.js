#!/usr/bin/env node
/**
 * 中医运动学 · 第 2 章 运动调的不是肌肉，是气机的升降出入
 * 课程: departments/04-gushang/01-zhongyi-yundong-xue/chapters/02-lilun-jichu/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 输出全部从本章正文现算：汉字数、节数、表格数、引文条数（《》）、加粗判断条数，
 * 以及每一节的汉字量。正文改一个字这里就跟着变；手打的数字会在改稿后静默过期。
 * 本章主题：运动的中医理论框架。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 2;
const TITLE = '运动调的不是肌肉，是气机的升降出入';

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

/** 读正文。文件不在就报错，不静默兜底。 */
function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

/**
 * 从正文里数四件事：
 *   hanzi     汉字总数（不含标点、数字、拉丁字母）
 *   sections  二级标题（## 开头）及其汉字量 —— 正文的「节」
 *   tables    Markdown 表格（分隔行 |---| 计一张）
 *   cites     《》引文出现的次数与去重清单
 * 另附 claims（**加粗** 的判断句）与 quote（以 > 开头的引言行）两笔辅助量。
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

  const tableHits = body.match(/^\s*\|[\s:|-]+\|\s*$/gm) || [];
  const citeHits = [...body.matchAll(/《([^》\n]+)》/g)].map((m) => m[1]);
  const cites = [...new Set(citeHits)];
  const claims = (body.match(/\*\*[^*\n]+\*\*/g) || []).length;
  const quote = lines.filter((l) => /^>\s*\S/.test(l)).length;

  return { hanzi, sections, tables: tableHits.length, cites, citeCount: citeHits.length, claims, quote };
}

function main() {
  const a = analyze(read());
  const pick = (fn) => a.sections.reduce((m, s) => (fn(s, m) ? s : m), a.sections[0] || { title: '—', hanzi: 0 });
  const fattest = pick((s, m) => s.hanzi > m.hanzi);
  const thinnest = pick((s, m) => s.hanzi < m.hanzi);

  console.log(`中医运动学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 表格 ${a.tables} 张 · 引文 ${a.citeCount} 条（去重 ${a.cites.length} 部）`);
  console.log('');
  console.log('逐节字数：');
  for (const s of a.sections) {
    const share = a.hanzi ? ((s.hanzi / a.hanzi) * 100).toFixed(1) : '0.0';
    console.log(`  ${s.title.padEnd(22, '　')} ${String(s.hanzi).padStart(5)} 字（${share}%）`);
  }
  console.log('');
  console.log(`最长一节：${fattest.title}（${fattest.hanzi} 字）；最短一节：${thinnest.title}（${thinnest.hanzi} 字）`);
  console.log(`加粗判断 ${a.claims} 处 · 引言行 ${a.quote} 行`);
  if (a.cites.length) console.log(`引文清单：${a.cites.map((c) => '《' + c + '》').join('、')}`);
  else console.log('引文清单：（本章正文未引书名）');
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即随之变化；不构成诊疗意见，具体习练与禁忌判断以所在机构规范为准。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, analyze };
