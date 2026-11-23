'use strict';
const assert = require('node:assert');
const test = require('node:test');
const { scan, tally, find, JING } = require('./main.js');

test('合病 29 处 · 并病 16 处，合计 45 处', () => {
  const t = tally();
  assert.strictEqual(t.total.合病, 29);
  assert.strictEqual(t.total.并病, 16);
  assert.strictEqual(scan().length, 45);
});

test('合病最集中的配对是太阳+阳明（14 处）', () => {
  assert.strictEqual(tally().by['合病:太阳+阳明'], 14);
});

test('并病最集中的配对是太阳+少阳（7 处）', () => {
  assert.strictEqual(tally().by['并病:太阳+少阳'], 7);
});

test('未标经名的 5 处单列，不并入任何经名配对', () => {
  const t = tally();
  assert.strictEqual(t.by['合病:未标经'], 5);
  const merged = Object.entries(t.by)
    .filter(([k]) => k !== '合病:未标经')
    .reduce((a, [, v]) => a + v, 0);
  assert.strictEqual(merged + 5, 45);
});

test('检索太阳+阳明同时命中合病与并病（不许只给合病）', () => {
  const r = find('太阳+阳明');
  assert.strictEqual(r.length, 18);
  assert.ok(r.some((x) => x.kind === '合病'));
  assert.ok(r.some((x) => x.kind === '并病'));
});

test('每条命中都带得出处（篇名 + 篇内条号）', () => {
  for (const r of scan()) {
    assert.ok(r.pian && Number.isInteger(r.no) && r.no > 0);
  }
});

test('经名只认六经，不把「二阳」猜成太阳+阳明', () => {
  assert.deepStrictEqual(JING, ['太阳', '阳明', '少阳', '太阴', '少阴', '厥阴']);
  const wu = scan().filter((r) => r.pair === '合病:未标经');
  assert.ok(wu.every((r) => r.named.length === 0));
});

test('太阳+阳明合病 14 处里含 1 条篇题残句，证治条文只有 13 条', () => {
  const hb = find('合病:太阳+阳明');
  assert.strictEqual(hb.length, 14);
  const titles = hb.filter((r) => r.text.trim() === '太阳阳明合病法');
  assert.strictEqual(titles.length, 1, '篇 5 第 2 条是篇题残句');
  assert.strictEqual(titles[0].no, 2);
  assert.strictEqual(hb.length - titles.length, 13);
});

test('篇次分布：篇 5 七处、篇 18 六处、篇 22 一处', () => {
  const hb = find('合病:太阳+阳明');
  const byPian = hb.reduce((a, r) => { a[r.pian] = (a[r.pian] || 0) + 1; return a; }, {});
  assert.strictEqual(byPian['辨太阳病脉证并治中'], 7);
  assert.strictEqual(byPian['辨可发汗病脉证并治'], 6);
  assert.strictEqual(Object.values(byPian).reduce((a, b) => a + b, 0), 14);
});

// ── quiz 结构契约（与 scripts/check_chapter_exercises.js 同源）──
const { quizContract } = require('../../_quiz-contract.js');
quizContract(__dirname);
