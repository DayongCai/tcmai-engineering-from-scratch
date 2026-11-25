#!/usr/bin/env node
/**
 * 组织学与胚胎学 · 第 9 章 消化管是同一套四层结构被逐段改装的结果
 *
 *   node code/main.js
 *
 * 正文：chapters/09-xiaohua-xitong/docs/zh.md
 * 习题：chapters/09-xiaohua-xitong/quiz.json
 * 依赖：仅 Node.js 标准库
 *
 * 只读本章正文与本章 quiz 两份材料，不引用外部取数表：正文改了，这里的数字跟着变。
 *   · 规模：汉字、段、节标题、表格张数与每张表的列数／行数
 *   · 底本口径：从正文解析单元数与底本汉字数，算出每节单元数与每单元平均汉字
 *   · 判据词频：本章要盯的术语各出现多少次、合计多少、哪个居首
 *   · quiz：题量、三段分布、选项数、解释长度、答案位置是否打散、check 题能否在正文找到原词
 * 任何一项对不上，说明正文、代码、习题三者已经不同源。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 9;
const SLUG = '09-xiaohua-xitong';
const TITLE = '消化管是同一套四层结构被逐段改装的结果';

/** 本章的判据词：都在正文里出现，数一遍就知道哪几件被反复强调 */
const WATCH = ["黏膜肌层","胃小凹","主细胞","壁细胞","环行皱襞","绒毛","微绒毛","中央乳糜管","潘氏细胞","结肠带","纹状管","泡心细胞","胰岛","肝小叶","门管区","胆小管","窦周隙"];

/* ── 文本口径 ────────────────────────────────────────────────────── */

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const count = (text, term) => String(text).split(term).length - 1;
const num = (s) => Number(String(s).replace(/[,，\s]/g, ''));
const readDoc = () => fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
const docLines = (doc) => String(doc).split(/\r?\n/);

/** 节标题：`## 一、…` */
function sections(doc) {
  return docLines(doc).filter((l) => /^##\s+/.test(l)).map((l) => l.replace(/^##\s+/, '').trim());
}

/** 编号节：`## 一、…` 这种带序号的正文节，不含「代价与边界」「运行与验证」两节收尾 */
function numberedSections(doc) {
  return sections(doc).filter((s) => /^[一二三四五六七八九十]+、/.test(s));
}

/** 段：非空，不以标题、引文、表格行、清单符号或编号起始 */
function paragraphs(doc) {
  return docLines(doc)
    .map((l) => l.trim())
    .filter((l) => l && !/^[#>|]/.test(l) && !/^[-*+]\s/.test(l) && !/^\d+[.、]/.test(l))
    .filter((l) => !l.includes('|'));
}

/** markdown 表格：表头 + 去分隔行的数据行 */
function tables(doc) {
  const ls = docLines(doc);
  const cells = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
  const out = [];
  let i = 0;
  while (i < ls.length) {
    if (/^\s*\|/.test(ls[i])) {
      const block = [];
      while (i < ls.length && /^\s*\|/.test(ls[i])) {
        block.push(ls[i]);
        i += 1;
      }
      const header = cells(block[0]);
      const rows = block.slice(1).filter((l) => !/^\s*\|[\s:|-]+\|\s*$/.test(l)).map(cells);
      out.push({ header, cols: header.length, rows });
    } else {
      i += 1;
    }
  }
  return out;
}

/* ── 本章算术（全部从正文解析） ─────────────────────────────────── */

/** 底本口径：正文首段写「底本 N 个单元、M 汉字」 */
function baseInfo(doc) {
  const m = doc.match(/底本\s*([\d,]+)\s*个单元、\s*([\d,]+)\s*汉字/);
  if (!m) return { units: 0, hanzi: 0 };
  return { units: num(m[1]), hanzi: num(m[2]) };
}

/** 判据词频：按原样计入复合词内的同形片段，所以只作相对比较用 */
function watchStats(doc) {
  const rows = WATCH.map((t) => ({ term: t, n: count(doc, t) }));
  const misses = rows.filter((r) => r.n === 0).map((r) => r.term);
  const total = rows.reduce((s, r) => s + r.n, 0);
  const top = rows.slice().sort((a, b) => b.n - a.n)[0] || { term: '—', n: 0 };
  return {
    rows,
    misses,
    total,
    top,
    lines: [
      '判据词 ' + rows.length + ' 个，正文命中 ' + (rows.length - misses.length) + ' 个，合计 ' + total + ' 次',
      '居首：' + top.term + '（' + top.n + ' 次）',
      misses.length ? '未命中：' + misses.join('、') : '未命中：无',
    ],
  };
}

/* ── quiz：结构 + 接地 ──────────────────────────────────────────── */

/** 正文里 4 字以上的连续汉字片段 */
function grams(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

function quizSummary(quiz, doc) {
  const body = grams(doc);
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stage = { pre: 0, check: 0, post: 0 };
  const items = qs.map((q, i) => {
    if (stage[q.stage] !== undefined) stage[q.stage] += 1;
    const opts = Array.isArray(q.options) ? q.options : [];
    const right = String(opts[q.correct] || '');
    const hit = [...grams(right)].filter((g) => body.has(g));
    const why = q.explain || q.explanation || '';
    return {
      n: i + 1,
      stage: q.stage,
      options: opts.length,
      correct: q.correct,
      explainHanzi: hanzi(why),
      grounded: hit.length,
      sample: hit.slice(0, 3),
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
    badCorrect: items.filter((x) => !(Number.isInteger(x.correct) && x.correct >= 0 && x.correct < 4)).length,
    stageComplete: ['pre', 'check', 'post'].every((s) => stage[s] > 0),
  };
}

/* ── 汇总 ──────────────────────────────────────────────────────── */

function analyze() {
  const doc = readDoc();
  const ts = tables(doc);
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const base = baseInfo(doc);
  const secs = sections(doc);
  const nb = numberedSections(doc);
  return {
    docHanzi: hanzi(doc),
    paragraphs: paragraphs(doc).length,
    sections: secs,
    numbered: nb,
    tables: ts.map((t) => ({ header: t.header, cols: t.cols, rows: t.rows.length })),
    base,
    perSection: nb.length ? base.units / nb.length : 0,
    perUnit: base.units ? Math.round(base.hanzi / base.units) : 0,
    watch: watchStats(doc),
    quiz: quizSummary(quiz, doc),
  };
}

function main() {
  const r = analyze();
  const b = r.base;
  console.log('组织学与胚胎学 第 ' + CHAPTER + ' 章 · ' + TITLE);
  console.log('正文 ' + r.docHanzi.toLocaleString('en-US') + ' 汉字 · ' + r.paragraphs + ' 段 · 节 ' + r.sections.length + ' 个');
  console.log('');
  console.log('结构：');
  for (const s of r.sections) console.log('  ' + s);
  console.log('');
  console.log('表 ' + r.tables.length + ' 张' + (r.tables.length ? '：' : '（本章无表格）'));
  r.tables.forEach((t, i) => console.log('  [' + (i + 1) + '] ' + t.header.join(' / ') + ' —— ' + t.cols + ' 列 × ' + t.rows + ' 行'));
  console.log('');
  console.log('本章算术（全部从正文解析后计算）：');
  console.log('  底本 ' + b.units + ' 单元 / ' + b.hanzi.toLocaleString('en-US') + ' 汉字；正文 ' + r.numbered.length + ' 个编号节 + ' + (r.sections.length - r.numbered.length) + ' 个收尾节');
  console.log('  节均单元 ' + (Number.isInteger(r.perSection) ? r.perSection : r.perSection.toFixed(2)) + ' 个 · 每单元平均 ' + r.perUnit + ' 汉字');
  for (const line of r.watch.lines) console.log('  ' + line);
  console.log('');
  console.log('quiz ' + r.quiz.total + ' 题（pre ' + r.quiz.stage.pre + ' / check ' + r.quiz.stage.check + ' / post ' + r.quiz.stage.post + '）· 答案 ' + r.quiz.answers.join('/'));
  console.log('  check 题接地 ' + r.quiz.checkGrounded + ' 道 · 答案落在 ' + r.quiz.distinctAnswers + ' 个位置 · 最短解释 ' + r.quiz.minExplain + ' 汉字');
  r.quiz.items.forEach((it) => {
    console.log('  第' + it.n + '题 [' + it.stage + '] 选项 ' + it.options + ' · 答案 ' + it.correct + ' · 解释 ' + it.explainHanzi + ' 汉字 · 正文原词 ' + it.grounded + (it.sample.length ? '（' + it.sample.join('、') + '）' : ''));
  });
  console.log('');
  console.log('※ 以上数字由本章正文与 quiz 现算，改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，判读与分档均为课堂约定，不构成诊断依据，也不替代具备资质人员的判断。');
}

if (require.main === module) main();

module.exports = {
  analyze,
  readDoc,
  sections,
  numberedSections,
  paragraphs,
  tables,
  baseInfo,
  watchStats,
  grams,
  hanzi,
  count,
  num,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  WATCH,
  DOC,
  QUIZ,
};
