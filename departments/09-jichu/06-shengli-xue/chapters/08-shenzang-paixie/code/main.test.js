#!/usr/bin/env node
/**
 * 第 8 章 肾脏的排泄功能 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言落在正文实测值与三处方向判别上：有效滤过压的净值合成（含「推不出」）、
 * 重吸收的两个特点、清除率的三种读法。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const {
  KEYWORDS,
  EXCRETION,
  CONCENTRATION_CONDITIONS,
  LOOP_ROLE,
  read,
  hanzi,
  shape,
  citations,
  judgments,
  keywords,
  boundaryHits,
  effectiveFiltration,
  reabsorptionTrait,
  clearanceMeaning,
  main,
} = require('./main');

const md = read();
const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));

test('正文规模：9792 汉字 / 8 个二级 / 10 个三级 / 12 个四级 / 59 行表格 / 51 段', () => {
  const s = shape(md);
  assert.strictEqual(s.hanzi, 9792);
  assert.strictEqual(s.h1, 1);
  assert.strictEqual(s.h2, 8);
  assert.strictEqual(s.h3, 10);
  assert.strictEqual(s.h4, 12);
  assert.strictEqual(s.tables, 59);
  assert.strictEqual(s.paras, 51);
});

test('引文 1 条（篇名级）、加粗判断句 34 条', () => {
  const c = citations(md);
  assert.strictEqual(c.length, 1);
  assert.strictEqual(c[0].book, '生理学');
  assert.match(c[0].part, /^第8章·8\.2/);
  assert.strictEqual(judgments(md).length, 34);
});

test('关键词命中：滤过 91 / 重吸收 69 / 分泌 36 / 清除率 18 / 渗透梯度 5', () => {
  assert.deepStrictEqual(keywords(md), {
    滤过: 91,
    重吸收: 69,
    分泌: 36,
    清除率: 18,
    渗透梯度: 5,
  });
  assert.deepStrictEqual(KEYWORDS, ['滤过', '重吸收', '分泌', '渗透梯度', '清除率']);
});

test('排泄＝滤过＋分泌，不含重吸收', () => {
  assert.deepStrictEqual(EXCRETION.计入, ['滤过', '分泌']);
  assert.deepStrictEqual(EXCRETION.不计入, ['重吸收']);
});

test('有效滤过压是净值；两侧同向变动时返回「推不出」', () => {
  assert.strictEqual(effectiveFiltration({ push: '升', colloid: '不变', capsule: '不变' }).verdict, '增强');
  assert.strictEqual(effectiveFiltration({ push: '不变', colloid: '升', capsule: '不变' }).verdict, '减弱');
  assert.strictEqual(effectiveFiltration({ push: '不变', colloid: '不变', capsule: '升' }).verdict, '减弱');
  assert.strictEqual(effectiveFiltration({ push: '升', colloid: '升', capsule: '不变' }).verdict, '推不出');
  assert.throws(() => effectiveFiltration({ push: '大', colloid: '不变', capsule: '不变' }), /未知变化/);
});

test('重吸收的两个特点：选择性看转运体种类，有限性看饱和', () => {
  assert.match(reabsorptionTrait('选择性').basis, /转运体/);
  assert.match(reabsorptionTrait('有限性').basis, /饱和/);
  assert.match(reabsorptionTrait('有限性').example, /肾糖阈/);
  assert.throws(() => reabsorptionTrait('等渗性'), /未知特点/);
});

test('髓袢分工「降支出水、升支出盐」，浓缩两个条件缺一不可', () => {
  assert.match(LOOP_ROLE.降支细段, /水出/);
  assert.match(LOOP_ROLE.升支细段, /盐出/);
  assert.deepStrictEqual(CONCENTRATION_CONDITIONS, ['髓质渗透梯度是否建立', '集合管对水是否通透']);
});

test('清除率三种读法：只反映肾机能的某一个侧面', () => {
  assert.match(clearanceMeaning('只滤过').meaning, /滤过/);
  assert.match(clearanceMeaning('滤过并大量分泌').meaning, /肾血浆流量/);
  assert.match(clearanceMeaning('滤过并被大量重吸收').meaning, /重吸收/);
  assert.throws(() => clearanceMeaning('只分泌'), /未知转运方式/);
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
  assert.strictEqual(r.shape.hanzi, 9792);
  assert.strictEqual(r.conditions, 2);
});
