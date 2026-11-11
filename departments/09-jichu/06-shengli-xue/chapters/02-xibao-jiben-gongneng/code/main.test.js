#!/usr/bin/env node
/**
 * 第 2 章 细胞的基本功能 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言落在「链是否成立」与「口径是否守住」两处：
 * 四节顺序、细胞层排名、关键词重心、数值为零。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const {
  LINKS,
  CHAPTER,
  load,
  text,
  chapterUnits,
  shape,
  lens,
  rank,
  total,
  valueAudit,
  chain,
  keyword,
  cellRanking,
  bySection,
} = require('./main');

const units = load();
const list = chapterUnits(units);

test('本章 12 个知识单元、4 节、正文合计 20767 字', () => {
  const s = shape(list);
  assert.strictEqual(s.units, 12);
  assert.strictEqual(s.secs, 4);
  assert.strictEqual(s.hanzi, 20767);
  assert.strictEqual(chapterUnits(units, CHAPTER).length, 12);
  const secNos = [...bySection(list).keys()].map((k) => k.split(/\s+/)[0]).sort();
  assert.deepStrictEqual(secNos, ['2.1', '2.2', '2.3', '2.4']);
});

test('三视角以形态居首（572 次），合计 1054 次', () => {
  const { views } = lens(list);
  assert.strictEqual(total(views), 1054);
  assert.strictEqual(views.形态, 572);
  assert.strictEqual(views.机能, 381);
  assert.strictEqual(views.代谢, 101);
  assert.strictEqual(rank(views)[0][0], '形态');
});

test('四层级以细胞居首（320 次），占本章层级命中的八成以上', () => {
  const { levels } = lens(list);
  assert.strictEqual(total(levels), 380);
  assert.strictEqual(levels.细胞, 320);
  assert.strictEqual(rank(levels)[0][0], '细胞');
  assert.ok(levels.细胞 / total(levels) > 0.8);
});

test('本章是全书细胞层词频最高的章：320 次，排第 1', () => {
  const r = cellRanking(units, list);
  assert.strictEqual(r.position, 1);
  assert.strictEqual(r.cell, 320);
  assert.strictEqual(r.bookCell, 1453);
  assert.strictEqual(r.rows[0].no, '2');
  // 第二名是第 3 章血液（血细胞）
  assert.strictEqual(r.rows[1].no, '3');
});

test('四节标题按「转运 → 信号 → 电 → 收缩」排列，四环全中', () => {
  const ch = chain(list);
  assert.deepStrictEqual(LINKS.map((l) => l.key), ['转运', '信号', '电', '收缩']);
  assert.deepStrictEqual(ch.map((x) => x.sec.split(/\s+/)[0]), ['2.1', '2.2', '2.3', '2.4']);
  assert.deepStrictEqual(ch.map((x) => x.hit), [true, true, true, true]);
});

test('钙的重心在 2.4.2：42 次里 32 次落在兴奋收缩耦联那一单元', () => {
  const ca = keyword(list, '钙');
  assert.strictEqual(ca.total, 42);
  assert.strictEqual(ca.top.sub, '2.4.2');
  assert.strictEqual(ca.top.n, 32);
  // 不是全章皆有：至少有一个单元完全没提钙
  assert.ok(ca.per.length < list.length);
});

test('通道的重心在 2.2.3：91 次里 41 次落在离子通道介导的信号转导', () => {
  const chan = keyword(list, '通道');
  assert.strictEqual(chan.total, 91);
  assert.strictEqual(chan.top.sub, '2.2.3');
  assert.strictEqual(chan.top.n, 41);
});

test('数值核验：12 个单元的 valueLike 全为 0', () => {
  const audit = valueAudit(list);
  assert.strictEqual(audit.hits, 0);
  assert.deepStrictEqual(audit.offenders, []);
  for (const u of list) assert.strictEqual(u.measure.valueLike, 0, `${u.sub} 出现数值`);
});

test('2.1.1 的 body 不许为空，prose 是去目标视图；text() 仍保留 rawBody 回退', () => {
  const first = list.find((u) => u.sub === '2.1.1');
  // 上游曾经把「去掉【学习目标】后的余文」存进 body，纯目标单元就变成空串，
  // text() 退到 rawBody 后口径悄悄变了（词频差一两点）。现在口径定死：body 恒等于整段。
  assert.ok(first.body.length > 1000, 'body 为空会让统计口径静默变化');
  assert.ok(first.prose && first.prose.length > 500, 'prose 应是去掉学习目标后的正文');
  assert.ok(!/^【学习目标】/.test(first.prose), 'prose 不该再以【学习目标】开头');
  assert.match(text(first), /细胞膜/);
});
