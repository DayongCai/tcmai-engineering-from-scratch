#!/usr/bin/env node
/**
 * 中药学 · 第 5 章 温里往下走、理气横着走，十九条记录里有一条自相矛盾
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

test('正文规模与表格：汉字 2790 / 段 29 / 节 7；表 3 张 [4, 4, 3] × [5, 8, 8]', () => {
  const r = m.analyze();
  assert.strictEqual(r.docHanzi, 2790);
  assert.strictEqual(r.paragraphs, 29);
  assert.strictEqual(r.sections.length, 7);
  assert.strictEqual(hanzi(readDoc()), 2790, '汉字口径必须与正文一致');
  assert.deepStrictEqual(r.tables.map((t) => t.cols), [4, 4, 3]);
  assert.deepStrictEqual(r.tables.map((t) => t.rows), [5, 8, 8]);
});

test('本章算术：两节味数、气值分布与覆盖率', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.coldN, 8, 'coldN');
  assert.strictEqual(a.heatN, 11, 'heatN');
  assert.strictEqual(a.total, 19, 'total');
  assert.strictEqual(a.gasColdFill, 6, 'gasColdFill');
  assert.strictEqual(a.gasHeatFill, 9, 'gasHeatFill');
  assert.strictEqual(a.gasCoverage, 78.9, 'gasCoverage');
  assert.strictEqual(a.hotCold, 3, 'hotCold');
  assert.strictEqual(a.warmCold, 2, 'warmCold');
  assert.strictEqual(a.coldCold, 1, 'coldCold');
  assert.strictEqual(a.warmHeat, 6, 'warmHeat');
  assert.strictEqual(a.flatHeat, 2, 'flatHeat');
  assert.strictEqual(a.coldHeat, 1, 'coldHeat');
  assert.strictEqual(a.heatTiers, 3, 'heatTiers');
});

test('本章算术：辛的分布、归经方向与空白味数', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.xinCold, 6, 'xinCold');
  assert.strictEqual(a.xinHeat, 7, 'xinHeat');
  assert.strictEqual(a.meridColdFill, 7, 'meridColdFill');
  assert.strictEqual(a.meridHeatFill, 10, 'meridHeatFill');
  assert.strictEqual(a.merCoverage, 89.5, 'merCoverage');
  assert.strictEqual(a.vertical, 9, 'vertical');
  assert.strictEqual(a.horizontal, 10, 'horizontal');
  assert.strictEqual(a.spleenBoth, true, 'spleenBoth');
  assert.strictEqual(a.liqiMeridians, 11, 'liqiMeridians');
  assert.strictEqual(a.toxicN, 3, 'toxicN');
  assert.strictEqual(a.blankN, 4, 'blankN');
  assert.strictEqual(a.blankRate, 21.1, 'blankRate');
});

test('本章算术：剂量跨度与两节字数对账', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.doseMin, 3, 'doseMin');
  assert.strictEqual(a.doseMax, 15, 'doseMax');
  assert.strictEqual(a.doseSpan, 5, 'doseSpan');
  assert.strictEqual(a.wCold, 1117, 'wCold');
  assert.strictEqual(a.wHeat, 1405, 'wHeat');
  assert.strictEqual(a.wordSum, 2522, 'wordSum');
  assert.strictEqual(a.wordMatch, true, '两节字数必须与正文合计相符');
});

test('quiz 结构：6 题、三段齐、4 选项、下标合法、答案打散', () => {
  const q = readQuiz();
  assert.strictEqual(q.questions.length, 6);
  assert.deepStrictEqual(q.questions.map((x) => x.correct), [0, 1, 2, 0, 1, 3]);
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

test('quiz 接地与解释：check 接地 3 道，最短解释 54 汉字', () => {
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
  assert.strictEqual(Math.min(...lens), 54);
  assert.strictEqual(m.analyze().quiz.minExplain, 54);
});

test('脚本可运行：退出码 0，输出带现算声明与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, String(r.stderr));
  const out = String(r.stdout || '');
  assert.ok(out.length > 200, '输出过短');
  assert.match(out, /现算/);
  assert.match(out, /不构成诊疗建议/);
  assert.match(out, /第 5 章/);
  assert.match(out, /19/);
});

test('代码头部指向本章目录', () => {
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes('chapters/05-wenli-liqi/docs/zh.md'), '头部注释未指向本章');
});
