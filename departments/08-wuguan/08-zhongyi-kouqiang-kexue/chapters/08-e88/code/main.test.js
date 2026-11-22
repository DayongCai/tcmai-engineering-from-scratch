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

test('三条通道、三本账、三因子齐备', () => {
  const a = m.audit();
  assert.deepStrictEqual(a.channels, ['经络', '津液', '腑气']);
  assert.deepStrictEqual(a.accounts, ['供给', '输布', '消耗']);
  assert.deepStrictEqual(a.factors, ['底物', '菌群', '滞留']);
});

test('口臭排查五步按正文次序：舌背最先，用药最后', () => {
  const a = m.audit();
  assert.strictEqual(a.scan.length, 5);
  assert.ok(a.scanOrdered, '排查次序与正文不符');
});

test('口干排查列出五类药', () => {
  assert.strictEqual(m.audit().drugs.length, 5);
});

test('先定源、后辨证与「通腑只部分有效」都在正文', () => {
  assert.ok(m.audit().claimsOk);
});

test('脚本可运行且带边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /教学样例/);
  assert.match(r.stdout, /本章不给剂量/);
});
