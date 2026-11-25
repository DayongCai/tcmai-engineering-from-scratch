#!/usr/bin/env node
/**
 * 中药学 · 第 3 章 清热药的分节依据在功效首词，四气在这里只剩一个值
 * 确定性单元测试 —— 运行: node --test code/main.test.js
 *
 * 断言钉的是本机实测值：正文、算术解析或 quiz 任一处改动，这里就应当变红。
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

test('正文规模与表格：汉字 2979 / 段 30 / 节 7；表 3 张 7×6、4×5、3×4', () => {
  const r = m.analyze();
  assert.strictEqual(r.docHanzi, 2979);
  assert.strictEqual(r.paragraphs, 30);
  assert.strictEqual(r.sections.length, 7);
  assert.strictEqual(hanzi(readDoc()), 2979, '汉字口径必须与正文一致');
  assert.deepStrictEqual(r.tables.map((t) => t.cols), [7, 4, 3]);
  assert.deepStrictEqual(r.tables.map((t) => t.rows), [6, 5, 4]);
});

test('本章算术：逐节累加', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.rowsInDoc, 5, 'rowsInDoc');
  assert.strictEqual(a.n, 36, 'n');
  assert.strictEqual(a.chantotal, 4628, 'chantotal');
  assert.strictEqual(a.share, 100, 'share');
  assert.strictEqual(a.gasFilled, 26, 'gasFilled');
  assert.strictEqual(a.tasteFilled, 26, 'tasteFilled');
  assert.strictEqual(a.merFilled, 33, 'merFilled');
});

test('本章算术：四气常量与功效首词命中', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.gasLabel, '寒', 'gasLabel');
  assert.strictEqual(a.hitSum, 33, 'hitSum');
  assert.strictEqual(a.hitTotal, 36, 'hitTotal');
  assert.strictEqual(a.hitRate, 91.7, 'hitRate');
  assert.strictEqual(a.exceptionCount, 3, 'exceptionCount');
  assert.strictEqual(a.exceptionNames, '决明子／白薇／地骨皮', 'exceptionNames');
});

test('本章算术：五味归经计数、脾胃禁忌与剂量跨度', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.tasteLabels, 44, 'tasteLabels');
  assert.strictEqual(a.bitter, 20, 'bitter');
  assert.strictEqual(a.bitterShare, 76.9, 'bitterShare');
  assert.strictEqual(a.merLabels, 90, 'merLabels');
  assert.strictEqual(a.liver, 19, 'liver');
  assert.strictEqual(a.liverShare, 57.6, 'liverShare');
  assert.strictEqual(a.tabooBase, 36, 'tabooBase');
  assert.strictEqual(a.taboo, 29, 'taboo');
  assert.strictEqual(a.tabooRate, 80.6, 'tabooRate');
  assert.strictEqual(a.incompat, 3, 'incompat');
  assert.strictEqual(a.pregnant, 5, 'pregnant');
  assert.strictEqual(a.lowUpper, 3, 'lowUpper');
  assert.strictEqual(a.highUpper, 60, 'highUpper');
  assert.strictEqual(a.doseSpan, 20, 'doseSpan');
});

test('quiz 结构：6 题、三段齐、4 选项、下标合法、答案打散', () => {
  const q = readQuiz();
  assert.strictEqual(q.questions.length, 6);
  assert.deepStrictEqual(q.questions.map((x) => x.correct), [1, 0, 2, 3, 0, 0]);
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

test('quiz 接地与解释：check 接地 3 道，最短解释 70 汉字', () => {
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
  assert.strictEqual(Math.min(...lens), 70);
  assert.strictEqual(m.analyze().quiz.minExplain, 70);
});

test('脚本可运行：退出码 0，输出带现算声明与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, String(r.stderr));
  const out = String(r.stdout || '');
  assert.ok(out.length > 200, '输出过短');
  assert.match(out, /现算/);
  assert.match(out, /不构成诊疗建议/);
  assert.match(out, /第 3 章/);
  assert.match(out, /4,628/);
});

test('代码头部指向本章目录', () => {
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes('chapters/03-qingreyao-fenlei/docs/zh.md'), '头部注释未指向本章');
});
