'use strict';
const assert = require('node:assert');
const test = require('node:test');
const { profile, classify, densityRank, totals, BOOK } = require('./main.js');

test('底本规模：26 项（22 正文 + 序 + 3 附）· 402 条 · 174 方（165 有方文 + 9 互见）', () => {
  const t = totals();
  assert.strictEqual(t.pianTotal, 26);
  assert.strictEqual(t.pianZhengwen, 22);
  assert.strictEqual(t.pianFu, 4);
  assert.strictEqual(t.tiao, 402);
  assert.strictEqual(t.tiaoZhengwen, 398, '22 篇正文合计 398 条');
  assert.strictEqual(t.fang, 174);
  assert.strictEqual(t.fangRefOnly, 9, '9 条互见（refOnly）只有方名与出处注');
  assert.strictEqual(t.fang - t.fangRefOnly, 165);
});

test('药：出现频次 728 · 不同药 165 味（同一药只计一次）', () => {
  const t = totals();
  assert.strictEqual(t.herbTokens, 728);
  assert.strictEqual(t.distinctHerbs, 165);
});

test('四类汇总加总 = 全书（附单列，不并入）', () => {
  const c = classify();
  const t = totals();
  assert.strictEqual(Object.values(c).reduce((n, v) => n + v.tiao, 0), t.tiao);
  assert.strictEqual(Object.values(c).reduce((n, v) => n + v.fang, 0), t.fang);
  assert.strictEqual(c['附'].tiao, 4);
  assert.strictEqual(c['附'].fang, 0, '附篇（杂疗方/食禁）没有方文，不应计方');
});

test('内伤杂病：260 条 / 117 方（章内数字必须与代码一致）', () => {
  const c = classify();
  assert.strictEqual(c['内伤'].tiao, 260);
  assert.strictEqual(c['内伤'].fang, 117);
  assert.strictEqual(c['内伤'].pian, 13);
});

test('第 1 篇 17 条 0 方 —— 「论多治少」的唯一一篇', () => {
  const p1 = profile().find((r) => r.no === 1);
  assert.strictEqual(p1.tiao, 17);
  assert.strictEqual(p1.fang, 0);
  const d = densityRank();
  assert.deepStrictEqual(d.sparsest.length, 1);
  assert.ok(d.sparsest[0].includes('第1篇'));
});

test('方条比最高的是篇 9 胸痹（1.00），篇 3 退居第二（0.80），篇 17 仅 0.49', () => {
  const d = densityRank();
  assert.ok(d.densest[0].includes('第9篇'), `实测首位：${d.densest[0]}`);
  assert.ok(d.densest[1].includes('第3篇'), `实测次位：${d.densest[1]}`);
  const p9 = profile().find((r) => r.no === 9);
  assert.strictEqual(p9.tiao, 9);
  assert.strictEqual(p9.fang, 9);
  assert.strictEqual(p9.per, 1);
  const p3 = profile().find((r) => r.no === 3);
  assert.strictEqual(p3.fang, 12);
  assert.strictEqual(p3.per, 0.8);
  const p17 = profile().find((r) => r.no === 17);
  assert.strictEqual(p17.per, 0.49);
});

test('序与附篇无条号（tiao: null），不得混进正文统计', () => {
  const fu = BOOK.pian.filter((p) => p.no == null);
  assert.strictEqual(fu.length, 4);
  for (const p of fu) for (const a of p.articles) assert.strictEqual(a.tiao, null);
});

test('每条都有繁/简两栏，且简体非空', () => {
  for (const p of BOOK.pian) {
    for (const a of p.articles) {
      assert.ok(a.zhHant && a.zhHant.length > 0, `${p.nameSimp} 缺繁文`);
      assert.ok(a.zhHans && a.zhHans.length > 0, `${p.nameSimp} 缺简文`);
    }
  }
});
