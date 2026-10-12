#!/usr/bin/env node
/**
 * 第 3 章 藏象 → 知识图谱 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const {
  NODE_TYPES, EDGE_TYPES, WUXING, ZANG,
  createGraph, addNode, addEdge, buildZangXiangGraph,
  neighborhood, shortestPath, formatPath, attributesOf,
  checkCompleteness, checkBiaoLi, checkWuxingUnique,
} = require('./main');

const g = buildZangXiangGraph();

test('本体定义齐备：五行在实体类型中，相生相克在关系类型中', () => {
  assert.ok(NODE_TYPES.includes('五行'), '五行应为独立的实体类型，而不是脏的一个属性字段');
  assert.ok(EDGE_TYPES.includes('相生'));
  assert.ok(EDGE_TYPES.includes('相克'));
  assert.ok(EDGE_TYPES.includes('相表里'));
});

test('藏象配属表完整：五藏，且每藏的六类配属与五行齐备', () => {
  assert.strictEqual(ZANG.length, 5);
  for (const z of ZANG) {
    for (const k of ['name', 'wuxing', 'fu', 'qiao', 'zhi', 'ti', 'hua', 'ye']) {
      assert.ok(z[k], `${z.name} 缺字段 ${k}`);
    }
    assert.ok(WUXING.includes(z.wuxing), `${z.name} 的五行 ${z.wuxing} 不在五行之列`);
  }
});

test('图规模：40 个节点、50 条边', () => {
  assert.strictEqual(g.nodes.size, 40);
  const edges = [...g.out.values()].reduce((a, l) => a + l.length, 0);
  assert.strictEqual(edges, 50);
});

test('相表里是对称边：脏→腑 与 腑→脏 都存在', () => {
  for (const z of ZANG) {
    assert.ok((g.out.get(z.name) || []).some((e) => e.type === '相表里' && e.to === z.fu), `${z.name}→${z.fu} 缺失`);
    assert.ok((g.out.get(z.fu) || []).some((e) => e.type === '相表里' && e.to === z.name), `${z.fu}→${z.name} 缺失（对称关系必须双向建边）`);
  }
});

test('本体校验三项全部通过', () => {
  assert.deepStrictEqual(checkCompleteness(g), []);
  assert.deepStrictEqual(checkBiaoLi(g), []);
  assert.deepStrictEqual(checkWuxingUnique(g), []);
});

test('校验能捕获人为破坏：删掉一侧相表里边后 checkBiaoLi 必须报错', () => {
  const broken = createGraph();
  addNode(broken, '肝', '脏');
  addNode(broken, '胆', '腑');
  addEdge(broken, '肝', '相表里', '胆'); // 只建一侧

  const problems = checkBiaoLi(broken);
  // checkBiaoLi 对 ZANG 全表校验，而这张残缺图里只有 肝→胆 一条边：
  //   肝：正向有、反向缺 → 1 项
  //   心/脾/肺/肾：正反向全缺 → 各 2 项
  // 合计 9 项。数字本身不重要，重要的是残缺被枚举出来而不是静默通过。
  assert.strictEqual(problems.length, 9, `应枚举出 9 项缺失，实得 ${problems.length}: ${problems.join(' / ')}`);
  assert.ok(problems.some((p) => p.includes('胆')), `报错信息应指出是胆未回连: ${problems.join(' / ')}`);
});

test('校验能捕获人为破坏：五行重复分配必须报错', () => {
  const broken = createGraph();
  addNode(broken, '甲', '脏');
  addNode(broken, '乙', '脏');
  addEdge(broken, '甲', '属五行', '木');
  addEdge(broken, '乙', '属五行', '木');
  const problems = checkWuxingUnique(broken);
  assert.ok(problems.some((p) => p.includes('重复')), `应报五行重复: ${problems.join(' / ')}`);
});

test('one-hop 邻域：从「目」出发恰好只有「肝」', () => {
  const nb = neighborhood(g, '目', 1);
  assert.strictEqual(nb.size, 1);
  assert.strictEqual(nb.get('肝'), 1);
});

test('two-hop 邻域：从「目」出发 7 个节点，距离 2 的集合含「木」', () => {
  const nb = neighborhood(g, '目', 2);
  assert.strictEqual(nb.size, 7);
  const dist2 = [...nb.entries()].filter(([, d]) => d === 2).map(([n]) => n).sort();
  assert.deepStrictEqual(dist2, ['木', '泪', '爪', '筋', '胆', '怒'].sort());
});

test('最短路径：肝 → 悲 必须绕道五行，且含逆向边（金克木）', () => {
  const p = shortestPath(g, '肝', '悲');
  assert.ok(p, '肝 → 悲 应当可达');
  assert.strictEqual(p.nodes.join('→'), '肝→木→金→肺→悲');
  assert.strictEqual(p.edges.length, 4);
  // 木—金 这一跳的真实边是「金克木」，遍历方向与真实方向相反
  const wuxingHop = p.edges.find((e) => e.type === '相克');
  assert.ok(wuxingHop, '路径中必须含相克边，否则绕道五行的说法不成立');
  assert.strictEqual(wuxingHop.src, '金');
  assert.strictEqual(wuxingHop.dst, '木');
  assert.strictEqual(wuxingHop.forward, false, '金克木被逆向遍历，必须标记 forward=false');
});

test('路径渲染保持真实边方向：金克木不能被写成木克金', () => {
  const s = formatPath(shortestPath(g, '肝', '悲'));
  assert.ok(s.includes('←相克-'), `逆向相克边应渲染为 ←相克-，实得: ${s}`);
  assert.ok(!s.includes('木 -相克→'), `不得把金克木写成木克金: ${s}`);
});

test('最短路径：水克火 是正向边，不应被标记为逆向', () => {
  const p = shortestPath(g, '水', '火');
  assert.strictEqual(p.edges.length, 1);
  assert.strictEqual(p.edges[0].type, '相克');
  assert.strictEqual(p.edges[0].forward, true);
  assert.strictEqual(p.edges[0].src, '水');
  assert.strictEqual(p.edges[0].dst, '火');
});

test('attributesOf 返回一脏的全套配属，含五行', () => {
  const a = attributesOf(g, '肾');
  assert.strictEqual(a.wuxing, '水');
  assert.strictEqual(a['相表里'], '膀胱');
  assert.strictEqual(a['开窍于'], '耳');
  assert.strictEqual(a['在志为'], '恐');
  assert.strictEqual(a['在体为'], '骨');
  assert.strictEqual(a['其华在'], '发');
});

test('孤岛检查：图上不存在无任何边的节点', () => {
  for (const [name] of g.nodes) {
    const deg = (g.out.get(name) || []).length + (g.in.get(name) || []).length;
    assert.ok(deg > 0, `节点 ${name} 是孤岛`);
  }
});
