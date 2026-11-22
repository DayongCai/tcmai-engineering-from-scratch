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

test('处置次序：先气道，最后辨证', () => {
  const a = m.audit();
  assert.deepStrictEqual(a.seq, ['先气道', '再出血', '再保牙', '最后辨证']);
  assert.ok(a.seqOk, '次序与正文不符');
});

test('全脱位四步与禁用介质齐备', () => {
  const a = m.audit();
  assert.deepStrictEqual(a.steps4, ['拿', '洗', '泡', '送']);
  assert.strictEqual(a.banned.length, 5);
  assert.ok(a.dryWorstOk, '正文缺「干藏是最坏的一种」');
});

test('感染四层表四行，七条红旗全在', () => {
  const a = m.audit();
  assert.strictEqual(a.layers, 4);
  assert.strictEqual(a.redCount, 7);
});

test('现场禁止四件事齐备', () => {
  assert.strictEqual(m.audit().forbid.length, 4);
});

test('脚本可运行且带边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /教学样例/);
  assert.match(r.stdout, /不给操作参数/);
});
