'use strict';
/**
 * 第 11 章的单测：八节同构、32 证—方对、预防调护槽位的语义分裂、量值复算。
 * 断言写死具体值：底本一改，测试必须失败。
 */
const assert = require('node:assert');
const test = require('node:test');
const {
  chap, subs, shape, skeleton, pairs, zhengPerDisease,
  careProfile, careSplit, valueSpots, valueTotal, clinTotal, formulaSpread, totals,
} = require('./main.js');

test('章的规模：8 节 · 40 小节 · 29617 汉字 · 量值 20', () => {
  const t = totals();
  assert.strictEqual(t.secs, 8);
  assert.strictEqual(t.subs, 40);
  assert.strictEqual(t.hanzi, 29617);
  assert.strictEqual(t.valueLike, 20);
});

test('量值复算与底本同口径：20 处；体温与角度另计 5 处', () => {
  assert.strictEqual(valueTotal(), 20);
  assert.strictEqual(valueTotal(), chap().counts.valueLike);
  assert.strictEqual(clinTotal(), 5);
  const subsWithValues = valueSpots().map((v) => v.sub);
  assert.ok(subsWithValues.includes('11.1.4'));
  assert.ok(subsWithValues.includes('11.3.4'));
  assert.ok(subsWithValues.includes('11.7.4'));
});

test('八节同构：8/8 节都是五格骨架', () => {
  const sk = skeleton();
  assert.strictEqual(sk.length, 8);
  for (const s of sk) {
    assert.deepStrictEqual(s.titles, ['概述', '病因病机', '辨证论治', '预防调护', '按语']);
    assert.strictEqual(s.regular, true);
  }
  assert.strictEqual(totals().regular, 8);
  assert.deepStrictEqual(sk.filter((s) => s.kind === '急症').map((s) => s.no), ['11.1', '11.2', '11.3']);
  assert.deepStrictEqual(sk.filter((s) => s.kind === '传染病').map((s) => s.no), ['11.4', '11.5', '11.6', '11.7', '11.8']);
});

test('证—方对 32 个；证数 6/4/3/4/4/6/2/3', () => {
  const t = totals();
  assert.strictEqual(t.pairs, 32);
  assert.deepStrictEqual(zhengPerDisease().map((r) => r.zheng), [6, 4, 3, 4, 4, 6, 2, 3]);
  assert.strictEqual(zhengPerDisease().reduce((n, r) => n + r.zheng, 0), 32);
});

test('证名去重 31、方名去重 28——唯一同名证是气阴两伤证', () => {
  assert.strictEqual(totals().distinctZheng, 31);
  assert.strictEqual(totals().distinctFang, 28);
  const byName = new Map();
  for (const p of pairs()) byName.set(p.zheng, [...(byName.get(p.zheng) || []), p.sub]);
  const dup = [...byName.entries()].filter(([, v]) => v.length > 1);
  assert.deepStrictEqual(dup.map(([k, v]) => [k, v]), [['气阴两伤证', ['11.4.3', '11.5.3']]]);
});

test('跨病复用的四张方：银翘散 · 新加香薷饮 · 大承气汤 · 参附汤合生脉散', () => {
  const multi = formulaSpread().filter((x) => x.diseaseCount > 1);
  assert.deepStrictEqual(multi.map((x) => x.fang).sort(), ['参附汤合生脉散', '大承气汤', '新加香薷饮', '银翘散']);
  for (const x of multi) assert.strictEqual(x.n, 2);
});

test('霍乱三证是兜底取到的：病名即证名（寒/热/干）', () => {
  const fb = pairs().filter((p) => p.fallback);
  assert.strictEqual(fb.length, 3);
  assert.deepStrictEqual(fb.map((p) => p.zheng), ['寒霍乱', '热霍乱', '干霍乱']);
  for (const p of fb) assert.strictEqual(p.sec, '11.8');
});

test('预防调护槽位语义分裂：急症护理词 6 / 公卫词 3；传染病护理词 5 / 公卫词 39', () => {
  const cs = careSplit();
  assert.deepStrictEqual(cs.acute, { rows: 3, care: 6, public: 3 });
  assert.deepStrictEqual(cs.infectious, { rows: 5, care: 5, public: 39 });
  // 隔离与消毒只在传染病五节出现
  for (const r of careProfile().filter((x) => x.kind === '急症')) {
    assert.strictEqual(r.hits['隔离'], 0, `${r.no} 急症节出现了隔离`);
    assert.strictEqual(r.hits['消毒'], 0, `${r.no} 急症节出现了消毒`);
  }
  // 隔离次数最多的是疫毒痢与霍乱
  const top = careProfile().sort((a, b) => b.hits['隔离'] - a.hits['隔离']).slice(0, 2).map((r) => r.no);
  assert.deepStrictEqual(top, ['11.7', '11.8']);
});

test('每条证—方对都有证名与方名，均非空', () => {
  for (const p of pairs()) {
    assert.ok(p.zheng.length >= 3, `${p.sub} 证名异常`);
    assert.ok(p.fang.length >= 3, `${p.sub} 方名异常`);
    assert.ok(!/未取到/.test(p.zheng + p.fang), `${p.sub} 有未取到的字段`);
  }
});

test('每个小节 1 个条目，正文都长于 400 字', () => {
  for (const u of subs()) {
    assert.strictEqual(u.items.length, 1, `${u.no} 条目数异常`);
    assert.ok(u.items[0].body.length > 400, `${u.no} 正文过短`);
  }
});
