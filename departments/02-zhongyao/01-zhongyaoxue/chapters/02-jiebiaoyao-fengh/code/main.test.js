#!/usr/bin/env node
/**
 * 中药学 · 第 2 章 解表药两节的分界是四气，不是「辛能散」
 * 确定性单元测试 —— 运行: node --test code/main.test.js
 *
 * 断言钉的是本机实测值：正文、算术解析或 quiz 任一处改动，这里就应当变红。
 * 数字不从 main.js 回读再自比（那样什么都测不出），而是写在断言里。
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const MAIN = path.join(__dirname, 'main.js');
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const m = require('./main.js');

const readDoc = () => fs.readFileSync(DOC, 'utf8');
const readQuiz = () => JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const grams = (t, n = 4) => {
  const out = new Set();
  for (const seg of String(t || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
};

test('正文规模：汉字 2819 / 段 27 / 节 7', () => {
  const r = m.analyze();
  assert.strictEqual(r.docHanzi, 2819);
  assert.strictEqual(r.paragraphs, 27);
  assert.strictEqual(r.sections.length, 7);
  assert.strictEqual(hanzi(readDoc()), 2819, '汉字口径必须与正文一致');
});

test('表格：3 张，列数 [4,3,4]，行数 [5,7,4]', () => {
  const r = m.analyze();
  assert.deepStrictEqual(r.tables.map((t) => t.cols), [4, 3, 4]);
  assert.deepStrictEqual(r.tables.map((t) => t.rows), [5, 7, 4]);
});

test('本章算术：两节味数与四气填齐数', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.coldN, 12, 'coldN');
  assert.strictEqual(a.heatN, 9, 'heatN');
  assert.strictEqual(a.total, 21, 'total');
  assert.strictEqual(a.coldFill, 9, 'coldFill');
  assert.strictEqual(a.heatFill, 5, 'heatFill');
  assert.strictEqual(a.filled, 14, 'filled');
  assert.strictEqual(a.coverage, 66.7, 'coverage');
  assert.strictEqual(a.disjoint, true, '两节气值集合必须不相交');
});

test('本章算术：辛的分布与错分率', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.coldWen, 9, 'coldWen');
  assert.strictEqual(a.heatCold, 3, 'heatCold');
  assert.strictEqual(a.heatCool, 2, 'heatCool');
  assert.strictEqual(a.xinCold, 9, 'xinCold');
  assert.strictEqual(a.xinHeat, 3, 'xinHeat');
  assert.strictEqual(a.xinAll, 12, 'xinAll');
  assert.strictEqual(a.misread, 21.4, 'misread');
});

test('本章算术：空白味数、剂量跨度与归经偏向', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.blankCold, 3, 'blankCold');
  assert.strictEqual(a.blankHeat, 4, 'blankHeat');
  assert.strictEqual(a.blank, 7, 'blank');
  assert.strictEqual(a.doseMin, 3, 'doseMin');
  assert.strictEqual(a.doseMax, 15, 'doseMax');
  assert.strictEqual(a.doseSpan, 5, 'doseSpan');
  assert.strictEqual(a.bladderBias, 4, 'bladderBias');
  assert.strictEqual(a.liverBias, 4, 'liverBias');
  assert.strictEqual(a.searchCool, 3, 'searchCool');
  assert.strictEqual(a.searchWarm, 4, 'searchWarm');
});

test('quiz 结构：6 题、三段齐、4 选项、下标合法、答案打散', () => {
  const q = readQuiz();
  assert.strictEqual(q.questions.length, 6);
  assert.deepStrictEqual(q.questions.map((x) => x.correct), [1, 0, 2, 1, 2, 3]);
  const distinct = [...new Set(q.questions.map((x) => x.correct))].sort((a, b) => a - b);
  assert.ok(distinct.length >= 3, '答案位置只有 ' + distinct.length + ' 种');
  assert.deepStrictEqual(distinct, [0, 1, 2, 3]);
  const stages = new Set(q.questions.map((x) => x.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), '缺 ' + s + ' 段');
  for (const x of q.questions) {
    assert.ok(['pre', 'check', 'post'].includes(x.stage), 'stage: ' + x.stage);
    assert.strictEqual(x.options.length, 4, x.question);
    assert.ok(Number.isInteger(x.correct) && x.correct >= 0 && x.correct < 4, 'correct 越界: ' + x.question);
    assert.ok(typeof x.explain === 'string' && x.explain.length > 0, '缺 explain: ' + x.question);
  }
});

test('quiz 接地：至少 2 道 check 题的正确选项含正文原词', () => {
  const body = grams(readDoc());
  const q = readQuiz();
  const grounded = q.questions.filter((x) => {
    if (x.stage !== 'check') return false;
    const right = String(x.options[x.correct] || '');
    return [...grams(right)].some((g) => body.has(g));
  });
  assert.ok(grounded.length >= 2, '只接地 ' + grounded.length + ' 道');
  assert.strictEqual(grounded.length, 3, '本章应有 3 道接地 check 题');
  assert.strictEqual(m.analyze().quiz.checkGrounded, grounded.length, 'main.js 与测试口径必须一致');
});

test('quiz 解释：每题 ≥30 汉字，最短 61 汉字', () => {
  const q = readQuiz();
  const lens = q.questions.map((x) => hanzi(x.explain));
  assert.deepStrictEqual(lens.filter((n) => n < 30), [], '有解释不足 30 汉字');
  assert.strictEqual(Math.min(...lens), 61);
  assert.strictEqual(m.analyze().quiz.minExplain, 61);
});

test('脚本可运行：退出码 0，输出带现算声明与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, String(r.stderr));
  const out = String(r.stdout || '');
  assert.ok(out.length > 200, '输出过短');
  assert.match(out, /现算/);
  assert.match(out, /不构成诊疗建议/);
  assert.match(out, /第 2 章/);
  assert.match(out, /21 味/);
});

test('代码头部指向本章目录', () => {
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes('chapters/02-jiebiaoyao-fengh/docs/zh.md'), '头部注释未指向本章');
});
