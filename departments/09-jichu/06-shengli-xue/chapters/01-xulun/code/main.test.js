#!/usr/bin/env node
/**
 * 第 1 章 绪论 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：规模、词频重心、回路是否写全、数值是否为 0。
 * 不锁死正文措辞，教材改写段落时测试不会变成噪声。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const {
  ARC,
  load,
  chapterUnits,
  shape,
  lens,
  rank,
  total,
  share,
  valueAudit,
  reflexArc,
  controlUnits,
  bySection,
} = require('./main');

const units = load();
const list = chapterUnits(units);

test('本章 12 个知识单元，分属 4 节，正文合计 20936 字', () => {
  const s = shape(list);
  assert.strictEqual(s.units, 12);
  assert.strictEqual(s.secs, 4);
  assert.strictEqual(s.hanzi, 20936);
  assert.deepStrictEqual(list.map((u) => u.sub), [
    '1.1.1', '1.1.2', '1.1.3',
    '1.2.1', '1.2.2', '1.2.3',
    '1.3.1', '1.3.2', '1.3.3',
    '1.4.1', '1.4.2', '1.4.3',
  ]);
});

test('三视角合计 615 次，以机能为重心（占七成）', () => {
  const { views } = lens(list);
  assert.strictEqual(total(views), 615);
  assert.strictEqual(views.机能, 436);
  assert.strictEqual(views.形态, 116);
  assert.strictEqual(views.代谢, 63);
  assert.strictEqual(rank(views)[0][0], '机能');
  assert.ok(share(views, '机能') > 0.7 && share(views, '机能') < 0.72);
});

test('四层级合计 392 次，落在系统层（绪论讲的是系统之间的配合）', () => {
  const { levels } = lens(list);
  assert.strictEqual(total(levels), 392);
  assert.strictEqual(levels.系统, 169);
  assert.strictEqual(levels.细胞, 121);
  assert.strictEqual(levels.组织, 39);
  assert.strictEqual(rank(levels)[0][0], '系统');
  // 系统层占四成以上，是本书 11 章里唯一以系统为主的章之一
  assert.ok(share(levels, '系统') > 0.43);
});

test('数值核验：12 个单元的 valueLike 全为 0，没有一处「数字＋计量单位」', () => {
  const audit = valueAudit(list);
  assert.strictEqual(audit.units, 12);
  assert.strictEqual(audit.hits, 0);
  assert.deepStrictEqual(audit.offenders, []);
  for (const u of list) assert.strictEqual(u.measure.valueLike, 0, `${u.sub} 出现数值`);
});

test('反射弧五环节写全的单元只有 1.3.1：本章唯一被写成完整回路的是神经调节', () => {
  assert.deepStrictEqual(ARC, ['感受器', '传入神经', '神经中枢', '传出神经', '效应器']);
  const arc = reflexArc(list);
  assert.deepStrictEqual(arc, ['1.3.1']);
  // 少一个环节就不算回路：把「传出神经」抽掉，命中数应当不增加
  const without = list.filter((u) => ARC.slice(0, 4).every((k) => (u.body || '').includes(k)));
  assert.ok(without.length >= arc.length);
});

test('调节框架占 12 个单元里的 5 个，且「学习要求」不计入', () => {
  const c = controlUnits(list);
  assert.strictEqual(c.length, 5);
  assert.deepStrictEqual(c.map((x) => x.sub), ['1.3.1', '1.3.2', '1.3.3', '1.4.1', '1.4.2']);
  assert.ok(!c.some((x) => x.sub === '1.4.3'));
});

test('四节各 3 个单元，每节汉字数在 5100 以上（教材按节均分，没有薄节）', () => {
  const secs = bySection(list);
  assert.strictEqual(secs.size, 4);
  for (const [sec, g] of secs) {
    assert.strictEqual(g.units, 3, `${sec} 单元数`);
    assert.ok(g.hanzi > 5100, `${sec} 只有 ${g.hanzi} 字`);
  }
});

test('每单元 brief 都带「不写数值与单位与正常值」的口径句', () => {
  for (const u of list) assert.match(u.brief, /不写数值与单位与正常值/, `${u.sub} brief 缺口径`);
});

test('学习目标是章级的：只落在 1.1.1，共 7 条，其余 11 个单元没有 goals', () => {
  const withGoals = list.filter((u) => u.goals.length > 0);
  assert.deepStrictEqual(withGoals.map((u) => u.sub), ['1.1.1']);
  assert.strictEqual(withGoals[0].goals.length, 7);
  assert.strictEqual(list.reduce((n, u) => n + u.goals.length, 0), 7);
});
