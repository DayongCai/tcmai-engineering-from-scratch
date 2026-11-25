#!/usr/bin/env node
/**
 * 中药学 · 第 1 章 性能五要素是总论的共用语法，不是任何一味药的取值
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

test('正文规模：汉字 2972 / 段 24 / 节 6', () => {
  const r = m.analyze();
  assert.strictEqual(r.docHanzi, 2972);
  assert.strictEqual(r.paragraphs, 24);
  assert.strictEqual(r.sections.length, 6);
  assert.strictEqual(hanzi(readDoc()), 2972, '汉字口径必须与正文一致');
});

test('表格：3 张，列数 [4,4,3]，行数 [6,4,11]', () => {
  const r = m.analyze();
  assert.deepStrictEqual(r.tables.map((t) => t.cols), [4, 4, 3]);
  assert.deepStrictEqual(r.tables.map((t) => t.rows), [6, 4, 11]);
});

test('本章算术：栏位与覆盖', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.slots, 6, 'slots');
  assert.strictEqual(a.emptySlots, 1, 'emptySlots');
  assert.deepStrictEqual(a.emptyNames, ['升降浮沉'], 'emptyNames');
});

test('本章算术：标签计数与归经均值', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.gasBins, 9, 'gasBins');
  assert.strictEqual(a.gasSum, 287, 'gasSum');
  assert.strictEqual(a.tasteKinds, 8, 'tasteKinds');
  assert.strictEqual(a.tasteLabels, 445, 'tasteLabels');
  assert.strictEqual(a.meridianFilled, 284, 'meridianFilled');
  assert.strictEqual(a.meridLabels, 692, 'meridLabels');
  assert.strictEqual(a.meridMean, 2.44, 'meridMean');
});

test('本章算术：毒性分布与代价条数', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.toxicSum, 44, 'toxicSum');
  assert.strictEqual(a.herbSum, 287, 'herbSum');
  assert.strictEqual(a.toxicRate, 15.3, 'toxicRate');
  assert.strictEqual(a.cleanClass, 1, 'cleanClass');
  assert.strictEqual(a.cleanName, '补虚', 'cleanName');
  assert.strictEqual(a.hardRules, 3, 'hardRules');
  assert.strictEqual(a.costLines, 5, 'costLines');
});

test('quiz 结构：6 题、三段齐、4 选项、下标合法、答案打散', () => {
  const q = readQuiz();
  assert.strictEqual(q.questions.length, 6);
  assert.deepStrictEqual(q.questions.map((x) => x.correct), [1, 1, 0, 3, 2, 3]);
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

test('quiz 解释：每题 ≥30 汉字，最短 67 汉字', () => {
  const q = readQuiz();
  const lens = q.questions.map((x) => hanzi(x.explain));
  assert.deepStrictEqual(lens.filter((n) => n < 30), [], '有解释不足 30 汉字');
  assert.strictEqual(Math.min(...lens), 67);
  assert.strictEqual(m.analyze().quiz.minExplain, 67);
});

test('脚本可运行：退出码 0，输出带现算声明与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, String(r.stderr));
  const out = String(r.stdout || '');
  assert.ok(out.length > 200, '输出过短');
  assert.match(out, /现算/);
  assert.match(out, /不构成诊疗建议/);
  assert.match(out, /第 1 章/);
  assert.match(out, /287/);
});

test('代码头部指向本章目录', () => {
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes('chapters/01-xingneng-siqi/docs/zh.md'), '头部注释未指向本章');
});
