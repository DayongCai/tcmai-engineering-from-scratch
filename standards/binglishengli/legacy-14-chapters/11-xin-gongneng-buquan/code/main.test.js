#!/usr/bin/env node
/**
 * 第 11 章 心功能不全 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：规模、词频重心、链条是否写全、数值是否为 0。
 * 不锁死正文措辞，底本改写段落时测试不会变成噪声。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const {
  CLUES,
  COMPENSATION,
  SITES,
  BOUNDARY,
  baseUnits,
  measureUnits,
  shape,
  lens,
  rank,
  total,
  valueAudit,
  chainUnits,
} = require('./main');

const list = baseUnits();
const measured = measureUnits();

test('本章 3 个小节，1 节，去空白字符数合计 5403', () => {
  const s = shape(list);
  assert.strictEqual(s.units, 3);
  assert.strictEqual(s.secs, 1);
  assert.strictEqual(s.chars, 5403);
  assert.deepStrictEqual(list.map((u) => u.sub), ['9.3.1', '9.3.2', '9.3.3']);
});

test('小节标题去掉重复编号，与底本一致', () => {
  assert.deepStrictEqual(list.map((u) => u.title), [
    '心功能不全的类别', '代偿环节的类别', '叙述边界要求',
  ]);
  for (const u of list) assert.ok(!u.title.startsWith(u.sub), `${u.sub} 标题仍在重复编号`);
});

test('三视角合计 141 次，机能是主轴、病因只给类别', () => {
  const { views } = lens(measured);
  assert.strictEqual(total(views), 141);
  assert.strictEqual(views.机能, 90);
  assert.strictEqual(views.机制, 51);
  assert.strictEqual(views.病因, 0);
  assert.strictEqual(rank(views)[0][0], '机能');
});

test('四层级合计 67 次，落在器官层（本章讲的是心这个泵）', () => {
  const { levels } = lens(measured);
  assert.strictEqual(total(levels), 67);
  assert.strictEqual(levels.器官, 33);
  assert.strictEqual(levels.系统, 18);
  assert.strictEqual(levels.组织, 12);
  assert.strictEqual(levels.细胞, 4);
  assert.strictEqual(rank(levels)[0][0], '器官');
});

test('数值核验：正文没有一处「数字＋计量单位」', () => {
  const audit = valueAudit(list);
  assert.strictEqual(audit.units, 3);
  assert.strictEqual(audit.hits, 0);
  assert.deepStrictEqual(audit.samples, []);
  for (const u of measured) assert.strictEqual(u.measure.valueLike, 0, `${u.sub} 出现数值`);
});

test('五条划分线索只在 9.3.1 写全：一处写全、其余承接', () => {
  assert.deepStrictEqual(CLUES, ['发生环节', '起病方式', '受累部位', '血流方向', '诱发类别']);
  assert.deepStrictEqual(chainUnits(list, CLUES), ['9.3.1']);
});

test('代偿的两条时间轴与四个作用部位都只在 9.3.2 写全', () => {
  assert.deepStrictEqual(COMPENSATION, ['快速代偿', '长期代偿']);
  assert.deepStrictEqual(SITES, ['心脏自身调节', '神经调节', '体液调节', '组织适应']);
  assert.deepStrictEqual(chainUnits(list, COMPENSATION), ['9.3.2']);
  assert.deepStrictEqual(chainUnits(list, SITES), ['9.3.2']);
});

test('三条叙述边界只在 9.3.3 写全，9.3.1 只承接其中两条', () => {
  assert.deepStrictEqual(BOUNDARY, ['不写分级与量化数值', '不作疾病诊断', '不作病情与预后的判定']);
  assert.deepStrictEqual(chainUnits(list, BOUNDARY), ['9.3.3']);
  const lifted = list.find((u) => u.sub === '9.3.1');
  assert.ok(lifted.rawBody.includes('不写分级与量化数值'));
  assert.ok(!lifted.rawBody.includes('不作病情与预后的判定'));
});

test('每小节都写着「只写类别与关系」的口径句，且篇幅相当', () => {
  for (const u of measured) {
    assert.match(u.brief, /只写类别与关系/, `${u.sub} brief 缺口径`);
    assert.ok(u.hanzi > 1500, `${u.sub} 只有 ${u.hanzi} 字，篇幅异常`);
  }
  for (const u of list) {
    assert.ok(u.chars > 1700 && u.chars < 1900, `${u.sub} 去空白 ${u.chars} 字，与「每小节约 1800」不符`);
  }
});
