#!/usr/bin/env node
/**
 * 第 6 章 消化和吸收 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言落在正文实测值与三张次序/去向表上：吸收走血还是走淋巴、胃排空次序、
 * 胰蛋白酶原的激活链。本章的考点就是次序与去向，所以这三张表是测试重点。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const {
  KEYWORDS,
  EMPTYING_ORDER,
  ACTIVATION,
  SLOW_WAVE_ROLE,
  read,
  hanzi,
  shape,
  citations,
  judgments,
  keywords,
  boundaryHits,
  absorptionRoute,
  emptyingFaster,
  activationStep,
  main,
} = require('./main');

const md = read();
const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));

test('正文规模：12993 汉字 / 8 个二级 / 9 个三级 / 12 个四级 / 68 行表格 / 70 段', () => {
  const s = shape(md);
  assert.strictEqual(s.hanzi, 12993);
  assert.strictEqual(s.h1, 1);
  assert.strictEqual(s.h2, 8);
  assert.strictEqual(s.h3, 9);
  assert.strictEqual(s.h4, 12);
  assert.strictEqual(s.tables, 68);
  assert.strictEqual(s.paras, 70);
});

test('引文 10 条、加粗判断句 58 条，引文到篇名级', () => {
  const c = citations(md);
  assert.strictEqual(c.length, 10);
  for (const x of c) {
    assert.strictEqual(x.book, '生理学');
    assert.match(x.part, /^第6章·6\.[1-4]/);
  }
  assert.strictEqual(judgments(md).length, 58);
});

test('关键词命中：吸收 65 / 排空 25 / 酶原 23 / 平滑肌 22 / 胆盐 10', () => {
  assert.deepStrictEqual(keywords(md), {
    吸收: 65,
    排空: 25,
    酶原: 23,
    平滑肌: 22,
    胆盐: 10,
  });
  assert.deepStrictEqual(KEYWORDS, ['酶原', '胆盐', '排空', '吸收', '平滑肌']);
});

test('吸收去向只看溶解性：水溶性走血、脂溶性走淋巴', () => {
  assert.strictEqual(absorptionRoute('水溶性').route, '血液');
  assert.strictEqual(absorptionRoute('脂溶性').route, '淋巴');
  assert.match(absorptionRoute('脂溶性').why, /乳糜微粒/);
  assert.throws(() => absorptionRoute('气态'), /未知产物类别/);
});

test('排空次序：液体 → 糖类 → 蛋白质 → 脂肪，脂肪最慢是小肠在踩刹车', () => {
  assert.deepStrictEqual(EMPTYING_ORDER, ['液体', '糖类', '蛋白质', '脂肪']);
  assert.strictEqual(emptyingFaster('糖类', '脂肪').faster, '糖类');
  assert.strictEqual(emptyingFaster('脂肪', '液体').faster, '液体');
  assert.match(emptyingFaster('蛋白质', '脂肪').why, /小肠在踩刹车/);
  assert.throws(() => emptyingFaster('脂肪', '纤维'), /未知食物类别/);
});

test('胰蛋白酶原的激活链：肠激酶起步，胰蛋白酶再放大', () => {
  assert.deepStrictEqual(ACTIVATION, ['肠激酶', '胰蛋白酶原', '胰蛋白酶', '糜蛋白酶原']);
  assert.strictEqual(activationStep('肠激酶').step, 1);
  assert.match(activationStep('肠激酶').note, /起步/);
  assert.strictEqual(activationStep('糜蛋白酶原').step, 4);
  assert.throws(() => activationStep('胃蛋白酶'), /未知环节/);
});

test('慢波定节拍、动作电位定力度', () => {
  assert.match(SLOW_WAVE_ROLE.慢波, /定节拍/);
  assert.match(SLOW_WAVE_ROLE.动作电位, /定力度/);
});

test('边界句与结构小节齐备', () => {
  assert.ok(boundaryHits(md) >= 1);
  assert.match(md, /免责声明/);
  assert.match(md, /^## 代价与边界/m);
});

test('quiz 契约：6 题、pre/check×3/post×2、4 选项、下标跨 3 种、解释 ≥30 汉字', () => {
  const qs = quiz.questions;
  assert.strictEqual(qs.length, 6);
  assert.deepStrictEqual(qs.map((q) => q.stage), ['pre', 'check', 'check', 'check', 'post', 'post']);
  assert.ok(new Set(qs.map((q) => q.correct)).size >= 3);
  for (const [i, q] of qs.entries()) {
    assert.strictEqual(q.options.length, 4);
    assert.deepStrictEqual(new Set(q.options).size, 4, `第 ${i + 1} 题选项重复`);
    assert.ok(q.correct >= 0 && q.correct <= 3);
    assert.ok(hanzi(q.explain) >= 30, `第 ${i + 1} 题 explain 只有 ${hanzi(q.explain)} 汉字`);
    assert.ok(String(q.explanation || '').length >= 10);
  }
});

test('quiz 接地：check 题正确项与正文共享 4 字词组（≥2 道）', () => {
  const clean = md.replace(/[^\u4e00-\u9fff]/g, ' ');
  const grams = new Set();
  for (const seg of clean.split(/\s+/)) {
    for (let i = 0; i + 4 <= seg.length; i += 1) grams.add(seg.slice(i, i + 4));
  }
  let grounded = 0;
  for (const q of quiz.questions) {
    if (q.stage !== 'check') continue;
    const right = q.options[q.correct].replace(/[^\u4e00-\u9fff]/g, ' ');
    if (right.split(/\s+/).some((seg) => {
      for (let i = 0; i + 4 <= seg.length; i += 1) if (grams.has(seg.slice(i, i + 4))) return true;
      return false;
    })) grounded += 1;
  }
  assert.ok(grounded >= 2, `只有 ${grounded} 道 check 题接地`);
});

test('main() 返回的规模与实测一致', () => {
  const r = main();
  assert.strictEqual(r.shape.hanzi, 12993);
  assert.strictEqual(r.order, 4);
});
