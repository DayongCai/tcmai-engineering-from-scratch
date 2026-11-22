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

test('三个病名接三项指标：齿衄、牙宣、齿动', () => {
  const a = m.audit();
  assert.deepStrictEqual(a.names, ['齿衄', '牙宣', '齿动']);
  assert.strictEqual(a.metrics.length, 3);
});

test('探诊深度三档由正文数字解析，且首尾相接', () => {
  const a = m.audit();
  assert.deepStrictEqual(a.depthBands, [1, 3, 4, 5, 6]);
  assert.ok(a.bandsContiguous, '三档界值不连续，正文数字可能被改动');
});

test('五项观察与六条红旗的条数由编号数出', () => {
  const a = m.audit();
  assert.strictEqual(a.obsCount, 5);
  assert.strictEqual(a.redCount, 6);
});

test('「不出血了」误读与附着丧失不可逆都在正文', () => {
  assert.ok(m.audit().quirkOk);
});

test('脚本可运行且带边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /教学样例/);
  assert.match(r.stdout, /本章不给剂量/);
});
