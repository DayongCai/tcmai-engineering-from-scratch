#!/usr/bin/env node
/**
 * 中药学 · 第 12 章 性味归经编成 21 维：余弦排得出描述邻近，排不出可以替换
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

test('正文规模与表格：汉字 3678 / 段 56 / 节 6；表 4 张 [4, 3, 3, 7] × [3, 9, 8, 6]', () => {
  const r = m.analyze();
  assert.strictEqual(r.docHanzi, 3678);
  assert.strictEqual(r.paragraphs, 56);
  assert.strictEqual(r.sections.length, 6);
  assert.strictEqual(hanzi(readDoc()), 3678, '汉字口径必须与正文一致');
  assert.deepStrictEqual(r.tables.map((t) => t.cols), [4, 3, 3, 7]);
  assert.deepStrictEqual(r.tables.map((t) => t.rows), [3, 9, 8, 6]);
});

test('本章算术：21 维的构成', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.dimTotal, 21, 'dimTotal');
  assert.strictEqual(a.gasDim, 1, 'gasDim');
  assert.strictEqual(a.weiDim, 8, 'weiDim');
  assert.strictEqual(a.merDim, 12, 'merDim');
  assert.strictEqual(a.gasShare, 4.8, 'gasShare');
  assert.strictEqual(a.merShare, 57.1, 'merShare');
});

test('本章算术：九档气与三个方向', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.tierN, 9, 'tierN');
  assert.strictEqual(a.qiTotal, 287, 'qiTotal');
  assert.strictEqual(a.coldSide, 127, 'coldSide');
  assert.strictEqual(a.warmSide, 108, 'warmSide');
  assert.strictEqual(a.flatN, 52, 'flatN');
  assert.strictEqual(a.microN, 61, 'microN');
});

test('本章算术：味与归经的计数', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.weiTotal, 445, 'weiTotal');
  assert.strictEqual(a.bitter, 126, 'bitter');
  assert.strictEqual(a.microBitter, 13, 'microBitter');
  assert.strictEqual(a.bitterMerged, 139, 'bitterMerged');
  assert.strictEqual(a.xin, 116, 'xin');
  assert.strictEqual(a.merTotal, 692, 'merTotal');
  assert.strictEqual(a.liver, 139, 'liver');
  assert.strictEqual(a.lung, 110, 'lung');
  assert.strictEqual(a.tiny, 8, 'tiny');
  assert.strictEqual(a.perHerb, 2.41, 'perHerb');
});

test('quiz 结构：6 题、三段齐、4 选项、下标合法、答案打散', () => {
  const q = readQuiz();
  assert.strictEqual(q.questions.length, 6);
  assert.deepStrictEqual(q.questions.map((x) => x.correct), [0, 1, 2, 3, 0, 2]);
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

test('quiz 接地与解释：check 接地 3 道，最短解释 53 汉字', () => {
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
  assert.strictEqual(Math.min(...lens), 53);
  assert.strictEqual(m.analyze().quiz.minExplain, 53);
});

test('脚本可运行：退出码 0，输出带现算声明与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, String(r.stderr));
  const out = String(r.stdout || '');
  assert.ok(out.length > 200, '输出过短');
  assert.match(out, /现算/);
  assert.match(out, /不构成诊疗建议/);
  assert.match(out, /第 12 章/);
  assert.match(out, /21/);
});

test('代码头部指向本章目录', () => {
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes('chapters/12-xingneng-bianma/docs/zh.md'), '头部注释未指向本章');
});
