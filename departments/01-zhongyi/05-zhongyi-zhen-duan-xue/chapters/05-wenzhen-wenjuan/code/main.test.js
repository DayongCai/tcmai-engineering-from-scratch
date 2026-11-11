'use strict';

const assert = require('node:assert');
const test = require('node:test');
const { shape, tenWen, structure, supplements } = require('./main.js');

test('问诊 2,281 字 = 全书 10.3%（四诊第二厚）', () => {
  const s = shape();
  assert.strictEqual(s.total, 2281);
  assert.ok(Math.abs(s.share - 2281 / 22215) < 1e-9);
  assert.deepStrictEqual(s.rows.map((r) => r.chars), [439, 1842]);
});

test('问现在症占 80.8%：问诊的重心在「现在症」而非方法', () => {
  const s = shape();
  assert.ok(Math.abs(s.nowShare - 1842 / 2281) < 1e-9);
  assert.ok(s.nowShare > 0.8);
});

test('标题称「十问歌」，实列 8 节（差 2）', () => {
  const t = tenWen();
  assert.strictEqual(t.claimed, true);
  assert.strictEqual(t.n, 8);
  assert.strictEqual(t.gap, 2);
});

test('八节次序：寒热/汗/疼痛/头身胸腹耳目/睡眠/饮食口味/二便/经带小儿', () => {
  const t = tenWen();
  assert.deepStrictEqual(t.subs.map((x) => x.no), ['4.2.1', '4.2.2', '4.2.3', '4.2.4', '4.2.5', '4.2.6', '4.2.7', '4.2.8']);
  assert.ok(t.subs[0].title.includes('寒热'));
  assert.ok(t.subs[7].title.includes('经带'));
});

test('缺的两问在前置病史里：4.1.2 给了既往史/个人生活史/家族史', () => {
  const st = structure();
  assert.ok(st.preamble.some((t) => t.includes('既往史')));
  assert.ok(st.preamble.some((t) => t.includes('主诉')));
});

test('4.1 四个段标题：方法 2 + 资料 2', () => {
  const st = structure();
  assert.strictEqual(st.n, 4);
  assert.strictEqual(st.method.length, 2);
  assert.strictEqual(st.preamble.length, 2);
});

test('补录：十问歌十项、八问有正文', () => {
  const g = supplements('z2-shiwen-ba-jie');
  assert.ok(g.entries[0].text.includes('十從氣味章神見'), '歌诀应到第十问');
  assert.strictEqual(g.heads.length, 8, '景岳正文只到八问');
  assert.strictEqual(g.textbookSeen.count, 8, '教材也是 8 节');
});
