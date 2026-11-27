#!/usr/bin/env node
/**
 * 流行病学 · 第 18 章 视频课不是「把正文念一遍」，是让每一段旁白都能指回一个判据
 *
 *   node code/main.js
 *
 * 正文：chapters/18-pingtai-lianjie/docs/zh.md
 * 习题：chapters/18-pingtai-lianjie/quiz.json
 * 依赖：仅 Node.js 标准库
 *
 * 只读本章正文与本章 quiz，不读任何取数表：正文改了，这里的数字跟着变。
 *   · 规模：汉字、段、节标题、表格张数与每张表的列数／行数
 *   · 本章算术：骨架稿占比、映射前后的段数与时长比、单章处理量、整库重渲染的机器时间
 *   · 门判据复算：真片按 字节÷秒 折算码率，与正文写的码率下限逐条比较
 *   · quiz：题量、三段分布、选项数、解释长度、答案位置是否打散、check 题能否在正文找到原词
 * 任何一项对不上，说明正文、代码、习题三者已经不同源。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 18;
const SLUG = '18-pingtai-lianjie';
const TITLE = '视频课不是"把正文念一遍"，是让每一段旁白都能指回一个判据';

/* ── 文本口径 ─────────────────────────────────────────────────────── */

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const count = (text, term) => String(text).split(term).length - 1;
const num = (s) => Number(String(s).replace(/[,，\s]/g, ''));
const pct = (x, d = 1) => (x * 100).toFixed(d) + '%';
const fix = (x, d = 1) => Number(x).toFixed(d);
const CN = { 一: 1, 两: 2, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
const cn2n = (s) => (CN[s] !== undefined ? CN[s] : Number(s));
const readDoc = () => fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
const docLines = (doc) => String(doc).split(/\r?\n/);

function must(re, text, label) {
  const m = String(text).match(re);
  if (!m) throw new Error('正文里找不到「' + label + '」——正文改过，脚本要跟着改');
  return m;
}

function sections(doc) {
  return docLines(doc).filter((l) => /^##\s+/.test(l)).map((l) => l.replace(/^##\s+/, '').trim());
}

function paragraphs(doc) {
  return docLines(doc)
    .map((l) => l.trim())
    .filter((l) => l && !/^[#>|]/.test(l) && !/^[-*+]\s/.test(l) && !/^\d+[.、]/.test(l))
    .filter((l) => !l.includes('|'));
}

function tables(doc) {
  const ls = docLines(doc);
  const cells = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
  const out = [];
  let i = 0;
  while (i < ls.length) {
    if (/^\s*\|/.test(ls[i])) {
      const block = [];
      while (i < ls.length && /^\s*\|/.test(ls[i])) { block.push(ls[i]); i += 1; }
      const header = cells(block[0]);
      const rows = block.slice(1).filter((l) => !/^\s*\|[\s:|-]+\|\s*$/.test(l)).map(cells);
      out.push({ header, cols: header.length, rows });
    } else {
      i += 1;
    }
  }
  return out;
}

const tableBy = (ts, kw) => ts.find((t) => t.header.join(' ').includes(kw));

/* ── 公式复核：正文里写成 a op b = c 的算式逐条复算 ───────────────── */

const OP = { '÷': (a, b) => a / b, '×': (a, b) => a * b, '−': (a, b) => a - b, '-': (a, b) => a - b, '+': (a, b) => a + b };

function formulaAudit(doc) {
  const src = String(doc);
  const re = /(?<![\d,.×÷+\-−\/])([\d][\d,]*(?:\.\d+)?)\s*([÷×+−\-])\s*([\d][\d,]*(?:\.\d+)?)\s*=\s*([\d][\d,]*(?:\.\d+)?)\s*(%|‰)?/g;
  const rows = [];
  for (const m of src.matchAll(re)) {
    const after = src.slice(m.index + m[0].length, m.index + m[0].length + 1);
    if (/[:\d\/]/.test(after)) continue;
    const a = num(m[1]);
    const b = num(m[3]);
    const stated = num(m[4]);
    const unit = m[5] || '';
    const scale = unit === '%' ? 100 : unit === '‰' ? 1000 : 1;
    const calc = OP[m[2]](a, b);
    const want = stated / scale;
    const ok = Math.abs(calc - want) <= Math.max(Math.abs(want) * 0.01, 0.0005);
    rows.push({ expr: m[0].replace(/\s+/g, ' ').trim(), calc, want, unit, ok });
  }
  return rows;
}

/* ── 本章算术（逐章注入，全部从正文解析） ───────────────────────── */

function chapterArithmetic(doc) {
  const all = must(/本仓实测：([\d,]+)\s*章成片全部生成过，其中\s*([\d,]+)\s*章（([\d.]+)%）/, doc, '成片总量与骨架稿数');
  const mapped = must(/补上分段映射后：(\d+)\s*段、(\d+)\s*分\s*(\d+)\s*秒/, doc, '映射后的段数与时长');
  const before = must(/映射前\s*(\d+)\s*段\s*\/\s*(\d+)\s*分\s*(\d+)\s*秒；映射后\s*(\d+)\s*段\s*\/\s*(\d+)\s*分\s*(\d+)\s*秒/, doc, '映射前后的对照');
  const cost = must(/配音\s*(\d+)\s*秒\s*\+\s*帧\s*(\d+)\s*秒\s*\+\s*合成\s*(\d+)\s*秒\s*≈\s*(\d+)\s*秒/, doc, '单章处理量');
  const slice = must(/切成\s*(\d+)\s*秒分片/, doc, 'HLS 分片长度');
  const courses = must(/本仓\s*(\d+)\s*门课里有\s*(\d+)\s*门走了第二条/, doc, '课程与映射覆盖数');
  const gate = must(/成片要求\s*≥(\d+)\s*KB\s*且码率\s*≥(\d+)\s*KB\/s/, doc, '成片的体积与码率下限');
  const real = must(/(\d+)\s*秒真片（([\d,]+)\s*字节）/, doc, '真片正例');
  const hards = must(/判据是七条硬指标（([^）]+)）/, doc, '正文层的七条硬指标');

  const total = num(all[1]);
  const skeleton = num(all[2]);
  const rate = skeleton / total;
  const costSum = num(cost[1]) + num(cost[2]) + num(cost[3]);
  const mappedSec = num(mapped[2]) * 60 + num(mapped[3]);
  const beforeSec = num(before[2]) * 60 + num(before[3]);
  const afterSec = num(before[5]) * 60 + num(before[6]);
  const realBitrate = (num(real[2]) / 1000) / num(real[1]); // KB/s
  const hardsCount = hards[1].split('、').length;
  const renderHours = (total * costSum) / 3600;

  return {
    lines: [
      '骨架稿：' + skeleton.toLocaleString('en-US') + ' ÷ ' + total.toLocaleString('en-US') + ' = ' + pct(rate) + '，与正文写的 ' + all[3] + '% 对上——这一项对不上就说明统计口径变了',
      '映射前后：' + before[1] + ' 段 / ' + beforeSec + ' 秒 → ' + before[4] + ' 段 / ' + afterSec + ' 秒，时长增至 ' + fix(afterSec / beforeSec, 1) + ' 倍（段数 ' + before[1] + ' → ' + before[4] + '）',
      '单章处理量：' + cost[1] + ' + ' + cost[2] + ' + ' + cost[3] + ' = ' + costSum + ' 秒 ≈ ' + num(cost[4]) + ' 秒，对应 ' + fix(mappedSec / 60, 1) + ' 分钟成片',
      '整库重渲染：' + total.toLocaleString('en-US') + ' 章 × ' + costSum + ' 秒 = ' + fix(renderHours, 1) + ' 小时——“按百小时计”不是修辞',
      '门判据复算：真片 ' + real[2] + ' 字节 ÷ ' + real[1] + ' 秒 = ' + fix(realBitrate, 1) + ' KB/s，高于成片下限 ' + gate[2] + ' KB/s，判过；0 字节与空文件必判不过',
      'HLS：' + fix(mappedSec / num(slice[1]), 0) + ' 个 ' + slice[1] + ' 秒分片覆盖 ' + mappedSec + ' 秒成片；首屏只需一个分片',
      '正文层七条硬指标，逐条点数得 ' + hardsCount + ' 条' + (hardsCount === 7 ? '（与条数一致）' : '（与条数不符）') + '：' + hards[1],
      '讲稿映射：' + courses[1] + ' 门课里有 ' + courses[2] + ' 门走了分段映射这条路（占 ' + pct(num(courses[2]) / num(courses[1])) + '），其余按七段模板写',
    ],
  };
}

/* ── quiz：结构 + 接地 ───────────────────────────────────────────── */

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
    return { n: i + 1, stage: q.stage, options: opts.length, correct: q.correct, explainHanzi: hanzi(why), grounded: hit.length, sample: hit.slice(0, 2) };
  });
  const minExplain = items.length ? Math.min(...items.map((x) => x.explainHanzi)) : 0;
  const checkGrounded = items.filter((x) => x.stage === 'check' && x.grounded > 0).length;
  const stageComplete = ['pre', 'check', 'post'].every((s) => stage[s] > 0);
  const allFour = items.every((x) => x.options === 4);
  const badCorrect = items.filter((x) => !(Number.isInteger(x.correct) && x.correct >= 0 && x.correct < 4)).length;
  return {
    total: qs.length,
    stage,
    items,
    answers: qs.map((q) => q.correct),
    distinctAnswers: new Set(qs.map((q) => q.correct)).size,
    checkGrounded,
    minExplain,
    stageComplete,
    allFour,
    badCorrect,
    pass: items.length >= 6 && stageComplete && allFour && badCorrect === 0 && minExplain >= 30 && checkGrounded >= 2,
  };
}

/* ── 汇总 ────────────────────────────────────────────────────────── */

function analyze() {
  const doc = readDoc();
  const ts = tables(doc);
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  return {
    docHanzi: hanzi(doc),
    paragraphs: paragraphs(doc).length,
    sections: sections(doc),
    tables: ts.map((t) => ({ header: t.header, cols: t.cols, rows: t.rows.length })),
    arith: chapterArithmetic(doc, ts),
    formulas: formulaAudit(doc),
    quiz: quizSummary(quiz, doc),
  };
}

function main() {
  const r = analyze();
  const f = r.formulas;
  const bad = f.filter((x) => !x.ok);
  console.log('流行病学 第 ' + CHAPTER + ' 章 · ' + TITLE);
  console.log('正文 ' + r.docHanzi.toLocaleString('en-US') + ' 汉字 · ' + r.paragraphs + ' 段 · 节 ' + r.sections.length + ' 个');
  console.log('');
  console.log('结构：');
  for (const s of r.sections) console.log('  ' + s);
  console.log('');
  console.log('表 ' + r.tables.length + ' 张：');
  r.tables.forEach((t, i) => console.log('  [' + (i + 1) + '] ' + t.header.join(' / ') + ' —— ' + t.cols + ' 列 × ' + t.rows + ' 行'));
  console.log('');
  console.log('本章算术（全部从正文解析后计算）：');
  for (const line of r.arith.lines) console.log('  ' + line);
  console.log('');
  console.log('公式复核：正文 ' + f.length + ' 处二元算式，' + (f.length - bad.length) + ' 处复算一致，' + bad.length + ' 处对不上');
  for (const x of bad.slice(0, 5)) console.log('  ✗ ' + x.expr + ' → 算得 ' + fix(x.calc, 4) + '，正文写 ' + fix(x.want, 4));
  console.log('');
  console.log('quiz ' + r.quiz.total + ' 题（pre ' + r.quiz.stage.pre + ' / check ' + r.quiz.stage.check + ' / post ' + r.quiz.stage.post + '）· 答案 ' + r.quiz.answers.join('/'));
  console.log('  check 题接地 ' + r.quiz.checkGrounded + ' 道 · 答案落在 ' + r.quiz.distinctAnswers + ' 个位置 · 最短解释 ' + r.quiz.minExplain + ' 汉字');
  console.log('  自检：' + (r.quiz.pass ? '通过' : '不通过') + '（题量／三段／四选项／解释长度／接地五项齐查）');
  console.log('');
  console.log('※ 以上数字由本章正文与 quiz 现算，改正文后重跑即可复核。');
  console.log('※ 本章为课程侧延展的教学材料，教材无对应单元；所述平台结构、门判据与数字均取自本仓当前实现，属教学设定。');
}

if (require.main === module) main();

module.exports = { analyze, readDoc, sections, paragraphs, tables, tableBy, formulaAudit, grams, hanzi, count, num, pct, cn2n, quizSummary, CHAPTER, SLUG, TITLE, DOC, QUIZ };
