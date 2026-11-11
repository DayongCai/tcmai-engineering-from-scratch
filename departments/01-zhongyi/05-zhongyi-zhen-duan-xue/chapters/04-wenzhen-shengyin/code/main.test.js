'use strict';

const assert = require('node:assert');
const test = require('node:test');
const { shape, sound, odor, SOUND, ODOR, supplements } = require('./main.js');

test('闻诊两节：684 + 171 = 855 字（全书 3.8%）', () => {
  const s = shape();
  assert.deepStrictEqual(s.rows.map((r) => r.chars), [684, 171]);
  assert.strictEqual(s.total, 855);
  assert.ok(Math.abs(s.share - 855 / 22215) < 1e-9);
});

test('听声音占闻诊 80.0%，嗅气味只占 20.0%', () => {
  const s = shape();
  assert.ok(Math.abs(s.soundShare - 0.8) < 1e-9);
});

test('声音五组共 17 词，全部命中教材原文', () => {
  const so = sound();
  assert.strictEqual(so.terms, 17);
  assert.strictEqual(so.hit, 17);
  assert.deepStrictEqual(Object.keys(SOUND).length, 5);
  assert.deepStrictEqual(so.groups.map((g) => g.group), ['语声异常', '呼吸异常', '咳嗽', '胃气上逆', '肠腑之声']);
});

test('语声异常 5 词：谵语/郑声/独语/错语/狂言（与第 12 章真假识别相关）', () => {
  const g = sound().groups.find((x) => x.group === '语声异常');
  assert.deepStrictEqual(g.items.map((x) => x.w), ['谵语', '郑声', '独语', '错语', '狂言']);
  assert.ok(g.items.every((x) => x.inText));
});

test('气味 6 项全部命中（口气/汗气/痰涕/二便/经带/病室）', () => {
  const od = odor();
  assert.strictEqual(ODOR.length, 6);
  assert.ok(od.every((x) => x.inText));
});

test('闻诊是四诊里最薄的一诊：855 字 < 望 2,812 / 问 2,281 / 切 2,030', () => {
  const s = shape();
  assert.ok(s.total < 2030);
  assert.ok(s.total < 2281);
  assert.ok(s.total < 2812);
});

test('补录：气味缺分级，外源五臭可查', () => {
  const g = supplements('z3-qiwei-wu-chou');
  assert.strictEqual(g.textbookSeen.count, 6, '教材气味六源');
  assert.strictEqual(g.textbookSeen.hasGrading, false, '教材没有分级');
  assert.deepStrictEqual(g.entries.map((e) => e.chou).sort(), ['臊', '焦', '香', '腥', '腐'].sort());
  assert.ok(g.citeAs.includes('外源·笈成·'), '引用格式');
});
