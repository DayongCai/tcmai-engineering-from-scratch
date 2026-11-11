#!/usr/bin/env node
/**
 * 第 4 章 泻下剂与和解剂 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const {
  CHAPTERS,
  findDataFile,
  loadFormulas,
  isNoise,
  herbsOf,
  noiseOf,
  stats,
  coreHerbs,
  jaccard,
  nearestPairs,
  subsetPairs,
  roleCoverage,
  bySection,
  main,
} = require('./main');

const LIST = loadFormulas().filter((f) => CHAPTERS.includes(f.chapter));
const byName = (n) => LIST.find((f) => f.name === n);

test('数据源可定位，且本章恰好 11 方、全部落在教材第 6/7 章', () => {
  assert.ok(/formulas\.json$/.test(findDataFile()));
  assert.strictEqual(LIST.length, 11);
  for (const f of LIST) {
    assert.ok(CHAPTERS.includes(f.chapter), `${f.name} 章号 ${f.chapter} 越界`);
    assert.ok(f.locator.startsWith(`教材·第${f.chapter}章·`), `${f.name} 的 locator 不合格：${f.locator}`);
  }
});

test('规模与逐节口径一致：67 药位 / 34 味 / 每方 6.1 味', () => {
  const s = stats(LIST);
  assert.strictEqual(s.formulas, 11);
  assert.strictEqual(s.rawSlots, 68);
  assert.strictEqual(s.noise, 1);
  assert.strictEqual(s.slots, 67);
  assert.strictEqual(s.unique, 34);
  assert.strictEqual(Number(s.avgHerbs.toFixed(1)), 6.1);
});

test('抽取残句判据：剔「同书卷十五另载」，留真实药名（「无当归」已不再被抽出）', () => {
  assert.strictEqual(isNoise('同书卷十五另载'), true);
  assert.strictEqual(isNoise('无当归'), true);
  assert.strictEqual(isNoise('而配伍之要尤在'), true);
  assert.strictEqual(isNoise('大黄'), false);
  assert.strictEqual(isNoise('熟干地黄'), false);
  assert.strictEqual(isNoise('碧玉散'), false);
  const wt = byName('温脾汤');
  assert.deepStrictEqual(noiseOf(wt).sort(), ['同书卷十五另载']);
  assert.strictEqual(herbsOf(wt).length, 7);
  // 上游抽取器修好「无当归」这条残句之后，温脾汤的当归是真药名而非残句
  assert.ok(herbsOf(wt).includes('当归'), '温脾汤的当归应作为真实药名留下');
});

test('核心药跨节次可回查：大黄 5 方、甘草 5 方且横跨下法与和法', () => {
  const core = coreHerbs(LIST, 3);
  const rhubarb = core.find((h) => h.name === '大黄');
  const licorice = core.find((h) => h.name === '甘草');
  assert.strictEqual(rhubarb.n, 5);
  assert.strictEqual(licorice.n, 5);
  // 大黄只出现在泻下方里；甘草两边都有 —— 这是两种「调和」的分工
  assert.ok(rhubarb.where.every((n) => byName(n).fa === '下'));
  assert.deepStrictEqual([...new Set(licorice.where.map((n) => byName(n).fa))].sort(), ['下', '和']);
});

test('Jaccard 有界、自反为 1、对称', () => {
  const a = byName('大承气汤');
  const b = byName('黄龙汤');
  assert.strictEqual(jaccard(a, a), 1);
  assert.strictEqual(jaccard(a, b), jaccard(b, a));
  for (const p of nearestPairs(LIST, 20)) assert.ok(p.j > 0 && p.j <= 1, `${p.a}~${p.b} 越界`);
});

test('最近邻首对是小柴胡汤 ~ 半夏泻心汤，且相似高但不是子集', () => {
  const top = nearestPairs(LIST, 1)[0];
  assert.deepStrictEqual([top.a, top.b], ['小柴胡汤', '半夏泻心汤']);
  assert.strictEqual(top.j, 0.56);
  assert.strictEqual(top.subset, false, '两方各有独有药味，不能读成合方');
});

test('子集关系只认真正的合方：大承气汤 ⊂ 黄龙汤', () => {
  const pairs = subsetPairs(LIST);
  assert.strictEqual(pairs.length, 1);
  assert.deepStrictEqual(pairs[0], { small: '大承气汤', big: '黄龙汤', size: 4, bigSize: 10 });
  // 反例：小柴胡汤（7 味）不在半夏泻心汤（7 味）里
  assert.ok(!pairs.some((p) => p.small === '小柴胡汤'));
});

test('君臣佐使覆盖：十枣汤四角色全空，是抽取缺口', () => {
  const cov = roleCoverage(LIST);
  assert.strictEqual(cov.cov['君'], 9);
  assert.strictEqual(cov.full4.length, 1);
  assert.deepStrictEqual(cov.none.map((f) => f.name), ['十枣汤']);
});

test('逐节统计：6 节、药位合计等于全章药位', () => {
  const secs = bySection(LIST);
  assert.strictEqual(secs.length, 6);
  assert.strictEqual(secs.reduce((n, s) => n + s.slots, 0), stats(LIST).slots);
  assert.deepStrictEqual(secs.map((s) => s.sec), [
    '6.1 寒下剂', '6.2 温下与润下剂', '6.3 逐水与攻补兼施剂',
    '7.1 和解少阳剂', '7.2 调和肝脾剂', '7.3 调和肠胃剂',
  ]);
});

test('main() 运行到最后一行是教学边界声明', () => {
  const lines = [];
  const orig = console.log;
  console.log = (...a) => lines.push(a.join(' '));
  try {
    main();
  } finally {
    console.log = orig;
  }
  const last = lines.filter(Boolean).pop();
  assert.ok(/教学边界/.test(last));
  assert.ok(/不构成/.test(last));
  assert.ok(/用药依据/.test(last));
});
