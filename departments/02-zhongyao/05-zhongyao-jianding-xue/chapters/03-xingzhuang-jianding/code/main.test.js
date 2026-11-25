#!/usr/bin/env node
/**
 * 中药鉴定学 · 第 3 章 性状鉴定没有仪器，八项描述就是它的仪器
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
  assert.strictEqual(m.CHAPTER, 3);
  assert.strictEqual(m.SLUG, '03-xingzhuang-jianding');
  assert.ok(m.TITLE.includes('八项'), '标题应与本章主题一致');
});

test('正文规模：3255 汉字 / 21 段 / 二级节 5 / 三级节 0', () => {
  const r = m.analyze();
  assert.strictEqual(r.docHanzi, 3255);
  assert.strictEqual(r.paragraphs, 21);
  assert.strictEqual(r.headings.h2.length, 5);
  assert.strictEqual(r.headings.h3.length, 0);
  assert.strictEqual(hanzi(readDoc()), 3255, '汉字口径必须与正文一致');
});

test('表格：3 张，数据行 [8,4,6] · 列 [4,4,2] · 累计 18 行 60 格', () => {
  const r = m.analyze();
  assert.deepStrictEqual(r.tables.map((t) => t.rows), [8, 4, 6]);
  assert.deepStrictEqual(r.tables.map((t) => t.cols), [4, 4, 2]);
  assert.strictEqual(r.arith.tableRows, 18);
  assert.strictEqual(r.arith.tableCells, 60);
  assert.strictEqual(r.arith.tableCells, 4 * 8 + 4 * 4 + 2 * 6, '累计应等于逐表列×行之和');
});

test('八项描述：8 项齐全，眼看覆盖 6 项（75%）', () => {
  const a = m.analyze().arith;
  assert.deepStrictEqual(a.items, ['形状', '大小', '色泽', '表面', '质地', '断面', '气', '味']);
  assert.strictEqual(a.itemCount, 8);
  assert.strictEqual(a.covered, 6);
  assert.strictEqual(a.coverShare, 0.75);
});

test('观察顺序 4 句、手段 4 种、口尝 3 条规矩', () => {
  const a = m.analyze().arith;
  assert.deepStrictEqual(a.order, ['由表及里', '先整后碎', '先干后湿', '先共性后个性']);
  assert.deepStrictEqual(a.means, ['眼看', '手摸', '鼻闻', '口尝']);
  assert.deepStrictEqual(a.tasteRules, ['少量', '浅尝即吐', '立即漱口']);
});

test('禁尝毒性药材 10 味，清单末位是细辛', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.banned.length, 10);
  assert.strictEqual(a.banned[0], '马钱子');
  assert.strictEqual(a.banned[a.banned.length - 1], '细辛');
});

test('成组判据 4 组 10 项，均 2.5 项/组', () => {
  const a = m.analyze().arith;
  assert.deepStrictEqual(a.groups.map((g) => g.name), ['形态组', '断面组', '气味组', '水火组']);
  assert.deepStrictEqual(a.groups.map((g) => g.items), [3, 3, 2, 2]);
  assert.strictEqual(a.groupItems, 10);
  assert.strictEqual(a.groupMean, 2.5);
});

test('行为判据：水试 8 例 + 火试 4 例 = 12 例；失效 4 种、记录 6 栏、考核 4 条', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.water, 8);
  assert.strictEqual(a.fire, 4);
  assert.strictEqual(a.failures, 4);
  assert.strictEqual(a.recordSlots, 6);
  assert.strictEqual(a.tasks, 4);
  assert.deepStrictEqual(a.easyToFake, ['形', '色', '气', '味']);
});

test('习题结构：6 题、pre1/check3/post2、答案 1/0/2/3/0/1、四选项合法', () => {
  const q = m.analyze().quiz;
  assert.strictEqual(q.total, 6);
  assert.deepStrictEqual(q.stage, { pre: 1, check: 3, post: 2 });
  assert.deepStrictEqual(q.answers, [1, 0, 2, 3, 0, 1]);
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
  assert.match(out, /第 3 章/);
  assert.match(out, /正文 3255 汉字/);
  assert.match(out, /水试 8 例/);
  assert.match(out, /自检：通过/);
  assert.match(out, /不构成真伪结论/);
});

test('自检门能拦住坏题：答案同排、缺 post 段、八项不全都要报出来', () => {
  const bad = JSON.parse(JSON.stringify(m.analyze()));
  bad.quiz.answers = [0, 0, 0, 0, 0, 0];
  bad.quiz.distinctAnswers = 1;
  bad.quiz.longestRun = 6;
  bad.quiz.stage.post = 0;
  bad.quiz.stage.check = 1;
  bad.quiz.allFourOptions = false;
  bad.quiz.checkGrounded = 0;
  bad.quiz.minExplain = 12;
  bad.arith.itemCount = 7;
  bad.arith.banned = [];
  const fails = m.gates(bad);
  assert.ok(fails.length >= 6, '应报多项违规，实际 ' + fails.length);
  assert.ok(fails.some((f) => f.includes('位置')), '未报答案位置扎堆');
  assert.ok(fails.some((f) => f.includes('post')), '未报缺段');
  assert.ok(fails.some((f) => f.includes('4 个选项')), '未报选项数');
  assert.ok(fails.some((f) => f.includes('接地')), '未报接地不足');
  assert.ok(fails.some((f) => f.includes('八项')), '未报八项不全');
});

test('脚本只读正文与习题，不读 standards，且不写死汉字数', () => {
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes("'docs', 'zh.md'") && body.includes("'quiz.json'"), '未指向正文与习题');
  assert.ok(!body.includes('standards'), '不得读 standards 取数表');
  assert.ok(!body.includes('units.json'), '不得读单元层');
  assert.ok(!body.includes('3255'), '主程序不得写死汉字数');
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
