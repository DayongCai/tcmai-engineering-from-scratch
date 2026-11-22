'use strict';

const test = require('node:test');
const assert = require('node:assert');

const {
  docText,
  quizData,
  grams,
  CONSENSUS_VALUES,
  observationLayers,
  minGrid,
  sentinels,
  plusPoints,
  photoUses,
  qcItems,
  consensusHits,
  quizAudit,
} = require('./main.js');

test('三层观察按 有没有 → 什么样 → 变了没有 排，记录只占第三层', () => {
  assert.deepStrictEqual(observationLayers(), ['有没有', '什么样', '变了没有']);
});

test('形态记录的最小集是五格，且顺序与正文一致', () => {
  assert.deepStrictEqual(minGrid(), ['部位', '大小', '边界', '深度', '荧光素染色表现']);
});

test('三项哨兵齐：充血类型、前房反应、瞳神大小与形态', () => {
  assert.deepStrictEqual(sentinels(), ['充血类型', '前房反应', '瞳神大小与形态']);
});

test('加分情形五条、照相三用途、质控五项', () => {
  assert.strictEqual(plusPoints(), 5);
  assert.deepStrictEqual(photoUses(), ['基线', '交班', '争议']);
  assert.deepStrictEqual(qcItems(), ['清晰度', '亮度对比', '对焦', '覆盖', '伪影']);
});

test('共识值原样保留：45°、35°、3mm、4–6 小时', () => {
  const hits = consensusHits();
  assert.deepStrictEqual(hits.map((h) => h.value), CONSENSUS_VALUES);
  for (const h of hits) assert.ok(h.found, `正文缺共识值：${h.value}`);
});

test('正文没有把共识值改写成更高的强制口径', () => {
  const text = docText();
  for (const bad of ['必须 45°', '必须 35°', '必须散瞳']) assert.ok(!text.includes(bad), `出现升级写法：${bad}`);
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

test('三道 check 题的正确选项都能在本章正文找到原词', () => {
  const a = quizAudit();
  assert.strictEqual(a.grounded, a.byStage.check);
  assert.ok(a.grounded >= 2);
});

test('每题正确选项的用词都能在正文里逐字对上', () => {
  const body = grams(docText());
  for (const item of quizData().questions) {
    const right = item.options[item.correct];
    assert.ok([...grams(right)].some((g) => body.has(g)), `正文里找不到：${right}`);
  }
});

test('本题库不写影像诊断结论：三不写的边界留在正文', () => {
  const text = docText();
  assert.ok(text.includes('记录对象，不是影像诊断'));
});
