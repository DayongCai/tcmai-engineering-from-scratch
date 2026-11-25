#!/usr/bin/env node
/**
 * 中药学 · 第 9 章 安神、平肝、开窍：26 味药只落在心与肝两条经上
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

test('正文规模与表格：汉字 3279 / 段 33 / 节 7；表 4 张 [6, 7, 3, 4] × [3, 3, 10, 8]', () => {
  const r = m.analyze();
  assert.strictEqual(r.docHanzi, 3279);
  assert.strictEqual(r.paragraphs, 33);
  assert.strictEqual(r.sections.length, 7);
  assert.strictEqual(hanzi(readDoc()), 3279, '汉字口径必须与正文一致');
  assert.deepStrictEqual(r.tables.map((t) => t.cols), [6, 7, 3, 4]);
  assert.deepStrictEqual(r.tables.map((t) => t.rows), [3, 3, 10, 8]);
});

test('本章算术：三章累加与最大一章', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.chapterN, 3, 'chapterN');
  assert.strictEqual(a.herbs, 26, 'herbs');
  assert.strictEqual(a.chantotal, 3669, 'chantotal');
  assert.strictEqual(a.mean, 141.1, 'mean');
  assert.deepStrictEqual(a.widths, [9, 13, 4], 'widths');
  assert.strictEqual(a.biggest, '第23章 平肝息风药', 'biggest');
});

test('本章算术：平性四成与两章的相反分布', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.filled, 22, 'filled');
  assert.strictEqual(a.ping, 9, 'ping');
  assert.strictEqual(a.han, 6, 'han');
  assert.strictEqual(a.liang, 2, 'liang');
  assert.strictEqual(a.wen, 5, 'wen');
  assert.strictEqual(a.blank, 4, 'blank');
  assert.strictEqual(a.flatShare, 40.9, 'flatShare');
  assert.strictEqual(a.anshenPing, 6, 'anshenPing');
  assert.strictEqual(a.pingganFilled, 11, 'pingganFilled');
  assert.strictEqual(a.pingganColdSide, 7, 'pingganColdSide');
});

test('本章算术：心肝两经占比与剂量千倍差', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.merRows, 10, 'merRows');
  assert.strictEqual(a.tagN, 50, 'tagN');
  assert.strictEqual(a.heart, 15, 'heart');
  assert.strictEqual(a.liver, 13, 'liver');
  assert.strictEqual(a.twoShare, 56, 'twoShare');
  assert.strictEqual(a.maxHigh, 30, 'maxHigh');
  assert.strictEqual(a.minLow, 0.03, 'minLow');
  assert.strictEqual(a.doseRatio, 1000, 'doseRatio');
  assert.strictEqual(a.wanSan, 6, 'wanSan');
  assert.strictEqual(a.toxicN, 4, 'toxicN');
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

test('quiz 接地与解释：check 接地 3 道，最短解释 60 汉字', () => {
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
  assert.strictEqual(Math.min(...lens), 60);
  assert.strictEqual(m.analyze().quiz.minExplain, 60);
});

test('脚本可运行：退出码 0，输出带现算声明与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, String(r.stderr));
  const out = String(r.stdout || '');
  assert.ok(out.length > 200, '输出过短');
  assert.match(out, /现算/);
  assert.match(out, /不构成诊疗建议/);
  assert.match(out, /第 9 章/);
  assert.match(out, /26/);
});

test('代码头部指向本章目录', () => {
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes('chapters/09-anshen-pinggan/docs/zh.md'), '头部注释未指向本章');
});
