#!/usr/bin/env node
/**
 * 妇产科护理学 · 第 4 章 分娩期护理 —— 正文口径自测
 * 正文: chapters/04-fenmian-qi/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 只读本章正文：汉字、节、表、段落、词频全部现算；不读教材单元层，也不手打统计数字。
 * 统计对象是这本讲义自己的 docs/zh.md，与临床任何机构的服务量无关。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const TITLE = '产房里最贵的东西不是设备，是"有人在看着"的那几分钟';
const KEYWORDS = ["产程","胎心","出血","交接","观察","记录","宫缩"];

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

const readDoc = () => fs.readFileSync(DOC, 'utf8');

/** 去掉引用块（MOTTO / PROBLEM 段）后的正文行，用于数骨架 */
const bodyLines = (text) => text.split(/\r?\n/).filter((line) => !/^\s*>/.test(line));

const hanzi = (text) => (text.match(HANZI) || []).length;

const hits = (text, word) => String(text).split(word).length - 1;

/** 节（## 标题）、表（分隔行）、段落（既非标题也非表格也非列表的正文行） */
function outline(text) {
  const lines = bodyLines(text);
  const sections = lines.filter((l) => /^##\s+/.test(l)).map((l) => l.replace(/^##\s+/, '').trim());
  const tables = lines.filter((l) => /^\|[\s:|-]+\|\s*$/.test(l)).length;
  const paragraphs = lines.filter(
    (l) => l.trim() && !/^#/.test(l) && !/^\|/.test(l) && !/^\s*[-*]\s/.test(l)
  ).length;
  return { sections, tables, paragraphs };
}

/** 词频：按 KEYWORDS 逐词计出，降序；同数按字面序稳定 */
function freq(text = readDoc(), words = KEYWORDS) {
  return words
    .map((word) => [word, hits(text, word)])
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-Hans-CN'));
}

function stats() {
  const text = readDoc();
  const o = outline(text);
  const f = freq(text);
  const total = hanzi(text);
  const cjkOnly = text.replace(/\s/g, '').length;
  return {
    title: TITLE,
    hanzi: total,
    sections: o.sections,
    tables: o.tables,
    paragraphs: o.paragraphs,
    perSection: o.sections.length ? Math.round(total / o.sections.length) : 0,
    freq: f,
    top: f[0],
    bottom: f[f.length - 1],
    cjkShare: cjkOnly ? total / cjkOnly : 0,
  };
}

function report() {
  const s = stats();
  console.log('═══ ' + s.title + ' ═══');
  console.log(`正文 ${s.hanzi} 汉字 · ${s.sections.length} 节 · ${s.tables} 张表 · ${s.paragraphs} 段 · 平均 ${s.perSection} 字/节`);
  console.log('汉字占非空白字符 ' + (s.cjkShare * 100).toFixed(1) + '%');
  console.log('');
  console.log('节标题：');
  for (const sec of s.sections) console.log('  - ' + sec);
  console.log('');
  console.log('词频（正文出现次数）：');
  for (const [word, n] of s.freq) console.log(`  ${word}：${n}`);
  console.log('');
  console.log(`最重的一词：${s.top[0]}（${s.top[1]} 次）；最轻的一词：${s.bottom[0]}（${s.bottom[1]} 次）`);
  console.log('※ 统计口径：数字由本章 docs/zh.md 现算，改稿后重跑即可复现，不构成诊疗建议。');
}

module.exports = { DOC, TITLE, KEYWORDS, readDoc, bodyLines, hanzi, hits, outline, freq, stats };

if (require.main === module) {
  if (process.argv.includes('--json')) console.log(JSON.stringify(stats()));
  else report();
}
