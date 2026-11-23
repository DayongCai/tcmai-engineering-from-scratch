#!/usr/bin/env node
/**
 * 第 9 章 内分泌 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言落在正文实测值与三处机制岔口上：溶解性定受体位置、反馈按「谁反馈给谁」分、
 * 三种相互作用的区别（允许作用最容易漏）。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const {
  KEYWORDS,
  HYPOTHALAMIC_ROUTES,
  NEUROHYPOPHYSIS,
  read,
  hanzi,
  shape,
  citations,
  judgments,
  keywords,
  boundaryHits,
  receptorSite,
  feedbackClass,
  interaction,
  main,
} = require('./main');

const md = read();
const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));

test('正文规模：9641 汉字 / 8 个二级 / 10 个三级 / 12 个四级 / 55 行表格 / 55 段', () => {
  const s = shape(md);
  assert.strictEqual(s.hanzi, 9641);
  assert.strictEqual(s.h1, 1);
  assert.strictEqual(s.h2, 8);
  assert.strictEqual(s.h3, 10);
  assert.strictEqual(s.h4, 12);
  assert.strictEqual(s.tables, 55);
  assert.strictEqual(s.paras, 55);
});

test('引文 1 条（篇名级）、加粗判断句 28 条', () => {
  const c = citations(md);
  assert.strictEqual(c.length, 1);
  assert.strictEqual(c[0].book, '生理学');
  assert.match(c[0].part, /^第9章·9\.1/);
  assert.strictEqual(judgments(md).length, 28);
});

test('关键词命中：激素 128 / 反馈 38 / 受体 37 / 靶 20 / 溶解性 7', () => {
  assert.deepStrictEqual(keywords(md), {
    激素: 128,
    反馈: 38,
    受体: 37,
    靶: 20,
    溶解性: 7,
  });
  assert.deepStrictEqual(KEYWORDS, ['受体', '溶解性', '反馈', '靶', '激素']);
});

test('溶解性定受体位置：水溶性走膜受体，脂溶性走胞内受体', () => {
  assert.strictEqual(receptorSite('水溶性').site, '膜受体');
  assert.strictEqual(receptorSite('脂溶性').site, '胞内受体');
  assert.match(receptorSite('脂溶性').route, /基因表达/);
  assert.strictEqual(receptorSite('水溶性').onset, '相对迅速');
  assert.throws(() => receptorSite('两亲性'), /未知溶解性/);
});

test('反馈按「谁反馈给谁」分三类', () => {
  assert.match(feedbackClass('长反馈').what, /靶腺激素/);
  assert.match(feedbackClass('短反馈').what, /促激素/);
  assert.match(feedbackClass('超短反馈').what, /自身/);
  assert.throws(() => feedbackClass('正反馈'), /未知反馈类别/);
});

test('三种相互作用：允许作用不直接产生效应，只为另一种激素创造条件', () => {
  assert.match(interaction('协同').what, /叠加/);
  assert.match(interaction('拮抗').what, /相抵/);
  assert.match(interaction('允许作用').what, /创造条件/);
  assert.throws(() => interaction('增强'), /未知相互作用/);
});

test('下丘脑两条通路与神经垂体的「只储存不合成」', () => {
  assert.deepStrictEqual(Object.keys(HYPOTHALAMIC_ROUTES), ['大细胞性神经分泌细胞', '小细胞性神经分泌细胞']);
  assert.match(HYPOTHALAMIC_ROUTES.大细胞性神经分泌细胞, /神经垂体/);
  assert.match(HYPOTHALAMIC_ROUTES.小细胞性神经分泌细胞, /腺垂体/);
  assert.strictEqual(NEUROHYPOPHYSIS.能合成激素, false);
  assert.match(NEUROHYPOPHYSIS.职能, /储存与释放/);
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
  assert.strictEqual(r.shape.hanzi, 9641);
  assert.strictEqual(r.routes, 2);
});
