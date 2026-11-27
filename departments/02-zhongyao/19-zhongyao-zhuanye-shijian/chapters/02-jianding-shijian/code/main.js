#!/usr/bin/env node
/**
 * 中药专业实践 · 第 2 章 鉴定实验室实践：性状与显微鉴定
 * 课程: departments/02-zhongyao/19-zhongyao-zhuanye-shijian/chapters/02-jianding-shijian
 * 取数: 本章 docs/zh.md 与 quiz.json 现算（正文规模、判断层条数、习题接地）；
 *       standards/zhongyao-shijian/units.json 与 chapter-map.json 提供底本层（单元、字数、引书、数值命中）。
 * 依赖: 仅 Node.js 标准库。
 *
 * 数字一律现算，不手打：改正文、改习题或改底本后重跑即可复现，
 * 手打的数字会在改版后静默过期，而静默过期的数字比没有数字更坏。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = '2';
const SLUG = '02-jianding-shijian';
const TITLE = '眼睛先看，显微镜只回答眼睛答不了的那一问';

function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, 'standards', 'zhongyao-shijian', 'units.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/zhongyao-shijian/units.json —— 章节目录是否已脱离仓库？');
}

const ROOT = findRoot(__dirname);
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const read = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const hanzi = (s) => (String(s || '').match(/[\u4e00-\u9fff]/g) || []).length;

/** 正文里的 4 字连续汉字片段集合（与习题对齐门同一口径） */
function shingles(text, n = 4) {
  const clean = String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ');
  const out = new Set();
  for (const seg of clean.split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

const loadDoc = () => read(DOC);
const loadQuiz = () => JSON.parse(read(QUIZ));

/** 本章映射到的底本单元（chapter-map.json → units.json），按单元号排序 */
function chapterUnits() {
  const map = JSON.parse(read(path.join(ROOT, 'standards', 'zhongyao-shijian', 'chapter-map.json'))).chapters;
  if (!map[SLUG]) throw new Error('chapter-map.json 里没有这一章: ' + SLUG);
  const all = JSON.parse(read(path.join(ROOT, 'standards', 'zhongyao-shijian', 'units.json')));
  const units = all.units
    .filter((u) => map[SLUG].units.includes(u.sub))
    .sort((a, b) => a.sub.localeCompare(b.sub, 'en', { numeric: true }));
  return { meta: map[SLUG], units };
}

/** 底本层：单元字数、数值命中、引书、取向与侧重分布 */
function sourceStats(units) {
  let h = 0;
  let values = 0;
  let cites = 0;
  const books = new Set();
  const views = {};
  const levels = {};
  for (const u of units) {
    h += u.hanzi;
    values += (u.measure && u.measure.valueLike) || 0;
    for (const [k, v] of Object.entries((u.measure && u.measure.views) || {})) views[k] = (views[k] || 0) + v;
    for (const [k, v] of Object.entries((u.measure && u.measure.levels) || {})) levels[k] = (levels[k] || 0) + v;
    for (const m of (u.prose || '').matchAll(/《([^》]+)》/g)) { books.add(m[1]); cites += 1; }
  }
  const top = (o) => Object.entries(o).sort((a, b) => b[1] - a[1])[0] || ['—', 0];
  return { hanzi: h, values, cites, books: books.size, views, levels, viewTop: top(views), levelTop: top(levels) };
}

/** 正文层：字数、节数、表格与行数、判断句、教学设定、失效模式 */
function docStats(doc) {
  const lines = doc.split('\n');
  const tables = (doc.match(/^\|---/gm) || []).length;
  const pipes = lines.filter((l) => l.trim().startsWith('|')).length;
  return {
    hanzi: hanzi(doc),
    sections: (doc.match(/^## /gm) || []).length,
    tables,
    tableRows: pipes - tables * 2,
    judgments: (doc.match(/^\*\*/gm) || []).length,
    settings: (doc.match(/【教学设定】/g) || []).length,
    failureModes: (doc.match(/失效/g) || []).length,
  };
}

/** 习题层：题量、三段分布、最短解释、接地 check 题数 */
function quizStats(quiz, doc) {
  const body = shingles(doc);
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stages = { pre: 0, check: 0, post: 0 };
  let checks = 0;
  let grounded = 0;
  let minExplain = Infinity;
  for (const q of qs) {
    stages[q.stage] = (stages[q.stage] || 0) + 1;
    minExplain = Math.min(minExplain, hanzi(q.explanation || q.explain));
    if (q.stage !== 'check') continue;
    checks += 1;
    const right = String((q.options || [])[q.correct] || '');
    if ([...shingles(right)].some((g) => body.has(g))) grounded += 1;
  }
  return { total: qs.length, stages, checks, grounded, minExplain: Number.isFinite(minExplain) ? minExplain : 0 };
}

function report() {
  const doc = loadDoc();
  const quiz = loadQuiz();
  const { meta, units } = chapterUnits();
  return { doc: docStats(doc), source: sourceStats(units), quiz: quizStats(quiz, doc), meta, units };
}

function main() {
  const { doc, source, quiz, meta, units } = report();
  console.log(`中药专业实践 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('');
  console.log(`本章 ${units.length} 单元 · ${source.hanzi.toLocaleString('en-US')} 汉字 · 教材章 ${(meta.srcChapters || []).join('、')}`);
  console.log('');
  console.log('取向分布（单元层 measure.views 求和）：');
  for (const [k, v] of Object.entries(source.views).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}：${v}`);
  }
  console.log(`  → 主导一辨：${source.viewTop[0]}（${source.viewTop[1]}）`);
  console.log('');
  console.log('侧重分布（单元层 measure.levels 求和）：');
  const ltot = Object.values(source.levels).reduce((a, b) => a + b, 0) || 1;
  for (const [k, v] of Object.entries(source.levels).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}：${v}（${((v / ltot) * 100).toFixed(1)}%）`);
  }
  console.log(`  → 主导位面：${source.levelTop[0]}（${source.levelTop[1]}）`);
  console.log('');
  console.log(`引书 ${source.books} 部 / ${source.cites} 次；数值类命中 ${source.values} 处。`);
  console.log('');
  console.log(`正文 ${doc.hanzi} 汉字 · 二级节 ${doc.sections} · 表格 ${doc.tables}（${doc.tableRows} 行）· 判断句 ${doc.judgments} · 教学设定 ${doc.settings} 处`);
  console.log(`失效提示 ${doc.failureModes} 处`);
  console.log('');
  console.log(`习题 ${quiz.total} 题（pre ${quiz.stages.pre}／check ${quiz.stages.check}／post ${quiz.stages.post}）· 最短解释 ${quiz.minExplain} 汉字 · 接地 check ${quiz.grounded}/${quiz.checks}`);
  console.log('');
  console.log('※ 教学样例：数字由 standards/zhongyao-shijian/units.json 与本章正文现算，不手打；改底本或改正文后重跑即可复现。');
  console.log('※ 本输出仅用于教学演示，不构成药品质量判定、工艺放行或用药建议。');

  const ok = quiz.total >= 5 && quiz.stages.pre >= 1 && quiz.stages.check >= 2 && quiz.stages.post >= 1
    && quiz.grounded >= 2 && quiz.minExplain >= 30 && doc.sections >= 4 && doc.hanzi >= 2500;
  if (!ok) {
    console.error('自检未通过：题量、三段、解释长度、接地数或正文规模不达标');
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = {
  CHAPTER, SLUG, TITLE, DOC, QUIZ,
  loadDoc, loadQuiz, chapterUnits, sourceStats, docStats, quizStats, shingles, report,
};
