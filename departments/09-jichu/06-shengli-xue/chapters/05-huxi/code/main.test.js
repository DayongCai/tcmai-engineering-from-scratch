#!/usr/bin/env node
/**
 * 第 5 章 呼吸 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言落在正文实测值与三处方向判别上：比值失调的两种效应、呼吸肌的主被动、
 * 扩散的动力来源。本章最贵的是方向题，所以判别函数是测试重点。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const {
  KEYWORDS,
  CHAIN,
  read,
  hanzi,
  shape,
  citations,
  judgments,
  keywords,
  boundaryHits,
  vaqMismatch,
  breathWork,
  diffusionBasis,
  main,
} = require('./main');

const md = read();
const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));

test('正文规模：11484 汉字 / 8 个二级 / 9 个三级 / 12 个四级 / 42 行表格 / 61 段', () => {
  const s = shape(md);
  assert.strictEqual(s.hanzi, 11484);
  assert.strictEqual(s.h1, 1);
  assert.strictEqual(s.h2, 8);
  assert.strictEqual(s.h3, 9);
  assert.strictEqual(s.h4, 12);
  assert.strictEqual(s.tables, 42);
  assert.strictEqual(s.paras, 61);
});

test('引文 11 条、加粗判断句 52 条，引文到篇名级', () => {
  const c = citations(md);
  assert.strictEqual(c.length, 11);
  for (const x of c) {
    assert.strictEqual(x.book, '生理学');
    assert.match(x.part, /^第5章·5\.[1-4]/);
  }
  assert.strictEqual(judgments(md).length, 52);
});

test('关键词命中：通气 61 / 肺泡 41 / 分压差 21 / 无效腔 20 / 换气 14', () => {
  assert.deepStrictEqual(keywords(md), {
    通气: 61,
    肺泡: 41,
    分压差: 21,
    无效腔: 20,
    换气: 14,
  });
  assert.deepStrictEqual(KEYWORDS, ['分压差', '通气', '换气', '无效腔', '肺泡']);
});

test('四个环节一条链，次序固定', () => {
  assert.deepStrictEqual(CHAIN, ['肺通气', '肺换气', '气体在血液中的运输', '组织换气']);
});

test('比值失调的两种方向：气多血少＝无效腔样，气少血多＝分流样', () => {
  assert.strictEqual(vaqMismatch({ ventilation: '过剩', perfusion: '不足' }).effect, '无效腔样效应');
  assert.strictEqual(vaqMismatch({ ventilation: '不足', perfusion: '过剩' }).effect, '分流样效应');
  assert.match(vaqMismatch({ ventilation: '过剩', perfusion: '过剩' }).effect, /匹配/);
  assert.throws(() => vaqMismatch({ ventilation: '多', perfusion: '少' }), /未知组合/);
});

test('呼吸肌：平静吸气主动、平静呼气被动、用力呼气转为主动', () => {
  assert.strictEqual(breathWork('平静吸气').active, true);
  assert.strictEqual(breathWork('平静呼气').active, false);
  assert.strictEqual(breathWork('用力呼气').active, true);
  assert.match(breathWork('平静呼气').who, /弹性回缩/);
  assert.throws(() => breathWork('屏气'), /未知呼吸状态/);
});

test('扩散方向由分压差定，二氧化碳靠溶解度补上分压差的不足', () => {
  assert.match(diffusionBasis('氧').driven, /肺泡侧向血液侧/);
  assert.match(diffusionBasis('二氧化碳').driven, /血液侧向肺泡侧/);
  assert.match(diffusionBasis('二氧化碳').factor, /溶解度/);
  assert.throws(() => diffusionBasis('氮'), /未知气体/);
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
  assert.strictEqual(r.shape.hanzi, 11484);
  assert.strictEqual(r.chain, 4);
});
