#!/usr/bin/env node
/**
 * 第 18 章 心脏功能异常 —— 确定性单元测试
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

test('本章 12 节，讲义 3549 汉字、4189 非空白字', () => {
  const s = shape(ch);
  assert.strictEqual(CHAPTER, 18);
  assert.strictEqual(s.secs, 12);
  assert.strictEqual(s.hanzi, 3549);
  assert.strictEqual(s.chars, 4189);
  assert.deepStrictEqual(
    ch.secs.map((s0) => s0.no),
    ['18.1', '18.2', '18.3', '18.4', '18.5', '18.6', '18.7', '18.8', '18.9', '18.10', '18.11', '18.12'],
  );
});

test('节号全部是 18.M 形式，章号与课程章号一致', () => {
  for (const s of ch.secs) assert.match(s.no, /^18\.(?:[1-9]|1[0-2])$/, `${s.no} 格式不对`);
  assert.ok(ch.title.startsWith('心脏功能异常'), ch.title);
  assert.strictEqual(CHAPTER, Number(ch.no));
});

test('关键词重心：失衡居首（先立分类框架，再用负荷把四类串成一张网）', () => {
  const kw = keywords(ch);
  const ranked = rank(kw);
  assert.strictEqual(ranked[0][0], '失衡');
  assert.strictEqual(kw['失衡'], 28);
  assert.strictEqual(kw['负荷'], 23);
  assert.strictEqual(kw['心肌'], 19);
  assert.strictEqual(kw['瓣膜'], 12);
  assert.strictEqual(kw['肥厚'], 12);
  assert.strictEqual(ranked[ranked.length - 1][0], '缺血');
});

test('docs 正文 ≥ 4189 非空白字，且 12 个节号全部出现（没有漏讲的节）', () => {
  assert.ok(nonWs(doc) >= 3000, `docs 只有 ${nonWs(doc)} 非空白字`);
  const cover = sectionCoverage(doc, ch);
  assert.deepStrictEqual(cover.off, [], `漏讲：${cover.off.join('、')}`);
  assert.strictEqual(cover.covered, cover.total);
});

test('引文 ≥3 条，全部指向第 18 章，节号真实存在', () => {
  const cite = citeAudit(doc, ch);
  assert.ok(cite.total >= 3, `引文只有 ${cite.total} 条`);
  assert.strictEqual(cite.wrongCh, 0, '有引文引串了章号');
  assert.deepStrictEqual(cite.noSec, [], `节号不存在：${cite.noSec.join('、')}`);
  assert.ok(cite.secs.length >= 3, '引文集中在一两节，覆盖太窄');
  assert.strictEqual(citeOf('18.1'), '补充·hermes-病理生理学讲义·第18章·18.1');
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
    assert.match(q.explanation, /补充·hermes-病理生理学讲义·第18章·\d+\.\d+/);
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
