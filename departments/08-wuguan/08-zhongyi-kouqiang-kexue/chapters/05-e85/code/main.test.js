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

test('三套坐标与四种时间型齐备', () => {
  const a = m.audit();
  assert.strictEqual(a.coords.length, 3);
  assert.deepStrictEqual(a.times, ['一过性痛', '自发痛', '持续痛', '咬合痛']);
});

test('四步链次序不倒：先时间型，后虚实', () => {
  const a = m.audit();
  assert.strictEqual(a.steps.length, 4);
  assert.ok(a.stepsOrdered, '四步次序与正文不符');
});

test('硬指征条数由编号数出，恰为五条', () => {
  assert.strictEqual(m.audit().redCount, 5);
});

test('承诺边界在正文：不写「治愈龋齿」，只写可观察的两项', () => {
  assert.ok(m.audit().promiseOk, '正文缺承诺边界');
});

test('脚本可运行且带边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /教学样例/);
  assert.match(r.stdout, /本章不给剂量/);
});
