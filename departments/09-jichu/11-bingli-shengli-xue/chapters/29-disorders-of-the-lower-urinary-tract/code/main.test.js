#!/usr/bin/env node
/**
 * 第 29 章 下尿路疾病 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：节数与节号、讲义字数、docs 规模、节覆盖、
 * 引文归属、逐字引语、正文裸值，以及 quiz 的六题契约。
 * 不锁死正文措辞，讲义改写段落时测试不会变成噪声。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');

const {
  CHAPTER,
  BOUNDARY,
  DOC,
  loadChapter,
  shape,
  termFreq,
  docAudit,
  quizAudit,
} = require('./main');

const ch = loadChapter();
const doc = fs.readFileSync(DOC, 'utf8');

test('本章对应讲义第 29 章：11 节，节号从 29.1 到 29.11 连续', () => {
  assert.strictEqual(CHAPTER, 29);
  assert.strictEqual(ch.secs.length, 11);
  assert.deepStrictEqual(
    ch.secs.map((s) => s.no),
    ['29.1', '29.2', '29.3', '29.4', '29.5', '29.6', '29.7', '29.8', '29.9', '29.10', '29.11'],
  );
  for (const s of ch.secs) assert.ok(s.text.length > 0, `${s.no} 正文为空`);
});

test('讲义规模现算：5313 非空白字符、3917 汉字，不是手打', () => {
  const s = shape(ch);
  assert.strictEqual(s.secs, 11);
  assert.strictEqual(s.chars, 5313);
  assert.strictEqual(s.hanzi, 3917);
});

test('术语词频现算：膀胱 45 · 排尿 34 · 感染 29 · 梗阻 28（重心在功能词）', () => {
  const f = termFreq(ch);
  assert.strictEqual(f['膀胱'], 45);
  assert.strictEqual(f['排尿'], 34);
  assert.strictEqual(f['感染'], 29);
  assert.strictEqual(f['梗阻'], 28);
});

test('docs 规模在目标区间，且十一节节号全部出现', () => {
  const a = docAudit(doc, ch);
  assert.ok(a.chars >= 3000, `正文 ${a.chars} 非空白字 < 3000`);
  assert.ok(a.chars <= 9000, `正文 ${a.chars} 非空白字超出本章体量上限`);
  assert.deepStrictEqual(a.uncovered, [], `节号未覆盖：${a.uncovered.join('、')}`);
});

test('讲义引文 ≥3 条，全部落在第 29 章，且节号真实存在', () => {
  const a = docAudit(doc, ch);
  assert.ok(a.cites.length >= 3, `引文 ${a.cites.length} 条 < 3`);
  assert.deepStrictEqual(a.wrongCh, []);
  assert.deepStrictEqual(a.noSec, []);
  for (const c of a.cites) assert.strictEqual(c.ch, 29);
});

test('逐字引语能在讲义里找到，正文没有裸写的「数字＋计量单位」', () => {
  const a = docAudit(doc, ch);
  assert.deepStrictEqual(a.quoteBad, [], `引语核不到：${a.quoteBad.join(' / ')}`);
  assert.deepStrictEqual(a.bareLines, [], `正文带数值：${a.bareLines.join(' | ')}`);
});

test('docs 含必备段：MOTTO / PROBLEM / 双根因定位 / 末节 / 运行与验证', () => {
  for (const k of ['MOTTO', 'PROBLEM', '双根因定位', '环境逼迫', '知识积累', '代价与边界', '运行与验证', '免责']) {
    assert.ok(doc.includes(k), `docs 缺 ${k}`);
  }
  assert.ok(/不写数值/.test(doc), 'docs 缺「不写数值」声明');
  assert.ok(/不作诊断|不构成诊断/.test(doc), 'docs 缺「不作诊断」声明');
  assert.ok(doc.includes(BOUNDARY), 'docs 缺教学边界句');
});

test('quiz 恰 6 题：pre 1 · check 3 · post 2，题干键为 question，每题带引证', () => {
  const q = quizAudit();
  assert.strictEqual(q.total, 6);
  assert.strictEqual(q.pre, 1);
  assert.strictEqual(q.check, 3);
  assert.strictEqual(q.post, 2);
  assert.strictEqual(q.noQuestionKey, 0);
  assert.strictEqual(q.cited, 6, '有题目 explanation 缺引证关键词');
  const raw = JSON.parse(fs.readFileSync(require('./main').QUIZ, 'utf8')).questions;
  for (const x of raw) {
    assert.ok(Array.isArray(x.options) && x.options.length >= 2, '选项不足');
    assert.ok(Number.isInteger(x.correct) && x.correct >= 0 && x.correct < x.options.length, 'correct 越界');
    assert.match(x.explanation, /第29章·29\.\d+/, '引证没落到本章节号');
  }
});

test('教学边界句固定，且 main.js 最后一行就是它', () => {
  const src = fs.readFileSync(require('node:path').join(__dirname, 'main.js'), 'utf8').trimEnd();
  const last = src.split(/\r?\n/).slice(-3).join('\n');
  assert.match(last, /教学边界/);
  assert.match(BOUNDARY, /^教学边界：/);
  assert.match(BOUNDARY, /不构成诊断/);
});
