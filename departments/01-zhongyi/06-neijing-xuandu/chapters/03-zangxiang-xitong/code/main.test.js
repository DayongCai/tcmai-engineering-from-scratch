'use strict';
const assert = require('node:assert');
const test = require('node:test');
const { stripGloss, parseFive } = require('./main.js');

test('剥夹注：校勘语进 glosses，正文不被改名', () => {
  const r = stripGloss('为阳中之太（《太素》作少）阴');
  assert.strictEqual(r.clean, '为阳中之太阴');
  assert.deepStrictEqual(r.glosses, ['《太素》作少']);
});

test('普通括号（非校勘）保留原文，不当夹注剥', () => {
  const r = stripGloss('其华在面（即额部）');
  assert.strictEqual(r.clean, '其华在面（即额部）');
  assert.deepStrictEqual(r.glosses, []);
});

test('五条记录齐全，字段名固定', () => {
  const rows = parseFive();
  assert.strictEqual(rows.length, 5);
  for (const r of rows) {
    assert.ok('zang' in r && 'ben' in r && 'hua' in r && 'chong' in r && 'position' in r && 'qi' in r);
  }
});

test('肺句清洗后为「阳中之太阴」，并保留被剥的夹注', () => {
  const lung = parseFive().find((r) => r.zang === '肺');
  assert.strictEqual(lung.position, '阳中之太阴');
  assert.ok(lung.glosses.some((g) => g.includes('《太素》作少')));
});

test('脾是唯一不规则项：六者合称 + 至阴之类', () => {
  const rows = parseFive();
  const irr = rows.filter((r) => r.irregular);
  assert.strictEqual(irr.length, 1);
  assert.strictEqual(irr[0].zang, '脾胃大肠小肠三焦膀胱');
  assert.match(irr[0].position, /至阴/);
});

test('四脏的「通于」都落到四季之气', () => {
  const rows = parseFive().filter((r) => !r.irregular);
  assert.deepStrictEqual(rows.map((r) => r.qi), ['夏气', '秋气', '冬气', '春气']);
});
