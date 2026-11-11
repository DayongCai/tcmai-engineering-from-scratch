'use strict';

const assert = require('node:assert');
const test = require('node:test');
const { taxonomy, bingjiLayers, nineteen, chains, LIUYIN, QIQING, BINGLI, supplements } = require('./main.js');

test('六淫 6 邪、七情 7 志、病理产物 3 类（凭小节核对，不凭记忆）', () => {
  const t = taxonomy();
  assert.strictEqual(LIUYIN.length, 6);
  assert.strictEqual(QIQING.length, 7);
  assert.strictEqual(BINGLI.length, 3);
  assert.strictEqual(t.liu.length, 6);
  assert.strictEqual(t.qi.length, 7);
  assert.strictEqual(t.bingli.length, 3);
  assert.deepStrictEqual(t.liu, ['风', '寒', '暑', '湿', '燥', '火']);
  assert.deepStrictEqual(t.qi, ['喜', '怒', '忧', '思', '悲', '恐', '惊']);
});

test('病因三层合计 13 个节点（7 + 3 + 3）', () => {
  const t = taxonomy();
  assert.deepStrictEqual(t.layers.map((l) => l.members.length), [7, 3, 3]);
  assert.strictEqual(t.layers.reduce((n, l) => n + l.members.length, 0), 13);
  assert.ok(t.layers[0].members.includes('疠气'));
});

test('基本病机 3 类，对应 9.2/9.3/9.4 三节', () => {
  const b = bingjiLayers();
  assert.deepStrictEqual(b.base, ['邪正盛衰', '阴阳失调', '气血津液失常']);
  assert.deepStrictEqual(b.baseSecs, ['9.2 邪正盛衰', '9.3 阴阳失调', '9.4 气血津液失常']);
});

test('具体病机 3 类（教材第9章无独立经络病机节）', () => {
  const b = bingjiLayers();
  assert.deepStrictEqual(b.specific, ['脏腑病机', '六经病机', '卫气营血病机']);
  assert.ok(!b.specific.includes('经络病机'));
});

test('病机十九条：声称 19、引出 2、缺 17', () => {
  const n = nineteen();
  assert.strictEqual(n.declared, 19);
  assert.strictEqual(n.cited.length, 2);
  assert.strictEqual(n.gap, 17);
  assert.deepStrictEqual(n.cited.sort(), ['诸湿肿满，皆属于脾', '诸风掉眩，皆属于肝'].sort());
});

test('全书 4 条箭头链，只有 1 条是病机演化链（6 节点 5 边）', () => {
  const cs = chains();
  assert.strictEqual(cs.length, 4);
  const med = cs.filter((x) => x.kind === '病机演化');
  assert.strictEqual(med.length, 1);
  assert.strictEqual(med[0].ch, '4');
  assert.strictEqual(med[0].nodes.length, 6);
  assert.strictEqual(med[0].edges, 5);
  assert.strictEqual(med[0].nodes[0], '脾气虚');
  assert.strictEqual(med[0].nodes[5], '心脾两虚');
});

test('其余三条链被正确归类（1 条经络流注 + 2 条教学流程）', () => {
  const cs = chains();
  assert.strictEqual(cs.filter((x) => x.kind === '经络流注').length, 1);
  assert.strictEqual(cs.filter((x) => x.kind === '教学流程').length, 2);
});

test('外源补录：病机十九条 19 条（底本仍只 2 条）', () => {
  const sp = supplements();
  assert.strictEqual(sp.length, 2); // 病机十九条 + 六气胜复（第二轮）
  const b19 = sp.find((x) => x.id === 'bingji-19');
  const sf = sp.find((x) => x.id === 'liuqi-shengfu');
  assert.strictEqual(b19.supplied, 19);
  assert.strictEqual(b19.items.length, 19);
  assert.ok(b19.source.includes('至真要大論篇第七十四'));
  // 补进来的 17 条里必须有这两条（教材没引的）
  assert.ok(b19.items.includes('诸寒收引，皆属于肾。'));
  assert.ok(b19.items.includes('诸呕吐酸，暴注下迫，皆属于热。'));
  // 六气胜复：6 司天之化 + 3 原则 + 亢害承制 2 条
  assert.strictEqual(sf.supplied, 11);
  assert.ok(sf.items.some((x) => x.includes('亢则害，承乃制')));
  assert.ok(sf.items.some((x) => x.includes('有胜则复，无胜则否')));
});

test('底本仍是 2 条：nineteen() 的 cited 不因补录而变', () => {
  assert.strictEqual(nineteen().cited.length, 2);
  assert.strictEqual(nineteen().gap, 17);
});
