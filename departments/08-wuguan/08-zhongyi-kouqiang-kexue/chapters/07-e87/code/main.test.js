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

test('四型齐备，且口疮与口糜的分界在正文', () => {
  const a = m.audit();
  assert.deepStrictEqual(a.types, ['实火', '阴虚', '脾虚', '寒热错杂']);
  assert.ok(a.diffOk, '正文缺口疮／口糜分界');
});

test('四个观察项与七条红线由编号数出', () => {
  const a = m.audit();
  assert.strictEqual(a.obsCount, 4);
  assert.strictEqual(a.redCount, 7);
});

test('自限性与「两周不愈」的时程表述在正文', () => {
  const a = m.audit();
  assert.ok(a.selfLimitOk, '正文缺「一至两周可自愈」');
  assert.ok(a.twoWeeks >= 2, '「两周」出现次数过少，时程轴可能被删');
  assert.ok(a.fourWeeks >= 1, '「四周活检」一条缺失');
});

test('脚本可运行且带边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /教学样例/);
  assert.match(r.stdout, /本章不给剂量/);
});
