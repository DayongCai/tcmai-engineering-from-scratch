'use strict';
/**
 * 本课程各章 code/main.js 共用的正文读取器。
 *
 * 只做一件事：把 chapters/<slug>/docs/zh.md 读成可统计的结构。
 * 统计一律截到 `<!-- UNITNOTES:BEGIN` 之前——那一段是
 * scripts/render_zhenduan_unit_notes.js 生成的教材小节落位，属生成产物，
 * 不参与本章的任何计数（生成器重跑不会让本章的数变动）。
 *
 * 依赖：Node.js 标准库。
 */

const fs = require('node:fs');
const path = require('node:path');

const HAN = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const hanzi = (s) => (String(s || '').match(HAN) || []).length;

/** 本章正文（不含生成块） */
function readBody(dir) {
  const raw = fs.readFileSync(path.join(dir, 'docs', 'zh.md'), 'utf8');
  const i = raw.indexOf('<!-- UNITNOTES:BEGIN');
  return i < 0 ? raw : raw.slice(0, i);
}

const isSep = (cells) => cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c) || c === '');

/** 连续的 `|` 行成块：第一行表头，第二行分隔，其余为数据行 */
function tables(body) {
  const lines = String(body).split('\n');
  const out = [];
  let buf = [];
  const flush = () => {
    if (buf.length >= 2 && isSep(buf[1].cells)) {
      out.push({ header: buf[0].cells, rows: buf.slice(2).map((x) => x.cells) });
    }
    buf = [];
  };
  for (const ln of lines) {
    const t = ln.trim();
    if (t.startsWith('|')) {
      const cells = t.replace(/^\|/, '').replace(/\|$/, '').split('|').map((s) => s.trim());
      buf.push({ cells });
    } else flush();
  }
  flush();
  return out;
}

/** 表头含某词的第一张表 */
function tableByHeader(ts, word) {
  return ts.find((t) => t.header.some((h) => h.includes(word))) || { header: [], rows: [] };
}

const sections = (body) => [...String(body).matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());

/** 《书名·篇名》级引文，去重 */
const quotes = (body) => [...new Set([...String(body).matchAll(/《([^》]+)》/g)].map((m) => m[1].trim()))];

/** 某二级节里的编号条目数（`1. ` 开头） */
function numberedItems(body, sectionPrefix) {
  const lines = String(body).split('\n');
  let on = false;
  let n = 0;
  for (const ln of lines) {
    if (/^## /.test(ln)) {
      on = ln.replace(/^##\s*/, '').startsWith(sectionPrefix);
      continue;
    }
    if (on && /^\d+\.\s/.test(ln)) n += 1;
  }
  return n;
}

function grams(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

/** quiz：题量、三段、四选项、解释字数、接地、答案分布 */
function quizSummary(quiz, body) {
  const bag = grams(body);
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stage = { pre: 0, check: 0, post: 0 };
  const items = qs.map((q) => {
    if (stage[q.stage] !== undefined) stage[q.stage] += 1;
    const opts = Array.isArray(q.options) ? q.options : [];
    const right = String(opts[q.correct] || '');
    return {
      stage: q.stage,
      options: opts.length,
      correct: q.correct,
      explainHanzi: hanzi(q.explain || q.explanation),
      grounded: [...grams(right)].filter((g) => bag.has(g)).length,
    };
  });
  return {
    total: qs.length,
    stage,
    items,
    answers: qs.map((q) => q.correct),
    distinctAnswers: new Set(qs.map((q) => q.correct)).size,
    checkGrounded: items.filter((x) => x.stage === 'check' && x.grounded > 0).length,
    minExplain: items.length ? Math.min(...items.map((x) => x.explainHanzi)) : 0,
    allFourOptions: items.every((x) => x.options === 4),
  };
}

/** 一章的通用骨架量：汉字、二级节、表、引文 */
function shape(dir) {
  const body = readBody(dir);
  const ts = tables(body);
  return {
    body,
    tables: ts,
    hanzi: hanzi(body),
    sections: sections(body),
    tableCount: ts.length,
    quotes: quotes(body),
  };
}

module.exports = {
  hanzi,
  readBody,
  tables,
  tableByHeader,
  sections,
  quotes,
  numberedItems,
  grams,
  quizSummary,
  shape,
};
