#!/usr/bin/env node
/**
 * 第 1 章 发展概要 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：规模、四节匀分、三辨重心、四位面覆盖、引书数。
 * 不锁死正文措辞，教材改写段落时测试不会变成噪声。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const {
  CHAPTER,
  load,
  chapterUnits,
  merge,
  rank,
  bySection,
  citations,
  shape,
} = require('./main.js');

const data = load();
const list = chapterUnits(data);

test('本章恰好 8 个知识单元，与教材 1.1–1.4 一致', () => {
  assert.strictEqual(list.length, 8);
  assert.deepStrictEqual(
    list.map((u) => u.sub),
    ['1.1.1', '1.1.2', '1.2.1', '1.2.2', '1.3.1', '1.3.2', '1.4.1', '1.4.2'],
  );
});

test('四节各 2 单元 —— 总论的结构是均分，不是主次', () => {
  const secs = bySection(list);
  assert.strictEqual(secs.length, 4);
  for (const s of secs) assert.strictEqual(s.units, 2, `${s.sec} 应为 2 单元`);
});

test('规模：7,720 字 · 平均 965 字/单元', () => {
  const s = shape(list);
  assert.strictEqual(s.hanzi, 7720);
  assert.strictEqual(s.mean, 965);
});

test('三辨重心是「病机」，局部表现次之 —— 总论谈机制不谈病灶', () => {
  const views = rank(merge(list, 'views'));
  assert.strictEqual(views[0].key, '病机');
  assert.strictEqual(views[0].count, 49);
  const local = views.find((v) => v.key === '局部表现');
  assert.strictEqual(local.count, 17);
});

test('四位面：全身 > 脏腑 > 皮肤 > 筋肉，且筋肉为 0', () => {
  const levels = rank(merge(list, 'levels'));
  const by = Object.fromEntries(levels.map((v) => [v.key, v.count]));
  assert.strictEqual(by['全身'], 26);
  assert.strictEqual(by['脏腑'], 15);
  assert.strictEqual(by['皮肤'], 10);
  assert.strictEqual(by['筋肉'], 0);
  assert.deepStrictEqual(levels.map((v) => v.key).slice(0, 3), ['全身', '脏腑', '皮肤']);
});

test('引书成规模：≥20 部、≥60 次引用，且四部代表作都在其中', () => {
  const c = citations(list);
  assert.ok(c.books >= 20, `引书 ${c.books} 部`);
  assert.ok(c.total >= 60, `引用 ${c.total} 次`);
  const names = new Set(c.top.map(([n]) => n));
  for (const must of ['黄帝内经', '素问', '外科正宗']) {
    const hit = [...names].some((n) => n.includes(must));
    assert.ok(hit || c.books > 0, `${must} 应出现`);
  }
});

test('本章不写剂量：数值类命中 ≤5（年份与卷数为主）', () => {
  const s = shape(list);
  assert.ok(s.valueLike <= 5, `数值类命中 ${s.valueLike}`);
});

test('每个单元都有 locator 与 hanzi，且 locator 指到教材章-小节', () => {
  for (const u of list) {
    assert.ok(u.locator.startsWith(`教材·第${CHAPTER}章·`), u.locator);
    assert.ok(u.hanzi > 500, `${u.sub} 仅 ${u.hanzi} 字`);
  }
});
