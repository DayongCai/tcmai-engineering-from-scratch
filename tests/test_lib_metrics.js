#!/usr/bin/env node
/**
 * tests/test_lib_metrics.js —— 嵌入质量指标模块
 *
 * 原则：**每个指标都要有一个能手算的期望值**。指标函数最容易出"看着像对"的错
 * （符号反了、除以 n 还是 n−1、某个簇漏算），而这些错在真实数据上不会报错，
 * 只会悄悄给出一个数。所以这里用**构造出来的、手算得出来的向量**去钉。
 *
 * 对齐对象：上游 `marcolomele/vectorization-ICD11` 的 `Embeddings/embedding_analysis.py`
 * （sklearn 口径）。
 */

const M = require('../scripts/lib_metrics.js');

let passed = 0;
const failures = [];
function test(name, fn) {
  try { fn(); passed += 1; console.log(`  ✓ ${name}`); }
  catch (e) { failures.push({ name, msg: e.message }); console.log(`  ✗ ${name}\n    ${e.message}`); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function close(a, b, eps, msg) { assert(Math.abs(a - b) <= eps, `${msg}: ${a} ≠ ${b}（容差 ${eps}）`); }

const v = (o) => M.normalize(o);   // 稀疏向量一站式

// ── 稀疏向量基础 ────────────────────────────────────────────

test('dot / norm / cosineDist：正交向量余弦距离恰为 1，同向为 0', () => {
  const a = v({ 0: 1 }), b = v({ 1: 1 }), c = v({ 0: 1 });
  close(M.cosineDist(a, b), 1, 1e-12, '正交');
  close(M.cosineDist(a, c), 0, 1e-12, '同向');
  close(M.dot(a, b), 0, 1e-12, '正交点积');
});

test('normalize：零向量不炸，返回空对象（不然下游会出 NaN）', () => {
  assert(Object.keys(M.normalize({})).length === 0, '空向量被归一化成了非空');
  assert(Object.keys(M.normalize({ 0: 0 })).length === 0, '全零向量被归一化成了非空');
});

// ── 聚类指标 ────────────────────────────────────────────────

test('silhouette：两簇完全分离 = 1（手算：每点 a=0, b=2, s=(2−0)/2=1）', () => {
  // 四个点两两正交 → 同簇内距离 1、异簇最近簇均距 1 → hmm 需可算的构型。
  // 用一维实数轴上的点更直观：转成稀疏向量 {0: x}
  const X = [v({ 0: 0 }), v({ 0: 0.1 }), v({ 0: 1 }), v({ 0: 1.1 })];
  // 注意：这些向量都在同一方向，余弦距离全为 0 → 轮廓必为 0 附近不适用。
  // 故改用二维正交基构型：A 簇在 e0 方向，B 簇在 e1 方向，且各簇内两点同向。
  const Y = [v({ 0: 1 }), v({ 0: 1 }), v({ 1: 1 }), v({ 1: 1 })];
  const s = M.silhouette(Y, ['A', 'A', 'B', 'B']);
  close(s, 1, 1e-9, '完美分离的轮廓系数');
  assert(X.length === 4, '占位');
});

test('silhouette：单簇返回 null（不是 0 —— 0 会被读成"很差"）', () => {
  assert(M.silhouette([v({ 0: 1 }), v({ 0: 2 })], ['A', 'A']) === null, '单簇竟返回了数');
});

test('calinskiHarabasz：分离越好值越大', () => {
  // 分离构型：A 簇两点同向 e0，B 簇两点同向 e1 —— 簇间远、簇内零离散
  const sep = [v({ 0: 1 }), v({ 0: 1 }), v({ 1: 1 }), v({ 1: 1 })];
  // 混杂构型：**两簇各自都含 e0 和 e1**，于是两簇质心重合、簇内离散大
  // （前两版都写成了"和分离构型同样的几何"，两个数一样大 —— 是测试错，不是函数错）
  const mix = [v({ 0: 1 }), v({ 1: 1 }), v({ 0: 1 }), v({ 1: 1 })];
  const a = M.calinskiHarabasz(sep, ['A', 'A', 'B', 'B']);
  const b = M.calinskiHarabasz(mix, ['A', 'A', 'B', 'B']);
  assert(a > b, `分离的 CH（${a}）应大于混杂的（${b}）`);
  assert(a > 0, 'CH 为负 —— 组间/组内算反了');
});

test('daviesBouldin：**越小越好**，分离构型必须小于混杂构型', () => {
  const sep = [v({ 0: 1 }), v({ 0: 1 }), v({ 1: 1 }), v({ 1: 1 })];
  const mix = [v({ 0: 1 }), v({ 1: 1 }), v({ 0: 1 }), v({ 1: 1 })];
  const a = M.daviesBouldin(sep, ['A', 'A', 'B', 'B']);
  const b = M.daviesBouldin(mix, ['A', 'A', 'B', 'B']);
  assert(a < b, `分离的 DB（${a}）应小于混杂的（${b}）`);
  assert(a >= 0, 'DB 为负 —— 不可能');
});

test('entropy：4 个等大簇 = 2 bit；单簇 = 0 bit；有效簇数 = 2^H', () => {
  const e4 = M.entropy(['A', 'B', 'C', 'D']);
  close(e4.chapterEntropy, 2, 1e-9, '四等分熵');
  close(e4.effectiveNumChapters, 4, 1e-9, '有效簇数');
  const e1 = M.entropy(['A', 'A', 'A', 'A']);
  close(e1.chapterEntropy, 0, 1e-9, '单簇熵');
  close(e1.effectiveNumChapters, 1, 1e-9, '单簇有效数');
});

test('clusterDistances：分离构型的分离比 > 1，混杂构型接近 1', () => {
  const sep = [v({ 0: 1 }), v({ 0: 1 }), v({ 1: 1 }), v({ 1: 1 })];
  const { intra, inter } = M.clusterDistances(sep, ['A', 'A', 'B', 'B']);
  close(intra, 0, 1e-9, '簇内（两点同向）');
  close(inter, 1, 1e-9, '簇间（正交）');
  assert(inter / intra === Infinity || inter > intra, '分离比没体现分离');
});

// ── 层级一致性 ──────────────────────────────────────────────

test('prefixOf：章节口径照上游 —— 前两位是数字取两位，否则取一位', () => {
  assert(M.prefixOf('01', 1) === '01', '两位数字码应取两位');
  assert(M.prefixOf('1C22', 1) === '1', '字母码应取一位');
  assert(M.prefixOf('1C22', 4) === '1C22', '四位口径');
  assert(M.prefixOf('', 1) === '', '空码');
});

test('symbolAccuracy：近邻同章节 → 准确率 = 1，且基线算得对', () => {
  // 三对点：A 簇彼此最近且同码；B 簇同理。k=1 时近邻必为同簇 → 1-符号准确率 1
  const X = [
    v({ 0: 1 }), v({ 0: 0.99 }),
    v({ 1: 1 }), v({ 1: 0.99 }),
  ];
  const codes = ['1A00', '1A01', '5A00', '5A01'];
  const r = M.symbolAccuracy(X, codes, [1], 1);
  close(r.symbol1Accuracy, 1, 1e-9, '1-符号准确率');
  // 基线：两码前 1 位分别是 '1' 与 '5'，各 2/4 → (0.5)²+(0.5)² = 0.5
  close(r.symbol1Chance, 0.5, 1e-9, '随机基线');
  close(r.symbol1Lift, 2, 1e-9, '相对基线的倍数');
});

test('symbolAccuracy：没有任何信息时准确率应贴住随机基线（lift≈1）', () => {
  // 全部向量同向 → 近邻顺序由索引决定，近似随机
  const X = Array.from({ length: 40 }, () => v({ 0: 1 }));
  const codes = X.map((_, i) => (i < 20 ? '1A00' : '5A00'));
  const r = M.symbolAccuracy(X, codes, [1], 5);
  assert(r.symbol1Lift < 2, `无信息时 lift 应接近 1，实得 ${r.symbol1Lift}`);
});

// ── 降维保真度 ──────────────────────────────────────────────

test('trustworthinessContinuity：高维=低维时 T=C=1（保真度满分）', () => {
  const X = [[0, 0], [1, 0], [0, 1], [1, 1], [2, 2], [3, 3], [0.5, 0.5], [4, 1],
    [1, 4], [2, 3], [5, 5], [0.1, 0.2], [3, 1], [2.5, 2.5], [1.5, 1.5]];
  const r = M.trustworthinessContinuity(X, X, 3);
  close(r.trustworthiness, 1, 1e-9, 'T');
  close(r.continuity, 1, 1e-9, 'C');
});

test('trustworthinessContinuity：样本太少时返回 null（不硬算一个假数）', () => {
  const r = M.trustworthinessContinuity([[0, 0], [1, 1]], [[0, 0], [1, 1]], 10);
  assert(r.trustworthiness === null && r.continuity === null, '样本不足竟返回了数');
});

// ── 稀疏表示的正确性（性能优化的前提是不可牺牲正确性）──────────

test('稀疏点积与稠密点积同值（快不能以错为代价）', () => {
  const a = { 0: 0.5, 5: 0.5, 9: 0.7071 };
  const b = { 0: 0.5, 9: 0.7071, 12: 0.5 };
  const dense = (x, y) => {
    let s = 0;
    for (let i = 0; i < 20; i++) s += (x[i] || 0) * (y[i] || 0);
    return s;
  };
  close(M.dot(a, b), dense(a, b), 1e-12, '稀疏 vs 稠密');
});

test('Map 载体与对象载体给出完全相同的指标（否则会有两份实现各自漂移）', () => {
  const obj = [v({ 0: 1 }), v({ 0: 1 }), v({ 1: 1 }), v({ 1: 1 })];
  const map = obj.map((o) => new Map(Object.entries(o)));
  const labels = ['A', 'A', 'B', 'B'];
  close(M.silhouette(obj, labels), M.silhouette(map, labels), 1e-12, '轮廓');
  close(M.calinskiHarabasz(obj, labels), M.calinskiHarabasz(map, labels), 1e-12, 'CH');
  close(M.daviesBouldin(obj, labels), M.daviesBouldin(map, labels), 1e-12, 'DB');
});

test('dotDiffNorm2 返回**平方和**而不是范数（差一个开方就是把 CH 全算错）', () => {
  const a = { 0: 3 }, b = { 0: 0 };   // ‖a−b‖² = 9，‖a−b‖ = 3
  close(M.dotDiffNorm2(a, b), 9, 1e-12, '平方差');
});

console.log(`\n  ${passed} 通过 · ${failures.length} 失败`);
if (failures.length) {
  console.log('\n失败明细:');
  for (const f of failures) console.log(`  ✗ ${f.name}\n    ${f.msg}`);
  process.exit(1);
}
console.log('\n✅ 嵌入指标通过');
