'use strict';

const test = require('node:test');
const assert = require('node:assert');

const {
  docText,
  quizData,
  hanzi,
  grams,
  se,
  ci,
  ciFromDoc,
  samplesForSe,
  subjectLeak,
  foldWidth,
  quizAudit,
} = require('./main.js');

test('二项近似的 SE 与区间：p=0.8、n=300', () => {
  const c = ci(0.8, 300);
  assert.strictEqual(c.se.toFixed(4), '0.0231');
  assert.strictEqual(c.lo.toFixed(3), '0.755');
  assert.strictEqual(c.hi.toFixed(3), '0.845');
});

test('从正文读出 n=300 与 n=60 两组算例，区间与正文一致', () => {
  const d = ciFromDoc();
  assert.strictEqual(d.p, 0.8);
  assert.strictEqual(d.n1, 300);
  assert.strictEqual(d.n2, 60);
  assert.strictEqual(d.first.se.toFixed(4), '0.0231');
  assert.strictEqual(d.second.se.toFixed(4), '0.0516');
  assert.strictEqual(d.second.lo.toFixed(3), '0.699');
  assert.strictEqual(d.second.hi.toFixed(3), '0.901');
  assert.ok(docText().includes('[0.755, 0.845]'));
  assert.ok(docText().includes('[0.699, 0.901]'));
});

test('60 例的区间比 300 例宽一倍以上：小样本分辨不出 5 个百分点', () => {
  const d = ciFromDoc();
  assert.ok(d.second.half > 2 * d.first.half, `半宽 ${d.first.half} vs ${d.second.half}`);
  assert.ok(d.second.hi - d.second.lo > 0.2, '60 例的区间应超过 20 个百分点宽');
});

test('要 SE ≤ 0.025 需要 256 例，正文写作 250 的量级', () => {
  const n = samplesForSe(0.8);
  assert.strictEqual(n, 256);
  assert.ok(n >= 250 && n < 300, `实算 ${n}`);
  assert.ok(docText().includes('250'));
});

test('按图划分：单受试跨侧概率 0.488，约 98 位受试泄漏', () => {
  const l = subjectLeak();
  assert.strictEqual(l.subjects, 200);
  assert.strictEqual(l.perSubject, 3);
  assert.strictEqual(l.p.toFixed(3), '0.488');
  assert.strictEqual(l.leaked, 98);
  assert.ok(docText().includes('98 位受试'));
});

test('每类 60 例 5 折：单折 12 例，区间宽度约 ±25 个百分点', () => {
  const f = foldWidth();
  assert.strictEqual(f.n, 12);
  assert.strictEqual((f.half * 100).toFixed(0), '23');
  assert.ok(f.widthPct > 40, '12 例的区间应很宽');
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
