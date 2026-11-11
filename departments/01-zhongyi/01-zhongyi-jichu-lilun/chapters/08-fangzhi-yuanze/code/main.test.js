'use strict';

const assert = require('node:assert');
const test = require('node:test');
const { levels, eightMethods, combos, constraints, costTable, EIGHT, supplements } = require('./main.js');

test('预防 3 级 / 治则 4 条 / 第10章 5 节', () => {
  const l = levels();
  assert.deepStrictEqual(l.preventive, ['未病先防', '既病防变', '瘥后防复']);
  assert.deepStrictEqual(l.principles, ['治病求本', '调整阴阳', '扶正祛邪', '三因制宜']);
  assert.strictEqual(l.secs.length, 5);
});

test('治病求本含正治与反治；反治只给热因热用 / 寒因寒用', () => {
  const l = levels();
  assert.strictEqual(l.zhengzhi, true);
  assert.strictEqual(l.fanzhi, true);
  assert.deepStrictEqual(l.fanzhiExamples, ['热因热用', '寒因寒用']);
  assert.deepStrictEqual(l.missingFanzhi, ['塞因塞用', '通因通用']);
});

test('八法 8 个名，标题齐；但只有汗法与补法有释义', () => {
  const e = eightMethods();
  assert.deepStrictEqual(e.names, ['汗', '吐', '下', '和', '温', '清', '补', '消']);
  assert.strictEqual(EIGHT.length, 8);
  assert.strictEqual(e.titleHas, true);
  assert.deepStrictEqual(e.described.sort(), ['汗', '补'].sort());
  assert.deepStrictEqual(e.missing.sort(), ['吐', '下', '和', '温', '清', '消'].sort());
});

test('八法组合 3 组，各带方名', () => {
  const c = combos();
  assert.strictEqual(c.length, 3);
  assert.deepStrictEqual(c.map((x) => x.mode), ['汗下', '温清', '攻补']);
  assert.deepStrictEqual(c.map((x) => x.formula), ['大柴胡汤', '半夏泻心汤', '黄龙汤']);
});

test('三因制宜 = 2 条方向性约束（夏慎辛温 / 冬慎寒凉），无系数', () => {
  const cs = constraints();
  assert.strictEqual(cs.length, 2);
  assert.deepStrictEqual(cs.map((x) => x.season), ['夏', '冬']);
  assert.ok(cs.every((x) => typeof x.forbid === 'string' && !/系数|权重/.test(x.forbid)));
});

test('代价函数等权时温阳益气居首；换权重后排序改变（证明无权重即伪比较）', () => {
  const base = costTable();
  assert.strictEqual(base[0].name, '温阳益气');
  assert.strictEqual(base[0].score, 0.4);
  const heavyJin = costTable({ gan: 0.2, jin: 3, zheng: 0.2 });
  assert.notStrictEqual(heavyJin[0].name, '温阳益气');
  assert.strictEqual(heavyJin[0].name, '甘寒养阴');
});

test('外源补录：八法 8 条释义 + 反治 4 法（底本仍只释 2 法）', () => {
  const sp = supplements();
  assert.strictEqual(sp.length, 2);
  const bafa = sp.find((x) => x.id === 'bafa-8');
  const fz = sp.find((x) => x.id === 'fanzhi-4');
  assert.strictEqual(bafa.supplied, 8);
  assert.strictEqual(fz.supplied, 4);
  assert.ok(bafa.source.includes('醫學心悟'));
  assert.ok(fz.items.includes('塞因塞用'));
  assert.ok(fz.items.includes('通因通用'));
  // 六法释义必须到位（不只是名字）
  const he = bafa.items.join('|');
  assert.ok(/和之一法/.test(he), '和法释义缺失');
});

test('底本口径不变：eightMethods().described 仍是汗、补两法', () => {
  assert.deepStrictEqual(eightMethods().described.sort(), ['汗', '补'].sort());
});
