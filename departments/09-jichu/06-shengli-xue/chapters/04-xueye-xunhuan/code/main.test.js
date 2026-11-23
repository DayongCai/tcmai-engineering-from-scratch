#!/usr/bin/env node
/**
 * 第 4 章 血液循环 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言落在正文实测值与三处方向判别上：瓣膜状态定时相、口径与阻力、
 * 缺氧在两个循环里的相反方向。这些判断不需要数值也能判。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const {
  KEYWORDS,
  REGULATION_SCALES,
  read,
  hanzi,
  shape,
  citations,
  judgments,
  keywords,
  boundaryHits,
  cardiacPhase,
  resistanceBy,
  hypoxiaEffect,
  main,
} = require('./main');

const md = read();
const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));

test('正文规模：11573 汉字 / 8 个二级 / 9 个三级 / 12 个四级 / 53 行表格 / 59 段', () => {
  const s = shape(md);
  assert.strictEqual(s.hanzi, 11573);
  assert.strictEqual(s.h1, 1);
  assert.strictEqual(s.h2, 8);
  assert.strictEqual(s.h3, 9);
  assert.strictEqual(s.h4, 12);
  assert.strictEqual(s.tables, 53);
  assert.strictEqual(s.paras, 59);
});

test('引文 8 条、加粗判断句 48 条，引文到篇名级', () => {
  const c = citations(md);
  assert.strictEqual(c.length, 8);
  for (const x of c) {
    assert.strictEqual(x.book, '生理学');
    assert.match(x.part, /^第4章·4\.[1-4]/);
  }
  assert.strictEqual(judgments(md).length, 48);
});

test('关键词命中：调节 79 / 阻力 27 / 压差 14 / 不应期 12 / 瓣膜 11', () => {
  assert.deepStrictEqual(keywords(md), {
    调节: 79,
    阻力: 27,
    压差: 14,
    不应期: 12,
    瓣膜: 11,
  });
  assert.deepStrictEqual(KEYWORDS, ['压差', '阻力', '瓣膜', '不应期', '调节']);
});

test('时相由两个瓣膜的状态唯一决定，两瓣同开不成立', () => {
  assert.strictEqual(cardiacPhase({ av: '关', sl: '开' }).phase, '射血期');
  assert.strictEqual(cardiacPhase({ av: '开', sl: '关' }).phase, '充盈期');
  assert.strictEqual(cardiacPhase({ av: '关', sl: '关' }).phase, '等容期');
  assert.strictEqual(cardiacPhase({ av: '开', sl: '开' }).phase, '不可能');
  assert.throws(() => cardiacPhase({ av: '半开', sl: '关' }), /未知瓣膜状态/);
});

test('口径与阻力：减小则阻力增大，且与半径的高次幂反变', () => {
  assert.strictEqual(resistanceBy('减小').change, '阻力增大');
  assert.strictEqual(resistanceBy('增大').change, '阻力减小');
  assert.match(resistanceBy('减小').why, /高次幂/);
  assert.throws(() => resistanceBy('不变'), /未知口径变化/);
});

test('缺氧在肺循环收缩、在体循环舒张：同一因素两个方向', () => {
  assert.strictEqual(hypoxiaEffect('肺循环').dir, '收缩');
  assert.strictEqual(hypoxiaEffect('体循环').dir, '舒张');
  assert.match(hypoxiaEffect('肺循环').why, /通气/);
  assert.throws(() => hypoxiaEffect('冠脉'), /未知循环/);
});

test('三条调节的时间尺度只写类别，不含任何数值', () => {
  assert.deepStrictEqual(Object.keys(REGULATION_SCALES), ['神经调节', '体液调节', '自身调节']);
  for (const v of Object.values(REGULATION_SCALES)) assert.ok(hanzi(v) > 8);
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
  assert.strictEqual(r.shape.hanzi, 11573);
  assert.strictEqual(r.phases, 4);
});
