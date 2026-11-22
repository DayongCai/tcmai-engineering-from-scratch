'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');

const {
  DOC,
  CHAPTER,
  SLUG,
  readDoc,
  internalRoads,
  externalMethods,
  gates,
  blockedAfter,
  reversal,
  oneLiner,
} = require('./main.js');

const doc = readDoc();

test('正文可读且规模合理', () => {
  assert.ok(fs.existsSync(DOC));
  assert.ok(doc.length > 2000, '正文过短');
});

test('内治四条路齐全，每条都有辨证依据与边界', () => {
  const roads = internalRoads(doc);
  assert.strictEqual(roads.length, 4);
  assert.deepStrictEqual(roads.map((r) => r.name), ['疏风清热（含清泻肺胃）', '养阴润燥', '活血化痰', '补益肺肾（含健脾）']);
  for (const r of roads) {
    assert.ok(r.basis.length >= 8, `${r.name} 缺依据`);
    assert.ok(r.boundary.length >= 3, `${r.name} 缺边界`);
  }
});

test('四条路的依据分别是表证、虚燥、久病入络与痰凝、虚损', () => {
  const roads = internalRoads(doc);
  assert.match(roads[0].basis, /^表证/);
  assert.match(roads[1].basis, /^虚燥/);
  assert.match(roads[2].basis, /^久病入络与痰凝/);
  assert.match(roads[3].basis, /^虚损/);
});

test('外治三法各管一层，含漱管面、吹药管点、雾化管腔', () => {
  const ext = externalMethods(doc);
  assert.strictEqual(ext.length, 3);
  assert.deepStrictEqual(ext.map((e) => [e.name, e.scope]), [['含漱', '面'], ['吹药', '点'], ['雾化', '腔']]);
  assert.strictEqual(oneLiner(doc), '含漱管面，吹药管点，雾化管腔');
});

test('五道闸门按气道→脓→深浅→虚实→用声排列，不是并列', () => {
  const gs = gates(doc);
  assert.strictEqual(gs.length, 5);
  assert.match(gs[0].gate, /气道/);
  assert.match(gs[1].gate, /脓/);
  assert.match(gs[4].gate, /用声/);
  for (const g of gs) {
    assert.ok(g.sign.length >= 3, `${g.gate} 缺判据`);
    assert.ok(g.action.length >= 4, `${g.gate} 缺动作`);
  }
});

test('第一道闸门没过时，其余四道全部待命', () => {
  const gs = gates(doc);
  const rest = blockedAfter(gs, '气道');
  assert.strictEqual(rest.length, gs.length - 1);
  assert.ok(rest.every((g) => !/气道/.test(g)));
});

test('虚实闸门的动作是定四条内治路，而不是直接开方', () => {
  const gs = gates(doc);
  const xu = gs.find((g) => /虚实/.test(g.gate));
  assert.match(xu.action, /四条内治路/);
});

test('主辅反转的判据不是病名，是有没有已成之脓与气道通不通', () => {
  const rv = reversal(doc);
  assert.match(rv.trigger, /已成之脓/);
  assert.match(rv.trigger, /气道/);
  assert.match(rv.pusSign, /局部隆起|穿刺有脓/);
  assert.match(rv.airwaySign, /呼吸困难/);
});

test('补益一路的总闸写的是脓未清时不可补涩', () => {
  const roads = internalRoads(doc);
  assert.match(roads[3].boundary, /脓未清时不可补涩/);
});

test('脚本可运行，输出含现算声明与临床边界', () => {
  const r = spawnSync(process.execPath, [require.resolve('./main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.length > 200);
  assert.match(out, /现算/);
  assert.match(out, /不构成/);
  assert.match(out, /不给剂量、疗程/);
  assert.match(out, new RegExp(SLUG));
});
