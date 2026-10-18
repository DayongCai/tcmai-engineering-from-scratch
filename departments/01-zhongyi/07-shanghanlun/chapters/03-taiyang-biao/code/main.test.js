'use strict';
const assert = require('node:assert');
const test = require('node:test');
const { normalize, search, classify } = require('./main.js');

test('归一化：异体 𤍠 → 热，并报替换次数', () => {
  const r = normalize('发𤍠恶寒，发𤍠而喘');
  assert.strictEqual(r.text, '发热恶寒，发热而喘');
  assert.deepStrictEqual(r.replaced, { '𤍠': 2 });
});

test('检索「发热」：raw 39 → 归一 163，漏检 124', () => {
  const r = search('发热');
  assert.strictEqual(r.raw, 39);
  assert.strictEqual(r.normalized, 163);
  assert.strictEqual(r.missed, 124);
});

test('不受异体字影响的关键词漏检为 0', () => {
  for (const k of ['汗出', '无汗', '恶寒']) assert.strictEqual(search(k).missed, 0, k);
});

test('表证分支：汗出脉缓 → 中风/桂枝汤；无汗脉浮紧而喘 → 伤寒/麻黄汤', () => {
  const a = classify({ sweat: true, pulse: '缓' });
  assert.strictEqual(a.branch, '太阳中风');
  assert.strictEqual(a.formula, '桂枝汤');
  const b = classify({ sweat: false, pulse: '浮紧', dyspnea: true });
  assert.strictEqual(b.branch, '太阳伤寒');
  assert.strictEqual(b.formula, '麻黄汤');
});

test('条件不足或不合分支时不硬分，且给出不排除项', () => {
  const r = classify({});
  assert.strictEqual(r.branch, '不确定');
  assert.strictEqual(r.formula, null);
  assert.ok(r.notExcluded.length >= 2);
  assert.strictEqual(classify({ sweat: true, pulse: '浮紧' }).branch, '不确定');
});

test('频次只报数：桂枝汤 134 条、麻黄汤 44 条（不可当权重）', () => {
  assert.strictEqual(search('桂枝汤').raw, 134);
  assert.strictEqual(search('麻黄汤').raw, 44);
});
