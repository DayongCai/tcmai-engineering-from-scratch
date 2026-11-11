#!/usr/bin/env node
/**
 * 第 4 章 酸碱平衡紊乱 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：规模、词频重心、四个基本类别的落点、
 * 三级调节的覆盖、起因与代偿两端的覆盖、数值是否为 0。
 * 不锁死正文措辞，底本改写段落时测试不会变成噪声。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const {
  SUBS,
  FOUR,
  STAGES,
  ENDS,
  QUALITATIVE,
  load,
  chapterUnits,
  shape,
  lens,
  rank,
  total,
  share,
  valueAudit,
  coverage,
  boundaryUnits,
  bySection,
} = require('./main');

const units = load();
const list = chapterUnits(units);

test('本章 6 个知识单元，分属 2 节，正文合计 10890 字', () => {
  const s = shape(list);
  assert.strictEqual(s.units, 6);
  assert.strictEqual(s.secs, 2);
  assert.strictEqual(s.chars, 10890);
  assert.deepStrictEqual(SUBS, ['5.3.1', '5.3.2', '5.3.3', '5.4.1', '5.4.2', '5.4.3']);
  assert.deepStrictEqual(list.map((u) => u.sub), SUBS);
});

test('三视角合计 377 次，以机能为重心（机能多于机制，病因一次不现）', () => {
  const { views } = lens(list);
  assert.strictEqual(total(views), 377);
  assert.strictEqual(views.机能, 234);
  assert.strictEqual(views.机制, 143);
  assert.strictEqual(views.病因, 0);
  assert.strictEqual(rank(views)[0][0], '机能');
  assert.ok(share(views, '机能') > 0.6);
});

test('四层级合计 70 次，落在系统层（两章里唯一落在系统的一段）', () => {
  const { levels } = lens(list);
  assert.strictEqual(total(levels), 70);
  assert.strictEqual(levels.系统, 31);
  assert.strictEqual(levels.细胞, 27);
  assert.strictEqual(levels.器官, 8);
  assert.strictEqual(levels.组织, 4);
  assert.strictEqual(rank(levels)[0][0], '系统');
});

test('数值核验：6 个单元的 valueLike 全为 0（只写方向，不写量）', () => {
  const audit = valueAudit(list);
  assert.strictEqual(audit.units, 6);
  assert.strictEqual(audit.hits, 0);
  assert.deepStrictEqual(audit.offenders, []);
  for (const u of list) assert.strictEqual(u.measure.valueLike, 0, `${u.sub} 出现数值`);
});

test('四个基本类别：两个酸中毒各覆盖 4 节，两个碱中毒各只落在 5.3.3', () => {
  assert.deepStrictEqual(FOUR, ['代谢性酸中毒', '呼吸性酸中毒', '代谢性碱中毒', '呼吸性碱中毒']);
  const cov = coverage(list, FOUR);
  assert.deepStrictEqual(cov.map((c) => c.key), FOUR);
  assert.deepStrictEqual(cov.map((c) => c.units.length), [4, 4, 1, 1]);
  assert.deepStrictEqual(cov[2].units, ['5.3.3']);
  assert.deepStrictEqual(cov[3].units, ['5.3.3']);
});

test('三级调节：肾环节覆盖 5 节居首，缓冲系统与呼吸环节各 4 节', () => {
  assert.deepStrictEqual(STAGES, ['缓冲系统', '呼吸环节', '肾环节']);
  const cov = coverage(list, STAGES);
  assert.deepStrictEqual(cov.map((c) => c.units.length), [4, 4, 5]);
  assert.deepStrictEqual(cov[2].units, ['5.3.1', '5.3.2', '5.3.3', '5.4.1', '5.4.2']);
  // 肾是末端：唯一没提它的是 5.4.3（那一节讲边界，不再讲环节）
  assert.ok(!cov[2].units.includes('5.4.3'));
  assert.strictEqual(rank(Object.fromEntries(cov.map((c) => [c.key, c.units.length])))[0][0], '肾环节');
});

test('起因与代偿两端：代偿 5 节、起因 4 节（本章主轴的两条轴）', () => {
  assert.deepStrictEqual(ENDS, ['起因', '代偿']);
  const cov = coverage(list, ENDS);
  assert.deepStrictEqual(cov.map((c) => c.units.length), [4, 5]);
  assert.deepStrictEqual(cov[0].units, ['5.3.1', '5.3.2', '5.3.3', '5.4.3']);
});

test('只能写方向的两处：阴离子间隙只在 5.3.1，代偿充分在 5.3.1 与 5.3.2', () => {
  assert.deepStrictEqual(QUALITATIVE, ['阴离子间隙', '代偿充分']);
  const cov = coverage(list, QUALITATIVE);
  assert.deepStrictEqual(cov[0].units, ['5.3.1']);
  assert.deepStrictEqual(cov[1].units, ['5.3.1', '5.3.2']);
});

test('边界：6 节全部写明「由具备资质的人员」判读', () => {
  const bounded = boundaryUnits(list);
  assert.strictEqual(bounded.length, 6);
  assert.deepStrictEqual(bounded, SUBS);
});

test('两节各 3 个单元，字数分别为 5449 与 5441', () => {
  const secs = bySection(list);
  assert.strictEqual(secs.size, 2);
  const first = secs.get('5.3 酸碱平衡紊乱的类别');
  const second = secs.get('5.4 紊乱的调节与整体联系');
  assert.strictEqual(first.units, 3);
  assert.strictEqual(second.units, 3);
  assert.strictEqual(first.chars, 5449);
  assert.strictEqual(second.chars, 5441);
});

test('本章没有单元携带章级学习目标（目标条目落在上一章 5.1.1）', () => {
  assert.deepStrictEqual(list.filter((u) => (u.goals || []).length > 0).map((u) => u.sub), []);
});
