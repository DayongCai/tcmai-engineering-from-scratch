#!/usr/bin/env node
/**
 * 第 16 章 心血管系统疾病 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：规模、词频重心、形态序列是否写全、数值是否为 0。
 * 不锁死正文措辞，教材改写段落时测试不会变成噪声。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const {
  LESION,
  INFARCT,
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

test('本章 12 个知识单元，分属 4 节，正文合计 20456 字', () => {
  const s = shape(list);
  assert.strictEqual(s.units, 12);
  assert.strictEqual(s.secs, 4);
  assert.strictEqual(s.hanzi, 20456);
  assert.deepStrictEqual(list.map((u) => u.sub), [
    '16.1.1', '16.1.2', '16.1.3',
    '16.2.1', '16.2.2', '16.2.3',
    '16.3.1', '16.3.2', '16.3.3',
    '16.4.1', '16.4.2', '16.4.3',
  ]);
});

test('三视角合计 859 次，形态占绝对主轴', () => {
  const { views } = lens(list);
  assert.strictEqual(total(views), 859);
  assert.strictEqual(views.形态, 761);
  assert.strictEqual(views.机制, 52);
  assert.strictEqual(views.病因, 46);
  assert.strictEqual(rank(views)[0][0], '形态');
  assert.ok(share(views, '形态') > 0.85);
});

test('四层级合计 376 次，落点在器官层', () => {
  const { levels } = lens(list);
  assert.strictEqual(total(levels), 376);
  assert.strictEqual(levels.器官, 166);
  assert.strictEqual(levels.细胞, 108);
  assert.strictEqual(levels.系统, 58);
  assert.strictEqual(levels.组织, 44);
  assert.strictEqual(rank(levels)[0][0], '器官');
  assert.ok(share(levels, '器官') > 0.4);
});

test('数值核验：12 个单元的 valueLike 全为 0，没有一处「数字＋计量单位」', () => {
  const audit = valueAudit(list);
  assert.strictEqual(audit.units, 12);
  assert.strictEqual(audit.hits, 0);
  assert.deepStrictEqual(audit.offenders, []);
  for (const u of list) assert.strictEqual(u.measure.valueLike, 0, `${u.sub} 出现数值`);
});

test('粥样硬化四阶段序列只在 16.1.1 写全：教材是「一处写全、其余承接」', () => {
  assert.deepStrictEqual(LESION, ['脂纹', '纤维斑块', '粥样斑块', '复合病变']);
  assert.deepStrictEqual(sequenceUnits(list, LESION), ['16.1.1']);
});

test('心肌梗死三段演变只在 16.1.3 写全，缺一环不算序列', () => {
  assert.deepStrictEqual(INFARCT, ['凝固性坏死', '肉芽组织', '瘢痕']);
  assert.deepStrictEqual(sequenceUnits(list, INFARCT), ['16.1.3']);
  // 少一环就不算写全：取前两个环节，命中数只能不减少
  const partial = sequenceUnits(list, INFARCT.slice(0, 2));
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
