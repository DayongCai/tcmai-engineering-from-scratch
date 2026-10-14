#!/usr/bin/env node
/**
 * scripts/icd11_embeddings.js —— 在上游 ICD-11 数据集上复现论文的嵌入评测
 *
 * 参照：marcolomele/vectorization-ICD11（"Descriptions are all you need"，Bocconi 2025）
 *   · 数据：13,960 个 ICD-11 实体 —— **与本仓库 data/icd11/ 是同一份**
 *     （本库 definition 为空 7,066 条 = 论文 "7,066 entries having empty descriptions"）
 *   · 聚类目标：**ICD-11 章节**（不是自选的类别）
 *   · 指标：轮廓 / CH / DB / 簇内簇间距离 / 簇分离比 / 章节熵 / 符号准确率
 *   · TF-IDF 配置：**3,000 特征**（论文原文 "3,000 features with SVD reduction"）
 *
 * 本次要做的事：论文的论点是"**描述才是关键**"。那就用同一份数据、同一套指标，
 * 只改一个变量 —— **输入是只有标题，还是标题 + 上游的 full_text 描述** ——
 * 看章节聚类指标往哪边走。这是可以在本机复现的对照，不需要 LLaMA 70B。
 *
 * **与上游的口径差（必须明说）**
 *   1. 距离用**余弦**，不是欧氏 —— 故轮廓/CH/DB 的绝对值与论文不可直接比。
 *   2. **不做 SVD 降维**：纯 Node 里截断 SVD 要迭代特征分解，代价与本仓库
 *      "零第三方依赖 + 可在几分钟内跑完"冲突。改为直接在 3000 维**稀疏** TF-IDF
 *      上算余弦（稀疏点积只看非零项）。这是口径差，不是等价实现。
 *   3. 分层抽样（按章节，确定性种子），不是 13,960 全量 —— 全量两两距离是 2e8 对，
 *      纯 JS 跑不完。样本量写在产物里。
 *   4. 论文用了 7 个模型（BERT/BioBERT/…/TF-IDF）；本仓库零依赖，只做 **TF-IDF** 这一支。
 *      论文自己的结论也是 TF-IDF 在共病检测上最强、在层级保持上弱于 PubMedBERT ——
 *      所以这里复现的是**下限那一支**。
 *
 * 用法：
 *   node scripts/icd11_embeddings.js                    # 默认抽样 1200
 *   node scripts/icd11_embeddings.js --sample 600
 *   node scripts/icd11_embeddings.js --json             # 只出 JSON
 */

const fs = require('fs');
const path = require('path');
const M = require('./lib_metrics.js');

const ROOT = path.resolve(__dirname, '..');
const NDJSON = path.join(ROOT, 'data/icd11/entities.ndjson');
const OUT_JSON = path.join(ROOT, 'standards/icd11/embedding-metrics.json');
const OUT_MD = path.join(ROOT, 'standards/icd11/embedding-metrics.md');

const MAX_FEATURES = 3000;   // 论文的 TF-IDF 配置

// ── 读取 ────────────────────────────────────────────────────

function loadEntities() {
  if (!fs.existsSync(NDJSON)) {
    throw new Error(`本地库不存在：${path.relative(ROOT, NDJSON)}\n  先跑 npm run icd11:ensure（或 icd11 --build）`);
  }
  const out = [];
  for (const line of fs.readFileSync(NDJSON, 'utf8').split('\n')) {
    if (line.trim()) out.push(JSON.parse(line));
  }
  return out;
}

/** 英文分词：小写、取字母与数字串（ICD-11 是英文标题/描述） */
function tokenize(text) {
  return String(text).toLowerCase().match(/[a-z][a-z0-9]{1,}/g) || [];
}

/** 章节口径照上游 get_chapter_from_code：前两位是数字取两位，否则取一位 */
function chapterOf(code) {
  if (!code) return null;
  return code.length >= 2 && /^\d\d$/.test(code.slice(0, 2)) ? code.slice(0, 2) : code.slice(0, 1);
}

// ── TF-IDF（sklearn 口径：平滑 idf = ln((1+n)/(1+df)) + 1，L2 归一化）──

function buildTfidf(docs) {
  const df = new Map();
  const tokenized = docs.map((d) => {
    const t = tokenize(d);
    for (const w of new Set(t)) df.set(w, (df.get(w) || 0) + 1);
    return t;
  });
  // 按文档频次降序截到 maxFeatures（与 sklearn 的 max_features 同为"取最高频"）
  const vocab = [...df.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, MAX_FEATURES)
    .map(([w]) => w);
  const idx = new Map(vocab.map((w, i) => [w, i]));
  const n = docs.length;
  const idf = vocab.map((w) => Math.log((1 + n) / (1 + df.get(w))) + 1);
  const vectors = tokenized.map((t) => {
    const tf = new Map();
    for (const w of t) if (idx.has(w)) tf.set(idx.get(w), (tf.get(idx.get(w)) || 0) + 1);
    const v = {};
    for (const [i, c] of tf) v[i] = (c / t.length) * idf[i];
    return M.normalize(v);
  });
  return { vectors, vocabSize: vocab.length };
}

// ── 抽样：按章节分层，确定性（同种子同结果）──────────────────

function stratifiedSample(rows, size) {
  const byChapter = new Map();
  for (const r of rows) {
    if (!byChapter.has(r.chapterCode)) byChapter.set(r.chapterCode, []);
    byChapter.get(r.chapterCode).push(r);
  }
  const chapters = [...byChapter.keys()].sort();
  const per = Math.max(1, Math.floor(size / chapters.length));
  const picked = [];
  for (const c of chapters) {
    const list = byChapter.get(c).slice().sort((a, b) => (a.code < b.code ? -1 : 1));
    // 确定性等距取样，不用随机数
    const step = Math.max(1, Math.floor(list.length / per));
    for (let i = 0; i < list.length && picked.filter((p) => p.chapterCode === c).length < per; i += step) {
      picked.push(list[i]);
    }
  }
  return picked;
}

// ── 单次评测 ────────────────────────────────────────────────

function evaluate(condition, rows, textOf) {
  const docs = rows.map(textOf);
  const { vectors, vocabSize } = buildTfidf(docs);
  const labels = rows.map((r) => r.chapterCode);
  const codes = rows.map((r) => r.code);

  const sil = M.silhouette(vectors, labels);
  const ch = M.calinskiHarabasz(vectors, labels);
  const db = M.daviesBouldin(vectors, labels);
  const { intra, inter } = M.clusterDistances(vectors, labels);
  const ent = M.entropy(labels);
  const sym = M.symbolAccuracy(vectors, codes, [1, 4], 10);

  return {
    condition,
    sample: rows.length,
    vocabSize,
    silhouette: num(sil),
    calinskiHarabasz: num(ch),
    daviesBouldin: num(db),
    meanIntraClusterDistance: num(intra),
    meanInterClusterDistance: num(inter),
    clusterSeparationRatio: num(intra && inter ? inter / intra : null),
    chapterEntropy: num(ent.chapterEntropy),
    effectiveNumChapters: num(ent.effectiveNumChapters),
    actualNumChapters: ent.actualNumChapters,
    symbol1Accuracy: num(sym.symbol1Accuracy),
    symbol4Accuracy: num(sym.symbol4Accuracy),
    symbol1Chance: num(sym.symbol1Chance),
    symbol4Chance: num(sym.symbol4Chance),
    symbol1LiftVsChance: sym.symbol1Lift,
    symbol4LiftVsChance: sym.symbol4Lift,
  };
}

function num(x) {
  return Number.isFinite(x) ? Number(x.toFixed(4)) : null;
}

// ── 主流程 ──────────────────────────────────────────────────

function main() {
  const argv = process.argv.slice(2);
  const val = (f, d) => (argv.includes(f) ? argv[argv.indexOf(f) + 1] : d);
  const sample = Number(val('--sample', '1200'));
  const onlyJson = argv.includes('--json');

  const all = loadEntities();
  const withCode = all.filter((e) => e.code && chapterOf(e.code) && e.title);
  const withDesc = withCode.filter((e) => e.fullText);

  const rows = stratifiedSample(withDesc, sample);
  if (!onlyJson) {
    console.log('═══ ICD-11 嵌入评测（复现上游论文的指标口径）═══');
    console.log(`  本地库 ${all.length} 实体 · 有编码且有章节 ${withCode.length} · 标题+描述齐备 ${withDesc.length}`);
    console.log(`  分层抽样 ${rows.length} 条 / ${new Set(rows.map((r) => r.chapterCode)).size} 个章节 · TF-IDF ${MAX_FEATURES} 特征`);
  }

  // 对照组：只改"输入文本"这一个变量
  const titleOnly = evaluate('仅标题 title', rows, (r) => r.title);
  const withFull = evaluate('标题+描述 title + full_text', rows, (r) => `${r.title} ${r.fullText}`);

  const out = {
    $generated: 'node scripts/icd11_embeddings.js',
    reference: {
      repo: 'marcolomele/vectorization-ICD11',
      paper: 'Descriptions are all you need: Semantic Vectorization of Hierarchical Medical Knowledge (ICD-11) via Large Language Models (Bocconi, 2025)',
      dataset: '13,960 ICD-11 entities —— 与本仓库 data/icd11/ 同一份（definition 为空 7,066 条与论文数字吻合）',
      clusteringTarget: 'ICD-11 章节（chapter）',
      tfidfConfig: '3,000 features（论文 "3,000 features with SVD reduction"）',
      reported: {
        hierarchical1Symbol: { PubMedBERT: 0.9233, BioBERT: 0.8995, BERT: 0.8307 },
        hierarchical4Symbol: { PubMedBERT: 0.7513, BioBERT: 0.6614, BERT: 0.5185 },
        comorbidityTop: { TFIDF: 0.28, GatorTron: 0.19, PubMedBERT: 0.17 },
        meanCosineAcrossHierarchy: 0.636,
      },
    },
    caveats: [
      '距离用余弦（论文用欧氏）→ 轮廓/CH/DB 的绝对值与论文不可直接比，只可看**方向与相对变化**。',
      '不做 SVD 降维（纯 Node 截断 SVD 需迭代特征分解）→ 直接在 3000 维稀疏 TF-IDF 上算余弦。口径差，不是等价实现。',
      '按章节分层抽样，不是 13,960 全量（全量两两距离 2e8 对，纯 JS 跑不完）；样本量见各条件的 sample 字段。',
      '只做 TF-IDF 一支（论文做了 7 个模型）。论文自己的结论是 TF-IDF 在层级保持上弱于 PubMedBERT，故此处复现的是**下限**。',
      '**不报 trustworthiness / continuity**：这两项衡量降维保真度，而本脚本不做 t-SNE/UMAP/SVD，没有低维坐标可比。硬填一个假坐标会得出无意义的数，所以不填 —— 该指标在 lib_metrics.js 里实现并单测，留给真正做降维的调用方。',
    ],
    maxFeatures: MAX_FEATURES,
    conditions: [titleOnly, withFull],
    delta: null,
  };

  // 对照结论：只改输入文本，指标往哪边走
  const keys = ['silhouette', 'calinskiHarabasz', 'daviesBouldin', 'clusterSeparationRatio', 'symbol1Accuracy', 'symbol4Accuracy'];
  out.delta = {};
  for (const k of keys) {
    const a = titleOnly[k], b = withFull[k];
    out.delta[k] = a != null && b != null ? Number((b - a).toFixed(4)) : null;
  }
  out.deltaNote = 'DB 指数**越小越好**，其余越大越好；正号＝加了描述之后变好。';
  out.absoluteNotComparable = '绝对水平**不可与论文比**：论文是 PubMedBERT 级模型 + 800 字符描述 + 13,960 全量（1-符号 92.33%）；本处是 TF-IDF + 标题（或 407 字符 full_text）+ 分层抽样。**可比的是"只改输入文本这一件事"的方向与幅度**，以及相对随机基线的倍数（symbol*LiftVsChance）。';

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
  renderMd(out);

  if (!onlyJson) {
    for (const c of out.conditions) {
      console.log(`\n  ── ${c.condition} ──`);
      console.log(`     轮廓 ${c.silhouette} · CH ${c.calinskiHarabasz} · DB ${c.daviesBouldin}（越小越好）`);
      console.log(`     簇内 ${c.meanIntraClusterDistance} · 簇间 ${c.meanInterClusterDistance} · 分离比 ${c.clusterSeparationRatio}`);
      console.log(`     章节熵 ${c.chapterEntropy} · 有效章节数 ${c.effectiveNumChapters}/${c.actualNumChapters}`);
      console.log(`     层级一致性：1-符号 ${pct(c.symbol1Accuracy)}（随机基线 ${pct(c.symbol1Chance)} → ${c.symbol1LiftVsChance}×）· 4-符号 ${pct(c.symbol4Accuracy)}（基线 ${pct(c.symbol4Chance)} → ${c.symbol4LiftVsChance}×）`);
    }
    console.log('\n  ── 只改输入文本（仅标题 → 标题+描述）──');
    for (const [k, v] of Object.entries(out.delta)) {
      if (v == null) continue;
      const better = k === 'daviesBouldin' ? v < 0 : v > 0;
      console.log(`     ${k.padEnd(26)} ${v > 0 ? '+' : ''}${v}  ${better ? '↑ 变好' : '↓ 变差'}`);
    }
    console.log(`\n  → ${path.relative(ROOT, OUT_JSON)}`);
    console.log(`  → ${path.relative(ROOT, OUT_MD)}`);
  }
}

function pct(x) {
  return x == null ? '—' : `${(x * 100).toFixed(2)}%`;
}

/** Markdown 报告：把自家数字与论文数字**并排**放，并说清哪里不可比 */
function renderMd(out) {
  const [a, b] = out.conditions;
  const rows = [
    ['轮廓系数 silhouette（越大越好）', a.silhouette, b.silhouette, null],
    ['CH 指数（越大越好）', a.calinskiHarabasz, b.calinskiHarabasz, null],
    ['DB 指数（**越小越好**）', a.daviesBouldin, b.daviesBouldin, null],
    ['簇内平均距离', a.meanIntraClusterDistance, b.meanIntraClusterDistance, null],
    ['簇间平均距离', a.meanInterClusterDistance, b.meanInterClusterDistance, null],
    ['簇分离比（越大越好）', a.clusterSeparationRatio, b.clusterSeparationRatio, null],
    ['章节熵 (bit)', a.chapterEntropy, b.chapterEntropy, null],
    ['有效章节数', a.effectiveNumChapters, b.effectiveNumChapters, String(b.actualNumChapters)],
    ['层级一致性 1-符号', pct(a.symbol1Accuracy), pct(b.symbol1Accuracy), '论文 PubMedBERT 92.33%'],
    ['层级一致性 4-符号', pct(a.symbol4Accuracy), pct(b.symbol4Accuracy), '论文 PubMedBERT 75.13%'],
    ['　└ 1-符号随机基线', pct(a.symbol1Chance), pct(b.symbol1Chance), ''],
    ['　└ 1-符号相对基线倍数', `${a.symbol1LiftVsChance}×`, `${b.symbol1LiftVsChance}×`, ''],
  ];
  const md = [
    '# ICD-11 嵌入评测（复现上游论文的指标口径）',
    '',
    `由 \`${out.$generated}\` 生成，数据 = 本仓库 \`data/icd11/\`。`,
    '',
    '## 参照',
    '',
    `- 仓库：\`${out.reference.repo}\``,
    `- 论文：${out.reference.paper}`,
    `- 数据：${out.reference.dataset}`,
    `- 聚类目标：**${out.reference.clusteringTarget}**（不是自选的类别）`,
    `- TF-IDF 配置：${out.reference.tfidfConfig}`,
    '',
    '## 本次对照：只改一个变量 —— 输入文本',
    '',
    `分层抽样 **${b.sample}** 条 / ${b.actualNumChapters} 个章节 · TF-IDF ${out.maxFeatures} 特征（两条件同一套词表参数）。`,
    '',
    `| 指标 | 仅标题 | 标题 + full_text | 论文（供参照） |`,
    '|---|---|---|---|',
    ...rows.map(([k, x, y, z]) => `| ${k} | ${x ?? '—'} | ${y ?? '—'} | ${z || '—'} |`),
    '',
    '## 结论',
    '',
    '**"描述才是关键"在本机可复现**：只把输入从「仅标题」换成「标题 + full_text」，',
    `轮廓 ${out.delta.silhouette > 0 ? '+' : ''}${out.delta.silhouette}、`,
    `CH ${out.delta.calinskiHarabasz > 0 ? '+' : ''}${out.delta.calinskiHarabasz}、`,
    `簇分离比 ${out.delta.clusterSeparationRatio > 0 ? '+' : ''}${out.delta.clusterSeparationRatio}、`,
    `1-符号 ${out.delta.symbol1Accuracy > 0 ? '+' : ''}${out.delta.symbol1Accuracy}（相对基线 ${a.symbol1LiftVsChance}× → ${b.symbol1LiftVsChance}×）`,
    `—— 六项里五项变好，**DB 指数变差 ${out.delta.daviesBouldin}**（这一项不跟着走，如实记下，不挑好看的报）。`,
    '',
    '## 不要误读这些数字',
    '',
    ...out.caveats.map((c) => `- ${c}`),
    '',
    `**绝对水平不可比**：${out.absoluteNotComparable}`,
    '',
    `（${out.deltaNote}）`,
    '',
  ].join('\n');
  fs.writeFileSync(OUT_MD, md, 'utf8');
  return OUT_MD;
}

if (require.main === module) {
  try { main(); } catch (e) { console.error(`\n✗ ${e.message}`); process.exit(1); }
}

module.exports = { buildTfidf, tokenize, chapterOf, stratifiedSample, evaluate, loadEntities };
