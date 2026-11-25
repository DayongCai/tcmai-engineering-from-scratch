#!/usr/bin/env node
/**
 * 中药鉴定学 · 第 2 章 学名错一个属，整批性状描述跟着作废
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
  assert.strictEqual(m.CHAPTER, 2);
  assert.strictEqual(m.SLUG, '02-laiyuan-jianding');
  assert.ok(m.TITLE.includes('学名'), '标题应与本章主题一致');
});

test('正文规模：3036 汉字 / 21 段 / 二级节 5 / 三级节 0', () => {
  const r = m.analyze();
  assert.strictEqual(r.docHanzi, 3036);
  assert.strictEqual(r.paragraphs, 21);
  assert.strictEqual(r.headings.h2.length, 5);
  assert.strictEqual(r.headings.h3.length, 0);
  assert.strictEqual(hanzi(readDoc()), 3036, '汉字口径必须与正文一致');
});

test('表格：2 张，数据行 [4,3] · 列 [4,2] · 累计 7 行 22 格', () => {
  const r = m.analyze();
  assert.deepStrictEqual(r.tables.map((t) => t.rows), [4, 3]);
  assert.deepStrictEqual(r.tables.map((t) => t.cols), [4, 2]);
  assert.strictEqual(r.arith.tableRows, 7);
  assert.strictEqual(r.arith.tableCells, 22);
  assert.strictEqual(r.arith.tableCells, 4 * 4 + 2 * 3, '累计应等于逐表列×行之和');
});

test('一药多基原：6 个中文名 → 24 个学名，川贝母最多 6 个', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.groupCount, 6);
  assert.deepStrictEqual(a.groups.map((g) => g.name), ['大黄', '甘草', '黄连', '石斛', '钩藤', '川贝母']);
  assert.deepStrictEqual(a.groups.map((g) => g.members.length), [3, 3, 3, 4, 5, 6]);
  assert.strictEqual(a.nameCount, 24);
  assert.strictEqual(a.meanPerName, 4);
  assert.deepStrictEqual(a.maxGroup, { name: '川贝母', members: 6 });
});

test('多药同源：2 种植物 → 10 味药（莲 6 / 桑 4）', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.plantCount, 2);
  assert.deepStrictEqual(a.plants, [{ plant: '莲', made: 6 }, { plant: '桑', made: 4 }]);
  assert.strictEqual(a.drugCount, 10);
  assert.strictEqual(a.meanPerSource, 5);
});

test('学名四段：Angelica / sinensis / Oliv. / Diels；双名 2 处、种下等级 3 种', () => {
  const a = m.analyze().arith;
  assert.deepStrictEqual(a.name, { genus: 'Angelica', epithet: 'sinensis', author: 'Oliv.', combiner: 'Diels' });
  assert.strictEqual(a.binomials, 2);
  assert.deepStrictEqual(a.rankSigns, ['var.', 'subsp.', 'f.']);
});

test('采集与命名：一式 3 份、照片 3 张、命名法规 3 条原则', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.copies, 3);
  assert.strictEqual(a.photos, 3);
  assert.deepStrictEqual(a.rules, ['优先律', '模式方法', '一名一分类群']);
});

test('成组判据 4 组 16 项；记录 3 类载体 23 项必填；考核项 4 条', () => {
  const a = m.analyze().arith;
  assert.deepStrictEqual(a.criterionGroups.map((g) => g.name), ['形态组', '检索组', '学名组', '文献组']);
  assert.deepStrictEqual(a.criterionGroups.map((g) => g.items), [6, 3, 4, 3]);
  assert.strictEqual(a.criterionItems, 16);
  assert.deepStrictEqual(a.carriers.map((c) => c.name), ['采集记录', '标本号牌', '鉴定记录']);
  assert.deepStrictEqual(a.carriers.map((c) => c.fields), [9, 9, 5]);
  assert.strictEqual(a.fieldTotal, 23);
  assert.strictEqual(a.tasks, 4);
});

test('习题结构：6 题、pre1/check3/post2、答案 2/1/3/0/1/2、四选项合法', () => {
  const q = m.analyze().quiz;
  assert.strictEqual(q.total, 6);
  assert.deepStrictEqual(q.stage, { pre: 1, check: 3, post: 2 });
  assert.deepStrictEqual(q.answers, [2, 1, 3, 0, 1, 2]);
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

test('习题解释：每题 ≥30 汉字，最短 108 汉字', () => {
  const lens = readQuiz().questions.map((x) => hanzi(x.explain));
  assert.deepStrictEqual(lens.filter((n) => n < 30), [], '有解释不足 30 汉字');
  assert.strictEqual(Math.min(...lens), 108);
  assert.strictEqual(m.analyze().quiz.minExplain, 108);
});

test('自检门：合规则零违规，脚本退出码 0 且输出带规模与算术', () => {
  const r = m.analyze();
  assert.deepStrictEqual(m.gates(r), [], '自检门应无违规');

  const run = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(run.status, 0, String(run.stderr));
  const out = String(run.stdout || '');
  assert.match(out, /第 2 章/);
  assert.match(out, /正文 3036 汉字/);
  assert.match(out, /24 个学名/);
  assert.match(out, /自检：通过/);
  assert.match(out, /不构成鉴定结论/);
});

test('自检门能拦住坏题：答案同排、缺 post 段、学名解析空都要报出来', () => {
  const bad = JSON.parse(JSON.stringify(m.analyze()));
  bad.quiz.answers = [0, 0, 0, 0, 0, 0];
  bad.quiz.distinctAnswers = 1;
  bad.quiz.longestRun = 6;
  bad.quiz.stage.post = 0;
  bad.quiz.stage.check = 1;
  bad.quiz.allFourOptions = false;
  bad.quiz.checkGrounded = 0;
  bad.quiz.minExplain = 12;
  bad.arith.name = null;
  bad.arith.nameCount = 0;
  const fails = m.gates(bad);
  assert.ok(fails.length >= 6, '应报多项违规，实际 ' + fails.length);
  assert.ok(fails.some((f) => f.includes('位置')), '未报答案位置扎堆');
  assert.ok(fails.some((f) => f.includes('post')), '未报缺段');
  assert.ok(fails.some((f) => f.includes('4 个选项')), '未报选项数');
  assert.ok(fails.some((f) => f.includes('接地')), '未报接地不足');
  assert.ok(fails.some((f) => f.includes('学名')), '未报学名解析空');
});

test('脚本只读正文与习题，不读 standards，且不写死汉字数', () => {
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes("'docs', 'zh.md'") && body.includes("'quiz.json'"), '未指向正文与习题');
  assert.ok(!body.includes('standards'), '不得读 standards 取数表');
  assert.ok(!body.includes('units.json'), '不得读单元层');
  assert.ok(!body.includes('3036'), '主程序不得写死汉字数');
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
