#!/usr/bin/env node
/**
 * 中医基础理论 · 第 3 章 藏象学说 → 知识图谱：脏腑关系的图表示
 * 课程: departments/01-zhongyi/01-zhongyi-jichu-lilun/chapters/03-zang-xiang-tupu/docs/zh.md
 * 出处: 《素问·六节藏象论》《素问·五藏别论》《素问·阴阳应象大论》五行配属段
 * 依赖: 仅 Node.js 标准库
 *
 * 核心命题: 藏象的「象」是关系，不是标签。用图存关系，用遍历回答"谁连着谁"。
 * 本课从零建图（邻接表）、做 k 跳邻域与最短路径，并对本体做三项完整性校验。
 *
 * 说明: 关系取自通行教材的藏象配属，用于教学演示；不构成诊疗依据。
 */

'use strict';

// ── 本体：实体类型 + 关系类型（先定本体，再灌数据） ──────────
const NODE_TYPES = ['脏', '腑', '官窍', '情志', '形体', '华', '液', '五行'];
const EDGE_TYPES = ['相表里', '开窍于', '在志为', '在体为', '其华在', '化为', '属五行', '相生', '相克'];

// 五行次序: 木 火 土 金 水
const WUXING = ['木', '火', '土', '金', '水'];
// 相生: 木→火→土→金→水→木 ；相克: 木克土、土克水、水克火、火克金、金克木
const WUXING_SHENG = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]];
const WUXING_KE = [[0, 2], [2, 4], [4, 1], [1, 3], [3, 0]];

// 五藏及其配属（通行藏象配属表）
const ZANG = [
  { name: '肝', wuxing: '木', fu: '胆',   qiao: '目', zhi: '怒', ti: '筋', hua: '爪', ye: '泪' },
  { name: '心', wuxing: '火', fu: '小肠', qiao: '舌', zhi: '喜', ti: '脉', hua: '面', ye: '汗' },
  { name: '脾', wuxing: '土', fu: '胃',   qiao: '口', zhi: '思', ti: '肉', hua: '唇', ye: '涎' },
  { name: '肺', wuxing: '金', fu: '大肠', qiao: '鼻', zhi: '悲', ti: '皮毛', hua: '毛', ye: '涕' },
  { name: '肾', wuxing: '水', fu: '膀胱', qiao: '耳', zhi: '恐', ti: '骨', hua: '发', ye: '唾' },
];

// ── 图：邻接表 ─────────────────────────────────────────────
function createGraph() {
  return { nodes: new Map(), out: new Map(), in: new Map() };
}

function addNode(g, name, type) {
  if (!g.nodes.has(name)) {
    g.nodes.set(name, { name, type, edges: [] });
    g.out.set(name, []);
    g.in.set(name, []);
  }
  return g.nodes.get(name);
}

function addEdge(g, from, type, to) {
  addNode(g, from, '未知');
  addNode(g, to, '未知');
  g.out.get(from).push({ from, type, to });
  g.in.get(to).push({ from, type, to });
  g.nodes.get(from).edges.push({ type, to, dir: 'out' });
  g.nodes.get(to).edges.push({ type, from, dir: 'in' });
  return g;
}

/** 由藏象配属表生成图 */
function buildZangXiangGraph() {
  const g = createGraph();

  // 先把五行建成节点，并连上相生 / 相克
  for (const w of WUXING) addNode(g, w, '五行');
  for (const [i, j] of WUXING_SHENG) addEdge(g, WUXING[i], '相生', WUXING[j]);
  for (const [i, j] of WUXING_KE) addEdge(g, WUXING[i], '相克', WUXING[j]);

  for (const z of ZANG) {
    addNode(g, z.name, '脏');
    addNode(g, z.fu, '腑');
    addNode(g, z.qiao, '官窍');
    addNode(g, z.zhi, '情志');
    addNode(g, z.ti, '形体');
    addNode(g, z.hua, '华');
    addNode(g, z.ye, '液');

    // 相表里是对称关系：两侧都要有边。只写一侧会让「从腑查脏」静默失败。
    addEdge(g, z.name, '相表里', z.fu);
    addEdge(g, z.fu, '相表里', z.name);
    addEdge(g, z.name, '开窍于', z.qiao);
    addEdge(g, z.name, '在志为', z.zhi);
    addEdge(g, z.name, '在体为', z.ti);
    addEdge(g, z.name, '其华在', z.hua);
    addEdge(g, z.name, '化为', z.ye);
    addEdge(g, z.name, '属五行', z.wuxing);
  }
  return g;
}

// ── 查询 ───────────────────────────────────────────────────
/** k 跳邻域（无向），返回 { 节点: 距离 } */
function neighborhood(g, start, k) {
  const seen = new Map([[start, 0]]);
  let frontier = [start];
  for (let d = 1; d <= k; d += 1) {
    const next = [];
    for (const n of frontier) {
      const nbrs = [
        ...g.out.get(n).map((e) => e.to),
        ...g.in.get(n).map((e) => e.from),
      ];
      for (const m of nbrs) {
        if (!seen.has(m)) {
          seen.set(m, d);
          next.push(m);
        }
      }
    }
    frontier = next;
    if (!frontier.length) break;
  }
  seen.delete(start);
  return seen;
}

/** 最短路径（无向 BFS）。
 *  返回 { nodes: string[], edges: [{ src, dst, type, forward }] }
 *  edges[i] 连接 nodes[i] 与 nodes[i+1]；forward=true 表示真实边方向就是 nodes[i]→nodes[i+1]，
 *  forward=false 表示真实边是 nodes[i+1]→nodes[i]（逆向遍历）。
 *  区分方向是必要的：否则「金克木」会被渲染成「木克金」，把相克方向讲反。 */
function shortestPath(g, from, to) {
  if (from === to) return { nodes: [from], edges: [] };

  const prev = new Map([[from, null]]);
  const queue = [from];
  let found = false;

  while (queue.length && !found) {
    const n = queue.shift();
    const step = [
      // 沿出边走：真实方向 n → e.to
      ...(g.out.get(n) || []).map((e) => ({ next: e.to, src: n, dst: e.to, type: e.type, forward: true })),
      // 沿入边走（逆向）：真实方向 e.from → n
      ...(g.in.get(n) || []).map((e) => ({ next: e.from, src: e.from, dst: n, type: e.type, forward: false })),
    ];
    for (const s of step) {
      if (prev.has(s.next)) continue;
      prev.set(s.next, { from: n, edge: { src: s.src, dst: s.dst, type: s.type, forward: s.forward } });
      if (s.next === to) { found = true; break; }
      queue.push(s.next);
    }
  }
  if (!prev.has(to)) return null;

  const nodes = [to];
  const edges = [];
  let cur = to;
  while (prev.get(cur)) {
    const p = prev.get(cur);
    edges.unshift(p.edge);
    nodes.unshift(p.from);
    cur = p.from;
  }
  return { nodes, edges };
}

/** 把路径渲染成可读字符串，逆向边用 ←type- 标记 */
function formatPath(p) {
  if (!p) return '不可达';
  return p.nodes
    .map((n, i) => {
      if (i === 0) return n;
      const e = p.edges[i - 1];
      return e.forward ? `-${e.type}→ ${n}` : `←${e.type}- ${n}`;
    })
    .join(' ');
}

/** 某一脏的全套配属（one-hop 出边） */
function attributesOf(g, zangName) {
  const out = {};
  for (const e of g.out.get(zangName) || []) {
    if (e.type === '属五行') out.wuxing = e.to;
    else out[e.type] = e.to;
  }
  return out;
}

// ── 完整性校验（本体级） ────────────────────────────────────
/** 1. 每个脏必须齐备六类配属 */
function checkCompleteness(g) {
  const required = ['相表里', '开窍于', '在志为', '在体为', '其华在', '属五行'];
  const problems = [];
  for (const z of ZANG) {
    const got = new Set((g.out.get(z.name) || []).map((e) => e.type));
    for (const r of required) {
      if (!got.has(r)) problems.push(`${z.name} 缺 ${r}`);
    }
  }
  return problems;
}

/** 2. 相表里必须是双向一致的配对（脏→腑 且 腑→脏） */
function checkBiaoLi(g) {
  const problems = [];
  for (const z of ZANG) {
    const forward = (g.out.get(z.name) || []).some((e) => e.type === '相表里' && e.to === z.fu);
    const backward = (g.out.get(z.fu) || []).some((e) => e.type === '相表里' && e.to === z.name);
    if (!forward) problems.push(`${z.name} 未连 ${z.fu}`);
    if (!backward) problems.push(`${z.fu} 未回连 ${z.name}（相表里必须对称）`);
  }
  return problems;
}

/** 3. 五行不得重复分配：任意两脏的五行必须不同，且恰好覆盖五行 */
function checkWuxingUnique(g) {
  const problems = [];
  const w = ZANG.map((z) => attributesOf(g, z.name).wuxing);
  if (new Set(w).size !== w.length) problems.push(`五行分配重复: ${w.join(' / ')}`);
  for (const x of WUXING) {
    if (!w.includes(x)) problems.push(`五行 ${x} 未被任何脏使用`);
  }
  return problems;
}

function main() {
  const g = buildZangXiangGraph();

  console.log('═══ 藏象学说 → 知识图谱 (中医基础理论 第3章) ═══');
  console.log(`节点 ${g.nodes.size} 个 | 边 ${[...g.out.values()].reduce((a, l) => a + l.length, 0)} 条`);
  console.log(`实体类型: ${NODE_TYPES.join(' / ')}`);
  console.log(`关系类型: ${EDGE_TYPES.join(' / ')}`);

  console.log('');
  console.log('【一】五藏的配属（one-hop 出边）');
  for (const z of ZANG) {
    const a = attributesOf(g, z.name);
    console.log(`  ${z.name}(${a.wuxing}) 合${a['相表里']} · 开窍于${a['开窍于']} · 在志为${a['在志为']} · 在体为${a['在体为']} · 其华在${a['其华在']}`);
  }

  console.log('');
  console.log('【二】k 跳邻域：从「目」出发');
  for (const k of [1, 2]) {
    const nb = neighborhood(g, '目', k);
    const byDist = {};
    for (const [n, d] of nb) (byDist[d] = byDist[d] || []).push(n);
    console.log(`  ${k} 跳 (${nb.size} 个节点):`);
    for (const d of Object.keys(byDist).sort()) {
      console.log(`    距离 ${d}: ${byDist[d].join(' ')}`);
    }
  }

  console.log('');
  console.log('【三】最短路径查询（←type- 表示该边是逆向遍历，真实方向相反）');
  const queries = [['目', '泪'], ['肝', '悲'], ['耳', '小肠'], ['怒', '骨']];
  for (const [a, b] of queries) {
    const p = shortestPath(g, a, b);
    if (!p) {
      console.log(`  ${a} → ${b}: 不可达 ❌（本体缺失，需补关系）`);
      continue;
    }
    const reversed = p.edges.filter((e) => !e.forward).length;
    console.log(`  ${a} → ${b} (${p.edges.length} 跳${reversed ? `, 含 ${reversed} 条逆向` : ''}): ${formatPath(p)}`);
  }

  console.log('');
  console.log('【四】本体完整性校验');
  const c1 = checkCompleteness(g);
  const c2 = checkBiaoLi(g);
  const c3 = checkWuxingUnique(g);
  const show = (label, problems) => {
    console.log(`  ${label}: ${problems.length === 0 ? '通过 ✅' : `发现 ${problems.length} 项 ❌`}`);
    problems.forEach((p) => console.log(`     - ${p}`));
  };
  show('六类配属齐备', c1);
  show('相表里对称', c2);
  show('五行分配唯一且覆盖', c3);

  const total = c1.length + c2.length + c3.length;
  console.log('');
  console.log(`结论: 图上有 ${g.nodes.size} 个节点、${[...g.out.values()].reduce((a, l) => a + l.length, 0)} 条边。`);
  console.log('      本体校验的作用不是"证明图谱正确"，而是把「哪些关系还没建」变成可枚举的清单。');
  console.log('      「肝 → 悲」必须绕道五行（肝属木、金克木、金配肺、肺在志为悲）才通 —— 这正是');
  console.log('      藏象与五行必须放在同一张图里的原因；拆成两张表，这条路就没有了。');
  console.log('      注意相克边只建了「克」的方向（金克木），反向查询时必须显式标注逆向遍历，');
  console.log('      否则会把「金克木」讲成「木克金」。');
  console.log('边界声明: 教学图谱，仅覆盖五藏的基础配属；不构成诊疗依据。');

  return { graph: g, checks: { completeness: c1, biaoli: c2, wuxing: c3, total } };
}

if (require.main === module) {
  main();
}

module.exports = {
  NODE_TYPES, EDGE_TYPES, WUXING, ZANG,
  createGraph, addNode, addEdge, buildZangXiangGraph, formatPath,
  neighborhood, shortestPath, attributesOf,
  checkCompleteness, checkBiaoLi, checkWuxingUnique,
  main,
};
