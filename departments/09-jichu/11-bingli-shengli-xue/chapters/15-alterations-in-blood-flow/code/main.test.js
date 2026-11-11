#!/usr/bin/env node
/**
 * 第 15 章 血流异常 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：讲义规模、关键词重心、节覆盖、引文条数与节号、
 * 引语逐字、正文裸数值是否为 0、quiz 契约、以及 main.js 末行的教学边界。
 * 不锁死正文措辞，讲义改写段落时测试不会变成噪声。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const {
  CHAPTER,
  BOUNDARY,
  citeOf,
  chapter,
  shape,
  keywords,
  rank,
  sectionCoverage,
  citeAudit,
  quoteAudit,
  valueAudit,
  nonWs,
} = require('./main');

const ch = chapter();
const doc = fs.readFileSync(path.join(__dirname, '..', 'docs', 'zh.md'), 'utf8');
const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));
const mainSrc = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8').trimEnd();

test('本章 10 节，讲义 3482 汉字、4600 非空白字', () => {
  const s = shape(ch);
  assert.strictEqual(CHAPTER, 15);
  assert.strictEqual(s.secs, 10);
  assert.strictEqual(s.hanzi, 3482);
  assert.strictEqual(s.chars, 4600);
  assert.deepStrictEqual(
    ch.secs.map((s0) => s0.no),
    ['15.1', '15.2', '15.3', '15.4', '15.5', '15.6', '15.7', '15.8', '15.9', '15.10'],
  );
});

test('节号全部是 15.M 形式，章号与课程章号一致', () => {
  for (const s of ch.secs) assert.match(s.no, /^15\.(?:[1-9]|10)$/, `${s.no} 格式不对`);
  assert.ok(ch.title.startsWith('血流异常'), ch.title);
  assert.strictEqual(CHAPTER, Number(ch.no));
});

test('关键词重心：缺血最多、侧支最少（笔墨压在缺血—血栓主干上）', () => {
  const kw = keywords(ch);
  const ranked = rank(kw);
  assert.strictEqual(ranked[0][0], '缺血');
  assert.strictEqual(kw['缺血'], 24);
  assert.strictEqual(kw['血栓'], 17);
  assert.strictEqual(kw['侧支'], 7);
  assert.ok(kw['梗死'] > 0 && kw['水肿'] > 0);
  assert.strictEqual(ranked[ranked.length - 1][0], '侧支');
});

test('docs 正文 ≥ 4600 非空白字，且 10 个节号全部出现（没有漏讲的节）', () => {
  assert.ok(nonWs(doc) >= 3000, `docs 只有 ${nonWs(doc)} 非空白字`);
  const cover = sectionCoverage(doc, ch);
  assert.deepStrictEqual(cover.off, [], `漏讲：${cover.off.join('、')}`);
  assert.strictEqual(cover.covered, cover.total);
});

test('引文 ≥3 条，全部指向第 15 章，节号真实存在', () => {
  const cite = citeAudit(doc, ch);
  assert.ok(cite.total >= 3, `引文只有 ${cite.total} 条`);
  assert.strictEqual(cite.wrongCh, 0, '有引文引串了章号');
  assert.deepStrictEqual(cite.noSec, [], `节号不存在：${cite.noSec.join('、')}`);
  assert.ok(cite.secs.length >= 3, '引文集中在一两节，覆盖太窄');
  assert.strictEqual(citeOf('15.1'), '补充·hermes-病理生理学讲义·第15章·15.1');
});

test('引语逐字：正文里 ≥6 字的「」全部能在讲义原文中找到', () => {
  const q = quoteAudit(doc, ch);
  assert.deepStrictEqual(q.lost, [], `找不到：${q.lost.join('、')}`);
  assert.ok(q.total > 0, '正文没有任何逐字引语，引证成了摆设');
});

test('正文非引用行零「数字＋单位」', () => {
  const v = valueAudit(doc);
  assert.strictEqual(v.hits, 0, `出现 ${v.hits} 行：${v.sample.join(' / ')}`);
});

test('quiz 恰 6 题（pre 1 · check 3 · post 2），题干键为 question，每题带引证', () => {
  const qs = quiz.questions;
  assert.strictEqual(qs.length, 6);
  const stage = (s) => qs.filter((q) => q.stage === s).length;
  assert.strictEqual(stage('pre'), 1);
  assert.strictEqual(stage('check'), 3);
  assert.strictEqual(stage('post'), 2);
  for (const q of qs) {
    assert.ok(q.question, '题干必须用 question 键');
    assert.ok(Array.isArray(q.options) && q.options.length >= 3);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < q.options.length);
    assert.match(q.explanation, /依据|口径见|前提|算见/);
    assert.match(q.explanation, /补充·hermes-病理生理学讲义·第15章·1[0-9]\.\d+/);
  }
});

test('docs 必备段齐：MOTTO / PROBLEM / 双根因定位 / 代价与边界 / 运行与验证 / 免责', () => {
  for (const k of ['MOTTO', 'PROBLEM', '双根因定位', '环境逼迫', '知识积累', '代价与边界', '运行与验证', '免责']) {
    assert.ok(doc.includes(k), `docs 缺 ${k}`);
  }
  assert.ok(/不写数值/.test(doc), 'docs 缺「不写数值」声明');
  assert.ok(!doc.includes('教材·'), 'docs 出现了「教材·」前缀（本章只引讲义）');
});

test('main.js 末行打印教学边界，且与 docs 里的边界句一致', () => {
  const tail = mainSrc.split(/\r?\n/).slice(-3).join('\n');
  assert.match(tail, /教学边界/);
  assert.match(BOUNDARY, /不构成/);
  assert.ok(doc.includes(BOUNDARY), 'docs 里的边界句与 main.js 不一致');
});
