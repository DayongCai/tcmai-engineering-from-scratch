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

test('五道闸门齐备，序号即次序', () => {
  const a = m.audit();
  assert.strictEqual(a.gateCount, 5);
  assert.deepStrictEqual(a.gates, ['急症', '器质', '内治', '外治', '调护']);
  assert.ok(a.gatesOrdered, '闸门序号在文中不是递增的');
});

test('外治四法与调护五条齐备', () => {
  const a = m.audit();
  assert.strictEqual(a.methods.length, 4);
  assert.strictEqual(a.care5.length, 5);
});

test('三处告诫各自封一条用错方向的治法', () => {
  assert.strictEqual(m.audit().warnings.length, 3);
});

test('舌下廉泉禁针一条在正文', () => {
  assert.ok(m.audit().forbidOk, '正文缺「舌下廉泉／禁针」');
});

test('脚本可运行且带边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /教学样例/);
  assert.match(r.stdout, /不给操作参数/);
});
