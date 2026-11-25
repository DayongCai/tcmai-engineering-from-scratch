#!/usr/bin/env node
/**
 * 中药学 · 第 4 章 泻下与祛湿共用「出口」二字，剂量却差六百倍
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

test('正文规模与表格：汉字 2785 / 段 29 / 节 7；表 4 张 [7, 5, 3, 3] × [11, 3, 4, 10]', () => {
  const r = m.analyze();
  assert.strictEqual(r.docHanzi, 2785);
  assert.strictEqual(r.paragraphs, 29);
  assert.strictEqual(r.sections.length, 7);
  assert.strictEqual(hanzi(readDoc()), 2785, '汉字口径必须与正文一致');
  assert.deepStrictEqual(r.tables.map((t) => t.cols), [7, 5, 3, 3]);
  assert.deepStrictEqual(r.tables.map((t) => t.rows), [11, 3, 4, 10]);
});

test('本章算术：十节累加与毒性分布', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.sectionCount, 10, 'sectionCount');
  assert.strictEqual(a.herbs, 45, 'herbs');
  assert.strictEqual(a.chantotal, 5774, 'chantotal');
  assert.strictEqual(a.share, 99.9, 'share');
  assert.strictEqual(a.gasFilled, 37, 'gasFilled');
  assert.strictEqual(a.toxic, 9, 'toxic');
  assert.strictEqual(a.toxicRate, 20, 'toxicRate');
  assert.strictEqual(a.zeroToxic, 7, 'zeroToxic');
  assert.deepStrictEqual(a.fullToxicNames, ['11.3 峻下逐水'], 'fullToxicNames');
});

test('本章算术：出口、剂量跨度与节名命名法', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.exits, 3, 'exits');
  assert.strictEqual(a.frontBack, 15, 'frontBack');
  assert.strictEqual(a.doseRows, 40, 'doseRows');
  assert.strictEqual(a.maxHigh, 60, 'maxHigh');
  assert.strictEqual(a.minHigh, 0.3, 'minHigh');
  assert.strictEqual(a.minLow, 0.1, 'minLow');
  assert.strictEqual(a.ratioHigh, 200, 'ratioHigh');
  assert.strictEqual(a.ratioLow, 600, 'ratioLow');
  assert.strictEqual(a.actionOnly, 5, 'actionOnly');
  assert.strictEqual(a.withCause, 2, 'withCause');
  assert.strictEqual(a.withResult, 3, 'withResult');
  assert.strictEqual(a.zeroHits, 5, 'zeroHits');
  assert.strictEqual(a.merLabels, 118, 'merLabels');
  assert.strictEqual(a.spleen, 18, 'spleen');
});

test('quiz 结构：6 题、三段齐、4 选项、下标合法、答案打散', () => {
  const q = readQuiz();
  assert.strictEqual(q.questions.length, 6);
  assert.deepStrictEqual(q.questions.map((x) => x.correct), [1, 2, 1, 3, 0, 3]);
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

test('quiz 接地与解释：check 接地 3 道，最短解释 65 汉字', () => {
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
  assert.strictEqual(Math.min(...lens), 65);
  assert.strictEqual(m.analyze().quiz.minExplain, 65);
});

test('脚本可运行：退出码 0，输出带现算声明与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, String(r.stderr));
  const out = String(r.stdout || '');
  assert.ok(out.length > 200, '输出过短');
  assert.match(out, /现算/);
  assert.match(out, /不构成诊疗建议/);
  assert.match(out, /第 4 章/);
  assert.match(out, /45/);
});

test('代码头部指向本章目录', () => {
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes('chapters/04-xiexia-qushi/docs/zh.md'), '头部注释未指向本章');
});
