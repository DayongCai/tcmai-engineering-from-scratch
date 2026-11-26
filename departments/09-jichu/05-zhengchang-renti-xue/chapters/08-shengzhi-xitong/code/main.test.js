'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const MAIN = path.join(__dirname, 'main.js');
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const {
  chapterKeys,
  chapterUnits,
  summarize,
  analyze,
  sections,
  tables,
  longestHit,
  quizCheck,
  hanzi,
  CHAPTER,
  SLUG,
  MAP,
} = require('./main.js');

const readDoc = () => fs.readFileSync(DOC, 'utf8');

test('本章映射存在且非空', () => {
  const keys = chapterKeys();
  assert.ok(keys.length > 0, 'chapter-map 里本章没有单元');
});

test('单元都能在单元层找到', () => {
  const units = chapterUnits();
  assert.strictEqual(units.length, chapterKeys().length);
  for (const u of units) assert.ok(u.sub && u.hanzi > 0);
});

test('规模与单元层一致', () => {
  const units = chapterUnits();
  const s = summarize(units);
  assert.strictEqual(s.count, units.length);
  assert.strictEqual(s.hanzi, units.reduce((a, b) => a + b.hanzi, 0));
  assert.ok(s.hanzi > 1000, '汉字过少：' + s.hanzi);
});

test('章节号与章映射一致', () => {
  const cm = JSON.parse(fs.readFileSync(MAP, 'utf8')).chapters;
  assert.strictEqual(String(cm[SLUG].n), String(CHAPTER));
});

test('正文规模达标：汉字 >= 2500，二级节 >= 4', () => {
  const doc = readDoc();
  assert.ok(hanzi(doc) >= 2500, '正文汉字 ' + hanzi(doc));
  assert.ok(sections(doc).length >= 4, '二级节 ' + sections(doc).length);
});

test('习题 6 题，pre 1 / check 3 / post 2', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  assert.strictEqual(q.questions.length, 6);
  const st = q.questions.map((x) => x.stage);
  assert.strictEqual(st.filter((x) => x === 'pre').length, 1);
  assert.strictEqual(st.filter((x) => x === 'check').length, 3);
  assert.strictEqual(st.filter((x) => x === 'post').length, 2);
});

test('每题 4 个互异选项，correct 为 0..3 整数', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  for (const [i, it] of q.questions.entries()) {
    assert.strictEqual(it.options.length, 4, '第 ' + (i + 1) + ' 题选项数');
    assert.strictEqual(new Set(it.options).size, 4, '第 ' + (i + 1) + ' 题选项重复');
    assert.ok(Number.isInteger(it.correct) && it.correct >= 0 && it.correct < 4, '第 ' + (i + 1) + ' 题 correct');
  }
});

test('每条解释 40–80 汉字', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  for (const [i, it] of q.questions.entries()) {
    const n = hanzi(it.explain || it.explanation || '');
    assert.ok(n >= 40 && n <= 80, '第 ' + (i + 1) + ' 题解释 ' + n + ' 汉字');
  }
});

test('三道 check 题全部接地，正确选项含 >=6 汉字原文', () => {
  const doc = readDoc();
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const checks = q.questions.filter((x) => x.stage === 'check');
  assert.strictEqual(checks.length, 3);
  for (const it of checks) {
    const hit = longestHit(it.options[it.correct], doc);
    assert.ok(hit >= 6, '正确项引文只有 ' + hit + ' 汉字');
  }
  const r = quizCheck(q, doc);
  assert.deepStrictEqual(r.issues, []);
});

test('体检结论与正文、习题一致', () => {
  const r = analyze();
  assert.ok(r.docHanzi > 2500);
  assert.strictEqual(r.quiz.total, 6);
  assert.strictEqual(r.quiz.grounded, 3);
});

test('脚本可运行：退出 0，并打印体检结论', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.length > 100, '输出过短');
  assert.match(out, /体检全部合格/);
  assert.match(out, /check 题接地 3 道/);
});

test('代码头部指向本章目录', () => {
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes('chapters/08-shengzhi-xitong/docs/zh.md'), '头部注释未指向本章');
});
