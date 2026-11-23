#!/usr/bin/env node
/**
 * 中医基础理论 · 第 8 章 治则不是八个字的目录，是八条各带「何时不能用」的判据
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

test('正文规模：汉字 2826 / 段 22 / 节 6', () => {
  const r = m.analyze();
  assert.strictEqual(r.docHanzi, 2826);
  assert.strictEqual(r.paragraphs, 22);
  assert.strictEqual(r.sections.length, 6);
  assert.strictEqual(hanzi(readDoc()), 2826, '汉字口径必须与正文一致');
});

test('表格：2 张，行数 [4,7]', () => {
  const r = m.analyze();
  assert.deepStrictEqual(r.tables.map((t) => t.rows), [4,7]);
  assert.deepStrictEqual(r.tables.map((t) => t.cols), [4,3]);
});

test('本章算术：解析出的数与派生量', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.collectItems, 4, 'collectItems');
  assert.strictEqual(a.fieldRows, 7, 'fieldRows');
  assert.strictEqual(a.levels, 3, 'levels');
  assert.strictEqual(a.crit, 4, 'crit');
  assert.strictEqual(a.stages, 3, 'stages');
  assert.strictEqual(a.contraindications, 3, 'contraindications');

});

test('本章算术：结构与清单', () => {
  const a = m.analyze().arith;
  assert.deepStrictEqual(a.methods, ["汗","吐","下","和","温","清","补","消"], 'methods');
});

test('quiz 结构：6 题、三段齐、4 选项、下标合法、答案打散', () => {
  const q = readQuiz();
  assert.strictEqual(q.questions.length, 6);
  assert.deepStrictEqual(q.questions.map((x) => x.correct), [1,0,1,0,1,2]);
  const distinct = [...new Set(q.questions.map((x) => x.correct))].sort((a, b) => a - b);
  assert.ok(distinct.length >= 3, '答案位置只有 ' + distinct.length + ' 种');
  assert.deepStrictEqual(distinct, [0,1,2]);
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
  assert.strictEqual(m.analyze().quiz.checkGrounded, grounded.length, 'main.js 与测试口径必须一致');
});

test('quiz 解释：每题 ≥30 汉字，最短 69 汉字', () => {
  const q = readQuiz();
  const lens = q.questions.map((x) => hanzi(x.explain));
  assert.deepStrictEqual(lens.filter((n) => n < 30), [], '有解释不足 30 汉字');
  assert.strictEqual(Math.min(...lens), 69);
  assert.strictEqual(m.analyze().quiz.minExplain, 69);
});

test('脚本可运行：退出码 0，输出带教学样例与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, String(r.stderr));
  const out = String(r.stdout || '');
  assert.ok(out.length > 200, '输出过短');
  assert.match(out, /现算/);
  assert.match(out, /不构成诊疗建议/);
  assert.match(out, /第 8 章/);
});

test('代码头部指向本章目录', () => {
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes('chapters/08-fangzhi-yuanze/docs/zh.md'), '头部注释未指向本章');
});
