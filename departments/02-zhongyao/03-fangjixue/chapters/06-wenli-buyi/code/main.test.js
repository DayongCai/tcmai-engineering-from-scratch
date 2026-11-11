#!/usr/bin/env node
/**
 * 第 6 章 温里剂与补益剂 —— 确定性单元测试
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
  stats,
  jaccard,
  diffPair,
  nearestPairs,
  subsetPairs,
  unionTest,
  bySection,
  coreHerbs,
  roleCoverage,
  main,
} = require('./main');

const LIST = loadFormulas().filter((f) => CHAPTERS.includes(f.chapter));
const byName = (n) => LIST.find((f) => f.name === n);

test('数据源可定位，16 方全部落在教材第 10/12 章，locator 合规', () => {
  assert.ok(/formulas\.json$/.test(findDataFile()));
  assert.strictEqual(LIST.length, 16);
  for (const f of LIST) {
    assert.ok(CHAPTERS.includes(f.chapter), `${f.name} 章号越界`);
    assert.ok(f.locator.startsWith(`教材·第${f.chapter}章·`), `${f.name} locator 不合格`);
  }
  assert.strictEqual(LIST.filter((f) => f.fa === '温').length, 5);
  assert.strictEqual(LIST.filter((f) => f.fa === '补').length, 11);
});

test('规模：96 原始药位、2 条残句、94 药位、41 味、每方 5.9 味', () => {
  const s = stats(LIST);
  assert.strictEqual(s.rawSlots, 96);
  assert.strictEqual(s.noise, 2);
  assert.strictEqual(s.slots, 94);
  assert.strictEqual(s.unique, 41);
  assert.strictEqual(Number(s.avgHerbs.toFixed(1)), 5.9);
  const wen = LIST.filter((f) => f.fa === '温');
  const bu = LIST.filter((f) => f.fa === '补');
  assert.strictEqual(stats(wen).slots, 24);
  assert.strictEqual(stats(bu).slots, 70);
});

test('温与补的最小差分：理中丸 = 四君子汤 − 茯苓 + 干姜', () => {
  const d = diffPair(byName('理中丸'), byName('四君子汤'));
  assert.deepStrictEqual(d.shared.sort(), ['人参', '白术', '甘草'].sort());
  assert.deepStrictEqual(d.onlyA, ['干姜']);
  assert.deepStrictEqual(d.onlyB, ['茯苓']);
  assert.strictEqual(d.j, 0.6);
});

test('合方验证：四君子 ∪ 四物 与八珍汤对上 7/8，缺的是「生地黄」（八珍作熟地黄）', () => {
  const ut = unionTest([byName('四君子汤'), byName('四物汤')], byName('八珍汤'));
  assert.strictEqual(ut.union.length, 8);
  assert.strictEqual(ut.target.length, 10);
  assert.strictEqual(ut.covered.length, 7);
  assert.deepStrictEqual(ut.missing, ['生地黄']);
  assert.deepStrictEqual(new Set(ut.extra), new Set(['熟地黄', '生姜', '大枣']));
});

test('同源验证：六味地黄丸与肾气丸共有 5 味，六味独有熟地黄，肾气独有生地黄、桂枝、附子', () => {
  const d = diffPair(byName('六味地黄丸'), byName('肾气丸'));
  assert.strictEqual(d.shared.length, 5);
  assert.deepStrictEqual(d.onlyA, ['熟地黄']);
  assert.deepStrictEqual(d.onlyB.sort(), ['生地黄', '桂枝', '附子'].sort());
  assert.strictEqual(d.j, 0.56);
});

test('子集判定带完整性前置：3 条边全以四君子汤为子集方，跳过 1 首小方', () => {
  const { edges, skipped } = subsetPairs(LIST);
  assert.strictEqual(edges.length, 3);
  assert.ok(edges.every((e) => e.small === '四君子汤'), '子集方应全部是四君子汤');
  assert.deepStrictEqual(edges.map((e) => e.big).sort(), ['八珍汤', '参苓白术散', '归脾汤'].sort());
  assert.deepStrictEqual(skipped.map((k) => k.name).sort(), ['当归补血汤']);
  assert.ok(skipped.every((k) => k.size < 3));
});

test('完整性前置只跳 1 首小方：当归补血汤（2 味）；生脉散已满 3 味不再被跳', () => {
  assert.strictEqual(herbsOf(byName('生脉散')).length, 3);
  assert.strictEqual(herbsOf(byName('当归补血汤')).length, 2);
  // 五味子曾被「味」字虚词判据误伤，现已排除该误判——这一味是回归证据
  assert.ok(herbsOf(byName('生脉散')).includes('五味子'));
  // 当归补血汤本来就只有黄芪、当归，2 味是它的真身，不是残缺
  assert.deepStrictEqual(herbsOf(byName('当归补血汤')).sort(), ['当归', '黄芪'].sort());
  // 若放行，会伪造出大量假边 —— 这里直接验证前置条件的效果
  assert.ok(!subsetPairs(LIST).edges.some((e) => e.small === '生脉散'));
});

test('最近邻首对是理中丸 ~ 四君子汤 0.60，且不是子集（各有一味独有药）', () => {
  const top = nearestPairs(LIST, 1)[0];
  assert.deepStrictEqual([top.a, top.b], ['理中丸', '四君子汤']);
  assert.strictEqual(top.j, 0.6);
  assert.strictEqual(top.subset, false);
  assert.strictEqual(jaccard(byName('理中丸'), byName('四君子汤')), jaccard(byName('四君子汤'), byName('理中丸')));
});

test('逐节：8 节、药位合计 94、气血双补仅八珍汤 1 方 10 味', () => {
  const secs = bySection(LIST);
  assert.strictEqual(secs.length, 8);
  assert.strictEqual(secs.reduce((n, s) => n + s.slots, 0), 94);
  const qiXue = secs.find((s) => s.sec.startsWith('12.3'));
  assert.strictEqual(qiXue.n, 1);
  assert.strictEqual(qiXue.slots, 10);
});

test('核心药与角色覆盖：甘草 9 方、人参 8 方、四角色齐 4 方', () => {
  const core = coreHerbs(LIST, 3);
  assert.strictEqual(core.find((h) => h.name === '甘草').n, 9);
  assert.strictEqual(core.find((h) => h.name === '人参').n, 8);
  assert.strictEqual(core.find((h) => h.name === '当归').n, 7);
  const cov = roleCoverage(LIST);
  assert.strictEqual(cov.cov['君'], 14);
  assert.strictEqual(cov.cov['使'], 8);
  assert.strictEqual(cov.full4.length, 4);
  assert.strictEqual(cov.none.length, 0);
});

test('残句判据：「法上为」是八珍汤服法交代，不是药', () => {
  assert.strictEqual(isNoise('法上为'), true);
  assert.strictEqual(isNoise('缩砂仁'), false);
  assert.ok(!herbsOf(byName('八珍汤')).includes('法上为'));
});

test('main() 最后一行是教学边界声明', () => {
  const lines = [];
  const orig = console.log;
  console.log = (...a) => lines.push(a.join(' '));
  try {
    main();
  } finally {
    console.log = orig;
  }
  const last = lines.filter(Boolean).pop();
  assert.ok(/教学边界/.test(last) && /不构成/.test(last) && /用药依据/.test(last));
});
