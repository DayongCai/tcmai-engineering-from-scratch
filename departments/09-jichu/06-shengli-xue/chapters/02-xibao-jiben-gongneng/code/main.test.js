#!/usr/bin/env node
/**
 * 第 2 章 细胞的基本功能 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言落在正文实测值与本章三处分类判别上：转运类别（方向/耗能/介导）、
 * 受体类别（穿膜次数）、耦联三步的次序。正文一改，数就变，测试立刻红。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const {
  KEYWORDS,
  CARRIER_TRAITS,
  read,
  hanzi,
  shape,
  citations,
  judgments,
  keywords,
  boundaryHits,
  transportKind,
  receptorClass,
  couplingStep,
  main,
} = require('./main');

const md = read();
const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));

test('正文规模：8580 汉字 / 7 个二级 / 9 个三级 / 12 个四级 / 41 行表格 / 52 段', () => {
  const s = shape(md);
  assert.strictEqual(s.hanzi, 8580);
  assert.strictEqual(s.h1, 1);
  assert.strictEqual(s.h2, 7);
  assert.strictEqual(s.h3, 9);
  assert.strictEqual(s.h4, 12);
  assert.strictEqual(s.tables, 41);
  assert.strictEqual(s.paras, 52);
});

test('引文 5 条、加粗判断句 28 条，引文全部落在教材第 2 章的 4 个小节', () => {
  const c = citations(md);
  assert.strictEqual(c.length, 5);
  for (const x of c) assert.strictEqual(x.book, '生理学');
  assert.deepStrictEqual([...new Set(c.map((x) => x.part))].sort(), [
    '第2章·2.1', '第2章·2.2', '第2章·2.3', '第2章·2.4',
  ]);
  assert.strictEqual(judgments(md).length, 28);
});

test('关键词命中：收缩 44 / 通道 37 / 受体 33 / 钙 16 / 动作电位 13', () => {
  assert.deepStrictEqual(keywords(md), {
    收缩: 44,
    通道: 37,
    受体: 33,
    钙: 16,
    动作电位: 13,
  });
  assert.deepStrictEqual(KEYWORDS, ['动作电位', '受体', '钙', '通道', '收缩']);
});

test('转运分类只看方向与耗能：顺/不耗能 → 被动，逆/耗能 → 主动', () => {
  assert.strictEqual(transportKind({ gradient: '顺', energy: false, protein: '无' }).kind, '单纯扩散');
  assert.strictEqual(transportKind({ gradient: '顺', energy: false, protein: '通道' }).kind, '易化扩散（通道介导）');
  assert.strictEqual(transportKind({ gradient: '顺', energy: false, protein: '载体' }).kind, '易化扩散（载体介导）');
  assert.strictEqual(transportKind({ gradient: '逆', energy: true, protein: '载体' }).kind, '主动转运');
  assert.throws(() => transportKind({ gradient: '逆', energy: false, protein: '载体' }), /逆梯度必须耗能/);
  assert.throws(() => transportKind({ gradient: '顺', energy: true, protein: '无' }), /与耗能无关/);
});

test('载体与通道的分水岭是三个性质，不是快慢', () => {
  assert.deepStrictEqual(CARRIER_TRAITS, ['结构特异性', '饱和现象', '竞争性抑制']);
  assert.match(transportKind({ gradient: '顺', energy: false, protein: '载体' }).note, /饱和现象/);
  assert.match(transportKind({ gradient: '顺', energy: false, protein: '通道' }).note, /门控/);
});

test('受体类别由穿膜次数定：单次＝酶耦联，多次＝G蛋白耦联', () => {
  assert.strictEqual(receptorClass('单次').kind, '酶耦联受体');
  assert.strictEqual(receptorClass('多次').kind, 'G蛋白耦联受体');
  assert.match(receptorClass('多次').route, /第二信使/);
  assert.match(receptorClass('单次').route, /不经 G 蛋白/);
  assert.throws(() => receptorClass('三次'), /未知穿膜次数/);
});

test('耦联三步的次序固定：横管去极化 → 肌质网释钙 → 钙与肌钙蛋白结合', () => {
  assert.strictEqual(couplingStep('横管去极化').order, 1);
  assert.strictEqual(couplingStep('肌质网释钙').order, 2);
  assert.strictEqual(couplingStep('钙与肌钙蛋白结合').order, 3);
  assert.throws(() => couplingStep('钙内流'), /未知环节/);
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
  assert.strictEqual(r.shape.hanzi, 8580);
  assert.strictEqual(r.coupling, 3);
});
