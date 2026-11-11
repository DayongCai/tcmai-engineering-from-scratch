'use strict';

const assert = require('node:assert');
const test = require('node:test');
const { cycle, fullNames, attributes, shichen, distances, diameter, qijing, ZHI, supplements } = require('./main.js');

test('流注链 12 经、12 边、起点肺经、终点肝经，原文 40 字', () => {
  const c = cycle();
  assert.strictEqual(c.n, 12);
  assert.strictEqual(c.edges.length, 12);
  assert.strictEqual(c.start, '肺经');
  assert.strictEqual(c.end, '肝经');
  assert.strictEqual(c.verbatim.length, 40);
  assert.strictEqual(c.names[0], '肺经');
  assert.strictEqual(c.names[11], '肝经');
});

test('最后一条边回到起点（是环，不是链）', () => {
  const c = cycle();
  assert.deepStrictEqual(c.edges[11], ['肝经', '肺经']);
});

test('环直径 = 6（12 节点环的对跖距离）', () => {
  assert.strictEqual(diameter(), 6);
});

test('肺经→肝经：顺行 11、最短 1', () => {
  const d = distances('肺经');
  const liver = d.find((x) => x.to === '肝经');
  assert.strictEqual(liver.forward, 11);
  assert.strictEqual(liver.shortest, 1);
  const bladder = d.find((x) => x.to === '膀胱经');
  assert.strictEqual(bladder.forward, 6);
  assert.strictEqual(bladder.shortest, 6, '膀胱经是环上的对跖点');
});

test('十二时辰：寅起肺经、丑止肝经，共 12 项且地支不重复', () => {
  const sc = shichen();
  assert.strictEqual(sc.length, 12);
  assert.strictEqual(sc[0].zhi, '寅');
  assert.strictEqual(sc[0].meridian, '肺经');
  assert.strictEqual(sc[0].hours, '3-5');
  assert.strictEqual(sc[11].zhi, '丑');
  assert.strictEqual(sc[11].meridian, '肝经');
  assert.strictEqual(new Set(sc.map((x) => x.zhi)).size, 12);
  assert.deepStrictEqual(ZHI.filter((z) => !sc.some((x) => x.zhi === z)), []);
});

test('教材只写全 7 个经名；手三阴 3 个齐', () => {
  const f = fullNames();
  assert.strictEqual(f.length, 7);
  assert.ok(f.includes('手太阴肺经'));
  assert.ok(!f.includes('手太阳小肠经'), '小肠经在教材里只有简称');
  const at = attributes();
  assert.strictEqual(at.tally['手三阴'], 3);
  assert.strictEqual(at.rows.length, 7);
});

test('奇经：声称 8 脉，只写出 4 脉，缺 4 脉含阴阳跷维', () => {
  const q = qijing();
  assert.strictEqual(q.declared, 8);
  assert.deepStrictEqual(q.named, ['督脉', '任脉', '冲脉', '带脉']);
  assert.strictEqual(q.gap, 4);
  assert.ok(q.missing.includes('阴跷脉'));
  assert.ok(q.missing.includes('阳维脉'));
});

test('外源补录：十二经全称 12 条、奇经八脉 8 条，均不并入底本', () => {
  const sp = supplements();
  assert.strictEqual(sp.length, 2);
  const mer = sp.find((x) => x.id === 'meridian-12');
  const qj = sp.find((x) => x.id === 'qijing-8');
  assert.strictEqual(mer.supplied, 12);
  assert.strictEqual(qj.supplied, 8);
  assert.ok(mer.source.includes('靈樞 經脈第十'));
  assert.ok(qj.source.includes('八十一難經 二十八難'));
  // 补录里补齐了教材只写简称的 5 个经
  for (const n of ['小肠手太阳之脉', '三焦手少阳之脉', '脾足太阴之脉', '肾足少阴之脉', '胆足少阳之脉']) {
    assert.ok(mer.items.includes(n), `缺补录 ${n}`);
  }
  // 教材原本缺名的四脉必须在补录里
  // 原文里阳维/阴维不带「脈」字（「陽維、陰維者」），补录照原文
  for (const n of ['阳跷脉', '阴跷脉', '阳维', '阴维']) assert.ok(qj.items.includes(n), `缺补录 ${n}`);
});

test('底本统计未被补录污染：教材全称仍是 7 个、奇经仍是 4 脉', () => {
  assert.strictEqual(fullNames().length, 7, '补录不得进底本口径');
  assert.strictEqual(qijing().named.length, 4);
});
