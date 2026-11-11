'use strict';
/**
 * 第 10 章的单测：五格骨架、25 个证—方对、零复用——每个数都必须能从底本重算。
 */
const assert = require('node:assert');
const test = require('node:test');
const {
  chap, subs, shape, skeleton, density, definitions, pairs,
  zhengPerDisease, formulaSpread, syndromeClash, maxims, values, totals,
} = require('./main.js');

test('章的规模：5 节 · 25 小节 · 24641 汉字 · 量值 0', () => {
  const t = totals();
  assert.strictEqual(t.secs, 5);
  assert.strictEqual(t.subs, 25);
  assert.strictEqual(t.hanzi, 24641);
  assert.strictEqual(t.valueLike, 0);
});

test('五格骨架同构：5 节的小节标题序列完全相同', () => {
  const sk = skeleton();
  assert.strictEqual(sk.length, 5);
  for (const s of sk) {
    assert.deepStrictEqual(s.titles, ['概述', '病因病机', '辨证论治', '预防调护', '按语']);
    assert.strictEqual(s.regular, true);
  }
  assert.strictEqual(totals().regular, 5);
});

test('字数分布：正文 29161 字，辨证论治五节 13291 字占 45.6%', () => {
  const d = density();
  assert.strictEqual(d.total, 29161);
  assert.strictEqual(d.bzTotal, 13291);
  assert.strictEqual(d.bzPct, 45.6);
  assert.deepStrictEqual(d.rows.map((r) => r.chars), [6431, 5423, 5795, 6119, 5393]);
  assert.deepStrictEqual(d.rows.map((r) => r.bzChars), [3112, 2301, 2618, 3006, 2254]);
});

test('证—方对 25 个，证名与方名都零重复', () => {
  const t = totals();
  assert.strictEqual(t.pairs, 25);
  assert.strictEqual(t.distinctZheng, 25);
  assert.strictEqual(t.distinctFang, 25);
  assert.deepStrictEqual(zhengPerDisease().map((r) => r.zheng), [6, 4, 5, 6, 4]);
});

test('零跨病复用、零同名证——与第 9 章形成对照', () => {
  assert.strictEqual(formulaSpread().filter((x) => x.diseaseCount > 1).length, 0);
  assert.strictEqual(formulaSpread().filter((x) => x.diseaseCount === 1).length, 25);
  assert.deepStrictEqual(syndromeClash(), []);
});

test('每条证—方对：证名以证结尾、方名以加减结尾', () => {
  for (const p of pairs()) {
    assert.ok(p.zheng.endsWith('证'), `${p.sub} 证名异常：${p.zheng}`);
    assert.ok(/加减$/.test(p.fang), `${p.sub} 方名未带加减：${p.fang}`);
    assert.ok(p.src.length >= 3, `${p.sub} 缺出处：${p.fang}`);
  }
  // 痹证六证：行、痛、着、风湿热（邪气偏胜）＋痰瘀、肝肾亏虚（病程演变）
  const bi = pairs().filter((p) => p.sec === '10.1').map((p) => p.zheng);
  assert.deepStrictEqual(bi, ['行痹证', '痛痹证', '着痹证', '风湿热痹证', '痰瘀痹阻证', '肝肾亏虚证']);
});

test('五个定义句：每个概述的第一句，且以病名起首', () => {
  const d = definitions();
  assert.strictEqual(d.length, 5);
  for (const x of d) {
    assert.ok(x.sentence.startsWith(x.disease), `${x.no} 定义句未以病名起首：${x.sentence.slice(0, 12)}`);
    assert.ok(x.sentence.endsWith('。'));
    assert.ok(x.sentence.length >= 20);
  }
});

test('按语治则句与边界句：治痿独取阳明 1 · 诸风掉眩 1 · 腰为肾之府 1 · 不可一味 4', () => {
  const m = Object.fromEntries(maxims().map((x) => [x.w, x.n]));
  assert.strictEqual(m['治痿独取阳明'], 1);
  assert.strictEqual(m['诸风掉眩'], 1);
  assert.strictEqual(m['腰为肾之府'], 1);
  assert.strictEqual(m['不可一味'], 4);
  assert.strictEqual(m['顾护脾胃'], 2);
  // 五节按语都带疗效评价的审慎声明 —— 教材自带的边界层
  assert.strictEqual(m['疗效评价'], 4);
  assert.strictEqual(m['力戒夸大'], 4);
  assert.strictEqual(m['中西医结合'], 3);
  assert.strictEqual(m['转诊'], 3);
});

test('底本量值 0：本章正文没有剂量，A 支形状', () => {
  assert.deepStrictEqual(values(), []);
  assert.strictEqual(chap().counts.valueLike, 0);
});

test('每个小节 1 个条目，正文都长于 400 字', () => {
  for (const u of subs()) {
    assert.strictEqual(u.items.length, 1, `${u.no} 条目数异常`);
    assert.ok(u.items[0].body.length > 400, `${u.no} 正文过短`);
  }
});
