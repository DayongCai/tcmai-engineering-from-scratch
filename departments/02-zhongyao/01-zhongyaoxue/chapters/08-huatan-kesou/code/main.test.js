#!/usr/bin/env node
/**
 * 中药学 · 第 8 章 化痰与止咳是两套轴：温寒对半，平性只剩两味
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

test('正文规模与表格：汉字 3101 / 段 30 / 节 7；表 5 张 [6, 6, 4, 4, 3] × [3, 3, 5, 3, 5]', () => {
  const r = m.analyze();
  assert.strictEqual(r.docHanzi, 3101);
  assert.strictEqual(r.paragraphs, 30);
  assert.strictEqual(r.sections.length, 7);
  assert.strictEqual(hanzi(readDoc()), 3101, '汉字口径必须与正文一致');
  assert.deepStrictEqual(r.tables.map((t) => t.cols), [6, 6, 4, 4, 3]);
  assert.deepStrictEqual(r.tables.map((t) => t.rows), [3, 3, 5, 3, 5]);
});

test('本章算术：三节累加与最厚一节', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.secN, 3, 'secN');
  assert.strictEqual(a.herbs, 25, 'herbs');
  assert.strictEqual(a.chantotal, 3251, 'chantotal');
  assert.strictEqual(a.mean, 130, 'mean');
  assert.deepStrictEqual(a.widths, [6, 10, 9], 'widths');
  assert.strictEqual(a.fattest, '21.2 清化热痰', 'fattest');
});

test('本章算术：温寒对半与平性占比', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.filled, 16, 'filled');
  assert.strictEqual(a.wen, 7, 'wen');
  assert.strictEqual(a.han, 7, 'han');
  assert.strictEqual(a.ping, 2, 'ping');
  assert.strictEqual(a.blank, 9, 'blank');
  assert.strictEqual(a.flatShare, 12.5, 'flatShare');
  assert.strictEqual(a.hanZhiWen, 3, 'hanZhiWen');
  assert.strictEqual(a.hanZhiHan, 1, 'hanZhiHan');
  assert.strictEqual(a.hanZhiFlat, 1, 'hanZhiFlat');
});

test('本章算术：归经主经、覆盖缺口与十八反', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.lung, 13, 'lung');
  assert.strictEqual(a.merRows, 5, 'merRows');
  assert.strictEqual(a.covGas, 16, 'covGas');
  assert.strictEqual(a.covGasBlank, 9, 'covGasBlank');
  assert.strictEqual(a.covGasRate, 64, 'covGasRate');
  assert.strictEqual(a.covMer, 17, 'covMer');
  assert.strictEqual(a.covMerBlank, 8, 'covMerBlank');
  assert.strictEqual(a.covMerRate, 68, 'covMerRate');
  assert.strictEqual(a.lungShare, 76.5, 'lungShare');
  assert.strictEqual(a.fanN, 5, 'fanN');
  assert.strictEqual(a.fanRate, 20, 'fanRate');
  assert.strictEqual(a.fanTargets, 2, 'fanTargets');
  assert.strictEqual(a.toxicN, 5, 'toxicN');
});

test('quiz 结构：6 题、三段齐、4 选项、下标合法、答案打散', () => {
  const q = readQuiz();
  assert.strictEqual(q.questions.length, 6);
  assert.deepStrictEqual(q.questions.map((x) => x.correct), [1, 1, 2, 1, 0, 3]);
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

test('quiz 接地与解释：check 接地 3 道，最短解释 61 汉字', () => {
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
  assert.match(out, /第 8 章/);
  assert.match(out, /25/);
});

test('代码头部指向本章目录', () => {
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes('chapters/08-huatan-kesou/docs/zh.md'), '头部注释未指向本章');
});
