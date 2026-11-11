'use strict';
const assert = require('node:assert');
const test = require('node:test');
const { sourceSplit, tongueIndex, banZhen, prognosis } = require('./main.js');

test('入章 99 条：温热论 26/37 · 条辨 73/290', () => {
  const s = sourceSplit();
  assert.strictEqual(s.sum, 99);
  assert.strictEqual(s.byBook.wenrelun.articles, 26);
  assert.strictEqual(s.byBook.wenrelun.total, 37);
  assert.strictEqual(s.byBook.tiaobian.articles, 73);
  assert.strictEqual(s.byBook.tiaobian.total, 290);
  assert.strictEqual(s.byBook.wenrelun.articles + s.byBook.tiaobian.articles, s.sum);
});

test('舌象词表 27 个（苔色 6 / 苔质 11 / 舌体 10），覆盖 83 条、137 处', () => {
  const t = tongueIndex();
  assert.strictEqual(t.vocabSize, 27);
  assert.deepStrictEqual(t.classCount, { 苔色: 6, 苔質: 11, 舌體: 10 });
  assert.strictEqual(t.articles, 83);
  assert.strictEqual(t.mentions, 137);
  const bySum = Object.values(t.byClass).reduce((a, b) => a + b, 0);
  assert.strictEqual(bySum, t.mentions, '三类计数之和应等于总次数');
});

test('最高频是白苔 25 次，不是黄苔（温病≠必黄苔）', () => {
  const t = tongueIndex();
  const top = t.terms[0];
  assert.strictEqual(top.label, '白苔');
  assert.strictEqual(top.count, 25);
  const huang = t.terms.find((x) => x.label === '黃苔');
  assert.strictEqual(huang.count, 8);
  assert.ok(top.count > huang.count * 3, '白苔应远多于黄苔');
});

test('每个高频词都带可回查的引用（外源·笈成·… 第N条/篇·条）', () => {
  const t = tongueIndex();
  for (const term of t.terms.filter((x) => x.count >= 5)) {
    assert.ok(Array.isArray(term.cites) && term.cites.length >= term.count > 0,
      `${term.label} 引用数少于出现次数`);
    for (const c of term.cites) assert.match(c, /^外源·笈成·/, `${term.label} 引用未标外源：${c}`);
  }
});

test('斑疹判据 6 个维度，每格都带原文与条号', () => {
  const b = banZhen();
  assert.strictEqual(b.criteria.length, 6);
  const dims = b.criteria.map((c) => c.dim);
  assert.deepStrictEqual(dims, ['形态', '所属', '色与脏腑', '多少', '兼见', '出后转归']);
  for (const c of b.criteria) {
    for (const side of ['ban', 'zhen']) {
      const cell = c[side];
      if (!cell) continue;
      assert.ok(cell.quote && cell.quote.length >= 4, `${c.dim}/${side} 缺原文`);
      assert.match(cell.cite, /^外源·笈成·/, `${c.dim}/${side} 缺出处`);
    }
  }
});

test('形态维度：斑「点大而在皮肤之上」· 疹「琐碎小粒」', () => {
  const b = banZhen();
  const xing = b.criteria.find((c) => c.dim === '形态');
  assert.ok(xing.ban.quote.includes('點大而在皮膚之上'));
  assert.ok(xing.zhen.quote.includes('瑣碎小粒'));
  assert.ok(xing.note.includes('皮肤之上') || xing.note.includes('皮膚之上'));
});

test('预后词 20 处：难治 7 · 死 5 · 凶 5 · 可治 3（可治是少数）', () => {
  const p = prognosis();
  assert.strictEqual(p.hits.length, 20);
  const v = {};
  for (const h of p.hits) v[h.verdict] = (v[h.verdict] || 0) + 1;
  assert.strictEqual(v['難治'], 7);
  assert.strictEqual(v['死'], 5);
  assert.strictEqual(v['凶'], 5);
  assert.strictEqual(v['可治'], 3);
  assert.ok((v['難治'] + v['死'] + v['凶']) > v['可治'] * 5, '坏结局远多于可治');
});

test('预后命中都带句内证据与体征（不许只给结论词）', () => {
  const p = prognosis();
  for (const h of p.hits) {
    assert.ok(h.clause && h.clause.length >= 6, `${h.word} 缺句内证据`);
    assert.match(h.cite, /^外源·笈成·/);
    assert.ok(Array.isArray(h.signs), `${h.word} 缺体征字段`);
  }
});
