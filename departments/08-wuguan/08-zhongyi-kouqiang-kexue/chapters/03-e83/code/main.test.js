'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const m = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const CHAPTERS = path.join(__dirname, '..', '..', '..', 'chapters.json');

test('章节号与课程清单一致', () => {
  const list = JSON.parse(fs.readFileSync(CHAPTERS, 'utf8')).chapters;
  const row = list.find((c) => c.slug === m.SLUG);
  assert.ok(row, `chapters.json 里没有 ${m.SLUG}`);
  assert.strictEqual(row.n, m.CHAPTER);
  assert.strictEqual(m.audit().title, row.title);
});

test('正文可读，小节齐全', () => {
  assert.ok(m.audit().sections.length >= 6, '小节过少');
});

test('六步齐备且次序不倒', () => {
  const a = m.audit();
  assert.strictEqual(a.steps.length, 6);
  assert.ok(a.stepsOrdered, '六步次序与正文不符');
});

test('舌症十条逐条在正文，归类后 5／3／2 与自述一致', () => {
  const a = m.audit();
  assert.strictEqual(a.tongueCount, 10);
  assert.deepStrictEqual(a.counts, { pure: 5, solid: 3, mixed: 2 });
  assert.ok(a.countsMatch, '归类结果与正文自述的比例不一致');
});

test('虚实四对与记录六行都在正文', () => {
  const a = m.audit();
  assert.strictEqual(a.pairs4.length, 4);
  assert.strictEqual(a.record6.length, 6);
});

test('无证可辨按「证不显、两周复诊」处置', () => {
  assert.ok(m.audit().blank, '正文缺「证不显／两周复诊」');
});

test('脚本可运行且带边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /教学样例/);
  assert.match(r.stdout, /本章不给剂量/);
});
