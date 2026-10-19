'use strict';
const assert = require('node:assert');
const test = require('node:test');
const { toGrams, toMl, countUnit, checkRelations, guizhiTang, unitCensus, ITEMS, SCHOOLS } = require('./main.js');

test('单位关系自检三条全过：1斤=16两、1两=24铢、1升=10合', () => {
  const r = checkRelations();
  assert.strictEqual(r.length, 3);
  assert.ok(r.every((x) => x.ok), JSON.stringify(r));
});

test('桂枝三两：三档 41.25 / 46.88 / 9 克，倍数 5.21', () => {
  assert.strictEqual(toGrams(3, '两', 'han220').grams, 41.25);
  assert.strictEqual(toGrams(3, '两', 'han250').grams, 46.88);
  assert.strictEqual(toGrams(3, '两', 'ming').grams, 9);
  const sums = guizhiTang().map((s) => s.sum);
  assert.deepStrictEqual(sums, [151.25, 171.89, 33]);
  assert.strictEqual(Number((Math.max(...sums) / Math.min(...sums)).toFixed(2)), 5.21);
});

test('每个克数都带前提，不返回裸数字', () => {
  const r = toGrams(1, '两', 'han220');
  assert.ok(r.label && r.basis && r.perLiang);
  assert.strictEqual(r.perLiang, 13.75);
  assert.deepStrictEqual(Object.keys(SCHOOLS).sort(), ['han220', 'han250', 'ming']);
});

test('铢与分的进位：24 铢 = 1 两；4 分 = 1 两', () => {
  assert.strictEqual(toGrams(24, '铢', 'han220').grams, toGrams(1, '两', 'han220').grams);
  assert.strictEqual(toGrams(4, '分', 'han220').grams, toGrams(1, '两', 'han220').grams);
});

test('斤：1 斤 = 16 两', () => {
  assert.strictEqual(toGrams(1, '斤', 'han220').grams, 220);
  assert.strictEqual(toGrams(1, '斤', 'han250').grams, 250);
});

test('容量：水七升 = 1400 ml，服一升 = 200 ml', () => {
  assert.strictEqual(toMl(7, '升').ml, 1400);
  assert.strictEqual(toMl(1, '升').ml, 200);
  assert.strictEqual(toMl(1, '合').ml, 20);
});

test('计数单位拒绝折算：大枣十二枚 grams 为 null 且有理由', () => {
  const c = countUnit(12, '枚');
  assert.strictEqual(c.grams, null);
  assert.strictEqual(c.count, 12);
  assert.match(c.note, /不折算/);
});

test('未知档 / 不支持的单位必须抛错，不许静默返回', () => {
  assert.throws(() => toGrams(1, '两', 'qing'), /未知折算档/);
  assert.throws(() => toGrams(1, '枚', 'han220'), /不支持的重量单位/);
  assert.throws(() => toMl(1, '两'), /不支持的容量单位/);
});

test('底本单位频次可复现：两 338 · 升 259 · 枚 147 · 斤 40 · 铢 32', () => {
  const c = Object.fromEntries(unitCensus().map((x) => [x.unit, x.tiao]));
  assert.strictEqual(c['两'], 338);
  assert.strictEqual(c['升'], 259);
  assert.strictEqual(c['枚'], 147);
  assert.strictEqual(c['斤'], 40);
  assert.strictEqual(c['铢'], 32);
});

test('底本内宋人校语存在（林亿等按桂枝汤方），且甘草两处说法不同', () => {
  const jiaoyu = ITEMS.filter((i) => i.text.includes('臣亿等谨按') && i.text.includes('桂枝汤方'));
  assert.ok(jiaoyu.length >= 1, '应有林亿校语');
  const frag = ITEMS.find((i) => i.id === '4:28');
  assert.ok(frag.text.includes('甘草三两'), '4:28 作甘草三两');
  assert.ok(jiaoyu.some((x) => x.text.includes('甘草二两')), '校语作甘草二两');
});
