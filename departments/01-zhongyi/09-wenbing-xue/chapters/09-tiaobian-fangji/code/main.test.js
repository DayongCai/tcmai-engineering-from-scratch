'use strict';
const assert = require('node:assert');
const test = require('node:test');
const { totals, herbFrequency, herbPairs, sizeProfile, derivedFormulas, ladderAnchors, normalize, herbNames } = require('./main.js');

test('总体：243 方 = 178 有药味 + 65 无药味；1153 味次', () => {
  const t = totals();
  assert.strictEqual(t.formulas, 243);
  assert.strictEqual(t.withHerbs, 178);
  assert.strictEqual(t.noHerbs, 65);
  assert.strictEqual(t.withHerbs + t.noHerbs, t.formulas);
  assert.strictEqual(t.tokens, 1153);
});

test('药名：未清洗 366 → 归并后 345（只降 21，别名不是主要来源）', () => {
  const t = totals();
  assert.strictEqual(t.rawNames, 366);
  assert.strictEqual(t.normNames, 345);
  assert.ok(t.rawNames - t.normNames < 30, '归并幅度应很小——否则说明做了语义合并');
});

test('归并只做别名，不做语义合并：生地 ≠ 熟地、麦冬 ≠ 天冬', () => {
  assert.strictEqual(normalize('生地'), '生地');
  assert.notStrictEqual(normalize('熟地'), '生地');
  assert.notStrictEqual(normalize('天冬'), '麦冬');
  assert.strictEqual(normalize('广皮'), '陈皮');
  assert.strictEqual(normalize('细生地'), '生地');
  assert.strictEqual(normalize('麦门冬'), '麦冬');
});

test('药频首位是人参 34 方（19.1%），不是任何清热药', () => {
  const f = herbFrequency();
  const top = f[0];
  assert.strictEqual(top.herb, '人参');
  assert.strictEqual(top.fang, 34);
  assert.strictEqual(top.rate, 19.1);
  const qingre = ['黄芩', '黄连', '银花', '连翘'];
  for (const h of qingre) {
    const row = f.find((x) => x.herb === h);
    if (row) assert.ok(row.fang < top.fang, `${h} 不应超过人参`);
  }
});

test('Top5 顺序：人参 34 · 半夏 30 · 厚朴 29 · 茯苓 28', () => {
  const f = herbFrequency().slice(0, 4).map((x) => `${x.herb}${x.fang}`);
  assert.deepStrictEqual(f, ['人参34', '半夏30', '厚朴29', '茯苓28']);
});

test('药对 ≥8 方共 20 对，首位三对并列 13 方', () => {
  const p = herbPairs(8);
  assert.strictEqual(p.length, 20);
  const top3 = p.slice(0, 3).map((x) => x.fang);
  assert.deepStrictEqual(top3, [13, 13, 13]);
  const names = p.slice(0, 3).map((x) => x.pair).sort();
  assert.deepStrictEqual(names, ['陈皮+厚朴', '麦冬+生地', '黄连+黄芩'].sort());
});

test('味数：中位 6 · 均值 6.48 · 范围 1–35（膏丹单列，不拉均值）', () => {
  const s = sizeProfile();
  assert.strictEqual(s.n, 178);
  assert.strictEqual(s.min, 1);
  assert.strictEqual(s.max, 35);
  assert.strictEqual(s.median, 6);
  assert.strictEqual(s.mean, 6.48);
  assert.strictEqual(s.largest[0].name, '化症回生丹方');
  assert.strictEqual(s.largest[0].n, 35);
  const over10 = Object.entries(s.dist).filter(([k]) => Number(k) > 10).reduce((a, [, v]) => a + v, 0);
  assert.ok(over10 <= 16, `超过 10 味的方有 ${over10} 个，不应过多`);
});

test('42 个加减/变方（17.3%）：银翘散是一个族，不是一个方', () => {
  const d = derivedFormulas();
  assert.strictEqual(d.n, 42);
  assert.strictEqual(d.share, 17.3);
  assert.ok(d.eg.some((x) => /银翘散/.test(x)), '应含银翘散加减族');
});

test('三阶锚点：银翘 9 味 · 桑菊 8 味 · 白虎 4 味 · 复脉 2 味（越往下越小）', () => {
  const a = ladderAnchors();
  const by = (l) => a.find((x) => x.label === l);
  assert.strictEqual(by('辛凉平剂').n, 9);
  assert.strictEqual(by('辛凉轻剂').n, 8);
  assert.strictEqual(by('辛凉重剂').n, 4);
  assert.strictEqual(by('下焦复脉').n, 2);
  assert.ok(by('辛凉平剂').n > by('下焦复脉').n, '上焦方应大于下焦方');
});

test('herbNames 对无药味方返回空数组（65 个方不得混入统计）', () => {
  const { WITH_HERBS, FORMULAS } = require('./main.js');
  const noHerb = FORMULAS.filter((f) => !(f.ingredients || []).length);
  assert.strictEqual(noHerb.length, 65);
  for (const f of WITH_HERBS) assert.ok(herbNames(f).length > 0);
});
