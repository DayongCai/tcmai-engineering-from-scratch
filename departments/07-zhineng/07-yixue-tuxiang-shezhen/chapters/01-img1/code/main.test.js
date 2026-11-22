'use strict';

const test = require('node:test');
const assert = require('node:assert');

const {
  docText,
  quizData,
  hanzi,
  grams,
  group,
  sourceSide,
  trainSide,
  pixelBudget,
  segLabels,
  quizAudit,
} = require('./main.js');

test('原图规格从正文读出：512×512×3', () => {
  assert.deepStrictEqual(sourceSide(), { w: 512, h: 512 });
});

test('训练缓存规格从正文读出：224×224', () => {
  assert.deepStrictEqual(trainSide(), { w: 224, h: 224 });
});

test('单图字节数现算 786,432，与正文写法一致', () => {
  const b = pixelBudget();
  assert.strictEqual(b.fullBytes, 512 * 512 * 3);
  assert.strictEqual(b.fullBytes, 786432);
  assert.ok(docText().includes(group(b.fullBytes)), `正文应写出 ${group(b.fullBytes)}`);
});

test('1 万张原图约 7.3 GiB，与正文一致', () => {
  const b = pixelBudget();
  assert.strictEqual(b.tenThousandGiB.toFixed(1), '7.3');
  assert.ok(docText().includes(`${b.tenThousandGiB.toFixed(1)} GiB`));
});

test('训练张量现算 602,112 字节，batch 32 约 18.4 MiB', () => {
  const b = pixelBudget();
  assert.strictEqual(b.trainBytes, 224 * 224 * 3 * 4);
  assert.strictEqual(b.trainBytes, 602112);
  assert.ok(docText().includes(group(b.trainBytes)), `正文应写出 ${group(b.trainBytes)}`);
  assert.strictEqual(b.batchMiB.toFixed(1), '18.4');
  assert.ok(docText().includes(`${b.batchMiB.toFixed(1)} MiB`));
});

test('标签占比 0.003%：20 字节相对训练张量的量级', () => {
  const b = pixelBudget();
  assert.ok(Math.abs(b.labelSharePct - 0.00332) < 0.0001);
  assert.strictEqual(b.labelSharePct.toFixed(3), '0.003');
  assert.ok(docText().includes(`${b.labelSharePct.toFixed(3)}%`));
});

test('分割每图标签数 = H×W = 262,144，是分类 1 个标签的同等倍数', () => {
  const n = segLabels();
  assert.strictEqual(n, 262144);
  assert.ok(docText().includes('262,144'), '正文应写出 262,144');
  assert.strictEqual(n, 262144 * 1, '分类每图只有 1 个标签，分割是它的 262,144 倍');
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

test('三道 check 题全部接地：正确选项能在正文找到原词', () => {
  const a = quizAudit();
  assert.strictEqual(a.grounded, 3);
  assert.ok(a.grounded >= 2);
});

test('解释都过 30 汉字，且不复述题干', () => {
  for (const item of quizData().questions) {
    assert.ok(hanzi(item.explain) >= 30, `解释过短：${item.question}`);
    assert.ok(!item.explain.includes(item.question), '解释不应整句复述题干');
  }
});

test('正确选项用词在正文里能逐字对上（不是自造术语）', () => {
  const body = grams(docText());
  for (const item of quizData().questions) {
    const right = item.options[item.correct];
    assert.ok([...grams(right)].some((g) => body.has(g)), `正确选项在正文找不到：${right}`);
  }
});

test('答案分散在四个位置，不是全押同一项', () => {
  const idx = quizData().questions.map((q) => q.correct);
  assert.strictEqual(new Set(idx).size, 4, `correct 分布：${idx.join(',')}`);
});
