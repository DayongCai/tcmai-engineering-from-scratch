#!/usr/bin/env node
/**
 * 第21章 常见传染病及寄生虫病 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言落在可对账的结构上：九种病的落点、三维对照的形态词、溃疡判据、六要素覆盖、数值是否为 0。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const {
  SIX,
  DISEASES,
  SHAPE_WORDS,
  load,
  chapterUnits,
  shape,
  lens,
  rank,
  total,
  share,
  valueAudit,
  sixElementUnits,
  diseaseAxis,
  shapeAxis,
  ulcerAxis,
} = require('./main');

const units = load();
const list = chapterUnits(units);

test('本章 12 个知识单元，分属 4 节，正文合计 20385 字', () => {
  const s = shape(list);
  assert.strictEqual(s.units, 12);
  assert.strictEqual(s.secs, 4);
  assert.strictEqual(s.hanzi, 20385);
  assert.deepStrictEqual(list.map((u) => u.sub), [
    '21.1.1', '21.1.2', '21.1.3',
    '21.2.1', '21.2.2', '21.2.3',
    '21.3.1', '21.3.2', '21.3.3',
    '21.4.1', '21.4.2', '21.4.3',
  ]);
});

test('三视角合计 681 次，形态占九成：这一章是形态对照，不是病原学', () => {
  const { views } = lens(list);
  assert.strictEqual(total(views), 681);
  assert.strictEqual(views.形态, 612);
  assert.strictEqual(views.机制, 44);
  assert.strictEqual(views.病因, 25);
  assert.strictEqual(rank(views)[0][0], '形态');
  assert.ok(share(views, '形态') > 0.89);
});

test('四层级合计 618 次，器官层占近六成：病变的读数落在「哪个器官、哪一层」', () => {
  const { levels } = lens(list);
  assert.strictEqual(total(levels), 618);
  assert.strictEqual(levels.器官, 351);
  assert.strictEqual(levels.组织, 147);
  assert.strictEqual(levels.细胞, 73);
  assert.strictEqual(levels.系统, 47);
  assert.ok(share(levels, '器官') > 0.56);
});

test('数值核验：12 个单元的 valueLike 全为 0，没有一处「数字＋计量单位」', () => {
  const audit = valueAudit(list);
  assert.strictEqual(audit.units, 12);
  assert.strictEqual(audit.hits, 0);
  assert.deepStrictEqual(audit.offenders, []);
  for (const u of list) assert.strictEqual(u.measure.valueLike, 0, `${u.sub} 出现数值`);
});

test('九种病都有落点；结核病 47 次最多，伤寒 37 次次之', () => {
  assert.strictEqual(DISEASES.length, 9);
  const d = diseaseAxis(list);
  assert.strictEqual(d.length, 9);
  for (const x of d) {
    assert.ok(x.hits > 0, `${x.name} 未出现`);
    assert.ok(x.units.length > 0, `${x.name} 没有归属单元`);
  }
  const map = Object.fromEntries(d.map((x) => [x.name, x.hits]));
  assert.strictEqual(map.结核病, 47);
  assert.strictEqual(map.伤寒, 37);
  assert.strictEqual(map.细菌性痢疾, 20);
  assert.ok(map.结核病 > map.伤寒);
});

test('三维对照的形态词：溃疡覆盖 9 个单元，是本章最通用的形态单位', () => {
  assert.deepStrictEqual(SHAPE_WORDS, ['溃疡', '肉芽肿', '干酪样坏死', '假膜', '溶解', '出血']);
  const s = shapeAxis(list);
  const map = Object.fromEntries(s.map((x) => [x.word, x]));
  assert.strictEqual(map.溃疡.hits, 68);
  assert.strictEqual(map.溃疡.units, 9);
  assert.strictEqual(map.肉芽肿.units, 7);
  assert.strictEqual(map.干酪样坏死.units, 3);
  assert.ok(map.溃疡.units > map.肉芽肿.units);
});

test('溃疡判据：长轴 13 次（伤寒）对地图状 3 次、烧瓶状 2 次（痢疾与阿米巴）', () => {
  const u = ulcerAxis(list);
  assert.strictEqual(u.长轴平行, 13);
  assert.strictEqual(u.地图状, 3);
  assert.strictEqual(u.烧瓶状, 2);
  assert.strictEqual(u.口小底大, 3);
  assert.ok(u.长轴平行 > u.地图状 + u.烧瓶状);
});

test('六要素在 11 个单元里写全，只有肺结核一节例外——这一章的六要素是硬骨架', () => {
  assert.deepStrictEqual(SIX, ['观察', '描述', '记录', '分析', '报告', '复核']);
  const six = sixElementUnits(list);
  assert.strictEqual(six.length, 11);
  assert.ok(!six.includes('21.1.2'));
});
