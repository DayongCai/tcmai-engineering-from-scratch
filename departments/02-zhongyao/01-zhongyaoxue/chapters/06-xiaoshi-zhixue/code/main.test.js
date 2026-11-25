#!/usr/bin/env node
/**
 * 中药学 · 第 6 章 消食、驱虫、止血共用一条判据：东西该不该留
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

test('正文规模与表格：汉字 3061 / 段 33 / 节 6；表 4 张 [7, 4, 7, 4] × [3, 4, 3, 5]', () => {
  const r = m.analyze();
  assert.strictEqual(r.docHanzi, 3061);
  assert.strictEqual(r.paragraphs, 33);
  assert.strictEqual(r.sections.length, 6);
  assert.strictEqual(hanzi(readDoc()), 3061, '汉字口径必须与正文一致');
  assert.deepStrictEqual(r.tables.map((t) => t.cols), [7, 4, 7, 4]);
  assert.deepStrictEqual(r.tables.map((t) => t.rows), [3, 4, 3, 5]);
});

test('本章算术：三章累加与止血章占比', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.chapterN, 3, 'chapterN');
  assert.strictEqual(a.herbs, 24, 'herbs');
  assert.strictEqual(a.chantotal, 2956, 'chantotal');
  assert.strictEqual(a.mean, 123.2, 'mean');
  assert.strictEqual(a.bloodN, 15, 'bloodN');
  assert.strictEqual(a.bloodWords, 1790, 'bloodWords');
  assert.strictEqual(a.bloodShare, 60.6, 'bloodShare');
  assert.strictEqual(a.secN, 4, 'secN');
  assert.strictEqual(a.secHerbs, 15, 'secHerbs');
});

test('本章算术：气分布、空栏与归经差', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.filled, 20, 'filled');
  assert.strictEqual(a.wen, 7, 'wen');
  assert.strictEqual(a.ping, 7, 'ping');
  assert.strictEqual(a.han, 4, 'han');
  assert.strictEqual(a.liang, 2, 'liang');
  assert.strictEqual(a.blank, 4, 'blank');
  assert.strictEqual(a.coverage, 83.3, 'coverage');
  assert.strictEqual(a.flatShare, 35, 'flatShare');
  assert.strictEqual(a.liver, 15, 'liver');
  assert.strictEqual(a.spleen, 11, 'spleen');
  assert.strictEqual(a.gap, 4, 'gap');
});

test('本章算术：味标、编号与剂量跨度', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.tasteLabels, 30, 'tasteLabels');
  assert.strictEqual(a.se, 3, 'se');
  assert.strictEqual(a.locatorN, 6, 'locatorN');
  assert.strictEqual(a.dupN, 9, 'dupN');
  assert.strictEqual(a.doseRatio, 80, 'doseRatio');
});

test('quiz 结构：6 题、三段齐、4 选项、下标合法、答案打散', () => {
  const q = readQuiz();
  assert.strictEqual(q.questions.length, 6);
  assert.deepStrictEqual(q.questions.map((x) => x.correct), [1, 1, 2, 3, 0, 2]);
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

test('quiz 接地与解释：check 接地 3 道，最短解释 56 汉字', () => {
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
  assert.strictEqual(Math.min(...lens), 56);
  assert.strictEqual(m.analyze().quiz.minExplain, 56);
});

test('脚本可运行：退出码 0，输出带现算声明与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, String(r.stderr));
  const out = String(r.stdout || '');
  assert.ok(out.length > 200, '输出过短');
  assert.match(out, /现算/);
  assert.match(out, /不构成诊疗建议/);
  assert.match(out, /第 6 章/);
  assert.match(out, /24/);
});

test('代码头部指向本章目录', () => {
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes('chapters/06-xiaoshi-zhixue/docs/zh.md'), '头部注释未指向本章');
});
