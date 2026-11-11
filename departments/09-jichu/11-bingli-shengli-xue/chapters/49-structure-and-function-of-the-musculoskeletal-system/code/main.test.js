#!/usr/bin/env node
/**
 * 第 47 章 疼痛 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：章号与节数、篇幅两极、关键词频、引文是否指向本章且节号存在、
 * 引语是否逐字、节是否全覆盖、正文有没有裸写的「数字＋计量单位」、quiz 契约、文件末行的教学边界。
 * 不锁死正文措辞——改写段落时测试不会变成噪声。
 * 换章只改 EXPECT 这一块：其余断言对任何一章都成立。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const {
  CONFIG,
  BOUNDARY,
  chapter,
  shape,
  keywordFreq,
  rank,
  readDoc,
  citeAudit,
  quoteAudit,
  bareAudit,
  coverAudit,
  quizAudit,
  nonWs,
} = require('./main');

const EXPECT = {
  no: 49,
  unit: 'U14',
  titlePrefix: '骨骼肌肉系统结构与功能',
  secs: [
    '49.1', '49.2', '49.3', '49.4', '49.5', '49.6',
    '49.7', '49.8', '49.9', '49.10', '49.11', '49.12',
  ],
  chars: 7982,
  shortest: '49.7',
  longest: '49.4',
  freq: { 软骨: 18, 肌肉: 22, 骨小梁: 6, 力学: 11, 重建: 6, 耦联: 5 },
};

const ch = chapter();
const doc = readDoc();

test(`章号与章题对得上讲义：第 ${EXPECT.no} 章，${EXPECT.secs.length} 节`, () => {
  assert.strictEqual(CONFIG.no, EXPECT.no);
  assert.strictEqual(ch.no, EXPECT.no);
  assert.strictEqual(ch.unit, EXPECT.unit);
  assert.ok(ch.title.startsWith(EXPECT.titlePrefix), `讲义章题：${ch.title}`);
  assert.deepStrictEqual(ch.secs.map((s) => s.no), EXPECT.secs);
  const s = shape(ch);
  assert.strictEqual(s.secs, EXPECT.secs.length);
  assert.strictEqual(s.span, `${EXPECT.secs[0]}–${EXPECT.secs[EXPECT.secs.length - 1]}`);
  assert.strictEqual(s.chars, EXPECT.chars);
  assert.strictEqual(s.shortest.no, EXPECT.shortest);
  assert.strictEqual(s.longest.no, EXPECT.longest);
});

test('关键词频可复算，且重心落在预期那一词上', () => {
  const f = keywordFreq(ch);
  for (const [k, v] of Object.entries(EXPECT.freq)) {
    assert.strictEqual(f[k], v, `「${k}」词频不等于 ${v}`);
  }
  const top = rank(f)[0][0];
  assert.ok(Object.keys(EXPECT.freq).includes(top), `重心落在「${top}」，不在本章词表重心上`);
});

test('讲义引文 ≥3 条，全部指向本章，节号真实存在', () => {
  const c = citeAudit(doc, ch);
  assert.ok(c.total >= 8 && c.total <= 24, `引文 ${c.total} 条，应落在 8–24 之间`);
  assert.deepStrictEqual(c.wrongCh, [], '有引文指向别的章');
  assert.deepStrictEqual(c.unknownSec, [], '有引文用了不存在的节号');
  assert.strictEqual(c.secs.length, EXPECT.secs.length, '每一节的节号都应被引到');
});

test('引语逐字：全页「」内 ≥6 字的句子，都能在讲义本章正文里找到', () => {
  const q = quoteAudit(doc, ch);
  assert.ok(q.total >= 10, `引语只有 ${q.total} 条，太薄`);
  assert.deepStrictEqual(q.lost, [], `有引语在讲义里找不到：${q.lost.join(' / ')}`);
});

test('讲义每一节都在正文出现节号', () => {
  const cov = coverAudit(doc, ch);
  assert.strictEqual(cov.total, EXPECT.secs.length);
  assert.strictEqual(cov.covered, EXPECT.secs.length);
  assert.deepStrictEqual(cov.missing, []);
});

test('正文零裸值：非引用行没有「数字＋计量单位」', () => {
  assert.deepStrictEqual(bareAudit(doc), [], 'docs 出现裸数值');
});

test('本页规模落在教学正文区间，且必备段齐全', () => {
  const n = nonWs(doc);
  assert.ok(n >= 3000, `正文 ${n} 非空白字 < 3000`);
  assert.ok(n <= 11500, `正文 ${n} 非空白字偏长`);
  for (const k of ['MOTTO', 'PROBLEM', '双根因定位', '环境逼迫', '知识积累', '运行与验证', '免责', '代价与边界']) {
    assert.ok(doc.includes(k), `docs 缺 ${k}`);
  }
  assert.ok(doc.includes(BOUNDARY), 'docs 缺教学边界句');
  assert.ok(/不写数值/.test(doc), 'docs 缺「不写数值」声明');
  assert.ok(/不作诊断/.test(doc), 'docs 缺「不作诊断」声明');
  assert.ok(!doc.includes('%'), 'docs 出现百分号（本书不给百分比数值）');
  assert.ok(!/教材·[^\n]*讲义/.test(doc), '把讲义标成了「教材」');
});

test('quiz 契约：6 题 · pre 1 / check 3 / post 2 · 题干键 question · 每题带引证', () => {
  const q = quizAudit();
  assert.strictEqual(q.total, 6);
  assert.strictEqual(q.pre, 1);
  assert.strictEqual(q.check, 3);
  assert.strictEqual(q.post, 2);
  assert.strictEqual(q.wrongKey, 0, '有题目用了 question 以外的题干键');
  assert.strictEqual(q.uncited, 0, '有题目缺引证');
  const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));
  for (const item of quiz.questions) {
    assert.ok(Array.isArray(item.options) && item.options.length === 4, '每题四个选项');
    assert.ok(item.correct >= 0 && item.correct < 4, 'correct 越界');
    assert.match(item.explanation, new RegExp(`补充·hermes-病理生理学讲义·第${EXPECT.no}章·\\d+\\.\\d+`), '引证没写节号');
  }
});

test('main.js 末三行带教学边界，且末行输出与 docs 声明一致', () => {
  const src = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8').trimEnd().split(/\r?\n/);
  assert.ok(src.slice(-3).join('\n').includes('教学边界'), 'main.js 末行未打印教学边界');
  assert.match(BOUNDARY, /^教学边界：/);
  assert.match(BOUNDARY, /不构成/);
  assert.ok(doc.includes(BOUNDARY));
});
