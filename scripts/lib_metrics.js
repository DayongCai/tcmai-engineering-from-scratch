/**
 * scripts/lib_metrics.js —— 嵌入质量指标（纯 Node 标准库，零第三方依赖）
 *
 * 为什么有这个文件：上游参考实现 `marcolomele/vectorization-ICD11` 的
 * `Embeddings/embedding_analysis.py` 用一套固定指标评嵌入质量，聚类目标是
 * **ICD-11 章节**。本模块把那套指标的**语义**照搬过来（sklearn 口径），
 * 使本仓库的输出**与论文可比**，而不是自造一套只有自己看得懂的数。
 *
 * 对齐的指标（名字与语义都按 sklearn / 论文）：
 *   · silhouette_score              轮廓系数（越大越好）
 *   · calinski_harabasz_score       CH 指数（越大越好）
 *   · davies_bouldin_score          DB 指数（**越小越好**）
 *   · mean_intra_cluster_distance   簇内平均距离（pdist 均值口径）
 *   · mean_inter_cluster_distance   簇间平均距离（对"其余全部"取样 <=100 个点）
 *   · cluster_separation_ratio      inter / intra（越大越好）
 *   · chapter_entropy               簇分布熵（log2）
 *   · effective_num_chapters        2^H
 *   · trustworthiness / continuity  降维保真度（Venna & Kaski，k=10）
 *   · symbolAccuracy                层级一致性：近邻的编码前缀是否同段
 *                                   （论文报 PubMedBERT 1-符号 92.33% / 4-符号 75.13%）
 *
 * **向量一律用稀疏表示** `{idx: w}`：13,960 篇 × 3000 维的 TF-IDF 若按稠密矩阵算
 * 两两距离是 6e9 次浮点运算，纯 JS 跑不动；稀疏点积只看非零项，实际快两个数量级。
 * 距离一律用 **余弦**（文本嵌入的常规口径），故 inter/intra 与论文的欧氏口径
 * 不严格同值 —— **这一点必须写在报告里，不许暗示同口径可比**。
 */

// ── 稀疏向量基础 ────────────────────────────────────────────

// 稀疏向量支持**两种载体**：纯对象 `{idx: w}` 与 `Map<idx, w>`。
// 上游两处调用方各用一种（build_embeddings 用 Map，本模块内部用对象），
// 让模块两种都吃 —— 否则同一个指标会有两份实现，改了这边忘了那边。
const isMap = (v) => typeof v.get === 'function' && typeof v.forEach === 'function';

function entries(v) {
  if (isMap(v)) return v.entries();
  return Object.entries(v).map(([k, x]) => [k, x]);
}

function norm(v) {
  let s = 0;
  for (const [, w] of entries(v)) s += w * w;
  return Math.sqrt(s);
}

function normalize(v) {
  const n = norm(v);
  if (!n) return isMap(v) ? new Map() : {};
  const out = isMap(v) ? new Map() : {};
  for (const [k, w] of entries(v)) {
    if (isMap(v)) out.set(k, w / n); else out[k] = w / n;
  }
  return out;
}

function sizeOf(v) {
  return isMap(v) ? v.size : Object.keys(v).length;
}

/** 取单个键的权重（两种载体通用） */
function getW(v, k) {
  return isMap(v) ? (v.get(k) || 0) : (v[k] || 0);
}

function dot(a, b) {
  // 遍历较短的那个，减少查表次数
  const [p, q] = sizeOf(a) <= sizeOf(b) ? [a, b] : [b, a];
  const get = (v, k) => (isMap(v) ? v.get(k) : v[k]);
  let s = 0;
  for (const [k, w] of entries(p)) {
    const o = get(q, k);
    if (o) s += w * o;
  }
  return s;
}

/** 余弦距离 1 − cos（向量须已归一化；未归一化时按原长算） */
function cosineDist(a, b) {
  return 1 - dot(a, b);
}

// ── 聚类指标 ────────────────────────────────────────────────

/** 收集全部维度键 —— **必须走 entries()**：`for...in` 对 Map 完全看不见，
 *  曾导致 CH 在对象载体下算 1.8e16、在 Map 载体下算 0（测试当场抓住）。 */
function allDims(vectors) {
  const dims = new Set();
  for (const v of vectors) for (const [d] of entries(v)) dims.add(d);
  return dims;
}

function clusterIndex(labels) {
  const groups = new Map();
  labels.forEach((l, i) => {
    if (!groups.has(l)) groups.set(l, []);
    groups.get(l).push(i);
  });
  return groups;
}

/**
 * 轮廓系数。**口径与 sklearn 一致**：
 * a(i) = 同簇其余点的平均距离（自己不算）；b(i) = 各**其他簇**平均距离的最小值；
 * s(i) = (b−a)/max(a,b)；单点簇贡献 0。距离用余弦。
 * 说明：sklearn 默认欧氏，本处用余弦 —— 对 L2 归一化向量二者单调对应，但**不同值**。
 */
function silhouette(vectors, labels) {
  const groups = clusterIndex(labels);
  const n = labels.length;
  if (groups.size < 2) return null;
  const dist = (i, j) => cosineDist(vectors[i], vectors[j]);
  let total = 0;
  for (let i = 0; i < n; i++) {
    const own = groups.get(labels[i]);
    let a = 0;
    if (own.length > 1) {
      for (const j of own) if (j !== i) a += dist(i, j);
      a /= own.length - 1;
    }
    let b = Infinity;
    for (const [lab, idxs] of groups) {
      if (lab === labels[i]) continue;
      let s = 0;
      for (const j of idxs) s += dist(i, j);
      b = Math.min(b, s / idxs.length);
    }
    total += own.length > 1 && Number.isFinite(b) ? (b - a) / Math.max(a, b) : 0;
  }
  return total / n;
}

/**
 * Calinski-Harabasz 指数 = (between/(k−1)) / (within/(n−k))，越大越好。
 * between = Σ_c n_c·‖质心_c − 全局质心‖²；within = Σ_c Σ_i ‖x_i − 质心_c‖²。
 * 因用余弦距离，质心按**平均向量**算（非球面平均），报告里须注明口径。
 */
function calinskiHarabasz(vectors, labels) {
  const groups = clusterIndex(labels);
  const n = labels.length, k = groups.size;
  if (k < 2 || n - k < 1) return null;
  const dims = allDims(vectors);
  const centroid = (idxs) => {
    const c = {};
    for (const d of dims) {
      let s = 0;
      for (const i of idxs) s += getW(vectors[i], d);
      if (s) c[d] = s / idxs.length;
    }
    return c;
  };
  const all = vectors.map((_, i) => i);
  const g = centroid(all);
  let between = 0, within = 0;
  for (const [, idxs] of groups) {
    const c = centroid(idxs);
    between += idxs.length * dotDiffNorm2(c, g);
    for (const i of idxs) within += dotDiffNorm2(vectors[i], c);
  }
  within = Math.max(within, Number.EPSILON);
  return (between / (k - 1)) / (within / (n - k));
}

/** 稀疏差向量平方范数 ‖a−b‖² —— **返回平方和，不是范数**（CH 用平方距离，DB 才开方） */
function dotDiffNorm2(a, b) {
  let s = 0;
  for (const [k, w] of entries(plainSub(a, b))) s += w * w;
  return s;
}

/** 把两种载体的差转成对象 */
function plainSub(a, b) {
  const out = {};
  for (const [k, w] of entries(a)) out[k] = w;
  for (const [k, w] of entries(b)) out[k] = (out[k] || 0) - w;
  return out;
}

/**
 * Davies-Bouldin 指数 = mean_i max_{j≠i} (S_i+S_j)/M_ij，**越小越好**。
 * S_c = 簇 c 内点到质心的平均距离；M_ij = 两簇质心的余弦距离。
 */
function daviesBouldin(vectors, labels) {
  const groups = clusterIndex(labels);
  if (groups.size < 2) return null;
  const dims = allDims(vectors);
  const centroid = (idxs) => {
    const c = {};
    for (const d of dims) {
      let s = 0;
      for (const i of idxs) s += getW(vectors[i], d);
      if (s) c[d] = s / idxs.length;
    }
    return normalize(c);
  };
  const cent = new Map(), spread = new Map();
  for (const [lab, idxs] of groups) {
    const c = centroid(idxs);
    cent.set(lab, c);
    let s = 0;
    for (const i of idxs) s += Math.sqrt(dotDiffNorm2(vectors[i], c));
    spread.set(lab, s / idxs.length);
  }
  const labs = [...groups.keys()];
  let total = 0;
  for (const i of labs) {
    let best = 0;
    for (const j of labs) {
      if (i === j) continue;
      const m = cosineDist(cent.get(i), cent.get(j));
      if (m <= 0) continue;
      best = Math.max(best, (spread.get(i) + spread.get(j)) / m);
    }
    total += best;
  }
  return total / labs.length;
}

/**
 * 簇内 / 簇间平均距离。
 * intra：每簇内部两两距离均值（等价 scipy `pdist(...).mean()`），再对簇取均值。
 * inter：每簇的点到"**其余全部点**"的距离均值，其余用**前 100 个**取样
 *        —— 这一处**照抄上游实现**（`other_embeddings[:100]`），不是自己改的口径。
 */
function clusterDistances(vectors, labels) {
  const groups = clusterIndex(labels);
  const intra = [], inter = [];
  for (const [, idxs] of groups) {
    if (idxs.length > 1) {
      let s = 0, c = 0;
      for (let a = 0; a < idxs.length; a++) {
        for (let b = a + 1; b < idxs.length; b++) {
          s += cosineDist(vectors[idxs[a]], vectors[idxs[b]]);
          c += 1;
        }
      }
      if (c) intra.push(s / c);
    }
    const others = labels.map((_, i) => i).filter((i) => !idxs.includes(i)).slice(0, 100);
    if (others.length) {
      let s = 0, c = 0;
      for (const i of idxs) for (const j of others) { s += cosineDist(vectors[i], vectors[j]); c += 1; }
      if (c) inter.push(s / c);
    }
  }
  const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  return { intra: mean(intra), inter: mean(inter) };
}

/** 簇分布熵（log2）与有效簇数 2^H */
function entropy(labels) {
  const groups = clusterIndex(labels);
  const n = labels.length;
  let h = 0;
  for (const [, idxs] of groups) {
    const p = idxs.length / n;
    // 只在 p=0 时兜底。**给每个 p 都加 ε 会把 p=0.25 也推偏**
    // （实测：4 等份算成 3.9999999984 个有效簇，测试当场抓住）。
    if (p > 0) h -= p * Math.log2(p);
  }
  return { chapterEntropy: h, effectiveNumChapters: 2 ** h, actualNumChapters: groups.size };
}

// ── 降维保真度（Venna & Kaski）────────────────────────────────

/**
 * 可信度与连续性。**照上游 `calculate_trustworthiness_continuity` 的公式与秩口径**：
 *   T = 1 − 2/(n·k·(2n−3k−1)) · Σ_{i} Σ_{j∈低维k近邻\高维k近邻} (r(i,j) − k)
 *   C = 同上，把"低/高"互换
 * r(i,j) 是 j 在 i 的**高维**邻居里的秩；不在 k 近邻内则按真实距离补算（上游同款）。
 * 距离用欧氏（这是降维坐标，已经低维，稠密数组即可）。
 */
function trustworthinessContinuity(Xhi, Xlo, k = 10) {
  const n = Xhi.length;
  if (n <= k + 1) return { trustworthiness: null, continuity: null };
  const knn = (X) => {
    const idx = [], dist = [];
    for (let i = 0; i < n; i++) {
      const d = [];
      for (let j = 0; j < n; j++) d.push(j === i ? Infinity : euclid(X[i], X[j]));
      const order = d.map((v, j) => [j, v]).sort((a, b) => a[1] - b[1]);
      idx.push(order.slice(0, k + 1).map((p) => p[0]));
      dist.push(order.map((p) => p[0]));
    }
    return { idx, dist };
  };
  const hi = knn(Xhi), lo = knn(Xlo);
  const rankOf = (distOrder, j) => {
    const r = distOrder.indexOf(j);
    return r < 0 ? n : r;   // 秩从 1 起：r=0 是自身
  };
  const calc = (a, b) => {
    // a = 邻居来源空间，b = 秩查询空间
    let acc = 0;
    for (let i = 0; i < n; i++) {
      const inA = new Set(a.idx[i].slice(1));
      for (const j of new Set(a.idx[i].slice(1))) {
        if (inA.has(j) && !new Set(b.idx[i].slice(1)).has(j)) {
          acc += Math.max(0, rankOf(b.dist[i], j) - k);
        }
      }
    }
    return 1 - (2 / (n * k * (2 * n - 3 * k - 1))) * acc;
  };
  return { trustworthiness: calc(lo, hi), continuity: calc(hi, lo) };
}

function euclid(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d; }
  return Math.sqrt(s);
}

// ── 层级一致性（论文的核心指标）────────────────────────────────

/**
 * 符号准确率：每个点的 **k 个余弦最近邻**里，编码前缀（取前 `len` 个字符）与自身相同的比例。
 * 论文报的是 1-符号 / 4-符号 两个口径（PubMedBERT 92.33% / 75.13%）。
 * 前缀口径照上游 `get_chapter_from_code`：前两位是数字则取两位，否则取一位。
 */
function symbolAccuracy(vectors, codes, lens = [1, 4], k = 10) {
  const n = vectors.length;
  const out = {};
  const nbrs = [];
  for (let i = 0; i < n; i++) {
    const d = [];
    for (let j = 0; j < n; j++) if (j !== i) d.push([j, cosineDist(vectors[i], vectors[j])]);
    d.sort((a, b) => a[1] - b[1]);
    nbrs.push(d.slice(0, Math.min(k, n - 1)).map((p) => p[0]));
  }
  for (const len of lens) {
    let hit = 0, tot = 0;
    for (let i = 0; i < n; i++) {
      for (const j of nbrs[i]) {
        tot += 1;
        if (prefixOf(codes[i], len) === prefixOf(codes[j], len)) hit += 1;
      }
    }
    out[`symbol${len}Accuracy`] = tot ? hit / tot : null;
    // **随机基线**：两个随机点前缀相同的概率 = Σ_c (n_c/n)²。
    // 没有它，23% 这个数看着像失败（对比论文 83%），其实相对基线是 6 倍。
    const counts = new Map();
    for (const c of codes) counts.set(prefixOf(c, len), (counts.get(prefixOf(c, len)) || 0) + 1);
    let base = 0;
    for (const [, v] of counts) base += (v / n) ** 2;
    out[`symbol${len}Chance`] = base;
    out[`symbol${len}Lift`] = base ? Number(((out[`symbol${len}Accuracy`] / base)).toFixed(2)) : null;
  }
  return out;
}

/** 前缀口径照上游 `get_chapter_from_code`：前两位是数字则取两位，否则取一位；len>1 时取前 len 个字符 */
function prefixOf(code, len) {
  if (!code) return '';
  if (len === 1) return code.length >= 2 && /^\d\d$/.test(code.slice(0, 2)) ? code.slice(0, 2) : code.slice(0, 1);
  return code.slice(0, len);
}

module.exports = {
  norm, normalize, dot, cosineDist, dotDiffNorm2, euclid,
  silhouette, calinskiHarabasz, daviesBouldin, clusterDistances, entropy,
  trustworthinessContinuity, symbolAccuracy, prefixOf, clusterIndex,
};
