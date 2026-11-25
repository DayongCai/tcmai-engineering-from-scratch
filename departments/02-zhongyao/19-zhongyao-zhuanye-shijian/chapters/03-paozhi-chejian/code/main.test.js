#!/usr/bin/env node
/**
 * 第 3 章 炮制车间实践：工艺与质控点 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 钉住的是实测值：正文规模、底本规模、习题题量与接地数。
 * 任何一项被改动（改正文、改习题、换底本），这里先红，逼着重算而不是静默漂移。
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  CHAPTER, SLUG, loadDoc, loadQuiz, chapterUnits, sourceStats, docStats, quizStats,
} = require('./main.js');

const doc = loadDoc();
const quiz = loadQuiz();
const d = docStats(doc);
const { meta, units } = chapterUnits();
const s = sourceStats(units);
const q = quizStats(quiz, doc);

test('章号与章节映射一致', () => {
  assert.strictEqual(String(CHAPTER), '3');
  assert.strictEqual(meta.n, 3);
  assert.strictEqual(SLUG, '03-paozhi-chejian');
  assert.strictEqual(meta.title, '炮制车间实践：工艺与质控点');
});

test('本章 8 个单元，单元号与映射逐一对应', () => {
  assert.strictEqual(units.length, 8);
  assert.deepStrictEqual(units.map((u) => u.sub), ["3.1","3.2","3.3","3.4","3.5","3.6","3.7","3.8"]);
  for (const u of units) assert.ok(u.hanzi > 0, `${u.sub} 没有字数`);
});

test('正文 3952 汉字 · 二级节 7 · 表格 2 张（6 行）', () => {
  assert.strictEqual(d.hanzi, 3952);
  assert.strictEqual(d.sections, 7);
  assert.strictEqual(d.tables, 2);
  assert.strictEqual(d.tableRows, 6);
  assert.strictEqual(d.judgments, 13);
  assert.strictEqual(d.failureModes, 5);
});

test('底本层：28026 汉字 · 引书 6 部 15 次 · 数值命中 0 处', () => {
  assert.strictEqual(s.hanzi, 28026);
  assert.strictEqual(s.books, 6);
  assert.strictEqual(s.cites, 15);
  assert.strictEqual(s.values, 0);
});

test('主导取向与主导侧重可复算', () => {
  assert.strictEqual(s.viewTop[0], '实践与操作');
  assert.strictEqual(s.viewTop[1], 83);
  assert.strictEqual(s.levelTop[0], '工艺与制剂');
  assert.strictEqual(s.levelTop[1], 256);
  for (const [k, v] of Object.entries(s.views)) assert.ok(v <= s.viewTop[1], `${k} 超过主导项`);
  for (const [k, v] of Object.entries(s.levels)) assert.ok(v <= s.levelTop[1], `${k} 超过主导侧重`);
});

test('习题 6 题，三段齐（pre 1／check 3／post 2）', () => {
  assert.strictEqual(q.total, 6);
  assert.strictEqual(q.stages.pre, 1);
  assert.strictEqual(q.stages.check, 3);
  assert.strictEqual(q.stages.post, 2);
  for (const item of quiz.questions) {
    assert.strictEqual((item.options || []).length, 4, `${item.question} 不是 4 选项`);
    assert.ok(Number.isInteger(item.correct) && item.correct >= 0 && item.correct < 4);
  }
});

test('每题解释 ≥30 汉字（最短 57）', () => {
  assert.strictEqual(q.minExplain, 57);
  assert.ok(q.minExplain >= 30);
});

test('接地：3 道 check 题的正确选项能在正文找到原词', () => {
  assert.strictEqual(q.grounded, 3);
  assert.ok(q.grounded >= 2);
});

test('答案打散：正确下标至少落在 3 个不同位置', () => {
  const idx = quiz.questions.map((x) => x.correct);
  assert.ok(new Set(idx).size >= 3, `正确下标过于集中：${idx.join(',')}`);
});

test('代码与习题都不含脚手架字样', () => {
  const code = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
  assert.ok(!/三辨|四位面|单元规模|本章实测/.test(code), 'main.js 含脚手架字样');
  const raw = fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8');
  assert.ok(!/三辨|四位面|单元规模|本章实测/.test(raw), 'quiz.json 含脚手架字样');
});

test('脚本可运行，且末尾两行是教学样例与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes('本章 8 单元 · 28,026 汉字'));
  assert.ok(out.includes('接地 check 3/3'));
  assert.match(out, /教学样例：数字由 standards\/zhongyao-shijian\/units\.json 与本章正文现算/);
  assert.match(out, /不构成药品质量判定、工艺放行或用药建议/);
});
