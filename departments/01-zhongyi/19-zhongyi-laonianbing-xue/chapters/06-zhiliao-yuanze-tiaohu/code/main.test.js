#!/usr/bin/env node
/**
 * 第 6 章 治疗原则与调护：小剂量、顾脾胃、缓图 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言钉住从 docs/zh.md 与 quiz.json 现算出来的实测值：节数、汉字、表格行数、
 * 结构表条目、分档、记录字段、失效模式、考核项，以及自测题的三段结构、选项数与接地数。
 * 正文或题库一改，测试先响。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const { SLUG, DOC, QUIZ, parse, metrics, quizAudit, shingles } = require('./main.js');

const text = fs.readFileSync(DOC, 'utf8');
const parsed = parse(text);
const m = metrics(parsed);
const a = quizAudit(m.quiz, text);
const mainSrc = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
const quizRaw = fs.readFileSync(QUIZ, 'utf8');

test('章号与标题取自正文，slug 与目录一致', () => {
  assert.strictEqual(m.chapter, 6);
  assert.ok(m.title.includes("治疗原则与调护：小剂量、顾脾胃、缓图"), m.title);
  assert.strictEqual(SLUG, "06-zhiliao-yuanze-tiaohu");
});

test('正文规模：2289 汉字 · 6 节', () => {
  assert.strictEqual(m.hanzi, 2289);
  assert.strictEqual(m.sections.length, 6);
});

test('小节标题与正文一致', () => {
  assert.deepStrictEqual(m.sections, ["一、原则要换算成四个可评估的量","二、八法在老人身上的适配","三、判据与分档【教学设定】","四、动作、时限与记录字段","五、失效模式与考核项","代价与边界"]);
});

test('表格 4 张 / 17 行', () => {
  assert.strictEqual(m.tables, 4);
  assert.strictEqual(m.tableRows, 17);
});

test('结构表 4 条，取自「一、原则要换算成四个可评估的量」', () => {
  assert.strictEqual(m.structure.count, 4);
  assert.strictEqual(m.structure.section, "一、原则要换算成四个可评估的量");
  assert.deepStrictEqual(m.structure.dims, ["肝肾功能","脾胃运化","体重肌肉","在服总数"]);
});

test('分档判据 3 档：可新增 / 宜替换 / 只调支持', () => {
  assert.deepStrictEqual(m.tiers.names, ["可新增","宜替换","只调支持"]);
});

test('记录字段 5 条', () => {
  assert.deepStrictEqual(m.records.names, ["主症","调方档","撤药项","复评项","起居动作"]);
});

test('失效模式 6 条', () => {
  assert.deepStrictEqual(m.failures, ["把「小」当算术","只加不减","峻猛攻伐","把「缓图」当拖延","中西药联用不审","宣教未回述"]);
});

test('考核项 5 条', () => {
  assert.strictEqual(m.checkItems.length, 5);
});

test('自测题 6 道，三段齐（pre 1 / check 4 / post 1）', () => {
  assert.strictEqual(a.total, 6);
  assert.deepStrictEqual(a.stages, {"pre":1,"check":4,"post":1});
});

test('每题 4 选项、correct 下标合法，explain 均 ≥30 汉字（最短 71）', () => {
  assert.strictEqual(a.optionsOk, true);
  assert.strictEqual(a.indexOk, true);
  assert.ok(a.minExplain >= 30, '最短解释 ' + a.minExplain + ' 汉字');
  assert.strictEqual(a.minExplain, 71);
});

test('check 题正确选项可在正文找到 ≥4 字原词：4/4', () => {
  assert.strictEqual(a.groundedCount, 4);
  assert.ok(a.groundedCount >= 2, '接地 ' + a.groundedCount);
  for (const g of a.grounded) assert.ok(g.hit, g.q);
});

test('正确项打散，不扎堆在同一位置', () => {
  assert.deepStrictEqual(a.spread, [1,2,1,2]);
  assert.ok(Math.max(...a.spread) <= 3, '最大聚集 ' + Math.max(...a.spread));
});

test('quiz 与 main.js 均无旧脚手架概念残留', () => {
  // 用转义构造，避免本文件自身被这些词命中
  const fp = new RegExp('\\u4e09\\u8fa8|\\u56db\\u4f4d\\u9762|\\u5355\\u5143\\u89c4\\u6a21|\\u672c\\u7ae0\\u5b9e\\u6d4b');
  assert.ok(!fp.test(quizRaw), 'quiz 残留指纹');
  assert.ok(!fp.test(mainSrc), 'main.js 残留指纹');
});

test('main.js 只读正文与题库，不引用旧单元层', () => {
  const legacy = new RegExp('units' + '\\.json|chapterUnits|standards');
  assert.ok(!legacy.test(mainSrc));
  assert.ok(mainSrc.includes('docs') && mainSrc.includes('quiz.json'));
});
