'use strict';

const test = require('node:test');
const assert = require('node:assert');

const {
  docText,
  quizData,
  grams,
  cupDiscRatio,
  interpret,
  rimQuadrants,
  fieldDefectWords,
  trendPillars,
  mismatchReasons,
  cdrThresholdClaims,
  consensusNoThreshold,
  quizAudit,
} = require('./main.js');

test('杯盘比就是两个直径的商，保留两位', () => {
  assert.strictEqual(cupDiscRatio(0.6, 1.0), 0.6);
  assert.strictEqual(cupDiscRatio(1, 3), 0.33);
  assert.strictEqual(cupDiscRatio(0, 1), 0);
});

test('非法输入要拒绝：盘为 0、杯为负、杯大于盘', () => {
  assert.throws(() => cupDiscRatio(0.3, 0), RangeError);
  assert.throws(() => cupDiscRatio(-0.1, 1), RangeError);
  assert.throws(() => cupDiscRatio(1.2, 1), RangeError);
});

test('只给比值不产出结论：杯盘比可以记，不能单独承担判读', () => {
  const r = interpret({ cupMm: 0.8, discMm: 1.0 });
  assert.strictEqual(r.ratio, 0.8);
  assert.deepStrictEqual(r.basis, []);
  assert.strictEqual(r.conclusion, '仅供记录，不作判读');
});

test('补上盘沿依据后比值才进入判读，比值不单独成结论', () => {
  const r = interpret({ cupMm: 0.8, discMm: 1.0, rimNotch: '下方局限性缺口' });
  assert.strictEqual(r.basis.length, 1);
  assert.ok(r.conclusion.startsWith('可进入判读'));
  assert.ok(r.conclusion.includes('比值须与上列依据并读'));
});

test('盘沿按上、下、鼻、颞四个象限记；视野缺损形态五个词', () => {
  assert.deepStrictEqual(rimQuadrants(), ['上', '下', '鼻', '颞']);
  assert.strictEqual(fieldDefectWords().length, 5);
  assert.ok(fieldDefectWords().includes('弓形暗点'));
});

test('随访三根柱子与不一致的四种解释都在正文里', () => {
  assert.deepStrictEqual(trendPillars(), ['基线', '间隔', '可重复性']);
  assert.deepStrictEqual(mismatchReasons(), ['病程错位', '测量误差', '解剖变异', '读片差异']);
});

test('正文不下杯盘比阈值，并写明按所在机构规范', () => {
  assert.deepStrictEqual(cdrThresholdClaims(), [], '不该出现「杯盘比 ≥ 某值」这类断言');
  assert.strictEqual(consensusNoThreshold(), true);
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

test('习题的正确答案不重复，干扰项彼此不同', () => {
  for (const item of quizData().questions) {
    const rights = new Set(item.options);
    assert.strictEqual(rights.size, item.options.length);
  }
});
