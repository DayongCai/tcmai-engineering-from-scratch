'use strict';

const test = require('node:test');
const assert = require('node:assert');

const {
  ZONES,
  docText,
  quizData,
  hanzi,
  grams,
  zoneOrder,
  wulunPairs,
  twoInfoDirections,
  gates,
  consensusSections,
  quizAudit,
} = require('./main.js');

test('四区按正文顺序出现：胞睑 → 白睛 → 黑睛 → 瞳神', () => {
  assert.deepStrictEqual(zoneOrder(), ZONES);
});

test('五轮配属由正文括注解析：肉脾气、风…脏与轮一一对应', () => {
  const pairs = wulunPairs();
  assert.strictEqual(pairs.length, 4, '正文应有四条五轮配属');
  assert.deepStrictEqual(
    pairs.map((p) => `${p.zone}${p.wheel}${p.organ}`),
    ['胞睑肉轮脾', '白睛气轮肺', '黑睛风轮肝', '瞳神水轮肾'],
  );
});

test('两类信息的方向句至少两处（结构推不出功能、功能推不出结构）', () => {
  assert.strictEqual(twoInfoDirections(), 2);
});

test('闸门三件按 适应证 → 禁忌 → 知情 的次序出现', () => {
  const g = gates();
  assert.deepStrictEqual(g.map((x) => x.key), ['适应证', '禁忌', '知情']);
  assert.ok(g.every((x) => x.at >= 0));
  assert.ok(g[0].at < g[1].at && g[1].at < g[2].at, '正文次序应为适应证在前');
});

test('正文引到的共识节可枚举，且含第一节', () => {
  const secs = consensusSections();
  assert.ok(secs.includes('一'), `缺共识第一节：${secs.join('、')}`);
  assert.strictEqual(new Set(secs).size, secs.length, '节号应去重');
});

test('习题结构：6 题、pre 1 / check 3 / post 2、每题 4 选项', () => {
  const a = quizAudit();
  assert.strictEqual(a.total, 6);
  assert.deepStrictEqual(a.byStage, { pre: 1, check: 3, post: 2 });
  assert.deepStrictEqual(a.problems, []);
  for (const item of quizData().questions) {
    assert.strictEqual(new Set(item.options).size, 4, `选项有重复：${item.question}`);
  }
});

test('至少两道 check 题的正确选项能在本章正文里找到原词', () => {
  const a = quizAudit();
  assert.ok(a.grounded >= 2, `只有 ${a.grounded} 道接地`);
  assert.strictEqual(a.grounded, a.byStage.check, '本章三道 check 题应全部接地');
});

test('解释都已过 30 汉字，且不复述题干', () => {
  for (const item of quizData().questions) {
    assert.ok(hanzi(item.explain) >= 30, `解释过短：${item.question}`);
    assert.ok(!item.explain.includes(item.question), '解释不应整句复述题干');
  }
});

test('正确选项的用词能在正文里逐字对上（不是自造术语）', () => {
  const body = grams(docText());
  const qs = quizData().questions;
  for (const item of qs) {
    const right = item.options[item.correct];
    const hit = [...grams(right)].some((g) => body.has(g));
    assert.ok(hit, `正确选项在正文里找不到对应片段：${right}`);
  }
});

test('正文的三不写与第 1 章习题口径一致', () => {
  const text = docText();
  for (const s of ['不写「符合', '不写「提示', '不写「建议']) {
    assert.ok(text.includes(s), `正文缺：${s}`);
  }
});
