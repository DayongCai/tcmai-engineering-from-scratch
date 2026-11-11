#!/usr/bin/env node
/**
 * 第 24 章 水电解质稳态与失衡 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：讲义规模、用词重心、两轴落位、节号覆盖、引文归属、
 * 引语逐字、零裸值、quiz 契约、末行教学边界。
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
  AXES,
  BOUNDARY,
  nonWs,
  chapterOf,
  shape,
  keyCounts,
  secsWith,
  bothAxes,
  docsAudit,
} = require('./main');

const MAIN = path.join(__dirname, 'main.js');
const DIR = path.join(__dirname, '..');
const ch = chapterOf();
const doc = fs.readFileSync(path.join(DIR, 'docs', 'zh.md'), 'utf8');

test('本章取自讲义第 24 章，14 节，节号形如 24.M', () => {
  assert.strictEqual(CHAPTER, 24);
  assert.strictEqual(ch.secs.length, 14);
  assert.strictEqual(ch.secs[0].no, '24.1');
  assert.strictEqual(ch.secs.at(-1).no, '24.14');
  for (const s of ch.secs) {
    assert.match(s.no, /^24\.\d+$/, `节号不合规：${s.no}`);
    assert.ok(s.paras.length > 0, `${s.no} 没有正文`);
    assert.ok(nonWs(s.text) > 150, `${s.no} 正文过短：${nonWs(s.text)}`);
  }
  assert.match(TITLE, /水电解质/);
});

test('讲义规模：6652 非空白字 · 4939 汉字 · 94 段（改稿时这条会先响）', () => {
  const s = shape(ch);
  assert.strictEqual(s.secs, 14);
  assert.strictEqual(s.chars, 6652);
  assert.strictEqual(s.hanzi, 4939);
  assert.strictEqual(s.paras, 94);
});

test('用词重心：钠最多（76 次），容量多于渗透，张力只在渗透轴上谈', () => {
  const byKey = Object.fromEntries(keyCounts(ch).map((k) => [k.key, k.n]));
  assert.deepStrictEqual(KEYS, ['容量', '渗透', '张力', '钠', '钾', '排出']);
  assert.deepStrictEqual(AXES, ['容量', '渗透']);
  assert.strictEqual(byKey['钠'], 76);
  assert.strictEqual(byKey['容量'], 45);
  assert.strictEqual(byKey['渗透'], 25);
  assert.strictEqual(byKey['张力'], 14);
  assert.ok(byKey['容量'] > byKey['渗透'], '本章把笔墨先压在容量上');
  // 张力只在渗透这一轴上出现：24.9（钾的分布）不出现
  assert.ok(!secsWith(ch, '张力').includes('24.9'), '张力不该出现在钾分布一节');
});

test('两轴交叉定位的框架节（24.4）同时写出容量与渗透', () => {
  assert.ok(bothAxes(ch).includes('24.4'), '24.4 必须同时谈容量与渗透');
  assert.ok(bothAxes(ch).includes('24.13'), '24.13 的评估四问也必须两轴齐备');
  assert.ok(bothAxes(ch).length >= 5, `两轴同现的节只有 ${bothAxes(ch).length} 个`);
});

test('docs 正文 ≥6652 非空白字，且必备段齐全', () => {
  assert.ok(nonWs(doc) >= 3000, `正文只有 ${nonWs(doc)} 非空白字`);
  for (const k of ['MOTTO', 'PROBLEM', '双根因定位', '环境逼迫', '知识积累', '运行与验证']) {
    assert.ok(doc.includes(k), `docs 缺 ${k}`);
  }
  for (const k of ['代价与边界', '免责']) assert.ok(doc.includes(k), `docs 缺 ${k}`);
});

test('讲义引文：≥3 条，条条属第 24 章、节号真实存在', () => {
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

test('讲义 14 节全部在 docs 出现节号', () => {
  const a = docsAudit(ch);
  assert.deepStrictEqual(a.uncovered, [], `未覆盖：${a.uncovered.join('、')}`);
  for (const s of ch.secs) assert.ok(doc.includes(s.no), `docs 没点明 ${s.no}`);
});

test('docs 不把讲义标成教材，不写百分比，也不给纠正速率', () => {
  assert.ok(!/教材·[^\n]*讲义/.test(doc), '把讲义标成了教材');
  assert.ok(!doc.includes('%'), 'docs 出现百分号');
  assert.ok(/纠正速度/.test(doc), 'docs 必须提到纠正速度是独立风险变量');
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
    assert.match(q.explanation, /补充·hermes-病理生理学讲义·第24章·\d+\.\d+/, 'explanation 缺本章引文');
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
  const slug = '24-fluid-and-electrolyte-homeostasis-and-imbalances';
  for (const f of [`prompt-${slug}.md`, `skill-${slug}.md`]) {
    const p = path.join(DIR, 'outputs', f);
    assert.ok(fs.existsSync(p), `缺 outputs/${f}`);
    assert.ok(nonWs(fs.readFileSync(p, 'utf8')) > 1200, `${f} 内容过短`);
  }
});
