#!/usr/bin/env node
/**
 * 呼吸功能与气体交换异常：四个环节与两类血气方向
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：讲义规模、主线词的落位、docs 覆盖、引文节号、
 * 引语是否逐字、正文有没有裸数值、quiz 契约、末行教学边界。
 * 不锁死正文措辞——讲义改写段落时，测试不会退化成噪声。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const {
  CHAPTER,
  TITLE,
  CHAIN,
  BOUNDARY,
  loadChapter,
  shape,
  secsMentioning,
  checkSecFormat,
  auditDoc,
} = require('./main');

const ch = loadChapter();
const s = shape(ch);
const doc = fs.readFileSync(path.join(__dirname, '..', 'docs', 'zh.md'), 'utf8');
const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));

test('章号 21、标题与讲义一致、11 节 33 段', () => {
  assert.strictEqual(CHAPTER, 21);
  assert.strictEqual(ch.no, 21);
  assert.match(ch.title, /呼吸功能与气体交换异常/);
  assert.strictEqual(s.secs, 11);
  assert.strictEqual(s.paras, 33);
  assert.deepStrictEqual(
    ch.secs.map((x) => x.no),
    [
    '21.1',
    '21.2',
    '21.3',
    '21.4',
    '21.5',
    '21.6',
    '21.7',
    '21.8',
    '21.9',
    '21.10',
    '21.11'
    ]
  );
});

test('小节号全部合 21.M，讲义规模在 3 千字以上', () => {
  const fmt = checkSecFormat(ch);
  assert.strictEqual(fmt.ok, true, `非法小节号：${fmt.bad.join('、')}`);
  assert.ok(s.chars >= 3000, `讲义本章只有 ${s.chars} 非空白字符`);
  assert.ok(s.hanzi >= 2500, `讲义本章只有 ${s.hanzi} 汉字`);
});

test('主线词在讲义里各自落位（通气/弥散/灌流/匹配）', () => {
  assert.deepStrictEqual(CHAIN.words, ['通气', '弥散', '灌流', '匹配']);
  assert.deepStrictEqual(secsMentioning(ch, '通气'), ['21.1', '21.2', '21.3', '21.4', '21.5', '21.6', '21.7', '21.8', '21.9', '21.10', '21.11']);
  assert.deepStrictEqual(secsMentioning(ch, '弥散'), ['21.1', '21.4', '21.6', '21.8']);
  assert.deepStrictEqual(secsMentioning(ch, '灌流'), ['21.1', '21.5', '21.6', '21.8']);
  assert.deepStrictEqual(secsMentioning(ch, '匹配'), ['21.1', '21.6']);
});

test('docs 覆盖讲义本章每一节', () => {
  const d = auditDoc(ch);
  assert.strictEqual(d.ready, true);
  assert.deepStrictEqual(d.uncovered, [], `未覆盖节号：${d.uncovered.join('、')}`);
  for (const x of ch.secs) assert.ok(doc.includes(x.no), `docs 没点明 ${x.no}`);
});

test('讲义引文 ≥ 8 条，章号全为 21，节号全部真实存在', () => {
  const d = auditDoc(ch);
  assert.ok(d.cites >= 8, `只有 ${d.cites} 条引文`);
  assert.strictEqual(d.wrongCh, 0, `有 ${d.wrongCh} 条引文引错章`);
  assert.deepStrictEqual(d.noSec, [], `节号不存在：${d.noSec.join('、')}`);
});

test('「」引语逐字：非引用行里每条 ≥6 字的引语都能在讲义本章正文找到', () => {
  const d = auditDoc(ch);
  assert.ok(d.quotes >= 10, `只查到 ${d.quotes} 条引语`);
  assert.deepStrictEqual(d.lost, [], `找不到：${d.lost.map((q) => q.slice(0, 12)).join(' / ')}`);
});

test('正文零裸数值（引用行豁免）', () => {
  const d = auditDoc(ch);
  assert.strictEqual(d.bare, 0, `有 ${d.bare} 行正文带数值与单位`);
});

test('docs 具备 MOTTO / PROBLEM / 双根因定位 / 运行与验证 / 边界末节', () => {
  for (const k of ['MOTTO', 'PROBLEM', '双根因定位', '环境逼迫', '知识积累', '运行与验证']) {
    assert.ok(doc.includes(k), `docs 缺 ${k}`);
  }
  const heads = doc.split(/\r?\n/).filter((l) => /^##\s/.test(l));
  assert.ok(heads.some((l) => /代价与边界|边界|免责/.test(l)), 'docs 缺末节（代价与边界 / 边界 / 免责）');
  assert.ok(doc.includes(BOUNDARY), 'docs 缺教学边界句');
});

test('quiz 恰 6 题：pre 1 · check 3 · post 2，题干用 question，每题带引证', () => {
  const qs = quiz.questions;
  assert.strictEqual(qs.length, 6);
  const count = (st) => qs.filter((q) => q.stage === st).length;
  assert.strictEqual(count('pre'), 1);
  assert.strictEqual(count('check'), 3);
  assert.strictEqual(count('post'), 2);
  for (const q of qs) {
    assert.ok(q.question, '有题目缺 question 键');
    assert.ok(!('stem' in q) && !('q' in q), '题干用了 question 以外的键名');
    assert.ok(Array.isArray(q.options) && q.options.length >= 3, '选项不足');
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < q.options.length, 'correct 越界');
    assert.ok(/(依据|口径见|前提|算见)/.test(q.explanation || ''), '解释缺引证');
    assert.ok(/补充·hermes-病理生理学讲义·第21章·\d+\.\d+/.test(q.explanation || ''), '解释没引到本章节号');
  }
  assert.strictEqual(quiz.subject, '11-bingli-shengli-xue');
  assert.strictEqual(quiz.lesson, '21-respiratory-function-and-alterations-in-gas-exchange');
});

test('教学边界是 main.js 的最后一句，且形如「教学边界：…不构成…」', () => {
  const src = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8').trimEnd().split(/\r?\n/);
  const tail = src.slice(-4).join('\n');
  assert.match(tail, /教学边界/);
  assert.match(BOUNDARY, /^教学边界：/);
  assert.match(BOUNDARY, /不构成/);
  assert.strictEqual(TITLE, '呼吸功能与气体交换异常');
});
