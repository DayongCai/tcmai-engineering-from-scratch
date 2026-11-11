#!/usr/bin/env node
/**
 * 第 3 章 血液 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言落在三张结构图上：止血的三枚齿轮、生成与破坏的两端、血型的判定表。
 * 顺带盯住一处静默失败：3.1.1 在单元层 body 为空，必须退到 rawBody。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const {
  GEARS,
  CHAPTER,
  load,
  text,
  chapterUnits,
  shape,
  lens,
  rank,
  total,
  valueAudit,
  keyword,
  gears,
  turnover,
  bloodGroups,
  levelRanking,
  bySection,
} = require('./main');

const units = load();
const list = chapterUnits(units);

test('本章 12 个知识单元、4 节、正文合计 20913 字', () => {
  const s = shape(list);
  assert.strictEqual(s.units, 12);
  assert.strictEqual(s.secs, 4);
  assert.strictEqual(s.hanzi, 20913);
  assert.deepStrictEqual(
    [...bySection(list).keys()].map((k) => k.split(/\s+/)[0]).sort(),
    ['3.1', '3.2', '3.3', '3.4'],
  );
});

test('三视角以机能居首（212 次），合计 379 次', () => {
  const { views } = lens(list);
  assert.strictEqual(total(views), 379);
  assert.strictEqual(views.机能, 212);
  assert.strictEqual(views.形态, 110);
  assert.strictEqual(views.代谢, 57);
  assert.strictEqual(rank(views)[0][0], '机能');
});

test('四层级以细胞居首（271 次），组织只有 45 次、不足一成', () => {
  const { levels } = lens(list);
  assert.strictEqual(total(levels), 526);
  assert.strictEqual(levels.细胞, 271);
  assert.strictEqual(levels.组织, 45);
  assert.strictEqual(rank(levels)[0][0], '细胞');
  assert.strictEqual(rank(levels).slice(-1)[0][0], '组织');
  assert.ok(levels.组织 / total(levels) < 0.1);
});

test('本章细胞层居全书第二（271），第一是第 2 章细胞的基本功能（320）', () => {
  const r = levelRanking(units, list);
  assert.strictEqual(r.cellPosition, 2);
  assert.strictEqual(r.cell, 271);
  assert.strictEqual(r.bookCell, 1453);
  assert.ok(r.cellShareOfBook > 0.18 && r.cellShareOfBook < 0.19);
});

test('止血三枚齿轮：凝血 97 / 抗凝 40 / 纤维蛋白溶解 51，各有重心单元', () => {
  const gs = gears(list);
  assert.deepStrictEqual(gears(list).map((g) => g.name), GEARS.map((g) => g.name));
  const by = Object.fromEntries(gs.map((g) => [g.name, g]));
  assert.strictEqual(by.凝血.total, 97);
  assert.strictEqual(by.抗凝.total, 40);
  assert.strictEqual(by.纤维蛋白溶解.total, 51);
  assert.strictEqual(by.抗凝.top.sub, '3.3.2');
  assert.strictEqual(by.抗凝.inUnit, 30);
  assert.strictEqual(by.纤维蛋白溶解.top.sub, '3.3.3');
  assert.strictEqual(by.纤维蛋白溶解.inUnit, 40);
});

test('生成与破坏两端重心同在 3.2.3：稳定靠两端相抵', () => {
  const t = turnover(list);
  assert.strictEqual(t.gen.total, 35);
  assert.strictEqual(t.gen.top.sub, '3.2.3');
  assert.strictEqual(t.gen.top.n, 20);
  assert.strictEqual(t.des.total, 27);
  assert.strictEqual(t.des.top.sub, '3.2.3');
  assert.strictEqual(t.des.top.n, 14);
});

test('血型判定：血型 72 次、抗原 61 次、抗体 41 次，重心在 3.4.2', () => {
  const bg = bloodGroups(list);
  assert.strictEqual(bg.group.total, 72);
  assert.strictEqual(bg.group.top.sub, '3.4.2');
  assert.strictEqual(bg.group.top.n, 48);
  assert.strictEqual(bg.antigen.total, 61);
  assert.strictEqual(bg.antibody.total, 41);
});

test('数值核验：12 个单元的 valueLike 全为 0', () => {
  const audit = valueAudit(list);
  assert.strictEqual(audit.hits, 0);
  assert.deepStrictEqual(audit.offenders, []);
  for (const u of list) assert.strictEqual(u.measure.valueLike, 0, `${u.sub} 出现数值`);
});

test('3.1.1 的 body 不许为空，prose 是去目标视图；text() 仍保留 rawBody 回退', () => {
  const first = list.find((u) => u.sub === '3.1.1');
  // 上游曾把去目标后的余文存进 body，纯目标单元成空串 → text() 退 rawBody → 口径漂移。
  // 现在 body 恒等于整段，prose 单独给「正文视图」，两边都不为空。
  assert.ok(first.body.length > 1000, 'body 为空会让统计口径静默变化');
  assert.ok(first.prose && first.prose.length > 500, 'prose 应是去掉学习目标后的正文');
  assert.ok(!/^【学习目标】/.test(first.prose), 'prose 不该再以【学习目标】开头');
  assert.match(text(first), /血液是流动于心血管系统内/);
});
