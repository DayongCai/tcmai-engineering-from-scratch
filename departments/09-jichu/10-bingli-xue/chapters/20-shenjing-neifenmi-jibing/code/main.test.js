#!/usr/bin/env node
/**
 * 第20章 常见神经及内分泌系统疾病 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言落在可对账的结构上：规模、「类别」密度、并发症覆盖、化脓性与病毒性的对照维度、数值是否为 0。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const {
  SIX,
  COMPLICATIONS,
  load,
  chapterUnits,
  shape,
  lens,
  rank,
  total,
  share,
  valueAudit,
  sixElementUnits,
  categoryDensity,
  complicationCoverage,
  encephalitis,
  endocrine,
} = require('./main');

const units = load();
const list = chapterUnits(units);

test('本章 12 个知识单元，分属 4 节，正文合计 20523 字', () => {
  const s = shape(list);
  assert.strictEqual(s.units, 12);
  assert.strictEqual(s.secs, 4);
  assert.strictEqual(s.hanzi, 20523);
  assert.deepStrictEqual(list.map((u) => u.sub), [
    '20.1.1', '20.1.2', '20.1.3',
    '20.2.1', '20.2.2', '20.2.3',
    '20.3.1', '20.3.2', '20.3.3',
    '20.4.1', '20.4.2', '20.4.3',
  ]);
});

test('三视角合计 821 次，形态占九成：本章几乎不写病因，全在写「长什么样、归哪一类」', () => {
  const { views } = lens(list);
  assert.strictEqual(total(views), 821);
  assert.strictEqual(views.形态, 747);
  assert.strictEqual(views.机制, 53);
  assert.strictEqual(views.病因, 21);
  assert.strictEqual(rank(views)[0][0], '形态');
  assert.ok(share(views, '形态') > 0.9);
});

test('四层级合计 329 次，器官层居首（56.8% 的量级落在系统病理的器官层）', () => {
  const { levels } = lens(list);
  assert.strictEqual(total(levels), 329);
  assert.strictEqual(levels.器官, 121);
  assert.strictEqual(levels.组织, 97);
  assert.strictEqual(levels.细胞, 68);
  assert.strictEqual(levels.系统, 43);
  assert.strictEqual(rank(levels)[0][0], '器官');
});

test('数值核验：12 个单元的 valueLike 全为 0，没有一处「数字＋计量单位」', () => {
  const audit = valueAudit(list);
  assert.strictEqual(audit.units, 12);
  assert.strictEqual(audit.hits, 0);
  assert.deepStrictEqual(audit.offenders, []);
  for (const u of list) assert.strictEqual(u.measure.valueLike, 0, `${u.sub} 出现数值`);
});

test('「类别」全章 622 次；20.2 最密、20.4 最疏——归纳压在病理节，方法节退到最轻', () => {
  const c = categoryDensity(list);
  assert.strictEqual(c.length, 4);
  assert.strictEqual(c.reduce((n, x) => n + x.hits, 0), 622);
  assert.deepStrictEqual(c.map((x) => x.hits), [140, 197, 189, 96]);
  const densest = c.slice().sort((a, b) => b.perK - a.perK)[0];
  assert.ok(densest.sec.startsWith('20.2'), `最密的是 ${densest.sec}`);
  const loosest = c.slice().sort((a, b) => a.perK - b.perK)[0];
  assert.ok(loosest.sec.startsWith('20.4'), `最疏的是 ${loosest.sec}`);
});

test('并发症五个类别全部出现，且以脑水肿起头（脑水肿→颅内压升高→脑疝的先后关系）', () => {
  assert.deepStrictEqual(COMPLICATIONS, ['脑水肿', '颅内压升高', '脑疝', '脑积水', '脑膜刺激']);
  const r = complicationCoverage(list);
  assert.deepStrictEqual(r.map((x) => x.name), COMPLICATIONS);
  for (const x of r) assert.ok(x.hits > 0, `${x.name} 未出现`);
  const map = Object.fromEntries(r.map((x) => [x.name, x.hits]));
  assert.strictEqual(map.脑水肿, 11);
  assert.strictEqual(map.脑疝, 6);
  assert.ok(map.脑水肿 > map.颅内压升高 && map.颅内压升高 > map.脑疝);
});

test('化脓性与病毒性用同一组对照维度：部位、渗出物、镜下标志', () => {
  const e = encephalitis(list);
  assert.strictEqual(e.化脓性, 13);
  assert.strictEqual(e.病毒性, 11);
  for (const k of ['血管套', '噬神经细胞现象', '胶质结节', '包涵体']) {
    assert.ok(e[k] > 0, `缺对照维度 ${k}`);
  }
  assert.strictEqual(e.包涵体, 3);
});

test('内分泌两节：甲状腺肿 28 次高于糖尿病 10 次，滤泡 27 次说明这一节的观察单位是滤泡', () => {
  const e = endocrine(list);
  assert.strictEqual(e.糖尿病, 10);
  assert.strictEqual(e.甲状腺肿, 28);
  assert.strictEqual(e.滤泡, 27);
  assert.ok(e.甲状腺肿 > e.糖尿病);
});

test('六要素写全的单元是 3 个：本章把六要素放进方法节，而不是每节都落地', () => {
  assert.deepStrictEqual(SIX, ['观察', '描述', '记录', '分析', '报告', '复核']);
  assert.deepStrictEqual(sixElementUnits(list), ['20.1.1', '20.1.3', '20.4.1']);
});
