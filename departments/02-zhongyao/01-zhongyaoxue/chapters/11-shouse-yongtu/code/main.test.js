#!/usr/bin/env node
/**
 * 中药学 · 第 11 章 收涩与涌吐编在一起：同一根气机轴，14 味里只有 8 味带涩
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

test('正文规模与表格：汉字 3229 / 段 33 / 节 6；表 4 张 [7, 7, 3, 3] × [4, 2, 2, 9]', () => {
  const r = m.analyze();
  assert.strictEqual(r.docHanzi, 3229);
  assert.strictEqual(r.paragraphs, 33);
  assert.strictEqual(r.sections.length, 6);
  assert.strictEqual(hanzi(readDoc()), 3229, '汉字口径必须与正文一致');
  assert.deepStrictEqual(r.tables.map((t) => t.cols), [7, 7, 3, 3]);
  assert.deepStrictEqual(r.tables.map((t) => t.rows), [4, 2, 2, 9]);
});

test('本章算术：四节累加与两章反差', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.secN, 4, 'secN');
  assert.strictEqual(a.herbs, 17, 'herbs');
  assert.strictEqual(a.chantotal, 2217, 'chantotal');
  assert.strictEqual(a.mean, 130.4, 'mean');
  assert.strictEqual(a.seN, 14, 'seN');
  assert.strictEqual(a.vuN, 3, 'vuN');
  assert.strictEqual(a.wordsRatio, 5.5, 'wordsRatio');
});

test('本章算术：收涩压中间、涌吐全寒', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.filled, 16, 'filled');
  assert.strictEqual(a.flat, 7, 'flat');
  assert.strictEqual(a.warm, 4, 'warm');
  assert.strictEqual(a.cold, 4, 'cold');
  assert.strictEqual(a.cool, 1, 'cool');
  assert.strictEqual(a.blank, 1, 'blank');
  assert.strictEqual(a.seFill, 13, 'seFill');
  assert.strictEqual(a.warmFlatSide, 11, 'warmFlatSide');
  assert.strictEqual(a.vuAllCold, true, 'vuAllCold');
});

test('本章算术：涩味分布与归经首位', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.seWithSe, 8, 'seWithSe');
  assert.strictEqual(a.vuWithSe, 1, 'vuWithSe');
  assert.strictEqual(a.noSeN, 6, 'noSeN');
  assert.strictEqual(a.tags, 39, 'tags');
  assert.strictEqual(a.kidney, 9, 'kidney');
  assert.strictEqual(a.lung, 6, 'lung');
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
  assert.match(out, /第 11 章/);
  assert.match(out, /17/);
});

test('代码头部指向本章目录', () => {
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes('chapters/11-shouse-yongtu/docs/zh.md'), '头部注释未指向本章');
});
