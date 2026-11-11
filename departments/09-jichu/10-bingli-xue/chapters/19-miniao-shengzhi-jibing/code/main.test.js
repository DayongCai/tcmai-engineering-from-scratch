#!/usr/bin/env node
/**
 * 第19章 泌尿及生殖系统疾病 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：规模、词频重心、类型是否摊全、六要素落在哪些单元、数值是否为 0。
 * 不锁死正文措辞，教材改写段落时测试不会变成噪声。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const {
  SIX,
  TYPES,
  load,
  chapterUnits,
  shape,
  lens,
  rank,
  total,
  share,
  valueAudit,
  sixElementUnits,
  typeList,
  partAxis,
} = require('./main');

const units = load();
const list = chapterUnits(units);

test('本章 12 个知识单元，分属 4 节，正文合计 20673 字', () => {
  const s = shape(list);
  assert.strictEqual(s.units, 12);
  assert.strictEqual(s.secs, 4);
  assert.strictEqual(s.hanzi, 20673);
  assert.deepStrictEqual(list.map((u) => u.sub), [
    '19.1.1', '19.1.2', '19.1.3',
    '19.2.1', '19.2.2', '19.2.3',
    '19.3.1', '19.3.2', '19.3.3',
    '19.4.1', '19.4.2', '19.4.3',
  ]);
});

test('三视角合计 824 次，形态占近八成：这一章是形态章，不是病因章', () => {
  const { views } = lens(list);
  assert.strictEqual(total(views), 824);
  assert.strictEqual(views.形态, 650);
  assert.strictEqual(views.机制, 106);
  assert.strictEqual(views.病因, 68);
  assert.strictEqual(rank(views)[0][0], '形态');
  assert.ok(share(views, '形态') > 0.78 && share(views, '形态') < 0.8);
});

test('四层级合计 381 次，细胞与组织并列第一：病变的读数落在镜下', () => {
  const { levels } = lens(list);
  assert.strictEqual(total(levels), 381);
  assert.strictEqual(levels.细胞, 103);
  assert.strictEqual(levels.组织, 103);
  assert.strictEqual(levels.器官, 89);
  assert.strictEqual(levels.系统, 86);
  assert.ok(share(levels, '细胞') > 0.26);
});

test('数值核验：12 个单元的 valueLike 全为 0，没有一处「数字＋计量单位」', () => {
  const audit = valueAudit(list);
  assert.strictEqual(audit.units, 12);
  assert.strictEqual(audit.hits, 0);
  assert.deepStrictEqual(audit.offenders, []);
  for (const u of list) assert.strictEqual(u.measure.valueLike, 0, `${u.sub} 出现数值`);
});

test('19.1.3 把七种形态类型全部摊开，一个不少', () => {
  assert.strictEqual(TYPES.length, 7);
  assert.deepStrictEqual(typeList(list), TYPES);
  const one = list.find((u) => u.sub === '19.1.3');
  for (const t of TYPES) assert.ok(one.body.includes(t), `19.1.3 缺 ${t}`);
});

test('部位轴：19.1 由肾小球主导、19.2 由肾盂主导，四节各有偏心的部位', () => {
  const p = partAxis(list);
  const s1 = p.find((x) => x.sec.startsWith('19.1'));
  const s2 = p.find((x) => x.sec.startsWith('19.2'));
  assert.ok(s1.肾小球 > s1.肾盂, '19.1 应以肾小球为主');
  assert.ok(s2.肾盂 > s2.肾小球, '19.2 应以肾盂为主');
  assert.strictEqual(s1.肾盂, 0);
  assert.ok(s2.肾盂 >= 40);
});

test('四节各 3 个单元，汉字数都在 5000 以上（教材按节均分，没有薄节）', () => {
  const p = partAxis(list);
  assert.strictEqual(p.length, 4);
  for (const s of p) {
    assert.strictEqual(s.units, 3, `${s.sec} 单元数`);
    assert.ok(s.hanzi > 5000, `${s.sec} 只有 ${s.hanzi} 字`);
  }
});

test('六要素写全的单元是 5 个：复述不等于落地', () => {
  assert.deepStrictEqual(SIX, ['观察', '描述', '记录', '分析', '报告', '复核']);
  assert.deepStrictEqual(sixElementUnits(list), ['19.1.1', '19.2.2', '19.4.1', '19.4.2', '19.4.3']);
});
