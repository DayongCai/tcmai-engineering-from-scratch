'use strict';

const test = require('node:test');
const assert = require('node:assert');

const {
  docText,
  quizData,
  grams,
  mediaOrder,
  wallLayers,
  taggedValues,
  deviceParams,
  foveaInFrame,
  quizAudit,
} = require('./main.js');

test('四层屈光间质按 角膜→房水→晶状体→玻璃体 的次序解析出来', () => {
  assert.deepStrictEqual(mediaOrder(), ['角膜', '房水', '晶状体', '玻璃体']);
});

test('三层壁自外向内：纤维膜 → 血管膜 → 视网膜', () => {
  assert.deepStrictEqual(wallLayers(), ['纤维膜', '血管膜', '视网膜']);
});

test('共识值都落在标了节号的句子里（扫描范围在第三节）', () => {
  const tagged = taggedValues();
  const third = tagged.filter((t) => t.section === '三').flatMap((t) => t.values);
  assert.ok(third.includes('6mm×6mm'), `第三节应有黄斑扫描范围：${third.join('、')}`);
  assert.ok(third.includes('3mm×3mm'), `第三节应有 OCTA 范围：${third.join('、')}`);
});

test('超声频率写在第五节：B 超 7.5–10MHz、UBM 35–50MHz', () => {
  const fifth = taggedValues().filter((t) => t.section === '五').flatMap((t) => t.values);
  assert.ok(fifth.includes('7.5–10MHz'), `第五节缺 B 超频率：${fifth.join('、')}`);
  assert.ok(fifth.includes('35–50MHz'), `第五节缺 UBM 频率：${fifth.join('、')}`);
});

test('凡 MHz / dB 数值，都能在某个带节号的句子里找到 —— 不许裸写参数', () => {
  const tagged = new Set(taggedValues().flatMap((t) => t.values));
  for (const p of deviceParams()) {
    assert.ok(tagged.has(p), `参数 ${p} 没有标共识节号`);
  }
});

test('中心凹是否落在框内：以偏移量与半边长判，边界值算在内', () => {
  assert.strictEqual(foveaInFrame(1.5, 3), true);
  assert.strictEqual(foveaInFrame(3, 3), true);
  assert.strictEqual(foveaInFrame(3.5, 3), false);
  assert.throws(() => foveaInFrame(1, 0), RangeError);
  assert.throws(() => foveaInFrame(-1, 3), RangeError);
});

test('水轮被明确判为不可对应，八廓三条纪律在正文里', () => {
  const text = docText();
  assert.ok(text.includes('水轮不对应'));
  for (const s of ['只作提醒', '不入编码', '不入报告字段']) assert.ok(text.includes(s), `缺：${s}`);
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
