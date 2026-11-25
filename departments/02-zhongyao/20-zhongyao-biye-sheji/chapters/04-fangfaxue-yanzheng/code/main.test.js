'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const MAIN = path.join(__dirname, 'main.js');
const {
  chapterKeys,
  chapterUnits,
  summarize,
  chapterArithmetic,
  analyze,
  readDoc,
  tables,
  per1k,
  hanzi,
  CHAPTER,
  SLUG,
  TITLE,
} = require('./main.js');

/* 以下断言的数值均为 2026-11-24 实测值：正文、quiz 或代码一改，先看这里对不上。 */

test('正文规模与结构是实测值', () => {
  const doc = readDoc();
  assert.strictEqual(hanzi(doc), 2894, '正文汉字');
  assert.strictEqual(tables(doc).length, 2, '表格数');
  assert.strictEqual(chapterKeys().length, 5, '节数');
});

test('章单元是正文五节，字数与汇总一致', () => {
  const units = chapterUnits();
  const s = summarize(units);
  assert.strictEqual(units.length, 5);
  assert.deepStrictEqual(s.keys, ['一', '二', '三', '四', '五']);
  assert.strictEqual(s.hanzi, units.reduce((a, u) => a + u.hanzi, 0));
  for (const u of units) assert.ok(u.sub.startsWith(String(CHAPTER) + '.'), '单元编号：' + u.sub);
});

test('正文标题与章号、章目录一致', () => {
  assert.strictEqual(readDoc().split(/\r?\n/)[0], '# 第 ' + CHAPTER + ' 章 · ' + TITLE);
  assert.strictEqual(SLUG, path.basename(path.join(__dirname, '..')));
});

test('数字符密度复算落在正文写的「约 41 个／千字」', () => {
  assert.strictEqual(per1k(419, 10239), 41);
  const a = chapterArithmetic(readDoc(), tables(readDoc()));
  assert.strictEqual(a.checks[0].got, 41);
  assert.strictEqual(a.checks[0].want, 41, '正文写的密度');
});

test('本章算术七项全部与正文对得上', () => {
  const doc = readDoc();
  const a = chapterArithmetic(doc, tables(doc));
  assert.strictEqual(a.checks.length, 7);
  for (const c of a.checks) assert.strictEqual(c.got, c.want, c.name + '：' + c.got + ' ≠ ' + c.want);
  assert.deepStrictEqual(a.counts, {
    units: 4,
    total: 10239,
    totalDigits: 419,
    splitAll: 419,
    splitFront: 402,
    tailHanzi: 2431,
    tailDigits: 17,
    paramRows: 8,
    reportItems: 6,
    weightSum: 100,
    examItems: 3,
  });
});

test('quiz 结构与三段分布是实测值', () => {
  const r = analyze();
  assert.strictEqual(r.quiz.total, 6);
  assert.deepStrictEqual(r.quiz.stage, { pre: 1, check: 3, post: 2 });
  assert.ok(r.quiz.allFourOptions, '有题不是 4 选项');
  assert.strictEqual(r.quiz.badCorrect, 0, 'correct 下标非法');
  assert.deepStrictEqual(r.quiz.answers, [2, 3, 1, 0, 2, 1]);
  assert.strictEqual(r.quiz.distinctAnswers, 4, '答案位置未打散');
});

test('每题 explain 在 40–120 汉字之间', () => {
  const r = analyze();
  assert.strictEqual(r.quiz.minExplain, 80);
  assert.strictEqual(r.quiz.maxExplain, 96);
  for (const it of r.quiz.items) {
    assert.ok(it.explainHanzi >= 40 && it.explainHanzi <= 120, '第 ' + it.n + ' 题 explain ' + it.explainHanzi + ' 汉字');
  }
});

test('三道 check 题的正确项都能在正文找到 ≥6 汉字原句', () => {
  const r = analyze();
  assert.strictEqual(r.quiz.checkGrounded, 3);
  for (const it of r.quiz.items) {
    if (it.stage === 'check') assert.ok(it.hit && it.hit.length >= 6, '第 ' + it.n + ' 题未接地');
  }
});

test('脚本可运行、退出码 0、带自检与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /自检通过/);
  assert.match(out, /不构成药品检验结论/);
  assert.match(out, /数字符分账 402（前三节）\+ 17（末节）= 419/);
});
