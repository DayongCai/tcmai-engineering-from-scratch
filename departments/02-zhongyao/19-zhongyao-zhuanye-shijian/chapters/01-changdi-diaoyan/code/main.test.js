#!/usr/bin/env node
/**
 * 第 1 章 药材市场与产地调研：道地性与商品规格 —— 确定性单元测试
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
  assert.strictEqual(String(CHAPTER), '1');
  assert.strictEqual(meta.n, 1);
  assert.strictEqual(SLUG, '01-changdi-diaoyan');
  assert.strictEqual(meta.title, '药材市场与产地调研：道地性与商品规格');
});

test('本章 2 个单元，单元号与映射逐一对应', () => {
  assert.strictEqual(units.length, 2);
  assert.deepStrictEqual(units.map((u) => u.sub), ["1.1","1.2"]);
  for (const u of units) assert.ok(u.hanzi > 0, `${u.sub} 没有字数`);
});

test('正文 3402 汉字 · 二级节 6 · 表格 2 张（14 行）', () => {
  assert.strictEqual(d.hanzi, 3402);
  assert.strictEqual(d.sections, 6);
  assert.strictEqual(d.tables, 2);
  assert.strictEqual(d.tableRows, 14);
  assert.strictEqual(d.judgments, 12);
  assert.strictEqual(d.failureModes, 5);
});

test('底本层：18882 汉字 · 引书 10 部 15 次 · 数值命中 7 处', () => {
  assert.strictEqual(s.hanzi, 18882);
  assert.strictEqual(s.books, 10);
  assert.strictEqual(s.cites, 15);
  assert.strictEqual(s.values, 7);
});

test('主导取向与主导侧重可复算', () => {
  assert.strictEqual(s.viewTop[0], '记录与考核');
  assert.strictEqual(s.viewTop[1], 63);
  assert.strictEqual(s.levelTop[0], '调研与取样');
  assert.strictEqual(s.levelTop[1], 91);
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

test('每题解释 ≥30 汉字（最短 58）', () => {
  assert.strictEqual(q.minExplain, 58);
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
  assert.ok(out.includes('本章 2 单元 · 18,882 汉字'));
  assert.ok(out.includes('接地 check 3/3'));
  assert.match(out, /教学样例：数字由 standards\/zhongyao-shijian\/units\.json 与本章正文现算/);
  assert.match(out, /不构成药品质量判定、工艺放行或用药建议/);
});
