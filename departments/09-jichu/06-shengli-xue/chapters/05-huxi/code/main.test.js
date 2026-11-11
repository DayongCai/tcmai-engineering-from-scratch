#!/usr/bin/env node
/**
 * 第 5 章 呼吸 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在「可对账的结构」与「方向判别」上：单元数与字数、三视角与四层级的加总、
 * 五个方向题各自的判别结果与非法输入的拒绝、教材零数值声明。
 * 不锁死单元正文文字，以免教材微调时测试变成噪声。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const {
  load,
  chapterUnits,
  profile,
  levelHotspot,
  deadSpaceTrend,
  vqClass,
  curveShift,
  chemoreceptor,
  fluxDirection,
  valueLikeZero,
} = require('./main');

const data = load();
const units = chapterUnits(data);
const p = profile(units);

test('本章恰有十二个知识单元，教材正文合计 20789 字', () => {
  assert.strictEqual(p.n, 12);
  assert.strictEqual(p.hanzi, 20789);
  assert.deepStrictEqual(p.locators, [
    '教材·第5章·5.1.1', '教材·第5章·5.1.2', '教材·第5章·5.1.3',
    '教材·第5章·5.2.1', '教材·第5章·5.2.2', '教材·第5章·5.2.3',
    '教材·第5章·5.3.1', '教材·第5章·5.3.2', '教材·第5章·5.3.3',
    '教材·第5章·5.4.1', '教材·第5章·5.4.2', '教材·第5章·5.4.3',
  ]);
});

test('三视角：机能 177 · 代谢 72 · 形态 71，代谢的相对比重明显高于循环章', () => {
  assert.deepStrictEqual(p.views, { 代谢: 72, 机能: 177, 形态: 71 });
  assert.strictEqual(p.viewTotal, 320);
  assert.ok(p.views.代谢 / p.views.机能 > 0.4, '代谢/机能的比值应过四成，这是呼吸章的特点');
});

test('四层级：器官 227 · 组织 97 · 细胞 70 · 系统 43，组织层占比过两成', () => {
  assert.deepStrictEqual(p.levels, { 细胞: 70, 组织: 97, 器官: 227, 系统: 43 });
  assert.strictEqual(p.levelTotal, 437);
  assert.ok(p.levels.组织 / p.levelTotal > 0.2, '组织层应占到两成以上');
  assert.ok(p.levels.器官 > p.levels.组织 && p.levels.组织 > p.levels.细胞, '排序应为器官 > 组织 > 细胞');
});

test('组织层落点集中在组织气体交换一节：5.2.3 独占 42 处，其余十一节 55 处', () => {
  const hs = levelHotspot(units, '组织');
  assert.strictEqual(hs.locator, '教材·第5章·5.2.3');
  assert.strictEqual(hs.n, 42);
  assert.strictEqual(hs.rest, 55);
  assert.strictEqual(hs.n + hs.rest, p.levels.组织);
});

test('无效腔：同样每分通气量下，浅快压低肺泡通气量，深慢抬高', () => {
  assert.strictEqual(deadSpaceTrend({ freq: 'up', depth: 'down' }).alveolar, 'down');
  assert.strictEqual(deadSpaceTrend({ freq: 'down', depth: 'up' }).alveolar, 'up');
  assert.strictEqual(deadSpaceTrend({ freq: 'flat', depth: 'flat' }).alveolar, 'flat');
  assert.strictEqual(deadSpaceTrend({ freq: 'up', depth: 'down' }).form, '浅快呼吸');
  assert.throws(() => deadSpaceTrend({ freq: 'up', depth: 'flat' }), /无法判定/);
});

test('通气血流比值：增大为无效腔样，减小为分流样，没有「越大越好」', () => {
  assert.strictEqual(vqClass('up').label, '无效腔样');
  assert.strictEqual(vqClass('down').label, '分流样');
  assert.strictEqual(vqClass('flat').label, '匹配');
  assert.throws(() => vqClass('higher'), /只能是 up/);
});

test('氧解离曲线：酸碱下降＋二氧化碳升高＋温度升高，三个因素同向右移', () => {
  const s = curveShift(['酸碱程度下降', '二氧化碳升高', '温度升高']);
  assert.strictEqual(s.shift, '右移');
  assert.match(s.meaning, /亲和力下降/);
  assert.strictEqual(s.applied.length, 3);
  assert.throws(() => curveShift(['氧分压升高']), /不是本章列出的影响因素/);
  assert.throws(() => curveShift([]), /没有给出任何影响因素/);
});

test('化学感受器分工：二氧化碳以中枢为主，低氧以外周为主，氢离子两处皆可', () => {
  assert.match(chemoreceptor('二氧化碳升高').site, /中枢/);
  assert.match(chemoreceptor('氧下降').site, /外周/);
  assert.match(chemoreceptor('氢离子升高').site, /中枢与外周/);
  assert.throws(() => chemoreceptor('温度升高'), /只讨论三种化学刺激/);
});

test('扩散方向只由两侧相对水平决定，两侧相等即为动态平衡', () => {
  assert.strictEqual(fluxDirection('氧', '较高', '较低').dir, '左→右');
  assert.strictEqual(fluxDirection('二氧化碳', '较低', '较高').dir, '右→左');
  assert.match(fluxDirection('氧', '较高', '较高').dir, /动态平衡/);
  assert.throws(() => fluxDirection('氧', '高', '低'), /只接受/);
});

test('教材「不写数值」的声明逐单元成立：十二个单元的 valueLike 全为零', () => {
  const z = valueLikeZero(units);
  assert.strictEqual(z.checked, 12);
  assert.deepStrictEqual(z.bad, []);
  for (const u of units) assert.strictEqual(u.measure.valueLike, 0, `${u.locator} 出现数值`);
});
