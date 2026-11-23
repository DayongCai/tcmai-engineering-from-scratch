#!/usr/bin/env node
/**
 * 第 3 章 血液 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言落在正文实测值与两张判定表上：凝集（抗原×抗体）、ABO 的抗原抗体互补表、
 * 血清与血浆的差别。这些表是布尔的，不需要数值也能判。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const {
  KEYWORDS,
  HEMOSTASIS,
  ABO,
  read,
  hanzi,
  shape,
  citations,
  judgments,
  keywords,
  boundaryHits,
  agglutination,
  reactionClass,
  specimen,
  aboOf,
  main,
} = require('./main');

const md = read();
const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));

test('正文规模：9772 汉字 / 7 个二级 / 9 个三级 / 12 个四级 / 83 行表格 / 51 段', () => {
  const s = shape(md);
  assert.strictEqual(s.hanzi, 9772);
  assert.strictEqual(s.h1, 1);
  assert.strictEqual(s.h2, 7);
  assert.strictEqual(s.h3, 9);
  assert.strictEqual(s.h4, 12);
  assert.strictEqual(s.tables, 83);
  assert.strictEqual(s.paras, 51);
});

test('引文 7 条、加粗判断句 23 条，引文都到篇名级', () => {
  const c = citations(md);
  assert.strictEqual(c.length, 7);
  for (const x of c) {
    assert.strictEqual(x.book, '生理学');
    assert.match(x.part, /^第3章·3\.[1-4]$/);
  }
  assert.strictEqual(judgments(md).length, 23);
});

test('关键词命中：血浆 40 / 红细胞 33 / 纤维蛋白 27 / 凝集 20 / 凝固 8', () => {
  assert.deepStrictEqual(keywords(md), {
    血浆: 40,
    红细胞: 33,
    纤维蛋白: 27,
    凝集: 20,
    凝固: 8,
  });
  assert.deepStrictEqual(KEYWORDS, ['凝集', '凝固', '纤维蛋白', '血浆', '红细胞']);
});

test('凝集判定：抗原与抗体必须同时在场', () => {
  assert.deepStrictEqual(agglutination({ donorAntigen: true, recipientAntibody: true }), {
    hit: true,
    verdict: '凝集',
    why: '供者红细胞膜上的抗原遇到受者血浆中的对应抗体，抗体把相邻红细胞连成团',
  });
  assert.strictEqual(agglutination({ donorAntigen: true, recipientAntibody: false }).verdict, '不凝集');
  assert.strictEqual(agglutination({ donorAntigen: false, recipientAntibody: true }).verdict, '不凝集');
});

test('凝集与凝固分属两类反应，不能互推', () => {
  assert.strictEqual(reactionClass('凝集').class, '抗原抗体反应');
  assert.strictEqual(reactionClass('凝固').class, '酶促级联反应');
  assert.match(reactionClass('凝固').basis, /纤维蛋白/);
  assert.throws(() => reactionClass('聚集'), /未知现象/);
});

test('血清与血浆只差在纤维蛋白原', () => {
  assert.strictEqual(specimen(true).name, '血浆');
  assert.strictEqual(specimen(false).name, '血清');
  assert.match(specimen(false).why, /纤维蛋白原/);
});

test('ABO 的抗原与抗体互补：A 有抗 B、B 有抗 A、AB 皆无、O 皆有两支', () => {
  assert.deepStrictEqual(aboOf('A').antibodies, ['抗B']);
  assert.deepStrictEqual(aboOf('B').antibodies, ['抗A']);
  assert.deepStrictEqual(aboOf('AB').antibodies, []);
  assert.deepStrictEqual(aboOf('O').antibodies, ['抗A', '抗B']);
  assert.deepStrictEqual(aboOf('O').antigens, []);
  assert.deepStrictEqual(Object.keys(ABO).sort(), ['A', 'AB', 'B', 'O']);
  assert.throws(() => aboOf('Rh'), /未知血型/);
});

test('止血是三枚齿轮：血管收缩 / 血小板止血栓 / 血液凝固', () => {
  assert.deepStrictEqual(HEMOSTASIS, ['血管收缩', '血小板止血栓', '血液凝固']);
  assert.strictEqual(HEMOSTASIS.length, 3);
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
  assert.strictEqual(r.shape.hanzi, 9772);
  assert.strictEqual(r.hemostasis, 3);
});
