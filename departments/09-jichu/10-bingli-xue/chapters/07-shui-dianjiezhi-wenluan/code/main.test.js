#!/usr/bin/env node
/**
 * 第 7 章 水、电解质代谢紊乱 —— 确定性单测
 * 运行: node --test code/main.test.js
 *
 * 两件事：① 正文实测值（小节数/汉字数/表格/引文/单元号/每节字数）逐个钉住；
 * ② 本章 quiz 的结构与接地——题数、分段、选项数、答案分布、解释长度、
 *    以及「正确选项能在正文里找到原词」这条判据本身也要可测。
 * 正文一改，这里的数就必须跟着改——这正是它的用处。
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const { readDoc, shape, head, average, sections, tables, quotes, unitIds, figures } = require('./main');

const md = readDoc();
const s = shape(md);
const a = average(s);
const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));

const hz = (t) => (String(t || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const shingles = (t, n = 4) => {
  const out = new Set();
  const clean = String(t || '').replace(/[^\u4e00-\u9fff]/g, ' ');
  for (const seg of clean.split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
};

test('首行是「第 7 章 · 判断句」，章号与本章一致', () => {
  const h = head(md);
  assert.strictEqual(h.n, 7);
  assert.ok(h.title.length >= 8, '判断句太短：' + h.title);
});

test('正文实测：8 个二级小节 · 9980 汉字 · 4 张表 · 20 行数据', () => {
  assert.strictEqual(s.secs, 8);
  assert.strictEqual(s.hanzi, 9980);
  assert.strictEqual(s.tables, 4);
  assert.strictEqual(s.rows, 20);
});

test('出证与单元：引文行 19 条 · 单元号 12 个 · 图注 4 条', () => {
  assert.strictEqual(s.quotes, 19);
  assert.strictEqual(s.units, 12);
  assert.strictEqual(s.figures, 4);
  assert.strictEqual(unitIds(md).length, 12, '一章应有 12 个单元号');
});

test('各节汉字之和等于正文汉字数（差一个字就不通过）', () => {
  assert.strictEqual(s.lead + s.perSection.reduce((x, y) => x + y, 0), s.hanzi);
  assert.ok(s.lead > 0, '题记部分不该为空');
  assert.strictEqual(sections(md).length, s.secs);
});

test('每节字数与最长节：均值 1248 字，最长「十二个小节：逐条落位」3277 字', () => {
  assert.strictEqual(a.perSection, 1248);
  assert.strictEqual(a.perUnit, 832);
  assert.strictEqual(a.largest.hanzi, 3277);
  assert.deepStrictEqual(s.perSection, [
    922, 760, 531, 458, 1126, 238, 3277, 2113
  ]);
});

test('小节标题去重且都不是空串', () => {
  const titles = s.sectionTitles;
  assert.strictEqual(new Set(titles).size, titles.length);
  for (const t of titles) assert.ok(t.length >= 4, '标题过短：' + t);
});

test('quiz：6 题，分段为 pre/check×3/post×2，每题 4 选项', () => {
  assert.strictEqual(quiz.questions.length, 6);
  assert.strictEqual(quiz.questions.map((q) => q.stage).join(','), 'pre,check,check,check,post,post');
  for (const q of quiz.questions) {
    assert.strictEqual(q.options.length, 4);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4);
    assert.strictEqual(new Set(q.options).size, 4, '选项不许重复：' + q.question);
  }
});

test('quiz：答案打散（正确项覆盖 3 个以上位置），解释够长', () => {
  const pos = new Set(quiz.questions.map((q) => q.correct));
  assert.ok(pos.size >= 3, '正确项位置太集中：' + [...pos].join(','));
  for (const q of quiz.questions) {
    assert.ok(hz(q.explain) >= 30, '解释不足 30 汉字：' + q.question);
    assert.ok(String(q.explain).length >= 10);
    assert.ok(!/见\s*code\/main\.js\s*输出/.test(q.explain));
  }
});

test('quiz：至少 2 道 check 题的正确选项能在正文里找到 4 字原词', () => {
  const body = shingles(md);
  let grounded = 0;
  for (const q of quiz.questions) {
    if (q.stage !== 'check') continue;
    const right = q.options[q.correct];
    if ([...shingles(right)].some((g) => body.has(g))) grounded += 1;
  }
  assert.ok(grounded >= 2, '只有 ' + grounded + ' 道 check 题接地');
});

test('quiz 与代码都不含脚手架与判定性字样', () => {
  const banned = [/三辨/, /四位面/, /单元规模/, /本章实测/, /本课第\s*\d+\s*章[（(]/];
  const blob = JSON.stringify(quiz) + md;
  for (const re of banned) assert.ok(!re.test(blob), '命中 ' + re);
});
