'use strict';
/**
 * 经脉别论的路径图：「食气」与「饮入」两条单向路径 → 拓扑排序 + 汇点
 *
 *   node code/main.js
 *
 * 口径：
 *   · 边逐句取自《素问·经脉别论》原文，每条边带原句依据（quote）。
 *   · 只收本篇出现的节点；不掺《灵枢·经脉》的经络循行（不同文本，不合并）。
 *   · 拓扑排序用来证明「这两段是流向叙述，不是闭环」；有人为加环则必须抛错。
 *   · 汇点 = 两条路径可达节点集的交集，是拓扑属性，不是功能结论。
 */

/** 食气路径（固体饮食之精） */
const EDGES_FOOD = [
  { from: '胃', to: '肝', quote: '食气入胃，散精于肝' },
  { from: '肝', to: '筋', quote: '淫气于筋' },
  { from: '胃', to: '心', quote: '食气入胃，浊气归心' },
  { from: '心', to: '脉', quote: '淫精于脉' },
  { from: '脉', to: '经', quote: '脉气流经' },
  { from: '经', to: '肺', quote: '经气归于肺' },
  { from: '肺', to: '皮毛', quote: '肺朝百脉，输精于皮毛' },
  { from: '皮毛', to: '腑', quote: '毛脉合精，行气于腑' },
  { from: '腑', to: '四脏', quote: '腑精神明，留于四脏' },
  { from: '四脏', to: '权衡', quote: '气归于权衡' },
  { from: '权衡', to: '气口', quote: '权衡以平，气口成寸，以决死生' },
];

/** 饮入路径（水液） */
const EDGES_DRINK = [
  { from: '胃', to: '脾', quote: '饮入于胃，游溢精气，上输于脾' },
  { from: '脾', to: '肺', quote: '脾气散精，上归于肺' },
  { from: '肺', to: '膀胱', quote: '通调水道，下输膀胱' },
  { from: '膀胱', to: '水精四布', quote: '水精四布' },
  { from: '水精四布', to: '五经并行', quote: '五经并行' },
];

function buildGraph(edges) {
  const adj = new Map();
  const indeg = new Map();
  const add = (n) => {
    if (!adj.has(n)) { adj.set(n, []); indeg.set(n, 0); }
  };
  for (const e of edges) {
    add(e.from); add(e.to);
    if (!adj.get(e.from).includes(e.to)) {
      adj.get(e.from).push(e.to);
      indeg.set(e.to, indeg.get(e.to) + 1);
    }
  }
  return { adj, indeg };
}

/** 拓扑排序：有环直接抛错（本章用它证明「无环」） */
function topoSort(edges) {
  const { adj, indeg } = buildGraph(edges);
  const deg = new Map(indeg);
  const q = [...deg.entries()].filter(([, d]) => d === 0).map(([n]) => n);
  const order = [];
  while (q.length) {
    const n = q.shift();
    order.push(n);
    for (const m of adj.get(n)) {
      deg.set(m, deg.get(m) - 1);
      if (deg.get(m) === 0) q.push(m);
    }
  }
  if (order.length !== deg.size) {
    const left = [...deg.keys()].filter((n) => !order.includes(n));
    throw new Error(`图中存在环，无法拓扑排序：${left.join('、')}`);
  }
  return order;
}

/** 可达集（BFS） */
function reachable(edges, start) {
  const { adj } = buildGraph(edges);
  const seen = new Set();
  const stack = [start];
  while (stack.length) {
    const n = stack.pop();
    for (const m of adj.get(n) || []) {
      if (!seen.has(m)) { seen.add(m); stack.push(m); }
    }
  }
  seen.delete(start);
  return seen;
}

/** 两路径的汇点（可达节点交集） */
function convergence() {
  const a = reachable(EDGES_FOOD, '胃');
  const b = reachable(EDGES_DRINK, '胃');
  return [...a].filter((n) => b.has(n)).sort();
}

function main() {
  console.log('食气路径（拓扑序）：');
  console.log('  ' + topoSort(EDGES_FOOD).join(' → '));
  console.log('\n饮入路径（拓扑序）：');
  console.log('  ' + topoSort(EDGES_DRINK).join(' → '));

  console.log('\n汇点（两条路径都可达的节点）：');
  console.log('  ' + convergence().join('、'));

  const foodSinks = [...buildGraph(EDGES_FOOD).adj.entries()].filter(([, v]) => v.length === 0).map(([k]) => k);
  const drinkSinks = [...buildGraph(EDGES_DRINK).adj.entries()].filter(([, v]) => v.length === 0).map(([k]) => k);
  console.log(`\n食气终点：${foodSinks.join('、')}`);
  console.log(`饮入终点：${drinkSinks.join('、')}`);
  console.log(`\n边数：食气 ${EDGES_FOOD.length} 条 · 饮入 ${EDGES_DRINK.length} 条；每条边均带原文依据。`);
  console.log('口径：文本图，非解剖图；不合并《灵枢·经脉》的循行路线。');
  console.log('本输出为文本结构分析，不构成诊疗依据。');
}

if (require.main === module) main();
module.exports = { EDGES_FOOD, EDGES_DRINK, buildGraph, topoSort, reachable, convergence };
