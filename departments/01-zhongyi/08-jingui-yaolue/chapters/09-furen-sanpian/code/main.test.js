'use strict';
/**
 * 第 9 章单测。断言的是**口径**，不是文案：
 * 每个数字都在 docs/zh.md 里出现过，改代码不改文档会在这里先炸。
 */
const assert = require('node:assert');
const test = require('node:test');
const {
  BOOK,
  PIAN_NOS,
  pianOf,
  articlesOf,
  tiaoText,
  pianStats,
  fangIndex,
  sanBing,
  pregnancyFlags,
  externalTx,
  heatIntoBlood,
  totals,
} = require('./main.js');

test('三篇规模：44 条 · 26 方（方名去重 25）', () => {
  const t = totals();
  assert.strictEqual(t.tiao, 44);
  assert.strictEqual(t.fang, 26);
  assert.strictEqual(fangIndex().distinct, 25, '当归芍药散在 20.5 与 22.17 各出现一次');
});

test('逐篇条数方数：20 篇 11/7 · 21 篇 11/6 · 22 篇 22/13', () => {
  const { rows } = pianStats();
  assert.deepStrictEqual(rows.map((r) => [r.no, r.tiao, r.fang]), [[20, 11, 7], [21, 11, 6], [22, 22, 13]]);
  assert.deepStrictEqual(rows.map((r) => r.per), [0.64, 0.55, 0.59]);
});

test('方条比合计 26/44 = 0.59，且三篇合计等于逐篇加总', () => {
  const ps = pianStats();
  assert.strictEqual(ps.total.per, 0.59);
  assert.strictEqual(ps.rows.reduce((n, r) => n + r.tiao, 0), ps.total.tiao);
  assert.strictEqual(ps.rows.reduce((n, r) => n + r.fang, 0), ps.total.fang);
});

test('药味：出现 90 次 · 不同药 52 味；无药味方 4 条', () => {
  const t = totals();
  assert.strictEqual(t.herbTokens, 90);
  assert.strictEqual(t.distinctHerbs, 52);
  assert.strictEqual(t.noRecipe, 4);
  // 4 条无药味方必须逐个点名，否则「26 方」会被误读成 26 张处方
  const noRecipe = fangIndex().rows.filter((r) => !r.recipe).map((r) => r.tiao);
  assert.deepStrictEqual(noRecipe.sort(), ['21.4', '22.17', '22.18', '22.22']);
});

test('重复方：只有当归芍药散，且 22.17 是承 20.5 的省方（无药味）', () => {
  const { dup } = fangIndex();
  assert.strictEqual(dup.length, 1);
  assert.strictEqual(dup[0].name, '当归芍药散方');
  assert.deepStrictEqual(dup[0].at, ['20.5', '22.17']);
  assert.strictEqual(dup[0].withRecipe, 1, '只有 20.5 列了药味');
  assert.ok(tiaoText('22.17').includes('当归芍药散主之'));
});

test('产后三病：并列三条，病机逐字出自 21.1', () => {
  const b = sanBing();
  assert.deepStrictEqual(b.map((x) => x.name), ['病痉', '病郁冒', '大便难']);
  const src = tiaoText('21.1');
  assert.ok(src.includes('新产妇人有三病'), '21.1 首句须为原文');
  for (const x of b) {
    assert.ok(src.includes(x.cause), `${x.name} 病机「${x.cause}」不在 21.1 原文里`);
    assert.strictEqual(x.verbatim, true);
  }
  // 「一者…二者…三者…」是并列句，三病不是递进关系 —— 用原文语序锁住
  assert.ok(src.indexOf('病痉') < src.indexOf('郁冒'));
  assert.ok(src.indexOf('郁冒') < src.indexOf('大便难'));
});

test('妊娠篇禁忌/常服分组：4 条命中，攻下与刺法各 1 条', () => {
  const pf = pregnancyFlags();
  assert.deepStrictEqual(pf.map((f) => f.tiao), ['20.2', '20.9', '20.10', '20.11']);
  const kinds = Object.fromEntries(pf.map((f) => [f.tiao, f.kinds]));
  assert.deepStrictEqual(kinds['20.2'], ['攻下']);
  assert.deepStrictEqual(kinds['20.11'], ['刺法']);
  assert.deepStrictEqual(kinds['20.9'], ['常服']);
  assert.deepStrictEqual(kinds['20.10'], ['常服']);
  // 常服条必须是原文自己写的，不能是归纳者加的标签
  assert.ok(tiaoText('20.9').includes('宜常服当归散'));
  assert.ok(tiaoText('20.10').includes('妊娠养胎'));
});

test('三篇占全书：条 44/398 = 11.1% · 方 26/174 = 14.9%', () => {
  const t = totals();
  assert.strictEqual(t.bookTiao, 398);
  assert.strictEqual(t.bookFang, 174, '174 = 165 有方文 + 9 互见（v1 的 164 是「每块只读首方」的产物）');
  assert.strictEqual(t.tiaoShare, 11.1);
  assert.strictEqual(t.fangShare, 14.9, '26/174 = 14.94%');
});

test('关键条文逐字可核（防止凭记忆改写）', () => {
  const cases = [
    ['20.1', '妇人得平脉，阴脉小弱，其人渴，不能食，无寒热，名妊娠'],
    ['20.2', '当下其症，桂枝茯苓丸主之'],
    ['20.5', '妇人怀妊，腹中㽲痛，当归芍药散主之'],
    ['21.1', '新产妇人有三病，一者病痉，二者病郁冒，三者大便难'],
    ['22.5', '妇人咽中如有炙脔，半夏厚朴汤主之'],
    ['22.6', '妇人脏躁，喜悲伤欲哭，象如神灵所作，数欠伸，甘麦大枣汤主之'],
    ['22.9', '当以温经汤主之'],
  ];
  for (const [id, s] of cases) assert.ok(tiaoText(id).includes(s), `${id} 缺「${s}」`);
});

test('杂病篇：热入血室 4 条（同名三治）· 外治给药 4 条（给药途径逐条核对）', () => {
  assert.deepStrictEqual(heatIntoBlood().map((x) => x.tiao), ['22.1', '22.2', '22.3', '22.4']);
  const ex = externalTx();
  assert.strictEqual(ex.length, 4);
  for (const x of ex) assert.strictEqual(x.verified, true, `${x.tiao} 找不到给药字串「${x.mark}」`);
  // 外治清单不能把内服方混进来：这 4 条之外，22 篇不应再有任何「内/洗/导」标记被算
  assert.deepStrictEqual(ex.map((x) => x.route), ['内藏', '坐药', '洗', '导']);
});

test('凡 26 方都在原始 formulas[] 里，无一条是本章补充', () => {
  const src = PIAN_NOS.flatMap((no) => articlesOf(no).flatMap((a) => a.formulas || []));
  assert.strictEqual(src.length, 26);
  assert.strictEqual(fangIndex().rows.length, src.length);
  for (const no of PIAN_NOS) assert.ok(pianOf(no).no === no);
  for (const p of BOOK.pian.filter((x) => x.no != null)) {
    for (const a of p.articles) assert.ok(a.zhHans && a.zhHans.length > 0, `${p.nameSimp} ${a.tiao} 缺简文`);
  }
});
