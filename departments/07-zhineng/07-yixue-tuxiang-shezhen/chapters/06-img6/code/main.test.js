'use strict';

const test = require('node:test');
const assert = require('node:assert');

const {
  docText,
  quizData,
  hanzi,
  grams,
  ppv,
  prevalenceFromDoc,
  thresholdScan,
  quizAudit,
} = require('./main.js');

test('PPV 公式：同一 Sens/Spec 下，基础率越高 PPV 越高', () => {
  assert.ok(ppv(0.9, 0.9, 0.3) > ppv(0.9, 0.9, 0.02));
  assert.ok(Math.abs(ppv(0.9, 0.9, 0.5) - 0.9) < 1e-12, '平衡时 PPV 等于 Sens');
});

test('正文的 Sens 0.90 / Spec 0.90 与两个基础率都能读出', () => {
  const p = prevalenceFromDoc();
  assert.strictEqual(p.sens, 0.9);
  assert.strictEqual(p.spec, 0.9);
  assert.deepStrictEqual(p.pis, [0.3, 0.02]);
});

test('PPV 从 0.794 掉到 0.155，与正文一致（不是模型变差，是基础率变了）', () => {
  const p = prevalenceFromDoc();
  const [hi, lo] = p.values;
  assert.strictEqual(hi.ppv.toFixed(3), '0.794');
  assert.strictEqual(lo.ppv.toFixed(3), '0.155');
  assert.ok(docText().includes('0.794') && docText().includes('0.155'));
  assert.ok(lo.ppv < hi.ppv / 4, '低基础率下 PPV 应掉到四分之一以下');
});

test('阈值扫描表的规模与代价比：1,000 例、20 阳性、10:1', () => {
  const s = thresholdScan();
  assert.strictEqual(s.pos, 20);
  assert.strictEqual(s.neg, 980);
  assert.strictEqual(s.cFn, 10);
  assert.strictEqual(s.cFp, 1);
  assert.strictEqual(s.rows.length, 4);
});

test('逐行重算 Sens/Spec/PPV/代价，与表格自报值一致', () => {
  const s = thresholdScan();
  for (const r of s.rows) {
    assert.strictEqual(r.sens.toFixed(2), r.sensClaim.toFixed(2), `t=${r.t} Sens`);
    assert.strictEqual(r.spec.toFixed(3), r.specClaim.toFixed(3), `t=${r.t} Spec`);
    assert.strictEqual(r.ppv.toFixed(3), r.ppvClaim.toFixed(3), `t=${r.t} PPV`);
    assert.strictEqual(r.cost, r.costClaim, `t=${r.t} 代价`);
  }
});

test('代价最小的阈值是 0.80（140），不是 0.5，也不是更低的 0.30', () => {
  const s = thresholdScan();
  assert.strictEqual(s.best.t, 0.8);
  assert.strictEqual(s.best.cost, 140);
  const lowest = s.rows.find((r) => r.t === 0.3);
  assert.ok(lowest.cost > s.best.cost, '0.30 抓到更多真阳性但代价更高');
  assert.ok(s.best.t > 0.5);
});

test('即使最优点 PPV 也只有 0.286：报警里约七成是假的', () => {
  const s = thresholdScan();
  assert.strictEqual(s.best.ppv.toFixed(3), '0.286');
  assert.ok(1 - s.best.ppv > 0.7);
});

test('贝叶斯阈值 1/11 ≈ 0.091，与扫描得到的 0.80 相差很远', () => {
  const s = thresholdScan();
  const bayes = s.cFp / (s.cFp + s.cFn);
  assert.strictEqual(bayes.toFixed(3), '0.091');
  assert.ok(Math.abs(bayes - s.best.t) > 0.5, '未校准时理论阈值与扫描值会分叉');
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
