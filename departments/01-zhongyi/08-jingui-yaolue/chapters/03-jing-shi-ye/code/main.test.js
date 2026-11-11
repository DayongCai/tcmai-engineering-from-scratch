'use strict';
/**
 * 第 3 章单测。每条断言都对着 docs/zh.md 里的一个数字：
 * 改代码不改文档、或改文档不改代码，这里都会红。
 */
const assert = require('node:assert');
const test = require('node:test');

const {
  PIAN,
  ARTICLES,
  classify,
  classifyAll,
  gangRou,
  gangRouAll,
  fangOf,
  herbFreq,
  misTreat,
  validateTags,
  hardCases,
  totals,
} = require('./main.js');

test('篇级规模：27 条 · 11 方（有方文）· 正文 1804 字 · 药味 50 次 / 23 味', () => {
  const t = totals();
  assert.strictEqual(t.pian, 2);
  assert.strictEqual(t.tiao, 27);
  assert.strictEqual(t.fang, 11);
  assert.strictEqual(t.chars, 1804, '按码点计；.length 会因「𠘧𠘧」「𬹼」多算 3');
  assert.strictEqual(t.herbTokens, 50);
  assert.strictEqual(t.distinctHerbs, 23);
  assert.strictEqual(PIAN.chars, 1804, '与底本 pian[].chars 一致');
});

test('三分：痉 13 · 湿 11 · 暍 3 · 未判 0（加总 = 27）', () => {
  const c = classifyAll();
  assert.strictEqual(c.count['痉'], 13);
  assert.strictEqual(c.count['湿'], 11);
  assert.strictEqual(c.count['暍'], 3);
  assert.strictEqual(c.count['未判'], 0);
  assert.strictEqual(Object.values(c.count).reduce((n, v) => n + v, 0), 27);
  assert.strictEqual(c.rows.length, 27);
});

test('逐条归类：2.1–2.13 痉、2.14–2.24 湿、2.25–2.27 暍', () => {
  const want = [
    ...Array.from({ length: 13 }, (_, i) => [`2.${i + 1}`, '痉']),
    ...Array.from({ length: 11 }, (_, i) => [`2.${i + 14}`, '湿']),
    ...Array.from({ length: 3 }, (_, i) => [`2.${i + 25}`, '暍']),
  ];
  assert.strictEqual(want.length, 27);
  for (const [tiao, cls] of want) assert.strictEqual(classify(tiao), cls, `${tiao} 应归 ${cls}`);
});

test('优先级：2.7 句中有「寒湿相得」，仍归痉（湿优先会把主证条吞掉）', () => {
  const a = ARTICLES.find((x) => x.tiao === '2.7');
  assert.ok(/湿/.test(a.zhHans), '前提：这一条确实同时出现湿字');
  assert.ok(/痉病也/.test(a.zhHans));
  assert.strictEqual(classify('2.7'), '痉');
  // 若把湿提到痉之前，痉只剩 12 条
  const naive = ARTICLES.filter((x) => /湿/.test(x.zhHans));
  assert.strictEqual(naive.length, 12, '含湿字的 12 条里，有 1 条是痉（2.7）');
});

test('2.4–2.6 无「痉病」之名（只有「致痉/则痉」），仍必须归痉', () => {
  for (const t of ['2.4', '2.5', '2.6']) {
    const a = ARTICLES.find((x) => x.tiao === t);
    assert.ok(!/痉病/.test(a.zhHans), `${t} 不应有「痉病」二字`);
    assert.strictEqual(classify(t), '痉');
  }
});

test('classify 也接受整段文字（不依赖条号），未知条文落「未判」', () => {
  assert.strictEqual(classify('太阳中暍，发热恶寒，身重而疼痛'), '暍');
  assert.strictEqual(classify('病者一身尽疼，发热，日晡所剧者，名风湿'), '湿');
  assert.strictEqual(classify('病人脉浮，欲饮水'), '未判');
});

test('刚柔：2.1 刚 · 2.2 柔 · 2.12 欲作刚 · 其余 24 条不判', () => {
  const g = gangRouAll();
  assert.deepStrictEqual(g['刚痉'], ['2.1']);
  assert.deepStrictEqual(g['柔痉'], ['2.2']);
  assert.deepStrictEqual(g['刚痉（欲作）'], ['2.12']);
  assert.strictEqual(g['未判'].length, 24);
  assert.strictEqual(gangRou('2.7'), '未判', '2.7 描述主证，不给刚柔之名');
  assert.strictEqual(gangRou('2.11'), '未判', '2.11 全条无一个汗字，不得外推为柔痉');
});

test('11 方清单与归属：痉 3 / 湿 6 / 暍 2，药味 6·7·4 / 5·4·4·5·5·4 / 5·1', () => {
  const jing = fangOf('痉');
  const shi = fangOf('湿');
  const ye = fangOf('暍');
  assert.deepStrictEqual(jing.map((f) => [f.tiao, f.name]), [
    ['2.11', '栝蒌桂枝汤方'],
    ['2.12', '葛根汤方'],
    ['2.13', '大承气汤方'],
  ]);
  assert.deepStrictEqual(shi.map((f) => [f.tiao, f.name]), [
    ['2.20', '麻黄加术汤方'],
    ['2.21', '麻黄杏仁薏苡甘草汤方'],
    ['2.22', '防己黄耆汤方'],
    ['2.23', '桂枝附子汤方'],
    ['2.23', '白术附子汤方'],
    ['2.24', '甘草附子汤方'],
  ]);
  assert.deepStrictEqual(ye.map((f) => [f.tiao, f.name]), [
    ['2.26', '白虎加人参汤方'],
    ['2.27', '一物瓜蒂汤方'],
  ]);
  assert.deepStrictEqual([...jing, ...shi, ...ye].map((f) => f.herbs), [6, 7, 4, 5, 4, 4, 5, 5, 4, 5, 1]);
  assert.strictEqual(jing.length + shi.length + ye.length, 11);
  assert.strictEqual(fangOf('未判').length, 0);
});

test('误治：9 条 / 12 次 —— 汗 6 · 下 4 · 温针 1 · 火攻 1', () => {
  const m = misTreat();
  assert.deepStrictEqual(m.byTag, { 汗: 6, 下: 4, 温针: 1, 火攻: 1 });
  assert.strictEqual(m.tiao, 9);
  assert.strictEqual(m.times, 12);
  assert.deepStrictEqual(m.list, ['2.4', '2.5', '2.6', '2.7', '2.16', '2.17', '2.18', '2.20', '2.25']);
});

test('误治表守卫：条号不存在、手段未登记、字面不符 —— 三种篡改都必须抛错', () => {
  assert.throws(() => validateTags({ '2.99': ['汗'] }), /不存在的条号/);
  assert.throws(() => validateTags({ '2.4': ['针'] }), /未知手段/);
  // 2.9 只讲脉，没有「火攻」二字 —— 表若被人手改成凑数，这里立刻拦下
  assert.throws(() => validateTags({ '2.9': ['火攻'] }), /没有这个字/);
  assert.doesNotThrow(() => validateTags({ '2.25': ['汗', '温针', '下'] }));
});

test('原文自标「难治」的只有 2.3 与 2.10', () => {
  assert.deepStrictEqual(hardCases(), ['2.3', '2.10']);
});

test('药味频次：甘草 9 方 · 桂枝 5 方 · 白术 4 方 · 麻黄 3 方', () => {
  const f = new Map(herbFreq());
  assert.strictEqual(f.get('甘草'), 9);
  assert.strictEqual(f.get('桂枝'), 5);
  assert.strictEqual(f.get('麻黄'), 3);
  assert.strictEqual(f.get('白术'), 4);
  const sum = [...f.values()].reduce((n, v) => n + v, 0);
  assert.strictEqual(sum, 50, '频次总和 = 药味出现次数');
});

test('条号唯一且有序，方只出自有方文的条（11 方 = 10 条，2.23 一条出两方）', () => {
  const seen = new Set();
  for (const a of ARTICLES) {
    assert.ok(a.tiao && a.idx > 0);
    assert.ok(!seen.has(a.tiao), `条号重复：${a.tiao}`);
    seen.add(a.tiao);
  }
  const withFang = ARTICLES.filter((a) => (a.formulas || []).length > 0);
  assert.strictEqual(withFang.length, 10);
  assert.strictEqual(withFang.reduce((n, a) => n + a.formulas.length, 0), 11);
  assert.deepStrictEqual(
    withFang.filter((a) => a.formulas.length > 1).map((a) => [a.tiao, a.formulas.map((f) => f.nameSimp)]),
    [['2.23', ['桂枝附子汤方', '白术附子汤方']]],
  );
  for (const a of withFang) assert.notStrictEqual(classify(a), '未判', `${a.tiao} 有方却未归类`);
});
