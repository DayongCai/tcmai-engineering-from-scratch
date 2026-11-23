'use strict';
const assert = require('node:assert');
const test = require('node:test');
const { buildMatrix, match, matchLift, matchHybrid, evidence, supportBreakdown, FORMULAS } = require('./main.js');

test('方-症矩阵：支持数与篇数可复现', () => {
  const m = buildMatrix();
  assert.strictEqual(m.get('桂枝汤').support, 134);
  assert.strictEqual(m.get('大承气汤').support, 79);
  assert.strictEqual(m.get('麻黄汤').support, 44);
  assert.strictEqual(m.get('小柴胡汤').support, 34);
  assert.strictEqual(m.get('四逆汤').support, 31);
  assert.ok(m.get('桂枝汤').pians.size >= 10, '桂枝汤应跨 10 篇以上');
});

test('第一版 Jaccard 的失败被保留：寒利查询排出泻下方', () => {
  const r = match(['下利', '厥', '恶寒']);
  assert.strictEqual(r[0].formula, '调胃承气汤');
});

test('第二版纯 lift 的失败被保留：表实查询排出小样本方', () => {
  const r = matchLift(['无汗', '脉浮', '头痛', '喘']);
  assert.strictEqual(r[0].formula, '理中丸');
  assert.ok(r[0].support < 10);
});

test('第三版混合：四个查询全部落到对应方', () => {
  assert.strictEqual(matchHybrid(['无汗', '脉浮', '头痛', '喘'])[0].formula, '麻黄汤');
  assert.strictEqual(matchHybrid(['往来寒热', '胸胁苦满', '口苦', '心烦'])[0].formula, '小柴胡汤');
  assert.strictEqual(matchHybrid(['腹满', '潮热', '谵语'])[0].formula, '小承气汤');
  assert.strictEqual(matchHybrid(['下利', '厥', '恶寒'])[0].formula, '四逆汤');
});

test('混合版给出覆盖率与提升度分量，供人复核', () => {
  const [top] = matchHybrid(['下利', '厥', '恶寒']);
  assert.strictEqual(top.coverage, 1);
  assert.ok(top.meanLift > 1);
  assert.strictEqual(top.score, Number((top.meanLift * top.coverage).toFixed(2)));
});

test('支持度门槛生效：小于 10 条的方不进混合版候选', () => {
  for (const x of matchHybrid(['发热', '恶寒'])) assert.ok(x.support >= 10, x.formula);
});

test('出处可回原文：麻黄汤 + 无汗 命中篇 5', () => {
  const ev = evidence('麻黄汤', ['无汗']);
  assert.ok(ev.length >= 1);
  assert.ok(ev.some((e) => e.pian === 5 && e.text.includes('麻黄汤')));
});

test('方名表覆盖本章用到的 12 方，且不含前缀污染词', () => {
  assert.strictEqual(FORMULAS.length, 12);
  assert.ok(FORMULAS.every((f) => !/^(宜|属|与|服)/.test(f)));
});

test('支持度成色：大承气 79 条里证治条 16、方后注 63', () => {
  const b = supportBreakdown('大承气汤');
  assert.strictEqual(b.total, 79);
  assert.strictEqual(b.zhengzhi, 16);
  assert.strictEqual(b.noteLike, 63);
  assert.strictEqual(b.title, 0);
});

test('支持度成色：桂枝汤 134 = 证治 51 + 方后注 82 + 方名行 1', () => {
  const b = supportBreakdown('桂枝汤');
  assert.deepStrictEqual([b.total, b.zhengzhi, b.noteLike, b.title], [134, 51, 82, 1]);
  assert.strictEqual(b.zhengzhi + b.noteLike + b.title, b.total);
});

test('支持度成色：不在方名表里的方必须抛错', () => {
  assert.throws(() => supportBreakdown('乌梅丸'), /方名表/);
});

// ── quiz 结构契约（与 scripts/check_chapter_exercises.js 同源）──
const { quizContract } = require('../../_quiz-contract.js');
quizContract(__dirname);
