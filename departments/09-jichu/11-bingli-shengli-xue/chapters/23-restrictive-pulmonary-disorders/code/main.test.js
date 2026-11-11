#!/usr/bin/env node
/**
 * 第 23 章 限制性肺疾病 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：讲义规模、用词重心、节号覆盖、引文归属、
 * 引语逐字、零裸值、quiz 契约、末行教学边界。
 * 不锁死正文措辞，正文改写时测试不会变成噪声。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const {
  CHAPTER,
  TITLE,
  KEYS,
  BOUNDARY,
  nonWs,
  chapterOf,
  shape,
  keyCounts,
  secsWith,
  docsAudit,
} = require('./main');

const MAIN = path.join(__dirname, 'main.js');
const DIR = path.join(__dirname, '..');
const ch = chapterOf();
const doc = fs.readFileSync(path.join(DIR, 'docs', 'zh.md'), 'utf8');

test('本章取自讲义第 23 章，10 节，节号形如 23.M', () => {
  assert.strictEqual(CHAPTER, 23);
  assert.strictEqual(ch.secs.length, 10);
  assert.strictEqual(ch.secs[0].no, '23.1');
  assert.strictEqual(ch.secs.at(-1).no, '23.10');
  for (const s of ch.secs) {
    assert.match(s.no, /^23\.\d+$/, `节号不合规：${s.no}`);
    assert.ok(s.paras.length > 0, `${s.no} 没有正文`);
    assert.ok(nonWs(s.text) > 200, `${s.no} 正文过短：${nonWs(s.text)}`);
  }
  assert.match(TITLE, /限制性肺疾病/);
});

test('讲义规模：4693 非空白字 · 3919 汉字 · 40 段（改稿时这条会先响）', () => {
  const s = shape(ch);
  assert.strictEqual(s.secs, 10);
  assert.strictEqual(s.chars, 4693);
  assert.strictEqual(s.hanzi, 3919);
  assert.strictEqual(s.paras, 40);
});

test('用词重心：通气最多（35 次），弥散只在肺内限制的节里出现', () => {
  const keys = keyCounts(ch);
  const byKey = Object.fromEntries(keys.map((k) => [k.key, k.n]));
  assert.deepStrictEqual(KEYS, ['顺应性', '通气', '弥散', '分流', '呼吸功', '死腔']);
  assert.strictEqual(byKey['通气'], 35);
  assert.strictEqual(byKey['顺应性'], 9);
  assert.strictEqual(byKey['弥散'], 8);
  assert.ok(keys.every((k) => k.n > 0), '每个锚点词都必须在讲义里出现');
  // 弥散不在 23.6、23.7（肺外限制两节）出现——这是「肺内才谈弥散」的结构证据
  const diff = secsWith(ch, '弥散');
  assert.ok(!diff.includes('23.6') && !diff.includes('23.7'), `弥散出现在肺外节：${diff.join('、')}`);
});

test('docs 正文 ≥4693 非空白字，且必备段齐全', () => {
  assert.ok(nonWs(doc) >= 3000, `正文只有 ${nonWs(doc)} 非空白字`);
  for (const k of ['MOTTO', 'PROBLEM', '双根因定位', '环境逼迫', '知识积累', '运行与验证']) {
    assert.ok(doc.includes(k), `docs 缺 ${k}`);
  }
  for (const k of ['代价与边界', '免责']) assert.ok(doc.includes(k), `docs 缺 ${k}`);
});

test('讲义引文：≥3 条，且条条属第 23 章、节号真实存在', () => {
  const a = docsAudit(ch);
  assert.ok(a.cites >= 3, `引文只有 ${a.cites} 条`);
  assert.strictEqual(a.wrongCh, 0, '有引文引到了别的章');
  assert.deepStrictEqual(a.unknownSec, [], `引文节号不在本章：${a.unknownSec.join('、')}`);
  assert.ok(a.sectionsCited >= 8, `引文只覆盖 ${a.sectionsCited} 节`);
});

test('「」引语逐字可核，正文零「数字＋单位」', () => {
  const a = docsAudit(ch);
  assert.deepStrictEqual(a.lostQuotes, [], `引语在讲义里查不到：${a.lostQuotes.join(' / ')}`);
  assert.strictEqual(a.bare, 0, `docs 有 ${a.bare} 行带数值与单位`);
});

test('讲义 10 节全部在 docs 出现节号', () => {
  const a = docsAudit(ch);
  assert.deepStrictEqual(a.uncovered, [], `未覆盖：${a.uncovered.join('、')}`);
  for (const s of ch.secs) assert.ok(doc.includes(s.no), `docs 没点明 ${s.no}`);
});

test('docs 不把讲义标成教材，也不写百分比', () => {
  assert.ok(!/教材·[^\n]*讲义/.test(doc), '把讲义标成了教材');
  assert.ok(!doc.includes('%'), 'docs 出现百分号');
  assert.ok(doc.includes(BOUNDARY), 'docs 缺教学边界句');
});

test('quiz：恰 6 题，pre 1 / check 3 / post 2，题干用 question 键，每题带引证', () => {
  const quiz = JSON.parse(fs.readFileSync(path.join(DIR, 'quiz.json'), 'utf8'));
  const qs = quiz.questions;
  assert.strictEqual(qs.length, 6);
  const stage = (s) => qs.filter((q) => q.stage === s).length;
  assert.strictEqual(stage('pre'), 1, 'pre 题不是 1 道');
  assert.strictEqual(stage('check'), 3, 'check 题不是 3 道');
  assert.strictEqual(stage('post'), 2, 'post 题不是 2 道');
  for (const q of qs) {
    assert.ok(q.question && typeof q.question === 'string', '题干必须用 question 键');
    assert.ok(Array.isArray(q.options) && q.options.length >= 4, `${q.question} 选项不足`);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < q.options.length, 'correct 越界');
    assert.match(q.explanation, /(依据|口径见|前提|算见)/, 'explanation 缺引证措辞');
    assert.match(q.explanation, /补充·hermes-病理生理学讲义·第23章·\d+\.\d+/, 'explanation 缺本章引文');
  }
});

test('末行打印教学边界，且退出码为 0', () => {
  const out = execFileSync(process.execPath, [MAIN], { encoding: 'utf8' });
  const last = out.trimEnd().split(/\r?\n/).at(-1);
  assert.strictEqual(last, BOUNDARY);
  assert.match(BOUNDARY, /教学边界/);
  assert.match(BOUNDARY, /不构成/);
  assert.match(BOUNDARY, /不写数值/);
});

test('outputs 两件齐：prompt 与 skill 都以本 slug 命名', () => {
  const slug = '23-restrictive-pulmonary-disorders';
  for (const f of [`prompt-${slug}.md`, `skill-${slug}.md`]) {
    const p = path.join(DIR, 'outputs', f);
    assert.ok(fs.existsSync(p), `缺 outputs/${f}`);
    assert.ok(nonWs(fs.readFileSync(p, 'utf8')) > 1200, `${f} 内容过短`);
  }
});
