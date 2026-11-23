#!/usr/bin/env node
/**
 * 第 19 章 气证门（M07） —— 本次实测的固定断言
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：正文规模（汉字/节/表/表行）、每节字数可复算、
 * 三项词频与占比、quiz 契约（题数/三段/四选项/解释字数/选项接地/答案分散）。
 * 正文改了而没有更新这里，测试会立刻红；这不是脆弱，是把「数」钉在正文上。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const lib = require('./main.js');

const doc = lib.readDoc();
const s = lib.stats();
const QUIZ = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));
const cjk = (x) => (String(x).match(/[\u4e00-\u9fff]/g) || []).length;

const EXPECT = {
  total: 2830,
  sectionCount: 6,
  sectionHanzi: 2551,
  tableCount: 5,
  tableRows: 23,
  perSection: 472,
  maxSection: 847,
  counts: {"气":180,"走窜":11,"得泄":11},
  shares: {"气":89.1,"走窜":5.4,"得泄":5.4},
};

function grams(str) {
  const out = new Set();
  const t = String(str);
  for (let i = 0; i + 4 <= t.length; i += 1) {
    const g = t.slice(i, i + 4);
    if (/^[\u4e00-\u9fff]{4}$/.test(g)) out.add(g);
  }
  return out;
}

test('正文规模：汉字 / 节 / 表 / 表行 / 节均字数 与正文一致', () => {
  assert.strictEqual(s.total, EXPECT.total);
  assert.strictEqual(s.sectionCount, EXPECT.sectionCount);
  assert.strictEqual(s.tableCount, EXPECT.tableCount);
  assert.strictEqual(s.tableRows, EXPECT.tableRows);
  assert.strictEqual(s.perSection, EXPECT.perSection);
  assert.strictEqual(s.maxSection, EXPECT.maxSection);
  assert.ok(s.total > 2000, '正文过短：' + s.total);
});

test('节数与 \'## \' 行数一致，每节都有字数，最长节唯一可查', () => {
  const h2 = doc.split(/\r?\n/).filter((l) => /^##\s+/.test(l)).length;
  assert.strictEqual(s.sectionCount, h2);
  for (const x of s.sections) assert.ok(x.hanzi > 100, '第 ' + x.no + ' 节过短：' + x.hanzi);
  const topHanzi = Math.max(...s.sections.map((x) => x.hanzi));
  assert.strictEqual(s.top.hanzi, topHanzi);
  assert.ok(doc.includes(s.top.title), '最长节标题在正文里找不到');
});

test('每节字数之和不大于全章汉字，且覆盖八成以上', () => {
  const sum = s.sections.reduce((a, x) => a + x.hanzi, 0);
  assert.strictEqual(sum, EXPECT.sectionHanzi);
  assert.ok(sum <= s.total);
  assert.ok(sum > s.total * 0.8, '节覆盖不足：' + sum + '/' + s.total);
});

test('关键词词频与占比可复算，占比之和约等于 100', () => {
  for (const c of s.counts) {
    assert.strictEqual(c.n, EXPECT.counts[c.term], c.term + ' 计数不符');
    assert.strictEqual(c.n, lib.countTerm(doc, c.term), c.term + ' 现场复算不符');
  }
  const sum = s.shares.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 100) < 0.3, '占比之和 ' + sum);
});

test('quiz：≥5 题，pre/check/post 三段齐，每题 4 个互异选项', () => {
  const qs = QUIZ.questions || [];
  assert.ok(qs.length >= 5, '题数 ' + qs.length);
  for (const stage of ['pre', 'check', 'post']) {
    assert.ok(qs.some((q) => q.stage === stage), '缺 ' + stage + ' 段');
  }
  qs.forEach((q, i) => {
    assert.ok(q.question && q.question.length >= 8, 'Q' + (i + 1) + ' 题干过短');
    assert.strictEqual((q.options || []).length, 4, 'Q' + (i + 1) + ' 选项数');
    assert.strictEqual(new Set(q.options).size, 4, 'Q' + (i + 1) + ' 选项重复');
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct <= 3, 'Q' + (i + 1) + ' correct 越界');
  });
});

test('quiz：每题的 explain 与 explanation 同文且不少于 30 汉字', () => {
  for (const [i, q] of (QUIZ.questions || []).entries()) {
    assert.ok(cjk(q.explain) >= 30, 'Q' + (i + 1) + ' explain ' + cjk(q.explain) + ' 汉字');
    assert.strictEqual(q.explain, q.explanation, 'Q' + (i + 1) + ' 两个解释字段不一致');
  }
});

test('quiz：check 题至少 2 道的正确项含本章正文 4 字词组', () => {
  const checks = (QUIZ.questions || []).filter((q) => q.stage === 'check');
  assert.ok(checks.length >= 2, 'check 题 ' + checks.length + ' 道');
  const grounded = checks.filter((q) => [...grams(q.options[q.correct])].some((g) => doc.includes(g)));
  assert.ok(grounded.length >= 2, '接地 check 题 ' + grounded.length + '/' + checks.length);
});

test('quiz：答案打散，至少覆盖 3 个位置且单一位置不超过 3 题', () => {
  const qs = QUIZ.questions || [];
  const counts = [0, 0, 0, 0];
  for (const q of qs) counts[q.correct] += 1;
  assert.ok(counts.filter((n) => n > 0).length >= 3, '分布 ' + counts.join('/'));
  assert.ok(Math.max(...counts) <= 3, '分布 ' + counts.join('/'));
});

test('quiz：lesson / subject 指向本章', () => {
  assert.strictEqual(QUIZ.lesson, '19-m07-qi-men');
  assert.strictEqual(QUIZ.subject, '14-zhongyi-zhenghou-xue');
  assert.ok(QUIZ.title && QUIZ.title.length >= 4);
});

test('脚本可运行：退出码 0，末行为边界句', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 30000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const lines = String(r.stdout || '').trim().split(/\r?\n/);
  assert.strictEqual(lines[lines.length - 1], lib.BOUNDARY);
  assert.ok(doc.includes('不构成诊疗建议'), '正文缺免责声明');
});
