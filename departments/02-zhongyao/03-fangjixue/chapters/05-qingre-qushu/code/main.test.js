#!/usr/bin/env node
/**
 * 第 5 章 清热剂与祛暑剂 —— 确定性单元测试
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
  bySection,
  coreHerbs,
  jaccard,
  nearestPairs,
  subsetPairs,
  roleCoverage,
  pearson,
  depthTest,
  main,
} = require('./main');

const LIST = loadFormulas().filter((f) => CHAPTERS.includes(f.chapter));
const byName = (n) => LIST.find((f) => f.name === n);

test('数据源可定位，16 方全部落在教材第 8/9 章，locator 合规', () => {
  assert.ok(/formulas\.json$/.test(findDataFile()));
  assert.strictEqual(LIST.length, 16);
  for (const f of LIST) {
    assert.ok(CHAPTERS.includes(f.chapter), `${f.name} 章号越界`);
    assert.ok(f.locator.startsWith(`教材·第${f.chapter}章·`), `${f.name} locator 不合格`);
  }
  assert.strictEqual(LIST.filter((f) => f.chapter === '8').length, 13);
  assert.strictEqual(LIST.filter((f) => f.chapter === '9').length, 3);
});

test('规模：116 原始药位、7 条残句、109 药位、59 味、每方 6.8 味', () => {
  const s = stats(LIST);
  assert.strictEqual(s.rawSlots, 116);
  assert.strictEqual(s.noise, 7);
  assert.strictEqual(s.slots, 109);
  assert.strictEqual(s.unique, 59);
  assert.strictEqual(Number(s.avgHerbs.toFixed(1)), 6.8);
});

test('残句判据：剔「而配伍之要尤在」「集寒凉之力于一」，留「熟干地黄」「西瓜翠衣」', () => {
  assert.strictEqual(isNoise('而配伍之要尤在'), true);
  assert.strictEqual(isNoise('集寒凉之力于一'), true);
  assert.strictEqual(isNoise('生甘草梢三味'), true);
  assert.strictEqual(isNoise('熟干地黄'), false);
  assert.strictEqual(isNoise('西瓜翠衣'), false);
  assert.strictEqual(herbsOf(byName('犀角地黄汤')).length, 4);
});

test('逐节：6 节、药位合计 109、最后一节是祛暑剂', () => {
  const secs = bySection(LIST);
  assert.strictEqual(secs.length, 6);
  assert.strictEqual(secs.reduce((n, s) => n + s.slots, 0), 109);
  assert.deepStrictEqual(secs.map((s) => s.sec), [
    '8.1 清气分热剂', '8.2 清营凉血剂', '8.3 清热解毒剂',
    '8.4 清脏腑热剂', '8.5 清虚热剂', '9.1 祛暑剂代表方',
  ]);
  assert.strictEqual(secs[2].avg, 9);
  assert.strictEqual(Number(secs[5].avg.toFixed(1)), 7.7);
});

test('Pearson：完全相关 = 1，零方差返回 null（不把算不了说成 0）', () => {
  assert.strictEqual(pearson([1, 2, 3], [2, 4, 6]), 1);
  assert.strictEqual(pearson([1, 2, 3], [6, 4, 2]), -1);
  assert.strictEqual(pearson([1, 1, 1], [1, 2, 3]), null);
  const d = depthTest(LIST);
  assert.strictEqual(d.secs.length, 6);
  assert.strictEqual(Number(d.r.toFixed(2)), 0.28);
});

test('最近邻首对是白虎汤 ~ 竹叶石膏汤（0.38），且不是子集', () => {
  const top = nearestPairs(LIST, 1)[0];
  assert.deepStrictEqual([top.a, top.b], ['白虎汤', '竹叶石膏汤']);
  assert.strictEqual(top.j, 0.38);
  assert.strictEqual(top.subset, false);
});

test('六一散已补到 2 味 → 假子集归零，真子集边也归零（漏边方向相反）', () => {
  // 上游修复后：滑石、甘草两味都在，单味残缺集合不再是假边来源
  assert.deepStrictEqual(herbsOf(byName('六一散')).sort(), ['甘草', '滑石'].sort());
  const subs = subsetPairs(LIST);
  assert.strictEqual(subs.length, 0);
  assert.strictEqual(subs.filter((p) => p.small === '六一散').length, 0);
  // 反方向的漏边：导赤散已抽全 4 味，但「生甘草梢」未归并为「甘草」，故不再 ⊂ 龙胆泻肝汤
  const dc = herbsOf(byName('导赤散'));
  assert.deepStrictEqual(dc.sort(), ['地黄', '木通', '生甘草梢', '竹叶'].sort());
  assert.ok(herbsOf(byName('龙胆泻肝汤')).includes('甘草'));
  assert.ok(!herbsOf(byName('龙胆泻肝汤')).includes('生甘草梢'));
});

test('核心药：甘草 8 方、黄连 6 方、地黄 6 方，且黄连横跨气/营/脏/虚热四层', () => {
  const core = coreHerbs(LIST, 3);
  assert.strictEqual(core.find((h) => h.name === '甘草').n, 8);
  assert.strictEqual(core.find((h) => h.name === '黄连').n, 6);
  assert.strictEqual(core.find((h) => h.name === '地黄').n, 6);
  const layers = new Set(core.find((h) => h.name === '黄连').where.map((n) => byName(n).sec));
  assert.ok(layers.size >= 4, `黄连只跨了 ${layers.size} 节`);
});

test('角色覆盖与 Jaccard 对称性', () => {
  const cov = roleCoverage(LIST);
  assert.strictEqual(cov.cov['君'], 14);
  assert.strictEqual(cov.cov['臣'], 14);
  assert.strictEqual(cov.cov['佐'], 14);
  assert.strictEqual(cov.cov['使'], 6);
  assert.strictEqual(cov.none.length, 0);
  assert.strictEqual(jaccard(byName('白虎汤'), byName('泻白散')), jaccard(byName('泻白散'), byName('白虎汤')));
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
