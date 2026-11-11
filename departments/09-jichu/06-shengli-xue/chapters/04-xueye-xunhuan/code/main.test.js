#!/usr/bin/env node
/**
 * 第 4 章 血液循环 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在「可对账的结构」上：单元数与字数、三视角与四层级的加总、
 * 判别函数在每个合法组合上给唯一答案并在每个非法组合上抛错、
 * 四条形成条件能在教材正文里逐字找到、教材的零数值声明逐单元成立。
 * 不锁死具体单元的文字，以免教材微调时测试变成噪声。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const {
  load,
  chapterUnits,
  profile,
  phaseOf,
  cycle,
  vesselRole,
  BP_CONDITIONS,
  conditionsInText,
  organRow,
  valueLikeZero,
  levelHotspot,
} = require('./main');

const data = load();
const units = chapterUnits(data);
const p = profile(units);

test('本章恰有十二个知识单元，教材正文合计 21230 字', () => {
  assert.strictEqual(p.n, 12);
  assert.strictEqual(p.hanzi, 21230);
  assert.deepStrictEqual(p.locators, [
    '教材·第4章·4.1.1', '教材·第4章·4.1.2', '教材·第4章·4.1.3',
    '教材·第4章·4.2.1', '教材·第4章·4.2.2', '教材·第4章·4.2.3',
    '教材·第4章·4.3.1', '教材·第4章·4.3.2', '教材·第4章·4.3.3',
    '教材·第4章·4.4.1', '教材·第4章·4.4.2', '教材·第4章·4.4.3',
  ]);
});

test('三视角：机能 556 · 代谢 57 · 形态 118，机能超过七成', () => {
  assert.deepStrictEqual(p.views, { 代谢: 57, 机能: 556, 形态: 118 });
  assert.strictEqual(p.viewTotal, 731);
  assert.ok(p.views.机能 / p.viewTotal > 0.7, '机能应占全章七成以上');
  assert.ok(p.views.机能 > p.views.形态 && p.views.形态 > p.views.代谢, '排序应为机能 > 形态 > 代谢');
});

test('四层级：细胞 171 · 组织 48 · 器官 327 · 系统 207，组织是最薄的一层', () => {
  assert.deepStrictEqual(p.levels, { 细胞: 171, 组织: 48, 器官: 327, 系统: 207 });
  assert.strictEqual(p.levelTotal, 753);
  assert.strictEqual(Math.min(...Object.values(p.levels)), p.levels.组织);
  assert.ok(p.levels.细胞 + p.levels.器官 > p.levelTotal * 0.6, '细胞与器官应合计过六成');
});

test('心动周期：四个合法组合各给唯一时相，且容积方向是推论不是输入', () => {
  assert.deepStrictEqual(cycle().map((x) => x.phase), ['等容收缩期', '射血期', '等容舒张期', '充盈期']);
  assert.strictEqual(phaseOf({ av: 'closed', sl: 'open', stage: 'systole' }).volume, 'down');
  assert.strictEqual(phaseOf({ av: 'open', sl: 'closed', stage: 'diastole' }).volume, 'up');
  assert.strictEqual(phaseOf({ av: 'closed', sl: 'closed', stage: 'systole', volume: 'flat' }).phase, '等容收缩期');
});

test('不相容的瓣膜组合必须抛错，不许给出一个看似合理的时相名', () => {
  assert.throws(() => phaseOf({ av: 'open', sl: 'open', stage: 'systole' }), /不相容/);
  assert.throws(() => phaseOf({ av: 'open', sl: 'closed', stage: 'systole' }), /不相容/);
  assert.throws(
    () => phaseOf({ av: 'closed', sl: 'open', stage: 'systole', volume: 'up' }),
    /容积方向/,
  );
});

test('血管按结构分工：四类血管区段各有唯一功能类别，杂血管名一律拒绝', () => {
  assert.strictEqual(vesselRole('大动脉').role, '弹性贮器血管');
  assert.strictEqual(vesselRole('小动脉').role, '阻力血管');
  assert.strictEqual(vesselRole('毛细血管').role, '交换血管');
  assert.strictEqual(vesselRole('静脉').role, '容量血管');
  assert.throws(() => vesselRole('动脉'), /没有这个血管区段/);
});

test('动脉血压的四条形成条件，每一条都能在教材 4.3.2 正文里逐字找到', () => {
  const got = conditionsInText(units);
  assert.strictEqual(got.length, BP_CONDITIONS.length);
  for (const c of got) assert.ok(c.found, `${c.name} 在 4.3.2 正文里找不到`);
  assert.deepStrictEqual(got.map((c) => c.name), ['血液充盈', '心脏射血', '外周阻力', '大动脉弹性']);
});

test('器官循环三例各有不同的调节侧重，未知器官抛错', () => {
  assert.match(organRow('冠脉循环').timing, /舒张期/);
  assert.match(organRow('肺循环').driver, /低氧|局部/);
  assert.match(organRow('脑循环').driver, /自身调节/);
  assert.throws(() => organRow('肝循环'), /没有这个器官循环/);
});

test('组织层不是平均分布的：4.3.3 一节独占 22 处，其余十一节合计 26 处', () => {
  const hs = levelHotspot(units, '组织');
  assert.strictEqual(hs.locator, '教材·第4章·4.3.3');
  assert.strictEqual(hs.n, 22);
  assert.strictEqual(hs.rest, 26);
  assert.strictEqual(hs.n + hs.rest, p.levels.组织);
});

test('教材「不写数值」的声明逐单元成立：十二个单元的 valueLike 全为零', () => {
  const z = valueLikeZero(units);
  assert.strictEqual(z.checked, 12);
  assert.deepStrictEqual(z.bad, []);
  for (const u of units) assert.strictEqual(u.measure.valueLike, 0, `${u.locator} 出现数值`);
});
