'use strict';
const assert = require('node:assert');
const test = require('node:test');
const { LEDGER, KIND_MAP, classify, auditChapters, verifyEvidence, coverage, CHAPTERS } = require('./main.js');

test('登记表覆盖九章，章号 01–09 各一次', () => {
  assert.strictEqual(LEDGER.length, 9);
  assert.deepStrictEqual(LEDGER.map((r) => r.ch), ['01', '02', '03', '04', '05', '06', '07', '08', '09']);
  assert.deepStrictEqual(LEDGER.map((r) => r.slug), CHAPTERS);
});

test('每章都写了「能算 / 不能算 / 失效模式」，三条都不许空', () => {
  const cov = coverage();
  assert.strictEqual(cov.total, 9);
  assert.deepStrictEqual(cov.bad, []);
  for (const r of LEDGER) {
    assert.ok(r.can.length >= 1, `${r.ch} 缺 能算`);
    assert.ok(r.cannot.length >= 1, `${r.ch} 缺 不能算`);
    assert.ok(r.failure.length > 5, `${r.ch} 失效模式太短`);
  }
});

test('磁盘核对：九章 docs/code/test/quiz 齐全', () => {
  const rows = auditChapters();
  assert.strictEqual(rows.length, 9);
  assert.ok(rows.every((r) => r.ok), JSON.stringify(rows.filter((r) => !r.ok)));
});

test('证据核对：登记的数字/关键词都能在该章 docs 里找到', () => {
  const rows = verifyEvidence();
  assert.ok(rows.every((r) => r.ok), JSON.stringify(rows.filter((r) => !r.ok)));
  // 抽查两条硬数字
  assert.ok(LEDGER[0].evidence.includes('561,111'));
  assert.ok(LEDGER[8].evidence.includes('2.31'));
});

test('请求类型判定：结构类可算，效力类不可算', () => {
  for (const k of ['计数', '顺序', '归属', '区间']) assert.strictEqual(classify(k).verdict, '可算', k);
  for (const k of ['因果', '效力', '应验']) assert.strictEqual(classify(k).verdict, '不可算', k);
});

test('未知请求类型必须抛错（不许「大概能算」）', () => {
  assert.throws(() => classify('疗效预测'), /未知请求类型/);
  assert.throws(() => classify(''), /未知请求类型/);
});

test('三律的载体在表里可查：null 归 0 属第 2 章，点值冒充精确属第 9 章', () => {
  assert.match(LEDGER.find((r) => r.ch === '02').failure, /null.*0|0.*null/);
  assert.match(LEDGER.find((r) => r.ch === '09').failure, /点值/);
  assert.match(LEDGER.find((r) => r.ch === '07').failure, /归纳/);
});

test('KIND_MAP 恰有 7 类，判定只有两个字面值', () => {
  assert.strictEqual(Object.keys(KIND_MAP).length, 7);
  assert.deepStrictEqual([...new Set(Object.values(KIND_MAP).map((v) => v.verdict))].sort(), ['不可算', '可算']);
});
