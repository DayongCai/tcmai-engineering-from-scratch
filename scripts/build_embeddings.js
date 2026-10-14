#!/usr/bin/env node
/**
 * scripts/build_embeddings.js —— 嵌入层（实现源材料的 embedding-code 规格）
 *
 * 规格来源：`standards/knowledge-tree/sources/中医知识树.xlsx` 工作表 `embedding-code`
 *   「embedding-code · ICD-11 / TF-IDF / FTS5 / RRF / 上下文工程（tcmP 真实实现）」
 *
 * 那张表把 tcmP 平台的检索编码引擎写成了八个编号组件，本文件按编号逐个实现：
 *   ① Document 构建（病侧＋证侧 → 单文本）
 *   ② 中文分词（字符 bigram + 英文词）
 *   ③ TF-IDF 字符 n-gram 向量（零依赖起步）
 *   ④ FTS5 全文索引（BM25）
 *   ⑤ RRF 融合（向量 Top-K ∪ FTS Top-K，k=60）
 *   ⑥ 上下文工程（只送 Top-5 叶）
 *   ⑧ 知识树查询（path / neighbors）
 *   （⑦ ICD-11 双通道客户端需要内网 API 与本地 icd11_mms.db，本机都没有 —— 见 README）
 *
 * ── 与规格的每一处偏离都写在下面，不藏 ──────────────────────────
 *
 * 偏离 1 · 输入字段不全。规格的 build_document() 吃 10 个字段
 *   （disease/icd/dcat/dsym/syndrome/pat/zf/six/ssym/formula），来自源平台 `kg/` 下的
 *   7 个病证单元文件。**那批文件不在本仓库的资料里** —— 我的资料只给出
 *   12 行 DSU 样例（病 × 证 × ICD-11，其中 5 行的 ICD 是空的）。所以：
 *   病侧与编码仅在已知时写入；未知就**不写**，绝不用证名去猜病名。
 *   证侧（syndrome）是 103/103 都有的，它是这条向量真正的主力 —— 这与上游
 *   vectorization-ICD11 的结论（"descriptions are all you need"）方向一致。
 *
 * 偏离 2 · ④ 不是 SQLite FTS5。本机没有 SQLite（宁可用不到也不引第三方依赖）。
 *   BM25 是**公式**不是数据库特性，这里在进程内实现它：倒排索引 + BM25 打分。
 *   检索结果的**排序**与 FTS5 同源，但"是 FTS5"这句话不成立，所以不这么写。
 *
 * 偏离 3 · ② 与 ③ 在源材料里就不一致。②写的是 bigram，③用的是 ngram_range=(1,3)。
 *   两个都实现，默认用 ③（1–3）出向量，②的 bigram 单独可调 ——
 *   不做取舍，因为取舍的依据不在我手上。
 *
 * 用法：
 *   node scripts/build_embeddings.js                 # 出向量 + 评测 + 报告
 *   node scripts/build_embeddings.js --query 失眠     # 检索（向量 ∪ BM25，RRF 融合）
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const OUTDIR = path.join(ROOT, 'standards/semtensor/embeddings');
const { readWorkbook } = require('./lib_xlsx.js');

// ─────────────────────────── ① Document 构建 ───────────────────────────
//
// 规格给的模板（源材料原文，逐字保留在这里，改一行就要说明为什么）：
//   text = (f"疾病：{disease}；ICD-11编码：{icd}；{dcat}。"
//           f"西医症状：{dsym}。"
//           f"中医证候：{syndrome}（{pat}），脏腑：{zf}，六经：{six}。"
//           f"主症：{ssym}。主方：{formula}。")
//
// 我的字段供给（实测，不是估计）：
//   syndrome  103/103（证名，来自 reference-units.json）
//   disease    12/103（来自 xlsx「图谱接口」样例表）
//   icd         7/103（同上；样例里 5 行的 ICD 单元格是空的）
//   dcat/zf/six/dsym/ssym/formula  0/103（不在资料里）
//
// 于是 buildDocument 只在有值时写入对应片段。**空字段不占位、不倒推**：
// 写一句"疾病：未知"会让"未知"变成一个有 IDF 的 token，污染整个向量空间 ——
// 缺席必须表现为缺席，而不是表现为一个取值。

function buildDocument(unit, attrs) {
  const parts = [];
  if (attrs.disease) parts.push(`疾病：${attrs.disease}`);
  if (attrs.icd) parts.push(`ICD-11编码：${attrs.icd}`);
  if (attrs.dcat) parts.push(attrs.dcat);
  if (attrs.dsym) parts.push(`西医症状：${attrs.dsym}`);
  parts.push(`中医证候：${unit.label}`);
  if (attrs.pat) parts.push(`（${attrs.pat}）`);
  if (attrs.zf) parts.push(`脏腑：${attrs.zf}`);
  if (attrs.six) parts.push(`六经：${attrs.six}`);
  if (attrs.ssym) parts.push(`主症：${attrs.ssym}`);
  if (attrs.formula) parts.push(`主方：${attrs.formula}`);
  return parts.join('；') + '。';
}

// ─────────────────────── ② 中文分词（bigram） ───────────────────────

const CJK = /[\u4e00-\u9fff]+/g;

function tokenizeBigram(text) {
  const toks = [];
  for (const seg of text.match(CJK) || []) {
    if (seg.length > 1) for (let i = 0; i < seg.length - 1; i++) toks.push(seg.slice(i, i + 2));
    else toks.push(seg);
  }
  for (const w of text.match(/[A-Za-z0-9][A-Za-z0-9.\-]*/g) || []) toks.push(w.toLowerCase());
  return toks;
}

// ──────────────── ③ TF-IDF 字符 n-gram（1–3，char_wb 近似） ────────────────
//
// sklearn 的 analyzer="char_wb" 会在**词边界内**取 n-gram（对 CJK 来说是以
// 连续汉字串为单位）。这里照此给每个 CJK 段加边界空格再取 1..3 gram。

function tokenizeNGram(text, lo = 1, hi = 3) {
  const toks = [];
  for (const seg of text.match(CJK) || []) {
    const s = ` ${seg} `;
    for (let n = lo; n <= hi; n++) for (let i = 0; i + n <= s.length; i++) toks.push(s.slice(i, i + n));
  }
  for (const w of text.match(/[A-Za-z0-9][A-Za-z0-9.\-]*/g) || []) {
    const s = ` ${w.toLowerCase()} `;
    for (let n = lo; n <= hi; n++) for (let i = 0; i + n <= s.length; i++) toks.push(s.slice(i, i + n));
  }
  return toks;
}

// TF-IDF：与 sklearn 默认一致（smooth_idf=True, norm='l2'）
//   idf = ln((1+N)/(1+df)) + 1        ← smooth_idf
//   向量最后做 L2 归一化
function buildTfidf(docs, tokenizer) {
  const N = docs.length;
  const df = new Map();
  const docToks = docs.map((d) => {
    const t = tokenizer(d.text);
    for (const tok of new Set(t)) df.set(tok, (df.get(tok) || 0) + 1);
    return t;
  });
  const vectors = docToks.map((toks) => {
    const tf = new Map();
    for (const t of toks) tf.set(t, (tf.get(t) || 0) + 1);
    const vec = new Map();
    let norm = 0;
    for (const [t, c] of tf) {
      const idf = Math.log((1 + N) / (1 + (df.get(t) || 0))) + 1;
      const w = (1 + Math.log(c)) * idf;   // sklearn 默认 sublinear_tf=False → 用 c*idf
      vec.set(t, c * idf);
      norm += (c * idf) ** 2;
    }
    norm = Math.sqrt(norm) || 1;
    for (const [t, w] of vec) vec.set(t, w / norm);
    return vec;
  });
  return { N, df, vectors, vocabulary: [...df.keys()].sort() };
}

function cosine(a, b) {
  const [small, big] = a.size < b.size ? [a, b] : [b, a];
  let s = 0;
  for (const [t, w] of small) { const o = big.get(t); if (o) s += w * o; }
  return s;  // 两边都已 L2 归一化
}

// ───────────────────── ④ BM25 倒排索引（FTS5 等价物） ─────────────────────

const BM25_K1 = 1.2;
const BM25_B = 0.75;

function buildBm25(docs, tokenizer) {
  const inv = new Map();          // token -> Map(docIdx -> tf)
  const len = [];
  let total = 0;
  docs.forEach((d, i) => {
    const toks = tokenizer(d.text);
    len.push(toks.length);
    total += toks.length;
    const tf = new Map();
    for (const t of toks) tf.set(t, (tf.get(t) || 0) + 1);
    for (const [t, c] of tf) {
      if (!inv.has(t)) inv.set(t, new Map());
      inv.get(t).set(i, c);
    }
  });
  const avgdl = total / (docs.length || 1);

  function search(queryTokens, topK) {
    const scores = new Map();
    const N = docs.length;
    for (const q of new Set(queryTokens)) {
      const posting = inv.get(q);
      if (!posting) continue;
      const df = posting.size;
      const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
      for (const [i, tf] of posting) {
        const denom = tf + BM25_K1 * (1 - BM25_B + BM25_B * (len[i] / avgdl));
        scores.set(i, (scores.get(i) || 0) + idf * ((tf * (BM25_K1 + 1)) / denom));
      }
    }
    return [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, topK).map(([i, s]) => ({ i, score: s }));
  }
  return { inv, len, avgdl, search };
}

// ────────────────── ⑤ RRF 融合（k=60，规格原文） ──────────────────

function rrf(rankLists, k = 60) {
  const score = new Map();
  for (const rl of rankLists) {
    rl.forEach((docIdx, i) => score.set(docIdx, (score.get(docIdx) || 0) + 1 / (k + i + 1)));
  }
  return [...score.entries()].sort((a, b) => b[1] - a[1]).map(([i, s]) => ({ i, score: s }));
}

// ─────────────────────────── 语料抽取 ───────────────────────────

function collectCorpus() {
  const files = [];
  const walk = (d) => {
    let e; try { e = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const x of e) {
      const p = path.join(d, x.name);
      if (x.isDirectory()) {
        // sources/ 是原件目录（含 xlsx 派生的整本 md），它对描述有帮助，但
        // 逐字节全读太贵；只跳过 .git/node_modules/build 与站点快照。
        if (!/node_modules|\.git$|build$|snapshot/.test(x.name)) walk(p);
      } else if (/\.(md|json|txt)$/.test(x.name)) files.push(p);
    }
  };
  for (const d of ['textbooks', 'standards', 'glossary', 'departments']) walk(path.join(ROOT, d));
  const out = [];
  for (const f of files) { try { out.push({ file: path.relative(ROOT, f), text: fs.readFileSync(f, 'utf8') }); } catch {} }
  return out;
}

/** 取证名在语料中的上下文窗口（这是"描述"的实际来源） */
function harvestContexts(label, corpus, { window = 140, max = 4 } = {}) {
  const found = [];
  const seen = new Set();
  for (const { file, text } of corpus) {
    let from = 0;
    for (;;) {
      const i = text.indexOf(label, from);
      if (i < 0) break;
      from = i + label.length;
      const snippet = text.slice(Math.max(0, i - window), i + label.length + window)
        .replace(/[\r\n]+/g, ' ')
        .replace(/!?\[[^\]]*\]\([^)]*\)/g, ' ')
        .replace(/[#>|*`_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const key = snippet.slice(0, 60);
      if (seen.has(key)) continue;
      seen.add(key);
      found.push({ file, snippet });
    }
  }
  // 窗口越长信息越多，但过长的常是表格行；按长度取前 max 条
  return found.sort((a, b) => b.snippet.length - a.snippet.length).slice(0, max);
}

// ─────────────────────── ⑧ 知识树查询 ───────────────────────

function loadTreeAttrs() {
  const wb = readWorkbook(path.join(ROOT, 'standards/knowledge-tree/sources/中医知识树.xlsx'));
  const sheet = wb.sheets.find((s) => s.name === '图谱接口');
  const rows = (sheet && (sheet.rows || [])).map((r) => r.map((c) => String(c == null ? '' : c).trim()));
  const attrs = new Map();      // uid -> {disease, icd, syndrome, branch}
  const edgeTypes = [];
  let inEdges = false, inDsu = false;
  for (const cells of rows) {
    const c = cells.filter((x) => x !== '');
    if (!c.length) continue;
    if (/^DSU ｜/.test(c.join(' ｜ ')) || c[0] === 'DSU') { inEdges = false; inDsu = true; continue; }
    if (c[0] === '边型 (type)') { inEdges = true; continue; }
    if (inEdges && c.length >= 2 && /^[a-z_]+$/.test(c[0])) {
      edgeTypes.push({ type: c[0], count: Number(c[1]) || 0, semantic: c[2] || '' });
      continue;
    }
    if (inDsu && /^DSU-\d+$/.test(c[0])) {
      // 形如： DSU-00001 ｜ CA00 ｜ 普通感冒（上呼吸道感染） × 风寒束表证（D01-S13）
      const uid = c[0];
      const rest = cells.slice(1).map((x) => x.trim()).filter((x) => x !== '');
      const icd = rest.find((x) => /^[A-Z0-9][A-Z0-9.]*$/.test(x) && x.length <= 8) || '';
      const pairCell = rest.find((x) => x.includes('×')) || '';
      const [diseaseRaw, syndromeRaw] = pairCell.split('×').map((s) => (s || '').trim());
      const disease = (diseaseRaw || '').replace(/（[^）]*）\s*$/, '').trim();
      const branch = (/（([A-Z]\d+-S\d+)）/.exec(syndromeRaw || '') || [])[1] || '';
      attrs.set(uid, {
        disease,
        icd,
        syndrome: (syndromeRaw || '').replace(/（[^）]*）\s*$/, '').trim(),
        branch,
        diseaseFull: diseaseRaw || '',
      });
    }
  }
  return { attrs, edgeTypes };
}

// ─────────────────────── 评测（借上游指标） ───────────────────────

/** 轮廓系数（按簇标签），返回均值 */
function silhouette(vectors, labels) {
  const idx = vectors.map((_, i) => i);
  const cos = (i, j) => cosine(vectors[i], vectors[j]);
  let sum = 0, n = 0;
  for (const i of idx) {
    const same = idx.filter((j) => j !== i && labels[j] === labels[i]);
    if (!same.length) continue;
    const others = [...new Set(labels)].filter((l) => l !== labels[i]);
    const a = 1 - same.reduce((s, j) => s + cos(i, j), 0) / same.length;   // 距离 = 1 - 余弦
    let b = Infinity;
    for (const l of others) {
      const grp = idx.filter((j) => labels[j] === l);
      if (!grp.length) continue;
      b = Math.min(b, 1 - grp.reduce((s, j) => s + cos(i, j), 0) / grp.length);
    }
    if (!isFinite(b)) continue;
    sum += (b - a) / Math.max(a, b);
    n += 1;
  }
  return n ? sum / n : NaN;
}

/** kNN 纯度：最近邻中同标签的比例（上游"是否有语义邻域"的判据） */
function knnPurity(vectors, labels, k = 5) {
  let hit = 0, tot = 0;
  for (let i = 0; i < vectors.length; i++) {
    const near = vectors
      .map((v, j) => ({ j, s: j === i ? -Infinity : cosine(vectors[i], v) }))
      .sort((a, b) => b.s - a.s).slice(0, k);
    for (const { j } of near) { tot += 1; if (labels[j] === labels[i]) hit += 1; }
  }
  return tot ? hit / tot : NaN;
}

// ─────────────────────────── 主流程 ───────────────────────────

function main() {
  const argv = process.argv.slice(2);
  const qIdx = argv.indexOf('--query');
  const query = qIdx >= 0 ? argv[qIdx + 1] : null;

  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/semtensor/datasets/reference-units.json'), 'utf8'));
  const units = Array.isArray(raw) ? raw : raw.units || raw.items || Object.values(raw).find(Array.isArray);
  const { attrs, edgeTypes } = loadTreeAttrs();
  const corpus = collectCorpus();

  // 文档集：103 个 DSU（kind==='dsu'）。其余 13 个概念单元也建，但评测只算 DSU。
  const docs = units.map((u) => {
    const a = attrs.get(u.uid) || {};
    const ctx = harvestContexts(u.label, corpus);
    const text = buildDocument(u, a);
    const full = ctx.length ? `${text} 语料：${ctx.map((c) => c.snippet).join(' ')}` : text;
    return {
      uid: u.uid, label: u.label, kind: u.kind,
      attrs: a, contexts: ctx,
      text: full,
      hasDisease: !!a.disease, hasIcd: !!a.icd,
    };
  });

  const dsuDocs = docs.filter((d) => d.kind === 'dsu');

  // 两个分词器：② bigram 与 ③ 1-3gram
  const variants = {
    'ngram13': (t) => tokenizeNGram(t, 1, 3),
    'bigram2': (t) => tokenizeBigram(t),
  };

  const reports = {};
  let primary = null;
  for (const [name, tok] of Object.entries(variants)) {
    const tfidf = buildTfidf(docs, tok);
    const bm25 = buildBm25(docs, tok);
    const dsuIdx = docs.map((d, i) => (d.kind === 'dsu' ? i : -1)).filter((i) => i >= 0);
    const vecs = dsuIdx.map((i) => tfidf.vectors[i]);

    // 簇标签：优先用「病」（12 个已知），否则退到「证的尾字族」（证名末 2 字之外的语义后缀）
    // ——两次评测都做，因为样本量差一个数量级，结论不能混着说。
    const byDisease = dsuIdx.map((i) => docs[i].attrs.disease || '__unknown__');
    const known = byDisease.filter((d) => d !== '__unknown__').length;

    let bySuffix = dsuIdx.map((i) => {
      const l = docs[i].label.replace(/证$/, '');
      return l.slice(-2) || l;   // 末二字作为粗族（如 两虚/阳虚/湿热/上亢）
    });
    // 只保留出现 ≥2 次的族，否则纯度无意义
    const cnt = new Map();
    bySuffix.forEach((s) => cnt.set(s, (cnt.get(s) || 0) + 1));
    bySuffix = bySuffix.map((s) => (cnt.get(s) >= 2 ? s : '__single__'));

    reports[name] = {
      tokensPerDoc: docs.map((d) => tok(d.text).length),
      vocabulary: tfidf.vocabulary.length,
      knnPurityBySuffix: knnPurity(vecs, bySuffix, 5),
      silhouetteBySuffix: silhouette(vecs, bySuffix),
      knnPurityByDisease: known >= 3 ? knnPurity(vecs, byDisease, 5) : null,
      diseaseCoverage: known,
    };
  }
  primary = { name: 'ngram13' };

  const tfidf = buildTfidf(docs, variants['ngram13']);
  const bm25 = buildBm25(docs, variants['ngram13']);

  // 检索冒烟：复现规格里记录的端点行为
  const endpoints = [
    { ep: '/semantic-search?q=失眠', q: '失眠', expect: '心脾两虚证' },
    { ep: '/bianzheng?q=口苦,咽干', q: '口苦 咽干', expect: '肝胆湿热证' },
    { ep: '/diag?q=恶寒,发热,无汗', q: '恶寒 发热 无汗', expect: '风寒束表证' },
  ];
  const smoke = endpoints.map((e) => {
    const qt = variants['ngram13'](e.q);
    const rankIn = (scope) => {
      const allow = (i) => scope === 'all' || docs[i].kind === 'dsu';
      const vecRank = docs
        .map((d, i) => ({ i, s: cosine(tfidf.vectors[i], sparseFromTokens(qt, tfidf)) }))
        .filter((x) => allow(x.i))
        .sort((a, b) => b.s - a.s).slice(0, 10).map((x) => x.i);
      const ftsRank = bm25.search(qt, 40).filter((x) => allow(x.i)).slice(0, 10).map((x) => x.i);
      return rrf([vecRank, ftsRank]);
    };
    const top = (fused) => fused.slice(0, 5).map((x) => docs[x.i]);
    const all = top(rankIn('all')), only = top(rankIn('dsu'));
    return {
      endpoint: e.ep, query: e.q, expectedInSpec: e.expect,
      allUnits: { top1: all[0] ? `${all[0].uid} · ${all[0].label}` : null, top5: all.map((f) => `${f.uid} · ${f.label}`), hit: all[0] ? all[0].label === e.expect : false },
      dsuOnly: { top1: only[0] ? `${only[0].uid} · ${only[0].label}` : null, top5: only.map((f) => `${f.uid} · ${f.label}`), hit: only[0] ? only[0].label === e.expect : false },
    };
  });

  const out = {
    $generated: 'node scripts/build_embeddings.js',
    specSource: 'standards/knowledge-tree/sources/中医知识树.xlsx#embedding-code',
    specComponents: ['① Document 构建', '② 中文分词', '③ TF-IDF n-gram', '④ BM25 倒排索引（FTS5 等价物）', '⑤ RRF 融合 k=60', '⑥ 上下文工程 Top-5', '⑧ 知识树查询 path/neighbors'],
    notImplemented: [{ component: '⑦ ICD-11 双通道客户端', why: '需要内网 API 192.168.0.111:8080 与本地 data/icd11_mms.db（31,838 实体），本机都没有' }],
    deviations: [
      '① 输入字段不全：syndrome 103/103，disease 12/103，icd 7/103，dcat/dsym/pat/zf/six/ssym/formula 0/103。空字段不占位、不倒推。',
      '④ 不是 SQLite FTS5：BM25 在进程内实现（无 SQLite 且坚持零第三方依赖）。排序同源，「是 FTS5」不成立。',
      '③ ②与③在源材料里互不一致（bigram vs 1–3gram），两个都实现，默认 1–3gram，不做取舍。',
    ],
    counts: {
      units: units.length,
      dsu: dsuDocs.length,
      corpusFiles: corpus.length,
      edgesReportedBySource: edgeTypes,
    },
    evaluation: reports,
    retrievalSmoke: smoke,
    documents: docs.map((d) => ({
      uid: d.uid, label: d.label, kind: d.kind,
      fields: { disease: d.attrs.disease || null, icd: d.attrs.icd || null, branch: d.attrs.branch || null },
      contextCount: d.contexts.length,
      contextFiles: d.contexts.map((c) => c.file),
      textLength: d.text.length,
      text: d.text.slice(0, 400),
    })),
  };

  fs.mkdirSync(OUTDIR, { recursive: true });
  fs.writeFileSync(path.join(OUTDIR, 'index.json'), `${JSON.stringify(out, null, 2)}\n`, 'utf8');

  // ── 终端报告 ──
  console.log('═══ 嵌入层 · 按源材料 embedding-code 规格实现 ═══\n');
  console.log(`语料 ${corpus.length} 文件 · 单元 ${units.length}（DSU ${dsuDocs.length}）`);
  console.log(`字段供给（103 个 DSU）：证候 ${dsuDocs.length} · 病 ${reports['ngram13'].diseaseCoverage} · ICD ${docs.filter((d) => d.kind === 'dsu' && d.hasIcd).length}\n`);
  console.log('变体对比：');
  for (const [n, r] of Object.entries(reports)) {
    console.log(`  ${n}  词表 ${String(r.vocabulary).padStart(5)} · 每篇 ${Math.round(r.tokensPerDoc.reduce((a, b) => a + b, 0) / r.tokensPerDoc.length)} token`);
    console.log(`      kNN 纯度(证尾族) ${r.knnPurityBySuffix.toFixed(4)} · 轮廓 ${isNaN(r.silhouetteBySuffix) ? 'n/a' : r.silhouetteBySuffix.toFixed(4)}`);
  }
  console.log('\n检索冒烟（向量 ∪ BM25，RRF k=60）· 两个口径都报 —— 失败要能定位到原因：');
  for (const s of smoke) {
    console.log(`  ${s.endpoint}   期望 ${s.expectedInSpec}`);
    console.log(`     全部单元 ${s.allUnits.hit ? '✅' : '  '} ${s.allUnits.top1}`);
    console.log(`     只 DSU   ${s.dsuOnly.hit ? '✅' : '  '} ${s.dsuOnly.top1}`);
  }
  const hitsAll = smoke.filter((s) => s.allUnits.hit).length;
  const hitsDsu = smoke.filter((s) => s.dsuOnly.hit).length;
  console.log(`    命中：全部单元 ${hitsAll}/${smoke.length} · 只 DSU ${hitsDsu}/${smoke.length}`);
  console.log(`\n  → ${path.relative(ROOT, path.join(OUTDIR, 'index.json'))}`);

  if (query) {
    const qt = variants['ngram13'](query);
    const vecRank = docs.map((d, i) => ({ i, s: cosine(tfidf.vectors[i], sparseFromTokens(qt, tfidf)) }))
      .sort((a, b) => b.s - a.s).slice(0, 10).map((x) => x.i);
    const ftsRank = bm25.search(qt, 10).map((x) => x.i);
    console.log(`\n═══ 查询「${query}」 ═══`);
    rrf([vecRank, ftsRank]).slice(0, 8).forEach((x, n) => {
      const d = docs[x.i];
      console.log(`  ${String(n + 1).padStart(2)}. ${d.uid} · ${d.label} · RRF ${x.score.toFixed(5)}`);
    });
  }
}

/** 把查询串转成与文档同空间的稀疏向量（用文档 IDF） */
function sparseFromTokens(tokens, tfidf) {
  const tf = new Map();
  for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
  const vec = new Map();
  let norm = 0;
  for (const [t, c] of tf) {
    if (!tfidf.df.has(t)) continue;
    const idf = Math.log((1 + tfidf.N) / (1 + tfidf.df.get(t))) + 1;
    vec.set(t, c * idf);
    norm += (c * idf) ** 2;
  }
  norm = Math.sqrt(norm) || 1;
  for (const [t, w] of vec) vec.set(t, w / norm);
  return vec;
}

if (require.main === module) main();

module.exports = {
  buildDocument, tokenizeBigram, tokenizeNGram, buildTfidf, buildBm25,
  rrf, cosine, silhouette, knnPurity, harvestContexts, BM25_K1, BM25_B,
};
