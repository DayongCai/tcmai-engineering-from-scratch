#!/usr/bin/env node
/**
 * 第 25 章 酸碱平衡与失衡 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：讲义规模、用词重心、三道防线各就各位、节号覆盖、
 * 引文归属、引语逐字、零裸值、quiz 契约、末行教学边界。
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
  LINES,
  BOUNDARY,
  nonWs,
  chapterOf,
  shape,
  keyCounts,
  secsWith,
  defenseLines,
  docsAudit,
} = require('./main');

const MAIN = path.join(__dirname, 'main.js');
const DIR = path.join(__dirname, '..');
const ch = chapterOf();
const doc = fs.readFileSync(path.join(DIR, 'docs', 'zh.md'), 'utf8');

test('本章取自讲义第 25 章，13 节，节号形如 25.M', () => {
  assert.strictEqual(CHAPTER, 25);
  assert.strictEqual(ch.secs.length, 13);
  assert.strictEqual(ch.secs[0].no, '25.1');
  assert.strictEqual(ch.secs.at(-1).no, '25.13');
  for (const s of ch.secs) {
    assert.match(s.no, /^25\.\d+$/, `节号不合规：${s.no}`);
    assert.ok(s.paras.length > 0, `${s.no} 没有正文`);
    assert.ok(nonWs(s.text) > 150, `${s.no} 正文过短：${nonWs(s.text)}`);
  }
  assert.match(TITLE, /酸碱/);
});

test('讲义规模：5974 非空白字 · 4351 汉字 · 118 段（改稿时这条会先响）', () => {
  const s = shape(ch);
  assert.strictEqual(s.secs, 13);
  assert.strictEqual(s.chars, 5974);
  assert.strictEqual(s.hanzi, 4351);
  assert.strictEqual(s.paras, 118);
});

test('用词重心：代偿最多（52 次），间隙最少但只服务一个分型', () => {
  const byKey = Object.fromEntries(keyCounts(ch).map((k) => [k.key, k.n]));
  assert.deepStrictEqual(KEYS, ['代偿', '通气', '碳酸氢根', '缓冲', '肾', '间隙']);
  assert.strictEqual(byKey['代偿'], 52);
  assert.strictEqual(byKey['通气'], 32);
  assert.strictEqual(byKey['肾'], 28);
  assert.strictEqual(byKey['间隙'], 6);
  // 代偿是贯穿全章的判据：出现的节数必须明显多于任何单一型
  assert.ok(secsWith(ch, '代偿').length >= 8, `代偿只出现在 ${secsWith(ch, '代偿').length} 节`);
  // 阴离子间隙只服务代谢性酸中毒的再分型
  assert.deepStrictEqual(secsWith(ch, '阴离子间隙'), ['25.2', '25.7', '25.12']);
});

test('三道防线各就各位：缓冲 25.3 · 肺 25.4 · 肾 25.5', () => {
  assert.deepStrictEqual(LINES.map((l) => l.sec), ['25.3', '25.4', '25.5']);
  for (const l of defenseLines(ch)) assert.ok(l.ok, `${l.name} 未落在 ${l.sec}`);
});

test('docs 正文 ≥5974 非空白字，且必备段齐全', () => {
  assert.ok(nonWs(doc) >= 3000, `正文只有 ${nonWs(doc)} 非空白字`);
  for (const k of ['MOTTO', 'PROBLEM', '双根因定位', '环境逼迫', '知识积累', '运行与验证']) {
    assert.ok(doc.includes(k), `docs 缺 ${k}`);
  }
  for (const k of ['代价与边界', '免责']) assert.ok(doc.includes(k), `docs 缺 ${k}`);
});

test('讲义引文：≥3 条，条条属第 25 章、节号真实存在', () => {
  const a = docsAudit(ch);
  assert.ok(a.cites >= 3, `引文只有 ${a.cites} 条`);
  assert.strictEqual(a.wrongCh, 0, '有引文引到了别的章');
  assert.deepStrictEqual(a.unknownSec, [], `引文节号不在本章：${a.unknownSec.join('、')}`);
  assert.ok(a.sectionsCited >= 10, `引文只覆盖 ${a.sectionsCited} 节`);
});

test('「」引语逐字可核，正文零「数字＋单位」', () => {
  const a = docsAudit(ch);
  assert.deepStrictEqual(a.lostQuotes, [], `引语在讲义里查不到：${a.lostQuotes.join(' / ')}`);
  assert.strictEqual(a.bare, 0, `docs 有 ${a.bare} 行带数值与单位`);
});

test('讲义 13 节全部在 docs 出现节号', () => {
  const a = docsAudit(ch);
  assert.deepStrictEqual(a.uncovered, [], `未覆盖：${a.uncovered.join('、')}`);
  for (const s of ch.secs) assert.ok(doc.includes(s.no), `docs 没点明 ${s.no}`);
});

test('docs 不把讲义标成教材，不写百分比，也不给阈值与公式', () => {
  assert.ok(!/教材·[^\n]*讲义/.test(doc), '把讲义标成了教材');
  assert.ok(!doc.includes('%'), 'docs 出现百分号');
  assert.ok(/方向/.test(doc) && /代偿/.test(doc), 'docs 必须写到方向判据');
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
    assert.match(q.explanation, /补充·hermes-病理生理学讲义·第25章·\d+\.\d+/, 'explanation 缺本章引文');
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
  const slug = '25-acid-base-homeostasis-and-imbalances';
  for (const f of [`prompt-${slug}.md`, `skill-${slug}.md`]) {
    const p = path.join(DIR, 'outputs', f);
    assert.ok(fs.existsSync(p), `缺 outputs/${f}`);
    assert.ok(nonWs(fs.readFileSync(p, 'utf8')) > 1200, `${f} 内容过短`);
  }
});
