'use strict';
const assert = require('node:assert');
const test = require('node:test');

const {
  CHAPTER, VIEWS, LEVELS, unitsOf, tally, density,
  sectionStats, unitStats, chapterStats,
  tightest, sparsest, cellPeak, morphologyPeak, morphologyLeads, selfCheck,
} = require('./main.js');

test('规模：12 小节、4 节、教材 20527 字（从 units.json 现算）', () => {
  const s = chapterStats();
  assert.strictEqual(CHAPTER, '11');
  assert.strictEqual(s.units, 12);
  assert.strictEqual(s.secs, 4);
  assert.strictEqual(s.hanzi, 20527);
});

test('三视角：形态 186 压过机能 156，代谢只有 20 —— 本书唯一「形态往过走」的两章之一', () => {
  const s = chapterStats();
  assert.strictEqual(s.views['形态'], 186);
  assert.strictEqual(s.views['机能'], 156);
  assert.strictEqual(s.views['代谢'], 20);
  assert.strictEqual(morphologyLeads(), true);
  assert.deepStrictEqual(Object.keys(s.views), VIEWS);
});

test('四层级：细胞 105、器官 39、系统 27、组织 5 —— 组织层是最薄的一层', () => {
  const s = chapterStats();
  assert.strictEqual(s.levels['细胞'], 105);
  assert.strictEqual(s.levels['器官'], 39);
  assert.strictEqual(s.levels['系统'], 27);
  assert.strictEqual(s.levels['组织'], 5);
  assert.ok(s.levels['组织'] < s.levels['系统']);
  assert.deepStrictEqual(Object.keys(s.levels), LEVELS);
});

test('细胞层 105 中有 48 挤在视网膜一节：11.2.2 是本章的细胞密度峰', () => {
  const peak = cellPeak();
  assert.strictEqual(peak.sub, '11.2.2');
  assert.strictEqual(peak.levels['细胞'], 48);
  assert.strictEqual(morphologyPeak().sub, '11.3.2');
  assert.strictEqual(morphologyPeak().views['形态'], 45);
});

test('数值零容忍：全章 valueLike 0，27 个阿拉伯数字全是列表序号', () => {
  const s = chapterStats();
  assert.strictEqual(s.valueLike, 0);
  assert.strictEqual(s.digits, 27);
  assert.strictEqual(s.digits, s.listItems);
  assert.ok(unitsOf().every((u) => u.measure.valueLike === 0));
});

test('逐节密度：视觉 32.9 最密、嗅觉味觉与观察要求 20.8 最疏，四节字数合计等于全章', () => {
  const secs = sectionStats();
  assert.deepStrictEqual(secs.map((x) => x.density), [22, 32.9, 29.2, 20.8]);
  assert.strictEqual(secs.reduce((n, x) => n + x.hanzi, 0), 20527);
  assert.strictEqual(secs.reduce((n, x) => n + x.hits, 0), 538);
  assert.strictEqual(tightest().sub, '11.2.2');
  assert.strictEqual(sparsest().sub, '11.2.3');
  assert.strictEqual(sparsest().density, 13);
});

test('「不给值」类声明全章 39 处：感觉器官章用重复的边界句替代数值', () => {
  const s = chapterStats();
  // 39 = 38 + 11.1.1 学习目标里那 1 处。body 口径现在恒为原文整段
  // （scripts/build_shengli_text.py），所以目标句也算进来，数字随之 +1。
  assert.strictEqual(s.decl, 39);
  assert.strictEqual(density(s.decl, s.hanzi), 1.9);
  const perUnit = unitStats().map((u) => u.decl);
  assert.strictEqual(perUnit.reduce((a, b) => a + b, 0), 39);
  assert.ok(Math.max(...perUnit) === 5);
});

test('口径自洽：tally 的命中合计等于两栏之和；自检全过', () => {
  const t = tally(unitsOf());
  const byHand = Object.values(t.views).reduce((a, b) => a + b, 0) + Object.values(t.levels).reduce((a, b) => a + b, 0);
  assert.strictEqual(t.hits, byHand);
  assert.strictEqual(t.hits, 538);
  assert.ok(selfCheck().every((c) => c.ok));
});
