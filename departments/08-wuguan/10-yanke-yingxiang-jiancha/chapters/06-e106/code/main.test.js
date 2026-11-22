'use strict';

const test = require('node:test');
const assert = require('node:assert');

const {
  docText,
  quizData,
  grams,
  layerTable,
  layerFor,
  minimalLayers,
  rulers,
  timeClues,
  intervalFactors,
  referralRules,
  effectTiers,
  inventedAccuracy,
  quizAudit,
} = require('./main.js');

test('分层表解析出五个层次，顺序与正文一致', () => {
  assert.deepStrictEqual(
    layerTable().map((r) => r.layer),
    ['视网膜内', '视网膜下', '视网膜前／玻璃体下', '玻璃体', '脉络膜'],
  );
});

test('形态决定层次：火焰状在视网膜内、舟状在视网膜前、絮状在玻璃体', () => {
  assert.strictEqual(layerFor('火焰状'), '视网膜内');
  assert.strictEqual(layerFor('线状'), '视网膜内');
  assert.strictEqual(layerFor('舟状'), '视网膜前／玻璃体下');
  assert.strictEqual(layerFor('絮状'), '玻璃体');
  assert.strictEqual(layerFor('弥漫'), '玻璃体');
  assert.strictEqual(layerFor('星芒状'), null, '正文没有的形态不许猜');
});

test('三层最小集、三个相对标尺、三条时程线索', () => {
  assert.deepStrictEqual(minimalLayers(), ['视网膜内出血', '视网膜下出血', '玻璃体与视网膜前出血']);
  assert.deepStrictEqual(rulers(), ['视盘直径', '遮蔽程度', '分区计数']);
  assert.deepStrictEqual(timeClues(), ['颜色', '边界', '液平面']);
});

test('复查间隔四件事、转诊判据六条、疗效三层', () => {
  assert.deepStrictEqual(intervalFactors(), ['层次与位置', '活动性', '全身状态', '可及性与责任']);
  assert.strictEqual(referralRules(), 6);
  assert.deepStrictEqual(effectTiers(), ['结构', '功能', '全身']);
});

test('不编造灵敏度／特异度这类数字', () => {
  assert.strictEqual(inventedAccuracy(), 0);
});

test('正文把面积能否随访讲清楚：没有绝对单位', () => {
  const text = docText();
  assert.ok(text.includes('面积在眼底出血里没有绝对单位'));
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
