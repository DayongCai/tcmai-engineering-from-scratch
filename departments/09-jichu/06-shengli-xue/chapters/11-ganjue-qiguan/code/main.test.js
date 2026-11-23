#!/usr/bin/env node
/**
 * 第 11 章 感觉器官 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言落在正文实测值与三处分类上：前庭两套感受装置与适宜刺激的配对、
 * 编码的三条对应、明暗条件下两类感光细胞的主次换位。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const {
  KEYWORDS,
  RECEPTOR_TRAITS,
  EAR_ROLE,
  AUDITORY_SCALE,
  read,
  hanzi,
  shape,
  citations,
  judgments,
  keywords,
  boundaryHits,
  receptorFor,
  codingDimension,
  photoreceptorFor,
  main,
} = require('./main');

const md = read();
const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));

test('正文规模：9166 汉字 / 8 个二级 / 8 个三级 / 12 个四级 / 47 行表格 / 41 段', () => {
  const s = shape(md);
  assert.strictEqual(s.hanzi, 9166);
  assert.strictEqual(s.h1, 1);
  assert.strictEqual(s.h2, 8);
  assert.strictEqual(s.h3, 8);
  assert.strictEqual(s.h4, 12);
  assert.strictEqual(s.tables, 47);
  assert.strictEqual(s.paras, 41);
});

test('引文 9 条、加粗判断句 16 条，引文到篇名级', () => {
  const c = citations(md);
  assert.strictEqual(c.length, 9);
  for (const x of c) {
    assert.strictEqual(x.book, '生理学');
    assert.match(x.part, /^第11章·11\.[1-4]/);
  }
  assert.strictEqual(judgments(md).length, 16);
});

test('关键词命中：适宜刺激 20 / 换能 14 / 听域 9 / 感受器电位 8 / 囊斑 4', () => {
  assert.deepStrictEqual(keywords(md), {
    适宜刺激: 20,
    换能: 14,
    听域: 9,
    感受器电位: 8,
    囊斑: 4,
  });
  assert.deepStrictEqual(KEYWORDS, ['适宜刺激', '换能', '感受器电位', '听域', '囊斑']);
});

test('前庭两套装置：囊斑管直线加速度，壶腹嵴管旋转', () => {
  assert.strictEqual(receptorFor('直线加速度').device, '囊斑');
  assert.strictEqual(receptorFor('旋转').device, '壶腹嵴');
  assert.match(receptorFor('直线加速度').where, /椭圆囊/);
  assert.match(receptorFor('旋转').basis, /惯性/);
  assert.throws(() => receptorFor('振动'), /未知刺激/);
});

test('编码三条对应：性质靠专用通路、强度靠纤维数目与疏密、部位靠投射关系', () => {
  assert.match(codingDimension('性质').how, /专用通路/);
  assert.match(codingDimension('强度').how, /纤维数目/);
  assert.match(codingDimension('部位').how, /投射/);
  assert.throws(() => codingDimension('时程'), /未知编码维度/);
});

test('明暗换位：暗靠视杆、亮靠视锥', () => {
  assert.strictEqual(photoreceptorFor('暗').main, '视杆细胞');
  assert.strictEqual(photoreceptorFor('亮').main, '视锥细胞');
  assert.match(photoreceptorFor('亮').why, /颜色与细节/);
  assert.throws(() => photoreceptorFor('弱光'), /未知光照条件/);
});

test('感受器四项特性、三段耳的分工、听觉三概念', () => {
  assert.deepStrictEqual(RECEPTOR_TRAITS, ['适宜刺激', '换能作用', '编码作用', '适应现象']);
  assert.match(EAR_ROLE.中耳, /阻抗匹配/);
  assert.match(EAR_ROLE.内耳, /换能/);
  assert.deepStrictEqual(AUDITORY_SCALE, ['听阈', '最大可听阈', '听域']);
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
  assert.strictEqual(r.shape.hanzi, 9166);
  assert.strictEqual(r.traits, 4);
});
