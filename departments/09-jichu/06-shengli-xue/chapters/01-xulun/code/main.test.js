#!/usr/bin/env node
/**
 * 第 1 章 绪论 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：正文规模、关键词命中、引文篇名级、加粗判断句数量，
 * 以及本卷 6 道题的契约（段位/选项/下标/解释长度/接地）。
 * 这些数全部由 main.js 从本章 docs/zh.md 现算，正文字数一变测试就红——这是故意的。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const {
  ARC,
  KEYWORDS,
  read,
  hanzi,
  shape,
  citations,
  judgments,
  keywords,
  boundaryHits,
  feedbackDirection,
  controlTiming,
  regulationProfile,
  arcComplete,
  main,
} = require('./main');

const md = read();
const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));

test('正文规模：8516 汉字 / 7 个二级 / 10 个三级 / 12 个四级 / 26 行表格 / 55 段', () => {
  const s = shape(md);
  assert.strictEqual(s.hanzi, 8516);
  assert.strictEqual(s.h2, 7);
  assert.strictEqual(s.h3, 10);
  assert.strictEqual(s.h4, 12);
  assert.strictEqual(s.tables, 26);
  assert.strictEqual(s.paras, 55);
  assert.strictEqual(s.h1, 1);
});

test('引文 8 条，全部到《书名·篇名》级，且落在教材第 1 章的 4 个小节上', () => {
  const c = citations(md);
  assert.strictEqual(c.length, 8);
  for (const x of c) {
    assert.strictEqual(x.book, '生理学');
    assert.match(x.part, /^第1章·1\.[1-4]$/);
  }
  assert.deepStrictEqual([...new Set(c.map((x) => x.part))].sort(), [
    '第1章·1.1', '第1章·1.2', '第1章·1.3', '第1章·1.4',
  ]);
});

test('加粗判断句 24 条，去重后仍是 24 条', () => {
  const j = judgments(md);
  assert.strictEqual(j.length, 24);
  assert.strictEqual(new Set(j).size, 24);
});

test('关键词命中：调节 68 / 反馈 27 / 稳态 16 / 前馈 16 / 回路 16', () => {
  assert.deepStrictEqual(keywords(md), {
    调节: 68,
    反馈: 27,
    稳态: 16,
    前馈: 16,
    回路: 16,
  });
  assert.deepStrictEqual(KEYWORDS, ['稳态', '调节', '反馈', '前馈', '回路']);
});

test('反馈方向与调节分工的三条判别', () => {
  assert.deepStrictEqual(feedbackDirection('减小'), {
    type: '负反馈', why: '偏差被改小，条件回到适宜一侧',
  });
  assert.strictEqual(feedbackDirection('加强').type, '正反馈');
  assert.throws(() => feedbackDirection('不确定'), /未知方向/);

  assert.match(controlTiming('已发生'), /^反馈/);
  assert.match(controlTiming('将发生'), /^前馈/);
  assert.throws(() => controlTiming('可能'), /未知依据/);

  assert.deepStrictEqual(regulationProfile('体液'), {
    kind: '体液', speed: '慢', reach: '广而久', basis: '载体 + 靶细胞',
  });
  assert.throws(() => regulationProfile('局部'), /未知调节方式/);
});

test('反射弧五段在正文里写全，且次序固定', () => {
  assert.deepStrictEqual(ARC, ['感受器', '传入神经', '神经中枢', '传出神经', '效应器']);
  assert.strictEqual(arcComplete(md), true);
  assert.strictEqual(arcComplete(md.split('传出神经').join('')), false);
});

test('「不给值」类边界句 9 处，免责声明与代价与边界都在', () => {
  assert.strictEqual(boundaryHits(md), 9);
  assert.match(md, /免责声明/);
  assert.match(md, /^## 代价与边界/m);
  assert.match(md, /本书不给值|不写数值/);
});

test('quiz 契约：6 题、pre/check×3/post×2、4 选项、下标跨 3 种以上、解释够长', () => {
  const qs = quiz.questions;
  assert.strictEqual(qs.length, 6);
  assert.deepStrictEqual(qs.map((q) => q.stage), ['pre', 'check', 'check', 'check', 'post', 'post']);
  assert.ok(new Set(qs.map((q) => q.correct)).size >= 3);
  for (const [i, q] of qs.entries()) {
    assert.ok(String(q.question || '').length >= 6, `第 ${i + 1} 题题干过短`);
    assert.strictEqual(q.options.length, 4);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct <= 3);
    assert.ok(hanzi(q.explain) >= 30, `第 ${i + 1} 题 explain 只有 ${hanzi(q.explain)} 汉字`);
    assert.ok(String(q.explanation || '').length >= 10);
    assert.deepStrictEqual(new Set(q.options).size, 4);
  }
});

test('quiz 接地：check 题的正确项里能找到正文的 4 字词组（≥2 道）', () => {
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
  assert.ok(grounded >= 2, `只有 ${grounded} 道 check 题的正确项与正文同词`);
});

test('main() 的末行是教学边界声明，且返回的规模与实测一致', () => {
  const r = main();
  assert.strictEqual(r.shape.hanzi, 8516);
  assert.strictEqual(r.arc, true);
  assert.strictEqual(r.judges.length, 24);
  assert.strictEqual(r.cites.length, 8);
});
