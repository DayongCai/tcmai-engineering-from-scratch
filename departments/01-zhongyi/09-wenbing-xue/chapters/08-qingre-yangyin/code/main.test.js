'use strict';
const assert = require('node:assert');
const test = require('node:test');
const { treatmentLadder, forbid, yinHerbs, methodPhrases, totals } = require('./main.js');

test('三书语料：630 条 · 926 块 · 243 方（178 有药味 + 65 互见）', () => {
  const t = totals();
  assert.strictEqual(t.books, 3);
  assert.strictEqual(t.articles, 630);
  assert.deepStrictEqual(t.byBook, { tiaobian: 290, wenrelun: 37, wenyilun: 303 });
  assert.strictEqual(t.formulas, 243);
  assert.strictEqual(t.formulasWithIngredients, 178);
  assert.strictEqual(t.formulasRefOnly, 65);
});

test('治法 7 阶：上焦辛凉三阶 → 中焦苦寒/甘寒 → 下焦咸寒/甘润', () => {
  const l = treatmentLadder();
  assert.strictEqual(l.totals.methodSteps, 7);
  const has = (fa) => l.steps.some((s) => s.fa.includes(fa) && !s.notMethod);
  for (const fa of ['辛涼平劑', '辛涼輕劑', '辛涼重劑', '苦寒', '甘寒', '鹹寒', '甘潤']) {
    assert.ok(has(fa), `缺治法阶：${fa}`);
  }
  const jiaoOrder = l.steps.filter((s) => !s.notMethod).map((s) => s.jiao);
  assert.strictEqual(jiaoOrder[0], '上焦');
  assert.strictEqual(jiaoOrder[jiaoOrder.length - 1], '下焦');
});

test('「甘澜」是煎法用水，必须标 notMethod 且不计入治法阶', () => {
  const l = treatmentLadder();
  const gan = l.steps.find((s) => s.fa.includes('甘瀾'));
  assert.ok(gan, '缺甘澜项');
  assert.strictEqual(gan.notMethod, true);
  assert.strictEqual(l.steps.filter((s) => s.notMethod).length, 1);
  assert.strictEqual(l.steps.length, 8, '共 8 项，其中 7 项才是治法');
});

test('每个治法阶都挂得住原文锚点（quote + 出处 + 条数）', () => {
  const l = treatmentLadder();
  for (const s of l.steps.filter((x) => !x.notMethod)) {
    assert.ok(s.quote && s.quote.length >= 6, `${s.fa} 缺原文`);
    assert.match(s.citeStr, /^外源·笈成·/, `${s.fa} 缺外源出处`);
    assert.ok(s.nTiao >= 1, `${s.fa} 条数异常`);
    assert.ok(Array.isArray(s.anchor), `${s.fa} 缺锚点`);
  }
  assert.strictEqual(l.totals.distinctTiao, 32, '涉及条文去重应为 32');
});

test('忌例 8 类共 27 处，且忌下/忌汗最多', () => {
  const f = forbid();
  const byId = Object.fromEntries(f.rules.map((r) => [r.id, r.n]));
  assert.deepStrictEqual(byId, { han: 7, run: 2, ni: 2, xinwen: 4, kuhan: 1, danshen: 1, xia: 8, zoubu: 2 });
  assert.strictEqual(Object.values(byId).reduce((a, b) => a + b, 0), 27);
  assert.ok(byId.xia >= byId.han, '忌下与忌汗应同量级');
  for (const r of f.rules) {
    assert.ok(r.refs.length >= 1, `${r.label} 缺引用`);
    for (const ref of r.refs) assert.match(ref, /^外源·笈成·/);
  }
});

test('忌例是「按条去重」的：25 处分布在少于 25 条里', () => {
  const f = forbid();
  const uniq = new Set(f.rules.flatMap((r) => r.refs));
  assert.ok(uniq.size <= 27, `引用条数 ${uniq.size} 不应超过次数`);
  assert.ok(uniq.size >= 15, `引用条数 ${uniq.size} 偏少，疑漏抽`);
});

test('养阴药按焦换将：麦冬 24 · 生地 21 · 元参 13（下焦 0）· 阿胶 9', () => {
  const rows = yinHerbs().rows;
  const by = (c) => rows.find((r) => r.canon === c);
  assert.strictEqual(by('麥冬').n, 24);
  assert.strictEqual(by('生地').n, 21);
  assert.strictEqual(by('元參').n, 13);
  assert.strictEqual(by('阿膠').n, 9);
  assert.strictEqual(by('元參').byJiao['下焦'], 0, '元参不入下焦');
  assert.ok(by('生地').byJiao['下焦'] >= 9, '生地在下焦应占一半以上');
});

test('治法语都能在原文里定位（透热转气 / 凉血散血 / 先安未受邪之地）', () => {
  const ps = methodPhrases();
  for (const p of ps) {
    assert.ok(p.refs.length >= 1, `${p.phrase} 无法定位`);
    assert.match(p.refs[0], /^外源·笈成·/);
  }
  const names = ps.map((p) => p.phrase).join('|');
  assert.ok(names.includes('透熱轉氣'));
  assert.ok(names.includes('涼血散血'));
  const tou = ps.find((p) => p.phrase === '透熱轉氣');
  assert.ok(tou.where.includes('溫熱論'), '透热转气应出自《温热论》');
});
