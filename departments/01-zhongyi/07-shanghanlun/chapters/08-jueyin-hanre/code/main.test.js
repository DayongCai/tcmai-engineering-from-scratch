'use strict';
const assert = require('node:assert');
const test = require('node:test');
const { parseOutline, probe, mixCheck, PIAN } = require('./main.js');

test('提纲拆出 5 症 + 1 条禁令：「下之利不止」不算症状', () => {
  const o = parseOutline();
  assert.strictEqual(o.symptomCount, 5);
  assert.deepStrictEqual(o.symptoms, ['消渴', '气上撞心', '心中疼热', '饥而不欲食', '食则吐蛔']);
  assert.strictEqual(o.contra, '下之利不止');
  assert.ok(!o.symptoms.includes('下之利不止'));
});

test('异体字已归一：提纲里的「心中疼𤍠」应计为一个症状而非丢失', () => {
  assert.ok(parseOutline().raw.includes('心中疼热'));
});

test('乌梅丸与四逆散在底本全库为 0（缺口可复核）', () => {
  for (const k of ['乌梅丸', '四逆散']) {
    const r = probe(k);
    assert.deepStrictEqual([r.inPian, r.all], [0, 0], k);
  }
});

test('篇内 vs 全库：「厥」篇内 4 / 全库 45；「厥深」「热亦深」仅篇外', () => {
  assert.deepStrictEqual([probe('厥').inPian, probe('厥').all], [4, 45]);
  assert.deepStrictEqual([probe('厥深').inPian, probe('厥深').all], [0, 1]);
  assert.deepStrictEqual([probe('热亦深').inPian, probe('热亦深').all], [0, 1]);
});

test('当归四逆汤：篇内有 1 条，但全库仅 2 条', () => {
  assert.deepStrictEqual([probe('当归四逆汤').inPian, probe('当归四逆汤').all], [1, 2]);
});

test('篇 24 共 30 条，且混入少阴病 1 条、阳明病 4 条（篇界错位）', () => {
  assert.strictEqual(PIAN.actual.tiao, 30);
  const m = mixCheck();
  assert.strictEqual(m['少阴病'], 1);
  assert.strictEqual(m['阳明病'], 4);
});
