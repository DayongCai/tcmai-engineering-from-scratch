#!/usr/bin/env node
/**
 * 第 10 章 神经系统 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言落在正文实测值与三处分类上：抑制发生的部位、突触后抑制的两种来源、
 * 化学性与电突触的传递性质。本章最密的一节是抑制，所以抑制相关判别是重点。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const {
  KEYWORDS,
  CENTRAL_FEATURES,
  PROJECTION,
  read,
  hanzi,
  shape,
  citations,
  judgments,
  keywords,
  boundaryHits,
  inhibitionSite,
  postsynapticKind,
  synapseType,
  main,
} = require('./main');

const md = read();
const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));

test('正文规模：9213 汉字 / 8 个二级 / 8 个三级 / 12 个四级 / 43 行表格 / 42 段', () => {
  const s = shape(md);
  assert.strictEqual(s.hanzi, 9213);
  assert.strictEqual(s.h1, 1);
  assert.strictEqual(s.h2, 8);
  assert.strictEqual(s.h3, 8);
  assert.strictEqual(s.h4, 12);
  assert.strictEqual(s.tables, 43);
  assert.strictEqual(s.paras, 42);
});

test('引文 8 条、加粗判断句 15 条，引文到篇名级', () => {
  const c = citations(md);
  assert.strictEqual(c.length, 8);
  for (const x of c) {
    assert.strictEqual(x.book, '生理学');
    assert.match(x.part, /^第10章·10\.[1-4]/);
  }
  assert.strictEqual(judgments(md).length, 15);
});

test('关键词命中：突触 58 / 抑制 37 / 递质 27 / 反射 26 / 易化 1', () => {
  assert.deepStrictEqual(keywords(md), {
    突触: 58,
    抑制: 37,
    递质: 27,
    反射: 26,
    易化: 1,
  });
  assert.deepStrictEqual(KEYWORDS, ['抑制', '突触', '递质', '反射', '易化']);
});

test('抑制按部位分两类：后膜超极化 vs 前末梢减少递质释放', () => {
  assert.match(inhibitionSite('突触后').mechanism, /抑制性突触后电位/);
  assert.match(inhibitionSite('突触前').mechanism, /减少递质释放/);
  assert.throws(() => inhibitionSite('轴突'), /未知部位/);
});

test('突触后抑制的两种来源都属负反馈，但意义不同', () => {
  const a = postsynapticKind('传入侧支');
  const b = postsynapticKind('回返');
  assert.match(a.role, /拮抗/);
  assert.match(b.role, /适时终止/);
  assert.strictEqual(a.negativeFeedback, true);
  assert.strictEqual(b.negativeFeedback, true);
  assert.throws(() => postsynapticKind('侧支'), /未知来源/);
});

test('化学性突触单向、电突触低电阻直接传播', () => {
  assert.strictEqual(synapseType('化学').feature, '单向性');
  assert.strictEqual(synapseType('电').feature, '低电阻直接传播');
  assert.match(synapseType('电').basis, /缝隙连接/);
  assert.throws(() => synapseType('混合'), /未知突触类别/);
});

test('中枢兴奋传递五特征与两套投射系统', () => {
  assert.deepStrictEqual(CENTRAL_FEATURES, ['单向传递', '中枢延搁', '总和', '后放', '易疲劳']);
  assert.match(PROJECTION.特异投射系统, /点对点/);
  assert.match(PROJECTION.非特异投射系统, /弥散/);
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
  assert.strictEqual(r.shape.hanzi, 9213);
  assert.strictEqual(r.features, 5);
});
