'use strict';
const assert = require('node:assert');
const test = require('node:test');
const { totals, shuVsShi, triJiao, fangBySyndrome, seasonality, profile } = require('./main.js');

test('九篇规模：132 条（暑 32 / 湿 100）· 135 方（109 有药味 + 26 互见）', () => {
  const t = totals();
  assert.strictEqual(t.pian, 9);
  assert.strictEqual(t.tiao, 132);
  assert.strictEqual(t.tiaoShu, 32);
  assert.strictEqual(t.tiaoShi, 100);
  assert.strictEqual(t.fang, 135);
  assert.strictEqual(t.withHerbs, 109);
  assert.strictEqual(t.refOnly, 26);
  assert.strictEqual(t.withHerbs + t.refOnly, t.fang);
});

test('三焦分布：上焦 28 · 中焦 62 · 下焦 42（湿温重心在中焦）', () => {
  const j = triJiao();
  assert.strictEqual(j['上焦'].tiao, 28);
  assert.strictEqual(j['中焦'].tiao, 62);
  assert.strictEqual(j['下焦'].tiao, 42);
  assert.strictEqual(j['上焦'].tiao + j['中焦'].tiao + j['下焦'].tiao, 132);
  assert.ok(j['中焦'].shiTiao > j['中焦'].shuTiao * 5, '中焦以湿温为主');
});

test('渴是暑热的判据：暑温 43.8% 提口渴，湿温只有 3%', () => {
  const s = shuVsShi();
  const ke = s.rows.find((r) => r.key === '口渴');
  assert.ok(ke, '缺口渴行');
  assert.strictEqual(ke.shu, 14);
  assert.strictEqual(ke.shi, 3);
  assert.ok(ke.delta > 30, `渴的差值应显著：${ke.delta}`);
});

test('面赤只在暑温出现（湿温 0 条）—— 热象不是湿象', () => {
  const s = shuVsShi();
  const mian = s.rows.find((r) => r.key === '面赤');
  assert.ok(mian);
  assert.strictEqual(mian.shi, 0);
  assert.ok(mian.shu >= 4);
});

test('方按治法归组：清气泄热 9 · 益气养阴 4 · 疏表透邪 6，每组都给出例方出处', () => {
  const f = fangBySyndrome();
  const keys = Object.keys(f);
  assert.ok(keys.length >= 5, `治法组只有 ${keys.length} 组`);
  assert.strictEqual(f['清气泄热'].fang, 9);
  assert.strictEqual(f['益气养阴'].fang, 4);
  assert.strictEqual(f['疏表透邪'].fang, 6);
  for (const k of keys) {
    assert.ok(Array.isArray(f[k].eg) && f[k].eg.length > 0, `${k} 缺例方`);
    // 例方必须带篇·条出处（如 一·上暑温·二二）
    assert.ok(f[k].eg.every((e) => /·[一二三四五六七八九十]+）$/.test(e)), `${k} 例方缺条号出处`);
  }
});

test('季节词稀缺：暑温 32 条里只有 1 条提「长夏」，说明季节并非逐条标注', () => {
  const se = seasonality();
  const cx = se.rows.find((r) => r.key === '长夏');
  assert.ok(cx);
  assert.strictEqual(cx.shu, 1);
  assert.ok(cx.shi >= 1);
});

test('逐篇剖面加总 = 全书（不重不漏）', () => {
  const rows = profile();
  const sumTiao = rows.reduce((n, r) => n + r.tiao, 0);
  const sumFang = rows.reduce((n, r) => n + r.fang, 0);
  const t = totals();
  assert.strictEqual(sumTiao, t.tiao);
  assert.strictEqual(sumFang, t.fang);
});
