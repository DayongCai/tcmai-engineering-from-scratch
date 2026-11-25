#!/usr/bin/env node
/**
 * 中药学 · 第 14 章 12 味毒药的分界不在毒性等级，在给药途径
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

test('正文规模与表格：汉字 3801 / 段 54 / 节 6；表 3 张 [6, 3, 5] × [2, 8, 3]', () => {
  const r = m.analyze();
  assert.strictEqual(r.docHanzi, 3801);
  assert.strictEqual(r.paragraphs, 54);
  assert.strictEqual(r.sections.length, 6);
  assert.strictEqual(hanzi(readDoc()), 3801, '汉字口径必须与正文一致');
  assert.deepStrictEqual(r.tables.map((t) => t.cols), [6, 3, 5]);
  assert.deepStrictEqual(r.tables.map((t) => t.rows), [2, 8, 3]);
});

test('本章算术：两章累加与篇均', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.chapterN, 2, 'chapterN');
  assert.strictEqual(a.herbs, 12, 'herbs');
  assert.strictEqual(a.chantotal, 1683, 'chantotal');
  assert.strictEqual(a.mean, 140.3, 'mean');
  assert.strictEqual(a.shortChapter, '第29章 拔毒化腐生肌药', 'shortChapter');
});

test('本章算术：归经首位与肠道占比', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.tags, 22, 'tags');
  assert.strictEqual(a.lung, 5, 'lung');
  assert.strictEqual(a.gut, 5, 'gut');
  assert.strictEqual(a.gutShare, 22.7, 'gutShare');
});

test('本章算术：途径三分与剂量跨度', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.routeSum, 12, 'routeSum');
  assert.strictEqual(a.outer, 3, 'outer');
  assert.strictEqual(a.pill, 8, 'pill');
  assert.strictEqual(a.decoct, 1, 'decoct');
  assert.strictEqual(a.qiTiers, 5, 'qiTiers');
  assert.strictEqual(a.xin, 7, 'xin');
  assert.strictEqual(a.warmSide, 7, 'warmSide');
  assert.strictEqual(a.doseLow, 0.002, 'doseLow');
  assert.strictEqual(a.doseHigh, 10, 'doseHigh');
  assert.strictEqual(a.doseRatio, 5000, 'doseRatio');
});

test('quiz 结构：6 题、三段齐、4 选项、下标合法、答案打散', () => {
  const q = readQuiz();
  assert.strictEqual(q.questions.length, 6);
  assert.deepStrictEqual(q.questions.map((x) => x.correct), [1, 3, 2, 0, 1, 2]);
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

test('quiz 接地与解释：check 接地 3 道，最短解释 63 汉字', () => {
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
  assert.strictEqual(Math.min(...lens), 63);
  assert.strictEqual(m.analyze().quiz.minExplain, 63);
});

test('脚本可运行：退出码 0，输出带现算声明与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, String(r.stderr));
  const out = String(r.stdout || '');
  assert.ok(out.length > 200, '输出过短');
  assert.match(out, /现算/);
  assert.match(out, /不构成诊疗建议/);
  assert.match(out, /第 14 章/);
  assert.match(out, /12/);
});

test('代码头部指向本章目录', () => {
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes('chapters/14-gongdu-badu/docs/zh.md'), '头部注释未指向本章');
});
