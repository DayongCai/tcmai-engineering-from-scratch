#!/usr/bin/env node
/**
 * 第 6 章 消化和吸收 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在「可对账的结构」与「次序/去向」两类判断上：单元数与字数、
 * 三视角与四层级的加总、胃排空的序数关系、两支自主神经的方向与性状、
 * 胰液调节的靶点分工、酶原激活的顺序与保护、吸收产物的去向、外来神经的层次。
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
  EMPTY_ORDER,
  emptyRank,
  emptiesFaster,
  salivaryResponse,
  pancreasAgent,
  BILE,
  activationChain,
  guardOfActivation,
  absorptionRoute,
  extrinsicNerveLevel,
  valueLikeZero,
  crossChapter,
} = require('./main');

const data = load();
const units = chapterUnits(data);
const p = profile(units);

test('本章恰有十二个知识单元，教材正文合计 21123 字', () => {
  assert.strictEqual(p.n, 12);
  assert.strictEqual(p.hanzi, 21123);
  assert.deepStrictEqual(p.locators, [
    '教材·第6章·6.1.1', '教材·第6章·6.1.2', '教材·第6章·6.1.3',
    '教材·第6章·6.2.1', '教材·第6章·6.2.2', '教材·第6章·6.2.3',
    '教材·第6章·6.3.1', '教材·第6章·6.3.2', '教材·第6章·6.3.3',
    '教材·第6章·6.4.1', '教材·第6章·6.4.2', '教材·第6章·6.4.3',
  ]);
});

test('三视角：机能 505 · 形态 136 · 代谢 113，机能约占三分之二', () => {
  assert.deepStrictEqual(p.views, { 代谢: 113, 机能: 505, 形态: 136 });
  assert.strictEqual(p.viewTotal, 754);
  assert.ok(p.views.机能 / p.viewTotal > 0.6, '机能应占六成以上');
  assert.ok(p.views.机能 > p.views.形态 && p.views.形态 > p.views.代谢);
});

test('四层级：器官 404 · 细胞 148 · 系统 87 · 组织 23，器官层独占六成以上', () => {
  assert.deepStrictEqual(p.levels, { 细胞: 148, 组织: 23, 器官: 404, 系统: 87 });
  assert.strictEqual(p.levelTotal, 662);
  assert.ok(p.levels.器官 / p.levelTotal > 0.6, '器官层应过六成');
  assert.strictEqual(Math.min(...Object.values(p.levels)), p.levels.组织);
});

test('组织层落点在吸收的部位与途径一节：6.4.1 独占 8 处，其余十一节 15 处', () => {
  const hs = levelHotspot(units, '组织');
  assert.strictEqual(hs.locator, '教材·第6章·6.4.1');
  assert.strictEqual(hs.n, 8);
  assert.strictEqual(hs.rest, 15);
  assert.strictEqual(hs.n + hs.rest, p.levels.组织);
});

test('胃排空由快到慢：液体 → 糖类 → 蛋白质 → 脂肪（脂肪最慢，不是最快）', () => {
  assert.deepStrictEqual(EMPTY_ORDER, ['液体', '糖类', '蛋白质', '脂肪']);
  assert.strictEqual(emptyRank('液体'), 0);
  assert.strictEqual(emptyRank('脂肪'), 3);
  assert.ok(emptiesFaster('糖类', '蛋白质'));
  assert.ok(emptiesFaster('蛋白质', '脂肪'));
  assert.ok(!emptiesFaster('脂肪', '液体'));
  assert.throws(() => emptyRank('混合食糜'), /不是本章列出的食糜类别/);
});

test('唾液：副交感与交感都促进分泌，差别在性状（交感不是抑制）', () => {
  const para = salivaryResponse('副交感');
  const sym = salivaryResponse('交感');
  assert.strictEqual(para.volume, '增多');
  assert.strictEqual(sym.volume, '增多');
  assert.notStrictEqual(para.texture, sym.texture);
  assert.strictEqual(para.texture, '稀薄');
  assert.strictEqual(sym.texture, '黏稠');
  assert.throws(() => salivaryResponse('迷走'), /只讨论副交感与交感两支/);
});

test('胰液：促胰液素作用于导管细胞（水与碳酸氢盐），胆囊收缩素作用于腺泡细胞（酶）', () => {
  assert.strictEqual(pancreasAgent('促胰液素').target, '导管细胞');
  assert.match(pancreasAgent('促胰液素').effect, /碳酸氢盐/);
  assert.strictEqual(pancreasAgent('胆囊收缩素').target, '腺泡细胞');
  assert.match(pancreasAgent('胆囊收缩素').effect, /酶/);
  assert.throws(() => pancreasAgent('组胺'), /不是本章列出的胰液调节因素/);
});

test('胆汁不含消化酶，靠乳化与微胶粒参与脂肪的消化与吸收', () => {
  assert.strictEqual(BILE.hasEnzyme, false);
  assert.strictEqual(BILE.roles.length, 3);
  assert.match(BILE.roles[0], /乳化/);
  assert.match(BILE.roles[1], /微胶粒/);
});

test('胰蛋白酶原的激活级联：肠激酶起步，胰蛋白酶接力，顺序不可颠倒', () => {
  const chain = activationChain();
  assert.strictEqual(chain.length, 4);
  assert.strictEqual(chain[0].by, '肠激酶');
  assert.strictEqual(chain[0].to, '胰蛋白酶');
  assert.strictEqual(chain[1].by, '胰蛋白酶（自身激活）');
  assert.deepStrictEqual(chain.slice(2).map((s) => s.from), ['糜蛋白酶原', '羧基肽酶原']);
  assert.match(guardOfActivation(), /抑制物/);
});

test('吸收去向：糖类与蛋白质与无机盐走血液，脂类与脂溶性维生素走淋巴', () => {
  assert.strictEqual(absorptionRoute('葡萄糖').route, '血液');
  assert.strictEqual(absorptionRoute('氨基酸').route, '血液');
  assert.strictEqual(absorptionRoute('钠离子').route, '血液');
  assert.strictEqual(absorptionRoute('水').route, '血液');
  assert.strictEqual(absorptionRoute('长链脂肪酸').route, '淋巴');
  assert.strictEqual(absorptionRoute('脂溶性维生素').route, '淋巴');
  assert.throws(() => absorptionRoute('淀粉'), /不是本章列出的吸收对象/);
});

test('外来神经只调节内在神经系统的活动水平，不直接支配每一个效应细胞', () => {
  const lv = extrinsicNerveLevel();
  assert.match(lv.level, /活动水平/);
  assert.match(lv.notThis, /每一个效应细胞/);
  assert.match(lv.why, /局部反射/);
});

test('三章同口径对照：组织层占比 消化 < 循环 < 呼吸，器官层占比 消化最高', () => {
  const rows = crossChapter(data, ['4', '5', '6']);
  assert.strictEqual(rows.length, 3);
  const [c4, c5, c6] = rows;
  assert.ok(c6.tissueShare < c4.tissueShare && c4.tissueShare < c5.tissueShare, '组织层应 消化 < 循环 < 呼吸');
  assert.ok(c6.organShare > c5.organShare && c6.organShare > c4.organShare, '器官层消化章最高');
  assert.strictEqual(c6.organShare, 404 / 662);
});

test('教材「不写数值」的声明逐单元成立：十二个单元的 valueLike 全为零', () => {
  const z = valueLikeZero(units);
  assert.strictEqual(z.checked, 12);
  assert.deepStrictEqual(z.bad, []);
  for (const u of units) assert.strictEqual(u.measure.valueLike, 0, `${u.locator} 出现数值`);
});
