'use strict';
/**
 * 第 6 章单测。测的不是「代码能跑」，而是**docs/zh.md 里那些数字能不能被复算**：
 * 18 条 / 7 方 / 6 层 / 血痹 2 : 虚劳 16 / 干血 1 条 / 药 64 味次 41 味。
 * 任何一条改口径，这里先红，docs 才不至于悄悄说假话。
 */
const assert = require('node:assert');
const test = require('node:test');

const {
  PIAN,
  LAYERS,
  LAYER_ORDER,
  TABLE,
  NAMED_ONLY,
  SIDE_FANG,
  VITAL,
  textOf,
  fangOf,
  assertCriteria,
  xulaoLayer,
  layerSummary,
  pibaiVsXulao,
  fangByLayer,
  ganxueCases,
  isEditorial,
  herbNames,
  scale,
} = require('./main.js');

test('篇 6 规模：18 条 · 7 方（有方文）· 原文 1322 字', () => {
  const s = scale();
  assert.strictEqual(s.tiao, 18, '第6篇应为 18 条');
  assert.strictEqual(s.fang, 7, '有方文者 7 方');
  assert.strictEqual(s.chars, 1322);
  // 逐条号连续，防止底本分条变动而表未跟上
  assert.deepStrictEqual(
    PIAN.articles.map((a) => a.tiao),
    Array.from({ length: 18 }, (_, i) => `6.${i + 1}`),
  );
});

test('每条都归层，条数加总 = 18；共 6 层，含「纲」', () => {
  const rows = xulaoLayer();
  assert.strictEqual(rows.length, 18);
  assert.strictEqual(rows.length, TABLE.length, '分层表不得漏条或多条');
  const sum = layerSummary().reduce((n, l) => n + l.tiao, 0);
  assert.strictEqual(sum, 18);
  assert.strictEqual(layerSummary().length, 6);
  assert.deepStrictEqual(LAYER_ORDER, ['血痹', '阳虚', '阴虚', '阴阳两虚', '干血', '纲']);
  for (const k of LAYER_ORDER) assert.ok(LAYERS[k], `缺层定义 ${k}`);
});

test('判据词必须逐字出现在原文里 —— 这是「不许编条文」的硬门', () => {
  assert.strictEqual(assertCriteria(), true);
  for (const row of TABLE) {
    const t = textOf(row.tiao);
    assert.ok(row.crit.length >= 1, `6.${row.tiao} 无判据词`);
    for (const c of row.crit) assert.ok(t.includes(c), `6.${row.tiao} 原文无「${c}」`);
  }
});

test('层分布：血痹 2 · 阳虚 2 · 阴虚 5 · 阴阳两虚 5 · 干血 1 · 纲 3', () => {
  const by = Object.fromEntries(layerSummary().map((l) => [l.layer, l.tiao]));
  assert.deepStrictEqual(by, { 血痹: 2, 阳虚: 2, 阴虚: 5, 阴阳两虚: 5, 干血: 1, 纲: 3 });
});

test('血痹 2 条 : 虚劳 16 条；方 1 : 6 = 7', () => {
  const d = pibaiVsXulao();
  assert.strictEqual(d.pibai.tiao.length, 2);
  assert.deepStrictEqual(d.pibai.tiao, ['6.1', '6.2']);
  assert.strictEqual(d.xulao.tiao.length, 16);
  assert.strictEqual(d.xulao.tiao[0], '6.3');
  assert.strictEqual(d.xulao.tiao.at(-1), '6.18');
  assert.strictEqual(d.pibai.fang.length, 1);
  assert.strictEqual(d.xulao.fang.length, 6);
  assert.strictEqual(d.pibai.fang[0], '黄耆桂枝五物汤');
});

test('界限是可算的数：血痹条全身耗损证命中 0，虚劳条 7 项全中', () => {
  const d = pibaiVsXulao();
  assert.strictEqual(d.pibai.vitalHits.length, 0, '血痹条不得出现失精/盗汗/羸瘦这类虚损全身证');
  assert.strictEqual(d.xulao.vitalHits.length, VITAL.length);
  // 6.2「如风痹状」—— 麻木不是界限，原文自己就否掉了这条鉴别依据
  assert.ok(textOf(2).includes('如风痹状'));
});

test('7 方归层：血痹 1 · 阳虚 1 · 阴虚 1 · 阴阳两虚 3 · 干血 1 · 纲 0', () => {
  const f = fangByLayer();
  const total = Object.values(f).reduce((n, v) => n + v.length, 0);
  assert.strictEqual(total, 7);
  assert.strictEqual(total, scale().fang, '方归层合计必须等于有方文的方数');
  assert.deepStrictEqual(
    Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.length])),
    { 血痹: 1, 阳虚: 1, 阴虚: 1, 阴阳两虚: 3, 干血: 1, 纲: 0 },
  );
  assert.strictEqual(f['纲'].length, 0, '脉纲层不出方');
});

test('方名与底本 formulas[] 一致（不手写方名）', () => {
  const names = [];
  for (let n = 1; n <= 18; n += 1) {
    const v = fangOf(n);
    if (v) names.push(v);
  }
  assert.deepStrictEqual(names, [
    '黄耆桂枝五物汤',
    '桂枝加龙骨牡蛎汤',
    '小建中汤',
    '肾气丸',
    '薯蓣丸',
    '酸枣仁汤',
    '大黄䗪虫丸',
  ]);
});

test('6.14 黄耆建中汤提名无方文 —— 不得计入 7 方', () => {
  assert.strictEqual(NAMED_ONLY.length, 1);
  assert.strictEqual(NAMED_ONLY[0].tiao, 14);
  assert.strictEqual(fangOf(14), null);
  assert.ok(textOf(14).includes('黄耆建中汤主之'));
  assert.ok(!fangByLayer()['阴阳两虚'].some((x) => x.name.includes('建中汤') && x.name.includes('黄耆')));
});

test('6.15 肾气丸条在底本里带完整方文（八味），不含「方见脚气中」', () => {
  const t = textOf(15);
  assert.ok(t.includes('八味肾气丸主之'));
  assert.ok(t.includes('肾气丸方'));
  assert.ok(t.includes('附子') && t.includes('干地黄'));
  // 他本此条作「方见脚气中」；本库底本实有方文，故不得引用那句互见注
  assert.ok(!t.includes('脚气'), '底本此条无「方见脚气中」，文档若写即为编造');
  assert.strictEqual(PIAN.articles.find((a) => a.tiao === '6.15').formulas[0].ingredients.length, 8);
});

test('条后附方 3 条不计入 7 方（天雄散 / 炙甘草汤 / 獭肝散）', () => {
  assert.strictEqual(SIDE_FANG.length, 3);
  assert.ok(textOf(8).includes('天雄散方'));
  assert.ok(textOf(18).includes('炙甘草汤'));
  assert.ok(textOf(18).includes('獭肝散'));
  // 它们没有独立条号，也不在 formulas[] 中
  assert.strictEqual(PIAN.articles.filter((a) => a.tiao === '6.8')[0].formulas.length, 1);
});

test('干血只此一条：6.18，治法「缓中补虚」，与建中温补方向相反', () => {
  const g = ganxueCases();
  assert.strictEqual(g.length, 1);
  assert.strictEqual(g[0].tiao, '6.18');
  assert.strictEqual(g[0].fang, '大黄䗪虫丸');
  assert.strictEqual(g[0].zhifa, '缓中补虚');
  assert.ok(textOf(18).includes('缓中补虚'));
  // 同篇建中两条均为温补（里急），且都没有「干血」
  for (const n of [13, 14]) {
    assert.ok(textOf(n).includes('里急'));
    assert.ok(!textOf(n).includes('干血'));
  }
});

test('药：味次 64 · 不同 41；校注串 ⟨深师有生姜二两⟩ 不在药名表里（底本 v2）', () => {
  const s = scale();
  assert.strictEqual(s.herbTokens, 64);
  assert.strictEqual(s.distinctHerbs, 41);
  // v2：整 token 为夹注者由解析器丢进 articles[].notes，ingredients 里本就没有 ——
  // 所以 64 是原值，不是「剔完剩的」；v1 的 raw 65 / editorial 1 已不再成立。
  assert.strictEqual(s.herbTokensRaw, 64, '未过滤即 64 —— 校注串不再混入 ingredients');
  assert.strictEqual(s.editorial, 0, '底本 v2 的 ingredients 里不应再有纯校注 token');
  // 断言方向：药名表**不含**该串（不是「应把它剔除」）
  const names = herbNames();
  assert.strictEqual(names.length, 64);
  for (const bad of ['深師有生薑二兩', '深师有生姜二两', '⟨深师有生姜二两⟩', '⟨深師有生薑二兩⟩']) {
    assert.ok(!names.includes(bad), `药名表不得含校注串「${bad}」`);
  }
  assert.ok(!names.some((h) => /深師|深师/.test(h)), '药名表不得含任何「深师…」夹注');
  assert.deepStrictEqual(names.filter(isEditorial), [], '药名表里一条夹注都不许有');
  // 但它仍在 6.17 的 notes 里留档：不是被删掉，只是不计入药味
  const a17 = PIAN.articles.find((a) => a.tiao === '6.17');
  assert.ok(a17.notes.includes('深師有生薑二兩'), '校注串应留在 6.17 的 notes 里');
  // 酸枣仁汤仍是 5 味，且无生姜 ——「深师有生姜」不作为药味存在
  const zs = a17.formulas[0].ingredients.map((i) => i.herbSimp);
  assert.deepStrictEqual(zs, ['酸枣仁', '甘草', '知母', '茯苓', '芎䓖']);
  assert.ok(!zs.includes('生姜'));
});

test('每条都有繁/简两栏，简体非空（引文可溯源）', () => {
  for (const a of PIAN.articles) {
    assert.ok(a.zhHant && a.zhHant.length > 0, `${a.tiao} 缺繁文`);
    assert.ok(a.zhHans && a.zhHans.length > 0, `${a.tiao} 缺简文`);
  }
});
