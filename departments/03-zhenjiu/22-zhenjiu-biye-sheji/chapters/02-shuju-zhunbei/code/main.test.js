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
  quizSummary,
  analyze,
  readDoc,
  tables,
  hanzi,
  CHAPTER,
  SLUG,
} = require('./main.js');

test('正文可读且规模像一章', () => {
  const doc = readDoc();
  assert.ok(hanzi(doc) > 1500, '正文汉字过少：' + hanzi(doc));
  assert.ok(tables(doc).length >= 3, '正文表格少于 3 张');
});

test('章键来自正文四节且不重复', () => {
  const keys = chapterKeys();
  assert.ok(keys.length >= 4, '正文四节没解析出来：' + keys.join(','));
  assert.strictEqual(new Set(keys).size, keys.length, '章键重复');
});

test('章单元是正文四节，字数与汇总一致', () => {
  const units = chapterUnits();
  const s = summarize(units);
  assert.strictEqual(units.length, chapterKeys().length);
  assert.strictEqual(s.hanzi, units.reduce((a, u) => a + u.hanzi, 0));
  assert.ok(s.hanzi > 1500, '单元汉字过少：' + s.hanzi);
  for (const u of units) assert.ok(u.title && u.sub.startsWith(String(CHAPTER) + '.'));
});

test('本章算术每项都与正文对得上', () => {
  const doc = readDoc();
  const a = chapterArithmetic(doc, tables(doc));
  assert.ok(a.checks.length >= 3, '算术断言少于 3 项');
  for (const c of a.checks) assert.strictEqual(c.got, c.want, c.name + '：' + c.got + ' ≠ ' + c.want);
});

test('quiz 结构与三段分布合规', () => {
  const r = analyze();
  assert.strictEqual(r.quiz.total, 6, '应为 6 题');
  assert.strictEqual(r.quiz.stage.pre, 1);
  assert.strictEqual(r.quiz.stage.check, 3);
  assert.strictEqual(r.quiz.stage.post, 2);
  assert.ok(r.quiz.allFourOptions, '有题不是 4 选项');
  assert.strictEqual(r.quiz.badCorrect, 0, 'correct 下标非法');
});

test('每题 explain 在 40–80 汉字之间', () => {
  const r = analyze();
  for (const it of r.quiz.items) {
    assert.ok(it.explainHanzi >= 40 && it.explainHanzi <= 80, '第 ' + it.n + ' 题 explain ' + it.explainHanzi + ' 汉字');
  }
});

test('check 题正确项都能在正文找到 ≥6 汉字原句', () => {
  const r = analyze();
  for (const it of r.quiz.items) {
    if (it.stage === 'check') assert.ok(it.hit && it.hit.length >= 6, '第 ' + it.n + ' 题未接地');
  }
  assert.ok(r.quiz.checkGrounded >= 2);
});

test('脚本可运行、退出码 0 且带边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.length > 200, '输出过短');
  assert.match(out, /自检通过/);
  assert.match(out, /不构成医学意见/);
  assert.strictEqual(SLUG, path.basename(path.join(__dirname, '..')));
});
