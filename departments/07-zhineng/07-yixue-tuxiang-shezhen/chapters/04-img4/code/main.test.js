'use strict';

const test = require('node:test');
const assert = require('node:assert');

const {
  docText,
  quizData,
  hanzi,
  grams,
  group,
  receptiveFields,
  layerTable,
  convParams,
  segScores,
  diceFromIou,
  quizAudit,
} = require('./main.js');

test('感受野递推：单层 3×3 卷积 s=1 → RF 3、J 1', () => {
  const [r] = receptiveFields([{ k: 3, s: 1 }]);
  assert.strictEqual(r.rf, 3);
  assert.strictEqual(r.j, 1);
});

test('六层表由正文解析，逐行与自报的 RF、跳距一致', () => {
  const rows = layerTable();
  assert.strictEqual(rows.length, 6);
  assert.deepStrictEqual(rows.map((r) => r.rf), [3, 5, 6, 10, 14, 16]);
  assert.deepStrictEqual(rows.map((r) => r.j), [1, 1, 2, 2, 2, 4]);
  for (const r of rows) {
    assert.strictEqual(r.rf, r.rfClaim, `L${r.n} 感受野与表不符`);
    assert.strictEqual(r.j, r.jClaim, `L${r.n} 跳距与表不符`);
  }
});

test('六层之后只覆盖 16×16，在 512 的图上占 3%', () => {
  const rows = layerTable();
  const last = rows[rows.length - 1];
  assert.strictEqual(last.rf, 16);
  const share = (16 * 16) / (512 * 512);
  assert.ok(share < 0.01, `16×16 占 512² 应不足 1%，实为 ${share}`);
  assert.ok(docText().includes('16×16'));
  assert.ok(docText().includes('3%'));
});

test('参数量：三层 3×3 为 110,784，一层 7×7 为 200,768', () => {
  const p = convParams();
  assert.strictEqual(p.C, 64);
  assert.strictEqual(p.threeByThree, 110784);
  assert.strictEqual(p.oneBySeven, 200768);
  assert.ok(p.oneBySeven > p.threeByThree, '7×7 参数应更多');
  assert.ok(docText().includes(group(p.threeByThree)));
  assert.ok(docText().includes(group(p.oneBySeven)));
});

test('分割算例现算：Dice 0.842、IoU 0.727、像素准确率 ≈99.88%', () => {
  const s = segScores();
  assert.strictEqual(s.gt, 1000);
  assert.strictEqual(s.pred, 900);
  assert.strictEqual(s.inter, 800);
  assert.strictEqual(s.total, 262144);
  assert.strictEqual(s.dice.toFixed(3), '0.842');
  assert.strictEqual(s.iou.toFixed(3), '0.727');
  // 正文按截断写成 99.88%，现算是 99.8856%：两者在正文声明的精度内一致
  assert.ok(Math.abs(s.pixelAcc * 100 - 99.88) < 0.01, `现算 ${(s.pixelAcc * 100).toFixed(4)}%`);
  assert.ok(docText().includes('99.88\\%'), '正文写作 99.88\\%（LaTeX 转义）');
  assert.ok(docText().includes('0.842'));
  assert.ok(docText().includes('0.727'));
});

test('Dice 与 IoU 单调对应，由 IoU 能反算回同一个 Dice', () => {
  const s = segScores();
  assert.ok(Math.abs(diceFromIou(s.iou) - s.dice) < 1e-12);
  for (const iou of [0.1, 0.5, 0.9]) {
    assert.ok(diceFromIou(iou) > iou, '同一重叠下 Dice 总大于 IoU');
  }
});

test('空掩膜口径：真值为空时 Dice 无定义，不能用 0/0', () => {
  const s = segScores();
  assert.ok(s.inter <= Math.min(s.gt, s.pred));
  assert.ok(docText().includes('Dice=0/0') || docText().includes('Dice}=0/0') || docText().includes('0/0'));
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
