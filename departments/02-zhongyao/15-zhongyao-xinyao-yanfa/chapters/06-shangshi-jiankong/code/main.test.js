'use strict';
/**
 * 第 6 章 单测：钉住正文实测值与习题契约
 * 数据源: ../docs/zh.md（正文）、../quiz.json（习题）
 * 期望值来自 2026-11-24 对正文与 quiz 的实测，改正文后必须重跑 main.js 并同步本文件。
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { analyze, SPEC } = require('./main.js');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const MAIN = path.join(__dirname, 'main.js');
const EXPECT = {
  "chapter": 6,
  "floor": 2800,
  "hanzi": 2858,
  "sections": 10,
  "tables": 2,
  "keyRows": 4,
  "keyCols": 3,
  "landmarks": {
    "报告四要素": 1,
    "因果四问": 4,
    "闭环四步": 1
  },
  "judgments": 22,
  "settings": 0,
  "boundaries": 4,
  "questions": 8,
  "correct": [
    3,
    1,
    0,
    2,
    0,
    2,
    1,
    3
  ],
  "keyNames": [
    "时间关系",
    "转归",
    "合并用药与背景",
    "必要检验"
  ]
};

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

/** 正文里 4 字以上连续汉字片段，用于判断习题正确项是否接地 */
function shingles(text, n = 4) {
  const clean = String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ');
  const out = new Set();
  for (const seg of clean.split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

const md = fs.readFileSync(DOC, 'utf8');
const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
const a = analyze(md);

test('章号与正文标题一致', () => {
  assert.strictEqual(a.head.n, EXPECT.chapter);
  assert.ok(a.head.title.length >= 8, '标题过短');
});

test('正文汉字数等于实测值，且不超过 3,400 的压顶上界', () => {
  assert.strictEqual(a.hanzi, EXPECT.hanzi);
  assert.ok(a.hanzi >= EXPECT.floor && a.hanzi <= 3400, `字数越界：${a.hanzi}（下界 ${EXPECT.floor}）`);
});

test('节数与表格数钉实测值', () => {
  assert.strictEqual(a.sectionCount, EXPECT.sections);
  assert.strictEqual(a.tables.length, EXPECT.tables);
});

test('关键表行列与首列条目钉实测值', () => {
  assert.ok(a.keyTable, '没找到本章关键表');
  assert.strictEqual(a.keyTable.rows.length, EXPECT.keyRows);
  assert.strictEqual(a.keyTable.cols, EXPECT.keyCols);
  const names = a.keyTable.rows.map((r) => r[0].replace(/\*\*/g, ''));
  assert.deepStrictEqual(names, EXPECT.keyNames);
});

test('关键条目数钉实测值', () => {
  const got = Object.fromEntries(a.landmarks.map((l) => [l.label, l.n]));
  assert.deepStrictEqual(got, EXPECT.landmarks);
});

test('判据句、教学设定与边界条目数钉实测值', () => {
  assert.strictEqual(a.judgments.length, EXPECT.judgments);
  assert.strictEqual(a.教学设定, EXPECT.settings);
  assert.strictEqual(a.boundaries.length, EXPECT.boundaries);
});

test('习题契约：题量、三段、四选项、解释长度、答案分布', () => {
  const qs = quiz.questions;
  assert.strictEqual(qs.length, EXPECT.questions);
  const stages = new Set(qs.map((q) => q.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), `缺 ${s} 段`);
  for (const q of qs) {
    assert.strictEqual(q.options.length, 4, `四选项：${q.question}`);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4);
    assert.ok(hanzi(q.explain) >= 30, `解释过短（${hanzi(q.explain)} 汉字）：${q.question}`);
  }
  assert.deepStrictEqual(qs.map((q) => q.correct), EXPECT.correct, '答案分布被改动');
});

test('接地：check 题正确项在正文里找得到原词，且不少于 2 道', () => {
  const body = shingles(md);
  let grounded = 0;
  for (const q of quiz.questions.filter((x) => x.stage === 'check')) {
    const right = String(q.options[q.correct] || '');
    if ([...shingles(right)].some((g) => body.has(g))) grounded += 1;
  }
  assert.ok(grounded >= 2, `接地不足：${grounded}`);
});

test('脚本可运行，输出含教学样例与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes('2,858 汉字'), '输出汉字数与实测不符');
  assert.match(out, /教学样例：数字由本章 docs\/zh\.md 现算/);
  assert.match(out, /不构成临床判断依据/);
});

test('代码头部指向本章正文目录', () => {
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes('/chapters/06-shangshi-jiankong/docs/zh.md'), '头部注释未指向本章');
  assert.strictEqual(SPEC.chapter, EXPECT.chapter);
});
