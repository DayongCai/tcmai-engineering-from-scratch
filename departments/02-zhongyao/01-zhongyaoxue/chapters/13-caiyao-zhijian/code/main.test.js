#!/usr/bin/env node
/**
 * 中药学 · 第 13 章 五道闸算出 3.341 分：四道是常数，只有炮制在动
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

test('正文规模与表格：汉字 3399 / 段 51 / 节 6；表 3 张 [6, 5, 4] × [5, 5, 5]', () => {
  const r = m.analyze();
  assert.strictEqual(r.docHanzi, 3399);
  assert.strictEqual(r.paragraphs, 51);
  assert.strictEqual(r.sections.length, 6);
  assert.strictEqual(hanzi(readDoc()), 3399, '汉字口径必须与正文一致');
  assert.deepStrictEqual(r.tables.map((t) => t.cols), [6, 5, 4]);
  assert.deepStrictEqual(r.tables.map((t) => t.rows), [5, 5, 5]);
});

test('本章算术：五章节数与字数', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.chapterN, 5, 'chapterN');
  assert.strictEqual(a.secTotal, 26, 'secTotal');
  assert.strictEqual(a.chantotal, 4266, 'chantotal');
  assert.strictEqual(a.mean, 164.1, 'mean');
});

test('本章算术：五道闸与平均分', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.gateN, 5, 'gateN');
  assert.deepStrictEqual(a.gateIds, ['G1', 'G2', 'G3', 'G4', 'G5'], 'gateIds');
  assert.strictEqual(a.passSum, 959, 'passSum');
  assert.strictEqual(a.meanPassed, 3.341, 'meanPassed');
  assert.strictEqual(a.meanScore, 0.668, 'meanScore');
  assert.deepStrictEqual(a.movingGate, ['G2 36.6%'], 'movingGate');
  assert.strictEqual(a.zeroGateN, 1, 'zeroGateN');
  assert.strictEqual(a.flatGateN, 3, 'flatGateN');
});

test('本章算术：得分分布与剂量窄带', () => {
  const a = m.analyze().arith;
  assert.deepStrictEqual(a.distRows.map((r) => r.n), [103, 179, 5], 'distRows');
  assert.strictEqual(a.distTotal, 287, 'distTotal');
  assert.strictEqual(a.identity, 280, 'identity');
  assert.strictEqual(a.exceptions, 7, 'exceptions');
  assert.strictEqual(a.narrow, 216, 'narrow');
  assert.strictEqual(a.narrowRate, 76.3, 'narrowRate');
  assert.strictEqual(a.topN, 9, 'topN');
  assert.strictEqual(a.pairN, 40, 'pairN');
  assert.strictEqual(a.bothIn, 21, 'bothIn');
  assert.strictEqual(a.written, 1, 'written');
});

test('quiz 结构：6 题、三段齐、4 选项、下标合法、答案打散', () => {
  const q = readQuiz();
  assert.strictEqual(q.questions.length, 6);
  assert.deepStrictEqual(q.questions.map((x) => x.correct), [0, 1, 2, 3, 1, 2]);
  const distinct = [...new Set(q.questions.map((x) => x.correct))].sort((a, b) => a - b);
  assert.ok(distinct.length >= 3, '答案位置只有 ' + distinct.length + ' 种');
  assert.deepStrictEqual(distinct, [0, 1, 2, 3]);
  const stages = new Set(q.questions.map((x) => x.stage));
  for (const s of ['pre', 'check', 'post']) assert.strictEqual(stages.has(s), true, '缺 ' + s + ' 段');
  for (const x of q.questions) {
    assert.strictEqual(['pre', 'check', 'post'].includes(x.stage), true, 'stage: ' + x.stage);
    assert.strictEqual(x.options.length, 4, x.question);
    assert.strictEqual(Number.isInteger(x.correct) && x.correct >= 0 && x.correct < 4, true, 'correct 越界: ' + x.question);
    assert.strictEqual(typeof x.explain === 'string' && x.explain.length > 0, true, '缺 explain: ' + x.question);
  }
});

test('quiz 接地与解释：check 接地 3 道，最短解释 50 汉字', () => {
  const body = grams(readDoc());
  const q = readQuiz();
  const grounded = q.questions.filter((x) => {
    if (x.stage !== 'check') return false;
    const right = String(x.options[x.correct] || '');
    return [...grams(right)].some((g) => body.has(g));
  });
  assert.ok(grounded.length >= 2, '只接地 ' + grounded.length + ' 道');
  assert.strictEqual(grounded.length, 3);
  assert.strictEqual(m.analyze().quiz.checkGrounded, grounded.length, 'main.js 与测试口径必须一致');
  const lens = q.questions.map((x) => hanzi(x.explain));
  assert.deepStrictEqual(lens.filter((n) => n < 30), [], '有解释不足 30 汉字');
  assert.strictEqual(Math.min(...lens), 50);
  assert.strictEqual(m.analyze().quiz.minExplain, 50);
});

test('脚本可运行：退出码 0，输出带现算声明与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, String(r.stderr));
  const out = String(r.stdout || '');
  assert.ok(out.length > 200, '输出过短');
  assert.match(out, /现算/);
  assert.match(out, /不构成诊疗建议/);
  assert.match(out, /第 13 章/);
  assert.match(out, /3.341/);
});

test('代码头部指向本章目录', () => {
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes('chapters/13-caiyao-zhijian/docs/zh.md'), '头部注释未指向本章');
});
