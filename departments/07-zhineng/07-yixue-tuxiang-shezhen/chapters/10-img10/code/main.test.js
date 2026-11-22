'use strict';

const test = require('node:test');
const assert = require('node:assert');

const {
  docText,
  quizData,
  hanzi,
  grams,
  psi,
  psiFromDoc,
  verificationLadder,
  freezeSet,
  quizAudit,
} = require('./main.js');

test('PSI 性质：分布不变时为 0，偏移越大值越大', () => {
  const base = [0.2, 0.2, 0.2, 0.2, 0.2];
  assert.ok(Math.abs(psi(base, base)) < 1e-12);
  const mild = [0.25, 0.22, 0.2, 0.18, 0.15];
  assert.ok(psi(base, mild) > 0);
  assert.ok(psi(base, mild) < psi(base, [0.3, 0.25, 0.2, 0.15, 0.1]));
});

test('分箱占比从正文读出：五个分箱、基线各 20%、当前 30/25/20/15/10', () => {
  const p = psiFromDoc();
  assert.strictEqual(p.bins, 5);
  assert.deepStrictEqual(p.baseline, [0.2, 0.2, 0.2, 0.2, 0.2]);
  assert.deepStrictEqual(p.current.map((v) => Number(v.toFixed(2))), [0.3, 0.25, 0.2, 0.15, 0.1]);
  assert.strictEqual(p.sumsTo1, true);
});

test('PSI 现算 0.135，与正文一致', () => {
  const p = psiFromDoc();
  assert.strictEqual(p.value.toFixed(3), '0.135');
  assert.ok(docText().includes('0.135'));
});

test('0.135 落在「提示中等漂移」的档，不等于稳定也不等于显著', () => {
  const p = psiFromDoc();
  assert.strictEqual(p.band, 'medium');
  assert.ok(p.value > 0.1 && p.value < 0.25);
  assert.ok(docText().includes('0.1–0.25'), '正文应给出中等漂移的区间');
});

test('阈值口径：小于 0.1 稳定、0.1–0.25 中等、大于 0.25 显著', () => {
  const base = [0.2, 0.2, 0.2, 0.2, 0.2];
  assert.ok(psi(base, [0.21, 0.2, 0.2, 0.2, 0.19]) < 0.1);
  assert.ok(psi(base, [0.35, 0.25, 0.2, 0.15, 0.05]) > 0.25);
});

test('验证阶梯 0.92 → 0.87 → 0.78，逐级落差 0.05 与 0.09', () => {
  const l = verificationLadder();
  assert.deepStrictEqual(l.levels, [0.92, 0.87, 0.78]);
  assert.strictEqual(l.stepDrops[0].toFixed(2), '0.05');
  assert.strictEqual(l.stepDrops[1].toFixed(2), '0.09');
  assert.strictEqual(l.totalDrop.toFixed(2), '0.14');
  assert.ok(docText().includes('0.92') && docText().includes('0.87') && docText().includes('0.78'));
});

test('版本冻结四样：只冻模型不冻预处理，等于没冻结', () => {
  const f = freezeSet();
  assert.strictEqual(f.length, 4);
  assert.deepStrictEqual(f, ['模型文件', '预处理参数', '色卡校正矩阵', '阈值']);
  assert.ok(docText().includes('等于没冻结'));
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
