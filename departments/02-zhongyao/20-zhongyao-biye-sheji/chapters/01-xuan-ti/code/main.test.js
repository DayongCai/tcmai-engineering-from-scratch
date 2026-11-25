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
  TITLE,
} = require('./main.js');

/* 以下断言的数值均为 2026-11-24 实测值：正文、quiz 或代码一改，先看这里对不上。 */

test('正文规模与结构是实测值', () => {
  const doc = readDoc();
  assert.strictEqual(hanzi(doc), 2983, '正文汉字');
  assert.strictEqual(tables(doc).length, 3, '表格数');
  assert.strictEqual(chapterKeys().length, 5, '节数');
  assert.ok(hanzi(doc) > 2500, '正文汉字过少：' + hanzi(doc));
});

test('章单元是正文五节，字数与汇总一致', () => {
  const units = chapterUnits();
  const s = summarize(units);
  assert.strictEqual(units.length, 5);
  assert.deepStrictEqual(s.keys, ['一', '二', '三', '四', '五']);
  assert.strictEqual(s.hanzi, units.reduce((a, u) => a + u.hanzi, 0));
  for (const u of units) {
    assert.ok(u.title.length > 4, '节标题过短：' + u.title);
    assert.ok(u.sub.startsWith(String(CHAPTER) + '.'), '单元编号：' + u.sub);
  }
});

test('正文标题与章号、章目录一致', () => {
  const first = readDoc().split(/\r?\n/)[0];
  assert.match(first, new RegExp('^# 第 ' + CHAPTER + ' 章 · ' + TITLE + '$'));
  assert.strictEqual(SLUG, path.basename(path.join(__dirname, '..')));
});

test('本章算术七项全部与正文对得上', () => {
  const doc = readDoc();
  const a = chapterArithmetic(doc, tables(doc));
  assert.deepStrictEqual(
    a.checks.map((c) => c.name),
    ['选题章占比', '样品章占比', '四槽表行数', '节点表行数', '权重合计', '台账字段数', '失效模式数']
  );
  for (const c of a.checks) assert.strictEqual(c.got, c.want, c.name + '：' + c.got + ' ≠ ' + c.want);
});

test('复算占比与正文写下的百分数逐位相同', () => {
  const doc = readDoc();
  const a = chapterArithmetic(doc, tables(doc));
  assert.strictEqual(a.checks[0].got, 16.31, '选题章占比');
  assert.strictEqual(a.checks[1].got, 25.81, '样品章占比');
  assert.deepStrictEqual(a.counts, {
    chapters: 6,
    units: 32,
    total: 83765,
    selHanzi: 13663,
    smpHanzi: 21618,
    fourSlots: 4,
    nodes: 4,
  });
});

test('quiz 结构与三段分布是实测值', () => {
  const r = analyze();
  assert.strictEqual(r.quiz.total, 6);
  assert.deepStrictEqual(r.quiz.stage, { pre: 1, check: 3, post: 2 });
  assert.ok(r.quiz.allFourOptions, '有题不是 4 选项');
  assert.strictEqual(r.quiz.badCorrect, 0, 'correct 下标非法');
  assert.deepStrictEqual(r.quiz.answers, [0, 0, 1, 1, 2, 1]);
  assert.strictEqual(r.quiz.distinctAnswers, 3, '答案位置未打散');
});

test('每题 explain 在 40–120 汉字之间', () => {
  const r = analyze();
  assert.strictEqual(r.quiz.minExplain, 84);
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

test('正确项不集中在同一位置（答案打散）', () => {
  const r = analyze();
  const positions = r.quiz.items.map((x) => x.correct);
  assert.strictEqual(positions.length, r.quiz.total);
  assert.ok(new Set(positions).size >= 3, '答案只落在 ' + new Set(positions).size + ' 个位置');
  assert.ok(positions.every((p) => Number.isInteger(p) && p >= 0 && p < 4));
});

test('脚本可运行、退出码 0、带自检与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /自检通过/);
  assert.match(out, /不构成药品检验结论/);
  assert.match(out, /复算占比 16\.31%/);
});
