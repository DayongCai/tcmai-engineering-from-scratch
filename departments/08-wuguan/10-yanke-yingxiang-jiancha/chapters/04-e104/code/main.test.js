'use strict';

const test = require('node:test');
const assert = require('node:assert');

const {
  docText,
  quizData,
  grams,
  reachStages,
  modalities,
  sectionChecks,
  changeKinds,
  angioAnswers,
  alignRules,
  phaseWindows,
  phaseAt,
  signalFloor,
  scanFrames,
  quizAudit,
} = require('./main.js');

test('可及性三段：通路 → 断面 → 灌注（顺序不能倒）', () => {
  assert.deepStrictEqual(reachStages(), ['通路', '断面', '灌注']);
});

test('四类手段各归各位，不互相替代', () => {
  assert.deepStrictEqual(modalities(), ['声学', '光学断面', '眼底照相', '造影']);
});

test('断面四层判断：连续 → 厚度 → 反射 → 界面', () => {
  assert.deepStrictEqual(sectionChecks(), ['连续', '厚度', '反射', '界面']);
});

test('七类常见改变、造影三答、复查对齐四条', () => {
  assert.strictEqual(changeKinds(), 7);
  assert.deepStrictEqual(angioAnswers(), ['灌注', '渗漏', '屏障']);
  assert.strictEqual(alignRules().length, 4);
});

test('时相窗口从正文解析：0–10s / 10–20s / 5–15min', () => {
  const w = phaseWindows();
  assert.deepStrictEqual(w.map((x) => [x.name, x.lo, x.hi]), [
    ['动脉期', 0, 10],
    ['静脉期', 10, 20],
    ['晚期', 300, 900],
  ]);
});

test('按时相窗口定名：边界归前一段，空档单列', () => {
  assert.strictEqual(phaseAt(0), '动脉期');
  assert.strictEqual(phaseAt(10), '动脉期');
  assert.strictEqual(phaseAt(10.5), '静脉期');
  assert.strictEqual(phaseAt(20), '静脉期');
  assert.strictEqual(phaseAt(21), '未入时相窗口');
  assert.strictEqual(phaseAt(300), '晚期');
  assert.strictEqual(phaseAt(900), '晚期');
  assert.strictEqual(phaseAt(901), '未入时相窗口');
});

test('计时起点错开会让动脉期冒充静脉期 —— 时序错位可复算', () => {
  assert.strictEqual(phaseAt(5), '动脉期');
  assert.strictEqual(phaseAt(5, 6), '静脉期');
  assert.throws(() => phaseAt(-1), RangeError);
});

test('可判读下限与扫描范围取自正文', () => {
  assert.strictEqual(signalFloor(), 40);
  assert.deepStrictEqual(scanFrames(), ['6mm×6mm', '3mm×3mm']);
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

test('写法纪律留在正文：不写好转、写差异', () => {
  const text = docText();
  assert.ok(text.includes('不写「好转」「加重」，写差异'));
});
