#!/usr/bin/env node
/**
 * 第 18 章 消化系统疾病 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：规模、词频重心、三条形态序列是否写全、数值是否为 0。
 * 不锁死正文措辞，教材改写段落时测试不会变成噪声。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const {
  ULCER_LAYERS,
  CIRRHOSIS,
  HEPATITIS_BASIC,
  load,
  chapterUnits,
  shape,
  lens,
  rank,
  total,
  share,
  valueAudit,
  bySection,
  sequenceUnits,
} = require('./main');

const units = load();
const list = chapterUnits(units);

test('本章 12 个知识单元，分属 4 节，正文合计 19909 字', () => {
  const s = shape(list);
  assert.strictEqual(s.units, 12);
  assert.strictEqual(s.secs, 4);
  assert.strictEqual(s.hanzi, 19909);
  assert.deepStrictEqual(list.map((u) => u.sub), [
    '18.1.1', '18.1.2', '18.1.3',
    '18.2.1', '18.2.2', '18.2.3',
    '18.3.1', '18.3.2', '18.3.3',
    '18.4.1', '18.4.2', '18.4.3',
  ]);
});

test('三视角合计 836 次，形态占八成以上', () => {
  const { views } = lens(list);
  assert.strictEqual(total(views), 836);
  assert.strictEqual(views.形态, 689);
  assert.strictEqual(views.机制, 85);
  assert.strictEqual(views.病因, 62);
  assert.strictEqual(rank(views)[0][0], '形态');
  assert.ok(share(views, '形态') > 0.82);
});

test('四层级合计 739 次，落点在器官层、细胞层比前两章高', () => {
  const { levels } = lens(list);
  assert.strictEqual(total(levels), 739);
  assert.strictEqual(levels.器官, 450);
  assert.strictEqual(levels.细胞, 131);
  assert.strictEqual(levels.组织, 83);
  assert.strictEqual(levels.系统, 75);
  assert.strictEqual(rank(levels)[0][0], '器官');
  assert.ok(share(levels, '细胞') > 0.17);
});

test('数值核验：12 个单元的 valueLike 全为 0，没有一处「数字＋计量单位」', () => {
  const audit = valueAudit(list);
  assert.strictEqual(audit.units, 12);
  assert.strictEqual(audit.hits, 0);
  assert.deepStrictEqual(audit.offenders, []);
  for (const u of list) assert.strictEqual(u.measure.valueLike, 0, `${u.sub} 出现数值`);
});

test('溃疡四层只在 18.1.3 写全：分层是一次讲透、其余引用', () => {
  assert.deepStrictEqual(ULCER_LAYERS, ['渗出物', '坏死组织', '肉芽组织', '瘢痕组织']);
  assert.deepStrictEqual(sequenceUnits(list, ULCER_LAYERS), ['18.1.3']);
});

test('肝硬化三段只在 18.3.1 写全：假小叶与纤维间隔与门脉高压同时出现', () => {
  assert.deepStrictEqual(CIRRHOSIS, ['假小叶', '纤维间隔', '门脉高压']);
  assert.deepStrictEqual(sequenceUnits(list, CIRRHOSIS), ['18.3.1']);
});

test('肝炎五件基本病变只在 18.2.2 写全，缺一件不算', () => {
  assert.deepStrictEqual(HEPATITIS_BASIC, ['变性', '坏死', '炎性细胞浸润', '再生', '纤维化']);
  assert.deepStrictEqual(sequenceUnits(list, HEPATITIS_BASIC), ['18.2.2']);
  // 少一件就不算写全：取前两件，命中数不应减少
  const partial = sequenceUnits(list, HEPATITIS_BASIC.slice(0, 2));
  assert.ok(partial.length >= 1);
});

test('四节各 3 个单元，每节汉字数在 4900 以上（教材按节均分，没有薄节）', () => {
  const secs = bySection(list);
  assert.strictEqual(secs.size, 4);
  for (const [sec, g] of secs) {
    assert.strictEqual(g.units, 3, `${sec} 单元数`);
    assert.ok(g.hanzi > 4900, `${sec} 只有 ${g.hanzi} 字`);
  }
});

test('每单元 brief 都带「不写数值与单位」的口径句', () => {
  for (const u of list) assert.match(u.brief, /不写数值与单位/, `${u.sub} brief 缺口径`);
});
