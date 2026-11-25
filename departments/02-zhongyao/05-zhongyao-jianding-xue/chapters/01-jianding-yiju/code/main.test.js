#!/usr/bin/env node
/**
 * 中药鉴定学 · 第 1 章 药典给的是最低线，经验给的是典型样
 * 确定性单元测试 —— 运行: node --test code/main.test.js
 *
 * 断言钉的是本机实测值：正文、算术解析或习题任一处改动，这里就应当变红。
 * 数字不靠从 main.js 回读再自比（那样什么都测不出），而是写在断言里。
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

const readDoc = () => fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
const readQuiz = () => JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const grams = (t, n = 4) => {
  const out = new Set();
  for (const seg of String(t || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
};

test('章号与标题与目录一致', () => {
  assert.strictEqual(m.CHAPTER, 1);
  assert.strictEqual(m.SLUG, '01-jianding-yiju');
  assert.ok(m.TITLE.includes('药典'), '标题应与本章主题一致');
});

test('正文规模：2960 汉字 / 18 段 / 二级节 5 / 三级节 0', () => {
  const r = m.analyze();
  assert.strictEqual(r.docHanzi, 2960);
  assert.strictEqual(r.paragraphs, 18);
  assert.strictEqual(r.headings.h2.length, 5);
  assert.strictEqual(r.headings.h3.length, 0);
  assert.strictEqual(hanzi(readDoc()), 2960, '汉字口径必须与正文一致');
});

test('表格：4 张，数据行 [4,5,4,7] · 列 [4,2,4,2]', () => {
  const r = m.analyze();
  assert.deepStrictEqual(r.tables.map((t) => t.rows), [4, 5, 4, 7]);
  assert.deepStrictEqual(r.tables.map((t) => t.cols), [4, 2, 4, 2]);
});

test('表行列累计：20 数据行 / 56 单元格', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.tableRows, 20);
  assert.strictEqual(a.tableCells, 56);
  assert.strictEqual(a.tableCells, 4 * 4 + 5 * 2 + 4 * 4 + 7 * 2, '累计应等于逐表列×行之和');
});

test('取样演算：表里读 5% 与 1%，1200 件 → 50 + 2 = 52 件，与正文自报对账一致', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.baseRate, 5);
  assert.strictEqual(a.extraRate, 1);
  assert.strictEqual(a.batch, 1200);
  assert.strictEqual(a.basePieces, 50);
  assert.strictEqual(a.extraPieces, 2);
  assert.strictEqual(a.pieces, 52);
  assert.strictEqual(a.statedPieces, 52);
  assert.strictEqual(a.reconciled, true);
});

test('留样分装：3 份（检验／复核／留样备查）→ 52 × 3 = 156', () => {
  const a = m.analyze().arith;
  assert.deepStrictEqual(a.portions, ['检验', '复核', '留样备查']);
  assert.strictEqual(a.portionCopies, 3);
  assert.strictEqual(a.portionTotal, 156);
});

test('成组判据：4 组 21 项，安全组 5 项占 23.8%', () => {
  const a = m.analyze().arith;
  assert.deepStrictEqual(a.groups.map((g) => g.name), ['基原组', '性状组', '检查组', '安全组']);
  assert.deepStrictEqual(a.groups.map((g) => g.items), [4, 8, 4, 5]);
  assert.strictEqual(a.groupItems, 21);
  assert.ok(Math.abs(a.safetyShare - 5 / 21) < 1e-9, '安全组占比');
});

test('依据分层：4 层中法定 2 层（50%），报告 7 栏必填', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.tiers, 4);
  assert.strictEqual(a.statutory, 2);
  assert.strictEqual(a.tierShare, 0.5);
  assert.strictEqual(a.reportSlots, 7);
});

test('习题结构：6 题、pre1/check3/post2、答案 1/2/0/3/1/2、四选项合法', () => {
  const q = m.analyze().quiz;
  assert.strictEqual(q.total, 6);
  assert.deepStrictEqual(q.stage, { pre: 1, check: 3, post: 2 });
  assert.deepStrictEqual(q.answers, [1, 2, 0, 3, 1, 2]);
  assert.strictEqual(q.distinctAnswers, 4);
  assert.strictEqual(q.longestRun, 1);
  assert.strictEqual(q.allFourOptions, true);
  assert.strictEqual(q.badCorrect, 0);
  for (const x of readQuiz().questions) {
    assert.strictEqual(x.options.length, 4, x.question);
    assert.ok(Number.isInteger(x.correct) && x.correct >= 0 && x.correct < 4, 'correct 越界: ' + x.question);
  }
});

test('习题接地：3/3 道 check 题的正确选项含正文原词', () => {
  const body = grams(readDoc());
  const grounded = readQuiz().questions.filter((x) => {
    if (x.stage !== 'check') return false;
    return [...grams(String(x.options[x.correct] || ''))].some((g) => body.has(g));
  });
  assert.strictEqual(grounded.length, 3, '接地题数');
  assert.strictEqual(m.analyze().quiz.checkGrounded, grounded.length, 'main.js 与测试口径必须一致');
});

test('习题解释：每题 ≥30 汉字，最短 110 汉字', () => {
  const lens = readQuiz().questions.map((x) => hanzi(x.explain));
  assert.deepStrictEqual(lens.filter((n) => n < 30), [], '有解释不足 30 汉字');
  assert.strictEqual(Math.min(...lens), 110);
  assert.strictEqual(m.analyze().quiz.minExplain, 110);
});

test('自检门：合规则零违规，脚本退出码 0 且输出带规模与算术', () => {
  const r = m.analyze();
  assert.deepStrictEqual(m.gates(r), [], '自检门应无违规');

  const run = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(run.status, 0, String(run.stderr));
  const out = String(run.stdout || '');
  assert.match(out, /第 1 章/);
  assert.match(out, /正文 2960 汉字/);
  assert.match(out, /对账 一致/);
  assert.match(out, /自检：通过/);
  assert.match(out, /不构成检验操作规程/);
});

test('自检门能拦住坏题：答案同排、缺 post 段、取样对不上都要报出来', () => {
  const bad = JSON.parse(JSON.stringify(m.analyze()));
  bad.quiz.answers = [0, 0, 0, 0, 0, 0];
  bad.quiz.distinctAnswers = 1;
  bad.quiz.longestRun = 6;
  bad.quiz.stage.post = 0;
  bad.quiz.stage.check = 1;
  bad.quiz.allFourOptions = false;
  bad.quiz.checkGrounded = 0;
  bad.quiz.minExplain = 12;
  bad.arith.reconciled = false;
  const fails = m.gates(bad);
  assert.ok(fails.length >= 6, '应报多项违规，实际 ' + fails.length);
  assert.ok(fails.some((f) => f.includes('位置')), '未报答案位置扎堆');
  assert.ok(fails.some((f) => f.includes('post')), '未报缺段');
  assert.ok(fails.some((f) => f.includes('4 个选项')), '未报选项数');
  assert.ok(fails.some((f) => f.includes('接地')), '未报接地不足');
  assert.ok(fails.some((f) => f.includes('不一致')), '未报取样对账');
});

test('脚本只读正文与习题，不读 standards，且不写死汉字数', () => {
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes("'docs', 'zh.md'") && body.includes("'quiz.json'"), '未指向正文与习题');
  assert.ok(!body.includes('standards'), '不得读 standards 取数表');
  assert.ok(!body.includes('units.json'), '不得读单元层');
  assert.ok(!body.includes('2960'), '主程序不得写死汉字数');
  assert.ok(!/三辨|四位面|单元规模|本章实测|本课第\s*\d+\s*章[（)]|见\s*code\/main\.js\s*输出/.test(body), '含旧脚手架字样');
});

test('正文与习题不含旧脚手架字样，题面不重复', () => {
  const doc = readDoc();
  const raw = fs.readFileSync(QUIZ, 'utf8');
  const tpl = /三辨|四位面|单元规模|本章实测/;
  assert.ok(!tpl.test(doc), '正文含旧脚手架字样');
  assert.ok(!tpl.test(raw), '习题含旧脚手架字样');
  const qs = JSON.parse(raw).questions.map((q) => q.question);
  assert.strictEqual(new Set(qs).size, qs.length, '题面有重复');
});
