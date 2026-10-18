'use strict';
const assert = require('node:assert');
const test = require('node:test');
const { domains, drift, tiao, load } = require('./main.js');

test('底本规模：27 篇 · 1760 条 · 71496 字 · 9 域', () => {
  const j = load();
  assert.strictEqual(j.counts.pian, 27);
  assert.strictEqual(j.counts.tiao, 1760);
  assert.strictEqual(j.counts.chars, 71496);
  assert.strictEqual(j.counts.domains, 9);
});

test('域汇总条数之和 = 全书条数（域划分必须闭合）', () => {
  const sum = domains().reduce((a, d) => a + d.tiao, 0);
  assert.strictEqual(sum, 1760);
});

test('最大域是「汗吐下诸可不可」，不是太阳病', () => {
  const top = domains().sort((a, b) => b.tiao - a.tiao)[0];
  assert.strictEqual(top.name, '汗吐下诸可不可');
});

test('declared ≠ actual 的篇有 18 篇，差异可逐篇列出', () => {
  const d = drift();
  assert.strictEqual(d.length, 18);
  assert.ok(d.every((x) => Number.isInteger(x.tiaoDelta) && Number.isInteger(x.charsDelta)));
});

test('篇内条号引用：第 72 条是葛根汤条', () => {
  const t = tiao('辨太阳病脉证并治中', 72);
  assert.match(t.text, /太阳与阳明合病/);
  assert.match(t.text, /葛根汤主之/);
});

test('不给条号 / 条号越界 / 篇名不唯一，都必须抛错（引用不许猜）', () => {
  assert.throws(() => tiao('辨太阳病脉证并治中'), /篇名与篇内条号/);
  assert.throws(() => tiao('辨太阳病脉证并治中', 99999), /没有第/);
  assert.throws(() => tiao('辨太阳病脉证并治', 1), /篇名不唯一/);
});
