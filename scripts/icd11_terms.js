#!/usr/bin/env node
/**
 * scripts/icd11_terms.js —— ICD-11 **术语嵌入层**（把「术语」变成可编程的检索单元）
 *
 * ── 这一层解决什么 ────────────────────────────────────────────
 * 原来 `data/icd11/` 只是一份**实体表**：13,960 行，查询靠 `code`/`title` 精确匹配，
 * 或 `icd11_embeddings.js` 做**评测**用的抽样向量（那条线只出指标，不建可查的库）。
 * 于是「口苦咽干 → 哪个 ICD-11 编码」这件事在本仓库是**做不到**的。
 *
 * 本文件按 Cremaschi et al. (2025, *Decoding the mind*, ESWA 279:127191) §3.1–§4 的
 * 数据组织方式，把 ICD-11 拆成**两类可嵌入单元**：
 *
 *   ① entity 单元 —— 一个疾病/类目一条，文本按论文 Listing 2 的字段顺序拼：
 *        Disorder Name / Disorder Code / Disorder symptoms（definition）
 *        / Chapter / Inclusions / Index terms
 *      论文的「For this disorder the diagnostical requirements are:」来自 ICD-11-CDDR
 *      （那本书本仓库没有）。**不用别的文字冒充它** —— 那一段换成 Chapter 与
 *      Inclusions 两个真实字段，并且这一段缺什么写在 meta.substitutions 里。
 *
 *   ② term 单元 —— **索引词自己成为一条向量**（10,855 个实体带 indexTerms，
 *      去重后 6 万余条）。这是「术语嵌入性编程」的关键：
 *        Term: {term}  →  Maps to disorder: {title} ({code})
 *      检索时先命中术语、再由术语**带着编码**回来，而不是全靠整段定义去撞。
 *      论文 §4.1 说「每个疾病是向量库里的一条 chunk，可增删而不动模型权重」——
 *      术语单元就是让这句话在术语粒度上成立。
 *
 * ── 与论文的口径差（明写，不藏）────────────────────────────────
 *   · 论文用 LangChain + ChromaDB + 真实 embedding 模型；本仓库零第三方依赖，
 *     用与 `embedding-code` 规格 ③ 同口径的 **TF-IDF（字符 n-gram + 词）**，
 *     余弦相似度。**语义泛化能力弱于稠密向量**，这是已知代价，不是等价实现。
 *   · 论文 top-k = 4（经验值）。本层可配，默认 4，与论文一致。
 *   · 论文的 719 条是**第 6 章（精神行为）**子集；本快照是全 26 章 13,960 条。
 *     章节口径不同，故**不宣称复现论文的 76.1% 准确率**。
 *
 * ── 产物（都在 data/icd11/term-index/，随 data/icd11/ 一起不入版本库）──
 *   units.ndjson     每条单元：id / kind / code / title / term / text / body
 *   vocab.json       { tokens: [...], idf: [...] }（词表按文档频次截断到 maxFeatures）
 *   csr.bin          稀疏向量的三段连续内存：int32 idx / float32 val / int32 offsets
 *   terms.fts5.db    FTS5 索引（docs_terms 词袋 + docs_substr 子串）
 *   meta.json        口径、计数、sha256、不足处
 *
 * 用法：
 *   node scripts/icd11_terms.js                     # 建库（全量）
 *   node scripts/icd11_terms.js --limit 2000        # 只取前 2000 实体（试跑）
 *   node scripts/icd11_terms.js --query "口苦 咽干" --k 4
 *   node scripts/icd11_terms.js --stats             # 只读已有产物，报计数
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { Fts5Index, segment, loadSqlite } = require('./lib_fts5.js');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'data/icd11/entities.ndjson');
const OUTDIR = path.join(ROOT, 'data/icd11/term-index');
// ICD-11 官方中文名（WHO Simple Tabulation 2025-01 中译本，第 26 章 472 条 TM1 全译）。
// 快照里第 26 章只有英文题名、没有定义、没有索引词 —— 中文面全靠这份表。
// 注意：TM2（Module II · 阿育吠陀/悉达）在 WHO 中译本里**整章没有中文题名**，源头缺，不是解析漏。
const ZH_NAMES = path.join(ROOT, 'standards/icd11/zh-names.json');
// 释义（定义段）：从 WHO 打印版 PDF 抽出（`scripts/build_icd11_definitions.py`）。
// 这是**免 API 凭据**的释义源；第 26 章在 WHO 源头就没有释义，故 TM1 只有名字级。
const DEFS = path.join(ROOT, 'standards/icd11/definitions-en.json');

const MAX_FEATURES = 20000;      // 词表截断（按文档频次取最高）；论文是 3000，语料量差 19 倍
const MAX_TERM_LEN = 120;        // 过长的索引词是整句，当术语嵌入没有意义
const RRF_K = 60;                // 与规格 ⑤ 同一个 k

/**
 * 第 26 章的**两个模块必须分开**：
 *   TM1（SA–SH，346 条）中国/日本/韩国传统医学——脏腑、六经、卫气营血等**中医证候**在这里；
 *   TM2（SK–ST，588 条）Module II，阿育吠陀/悉达等体系（"Vata predominant"、"Varmam and Marmam"）。
 * 混在一张索引里，中文证候查询会被 TM2 的近邻词抢位；所以单元带 module，检索可只回 TM1。
 */
function moduleOf(e) {
  const t = String(e.title || '');
  if (/\(TM1\)/.test(t)) return 'TM1';
  if (/\(TM2\)/.test(t)) return 'TM2';
  return null;
}

function loadDefinitions() {
  if (!fs.existsSync(DEFS)) return { map: new Map(), meta: null };
  const d = JSON.parse(fs.readFileSync(DEFS, 'utf8'));
  const m = new Map();
  for (const [code, v] of Object.entries(d.entries || {})) m.set(code, v);
  return { map: m, meta: d.meta || null };
}

function loadZhNames() {
  if (!fs.existsSync(ZH_NAMES)) return { map: new Map(), meta: null };
  let d;
  try {
    d = JSON.parse(fs.readFileSync(ZH_NAMES, 'utf8'));
  } catch (e) {
    throw new Error(`中文名表解析失败：${path.relative(ROOT, ZH_NAMES)} —— ${e.message}`);
  }
  const map = new Map();
  for (const n of d.names || []) if (n.code) map.set(n.code, n);
  return { map, meta: d.meta || null };
}


// ── 读取 ────────────────────────────────────────────────────

function readEntities(limit = 0) {
  if (!fs.existsSync(SRC)) {
    throw new Error(
      `本地 ICD-11 库不存在：${path.relative(ROOT, SRC)}\n`
      + '  先跑 npm run icd11:ensure（需要能访问 raw.githubusercontent.com 或走代理）',
    );
  }
  const out = [];
  for (const line of fs.readFileSync(SRC, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    out.push(JSON.parse(line));
    if (limit && out.length >= limit) break;
  }
  // 快照（第三方整理，2025-01）在第 26 章只覆盖 876/1120 个码。WHO 官方发布文件里有全部 1120 个，
  // 且其中 126 个 TM1 码**带官方中文名** —— 不索引它们，等于把这 126 个证候从术语层里删掉。
  // 所以这里用 zh-names.json（WHO 原件，见 standards/icd11/tm1/README.md）补齐缺口，
  // 每条标 `synthetic:true` 与 `source`，与快照来的实体**不混称**。
  const have = new Set(out.map((e) => e.code));
  const zh = loadZhNames();
  let supplement = 0;
  for (const [code, n] of zh.map) {
    if (have.has(code) || !n.en) continue;
    out.push({
      id: `W:${code}`,
      code,
      title: n.en,
      kind: 'category',
      parent: null,
      fullText: n.en,
      indexTerms: n.en,
      hasDefinition: false,
      chapterId: null,
      chapterCode: n.chapter || null,
      chapterTitle: n.chapter === '26' ? 'Supplementary Chapter Traditional Medicine Conditions' : null,
      synthetic: true,
      source: `who-tabulation ${(zh.meta && zh.meta.source && zh.meta.source.url) || ''}`.trim(),
    });
    supplement += 1;
    if (limit && out.length >= limit) break;
  }
  // 释义回填：快照的 `hasDefinition` 基本是 false（第三方整理没带正文），
  // 而打印版 PDF 里逐条写着定义段。按 code 挂上去，并如实改写 hasDefinition —— 
  // 没挂上的保持 false，不拿空串冒充。
  const defs = loadDefinitions();
  let withDef = 0;
  for (const e of out) {
    // 快照自带的 hasDefinition 与实际正文并不一致（标了 true 但只有题名重复的有一批）。
    // 所以先按「有没有 ≥40 字的正文」重算一遍，再让打印版补缺 —— 这个标记下游要用来判证据级，
    // 不能靠上游的一句话。
    e.hasDefinition = !!(e.definition && String(e.definition).trim().length > 40);
    const d = e.code && defs.map.get(e.code);
    if (!d) continue;
    const hadText = e.hasDefinition;
    e.definition = d.definition;
    if (!e.inclusions && d.inclusions && d.inclusions.length) e.inclusions = d.inclusions.join('; ');
    if (!e.exclusions && d.exclusions && d.exclusions.length) e.exclusions = d.exclusions.join('; ');
    e.hasDefinition = true;
    e.definitionSource = hadText ? 'snapshot+print' : 'who-print-edition';
    if (!hadText) withDef += 1;   // 只数「打印版补上的」
  }
  // 确定性：按 code 再按 id 排序（源文件顺序是抓取顺序，不能当契约）
  out.sort((a, b) => (String(a.code || '') < String(b.code || '') ? -1
    : String(a.code || '') > String(b.code || '') ? 1
      : String(a.id) < String(b.id) ? -1 : 1));
  out.supplement = supplement;
  // 两个数分开记，别混：
  //   withDefinition      —— 单元里 hasDefinition=true 的实体（快照自带标记 + 本次回填）
  //   definitionFromPrint —— 本次从打印版 PDF 真正补上定义段的实体
  out.withDefinition = out.filter((e) => e.code && e.hasDefinition).length;
  out.definitionFromPrint = withDef;
  out.definitionsMeta = defs.meta;
  return out;
}

/** indexTerms 是分号分隔的短语表（实测 10,855 个实体带它，最多 500 条） */
function splitTerms(raw) {
  return String(raw || '')
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s && s.length <= MAX_TERM_LEN);
}

// ── ① 单元构造（论文 Listing 2 的字段顺序）──────────────────────

function entityUnit(e, zh) {
  const lines = [
    `Disorder Name: ${e.title}`,
    `Disorder Code: ${e.code}`,
  ];
  // 官方中文名放在题名之后、症状之前：它和题名是同一个实体的两种语言形式（不是索引词，
  // 不是等价类成员），放在这里让中文查询能整串命中，也让人一眼看出这条有没有中文面。
  if (zh && zh.zh) lines.push(`Disorder Name (zh-Hans): ${zh.zh}`);
  lines.push('Disorder symptoms:');
  lines.push(String(e.definition || e.fullText || '').trim() || `(no definition) ${e.title}`);
  if (e.chapterCode || e.chapterTitle) lines.push(`Chapter: ${e.chapterCode || ''} ${e.chapterTitle || ''}`.trim());
  if (e.inclusions && e.inclusions.trim()) lines.push(`Inclusions: ${e.inclusions.trim()}`);
  if (e.indexTerms && e.indexTerms.trim()) lines.push(`Index terms: ${e.indexTerms.trim()}`);
  return lines.join('\n');
}

function termUnit(term, e, lang) {
  const l = lang === 'zh-Hans' ? ' (zh-Hans)' : lang === 'zh-Hant' ? ' (zh-Hant)' : '';
  return `Term: ${term}${l}\nMaps to disorder: ${e.title} (${e.code})`;
}

/**
 * 生成单元流（不一次性驻留内存 —— 6 万条 term 单元 + 1.4 万条 entity 单元）。
 * @param {(u: object) => void} emit
 * @param {Map<string,object>} [zhNames] code → {zh, zhS}（第 26 章官方中文名）
 */
function forEachUnit(entities, emit, zhNames = new Map()) {
  const seenTerm = new Set();
  let termDup = 0, zhTerms = 0, zhCovered = 0;
  for (const e of entities) {
    if (!e.code || !e.title) continue;   // 无编码的实体（chapter/window 等）当术语锚点没意义
    const zh = zhNames.get(e.code) || null;
    const module = moduleOf(e);
    if (zh && zh.zh) zhCovered += 1;   // 只数真有中文名的（TM2 在 WHO 中译本里没有）
    emit({
      id: `E:${e.code}`,
      kind: 'entity',
      code: e.code,
      title: e.title,
      term: null,
      module,
      // 释义有无必须写进单元：加载时只看 units.ndjson，不回读实体文件
      hasDefinition: !!e.hasDefinition,
      text: entityUnit(e, zh),
      body: `${e.title} | ${e.code} | ${zh && zh.zh ? `${zh.zh} | ` : ''}${e.indexTerms || ''}`.slice(0, 4000),
    });
    for (const t of splitTerms(e.indexTerms)) {
      const key = t.toLowerCase();
      if (seenTerm.has(key)) { termDup += 1; continue; }
      seenTerm.add(key);
      emit({
        id: `T:${e.code}:${key}`,
        kind: 'term',
        code: e.code,
        title: e.title,
        term: t,
        module,
        lang: 'en',
        text: termUnit(t, e),
        body: `${t} | ${e.title} | ${e.code}`,
      });
    }
    // 中文别名各自成一条 term 单元：中文查询走字面通道时不必先翻译，
    // 也就不会把「翻译错了」和「检索错了」混成一个问题。
    // 官方中译本只给简体（`zh`）；若将来拿到繁體，用 `zhHant` 字段加一条即可。
    for (const lang of ['zh-Hans', 'zh-Hant']) {
      const z = zh && (lang === 'zh-Hans' ? zh.zh : zh.zhHant);
      if (!z) continue;
      const key = `${lang}:${z}`;
      if (seenTerm.has(key)) continue;
      seenTerm.add(key);
      zhTerms += 1;
      emit({
        id: `T:${e.code}:${key}`,
        kind: 'term',
        code: e.code,
        title: e.title,
        term: z,
        module,
        lang,
        text: termUnit(z, e, lang),
        body: `${z} | ${e.title} | ${e.code}`,
      });
    }
  }
  return { uniqueTerms: seenTerm.size, termDup, zhTerms, zhCovered };
}


// ── ② TF-IDF（与规格 ③ 同口径：smooth_idf + L2 归一化）──────────

function dfPass(unitsPath) {
  const df = new Map();
  let n = 0;
  for (const line of fs.readFileSync(unitsPath, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const u = JSON.parse(line);
    n += 1;
    for (const t of new Set(segment(u.text))) df.set(t, (df.get(t) || 0) + 1);
  }
  return { df, n };
}

function buildVocab(df, n) {
  const tokens = [...df.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, MAX_FEATURES)
    .map(([t]) => t);
  const idf = tokens.map((t) => Math.log((1 + n) / (1 + df.get(t))) + 1);
  return { tokens, idf, index: new Map(tokens.map((t, i) => [t, i])) };
}

/** 把一段文本变成 (idx, w) 稀疏向量（用已定的词表与 idf），L2 归一化 */
function vectorize(text, vocab) {
  const tf = new Map();
  for (const t of segment(text)) {
    const i = vocab.index.get(t);
    if (i === undefined) continue;
    tf.set(i, (tf.get(i) || 0) + 1);
  }
  if (!tf.size) return { idx: [], val: [] };
  const idx = [...tf.keys()].sort((a, b) => a - b);
  const val = idx.map((i) => tf.get(i) * vocab.idf[i]);
  const norm = Math.sqrt(val.reduce((s, w) => s + w * w, 0)) || 1;
  return { idx, val: val.map((w) => w / norm) };
}

// ── ③ 建库 ──────────────────────────────────────────────────

function build(opts = {}) {
  const t0 = Date.now();
  const limit = Number(opts.limit) || 0;
  const outDir = opts.outDir || OUTDIR;   // 测试用临时目录，不覆盖正式库
  const entities = readEntities(limit);
  fs.mkdirSync(outDir, { recursive: true });
  const zh = loadZhNames();

  const unitsPath = path.join(outDir, 'units.ndjson');
  const ftsPath = path.join(outDir, 'terms.fts5.db');
  const fts = new Fts5Index(ftsPath);

  // pass A：写单元 + 建 FTS5
  let nEntity = 0, nTerm = 0;
  let termStats = null, ftsStats = null;
  {
    const fd = fs.openSync(unitsPath, 'w');
    termStats = forEachUnit(entities, (u) => {
      fs.writeSync(fd, `${JSON.stringify(u)}\n`);
      if (u.kind === 'entity') nEntity += 1; else nTerm += 1;
      fts.add({ id: u.id, text: u.text, body: u.body });
    }, zh.map);
    fs.closeSync(fd);
    fts.finish();

    // 必须关掉：Windows 上打开的 db 文件锁着，测试里删临时目录会 EBUSY，
    // 正式库里也会留着没人关的句柄。stats 在关闭前取。
    ftsStats = fts.stats();
    fts.close();
  }

  // pass B/C：词表 + CSR
  const { df, n } = dfPass(unitsPath);
  const vocab = buildVocab(df, n);
  const idxChunks = [], valChunks = [], offsets = [0];
  let pos = 0;
  for (const line of fs.readFileSync(unitsPath, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const u = JSON.parse(line);
    const v = vectorize(u.text, vocab);
    idxChunks.push(Int32Array.from(v.idx));
    valChunks.push(Float32Array.from(v.val));
    pos += v.idx.length;
    offsets.push(pos);
  }
  const idxBuf = Buffer.alloc(pos * 4);
  const valBuf = Buffer.alloc(pos * 4);
  let o = 0;
  for (let i = 0; i < idxChunks.length; i++) {
    Buffer.from(idxChunks[i].buffer, idxChunks[i].byteOffset, idxChunks[i].byteLength).copy(idxBuf, o);
    Buffer.from(valChunks[i].buffer, valChunks[i].byteOffset, valChunks[i].byteLength).copy(valBuf, o);
    o += idxChunks[i].byteLength;
  }
  const offBuf = Buffer.alloc(offsets.length * 4);
  for (let i = 0; i < offsets.length; i++) offBuf.writeInt32LE(offsets[i], i * 4);

  fs.writeFileSync(path.join(outDir, 'csr_idx.bin'), idxBuf);
  fs.writeFileSync(path.join(outDir, 'csr_val.bin'), valBuf);
  fs.writeFileSync(path.join(outDir, 'csr_offset.bin'), offBuf);
  fs.writeFileSync(
    path.join(outDir, 'vocab.json'),
    `${JSON.stringify({ tokens: vocab.tokens, idf: vocab.idf.map((x) => Number(x.toFixed(6))) })}\n`,
    'utf8',
  );

  const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
  const meta = {
    $generated: 'node scripts/icd11_terms.js',
    reference: {
      paper: 'Cremaschi, Ditolve, Curcio, Panzeri, Spoto, Maurino. Decoding the mind: A RAG-LLM on ICD-11 for decision support in psychology. Expert Systems With Applications 279 (2025) 127191',
      doi: '10.1016/j.eswa.2025.127191',
      whatWeTook: [
        '数据组织：code / title / definition / inclusions / index terms → 单条 prompt 单元（Listing 2 的字段顺序）',
        '一条疾病 = 向量库里的一条 chunk，可增删而不动模型权重（§4.1）',
        '检索相似度 = 余弦；top-k = 4（论文经验值）',
        '评测思路：主诊断单值判定 + 专家 0–1 分（本层不评 LLM，只建检索层）',
      ],
    },
    source: { file: path.relative(ROOT, SRC), sha256: sha(SRC), bytes: fs.statSync(SRC).size },
    docs: {
      entitiesRead: entities.length,
      supplementEntities: entities.supplement || 0,
      withDefinition: entities.withDefinition || 0,
      definitionFromPrint: entities.definitionFromPrint || 0,
      entitiesWithCode: nEntity,
      termUnits: nTerm,
      uniqueTerms: termStats.uniqueTerms,
      termDupCollapsed: termStats.termDup,
      zhTermUnits: termStats.zhTerms,
      zhNamedEntities: termStats.zhCovered,
      unitsTotal: nEntity + nTerm,
    },
    modules: (() => {
      // 第 26 章分账：TM1 = 中医/日韩传统医学（我们真正要对的），TM2 = 阿育吠陀/悉达等
      const m = {};
      for (const line of fs.readFileSync(unitsPath, 'utf8').split('\n')) {
        if (!line.trim()) continue;
        const u = JSON.parse(line);
        if (!u.module || u.kind !== 'entity') continue;
        m[u.module] = (m[u.module] || 0) + 1;
      }
      return m;
    })(),
    zhNames: zh.meta ? {
      source: zh.meta.source,
      counts: zh.meta.counts,
      reconcile: zh.meta.reconcile,
    } : { note: '未找到 standards/icd11/zh-names.json —— 中文面为空（先跑 npm run icd11:zh-names）' },

    vector: {
      analyzer: 'TF-IDF · 与 embedding-code 规格 ③ 同口径（CJK bigram + 拉丁词，smooth_idf，L2）',
      maxFeatures: MAX_FEATURES,
      vocabSize: vocab.tokens.length,
      nnz: pos,
      csrBytes: idxBuf.length + valBuf.length + offBuf.length,
      distance: 'cosine',
    },
    fts5: ftsStats,
    substitutions: [
      '论文的「For this disorder the diagnostical requirements are:」取自 ICD-11-CDDR（本仓库无此书）。本层改用 Chapter + Inclusions 两个真实字段，**不拿别的文字冒充 CDDR 正文**。',
      '论文用 LangChain + ChromaDB + 稠密 embedding 模型；本层是 TF-IDF 稀疏向量 + 余弦。语义泛化弱于稠密向量，**不是等价实现**。',
      '论文数据是第 6 章（精神行为）719 条；本快照是全 26 章 13,960 条。章节口径不同，**不宣称复现论文的 76.1%**。',
      '实体来源两条：data/icd11/entities.ndjson（第三方整理，2025-01）+ WHO 官方 Simple Tabulation 补齐的'
        + '「快照缺、WHO 有」的码（标 synthetic，只含 code/标题/章节，无定义、无父链）。两源不混称。',
    ],
    rrfK: RRF_K,
    elapsedMs: Date.now() - t0,
  };
  fs.writeFileSync(path.join(outDir, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
  return meta;
}

// ── ④ 加载与检索（供 build_embeddings.js 与 CLI 共用）───────────

function artifact(name, dir = OUTDIR) {
  const p = path.join(dir, name);
  if (!fs.existsSync(p)) {
    throw new Error(
      `术语嵌入层未构建：缺 ${path.relative(ROOT, p)}\n  先跑 node scripts/icd11_terms.js（或 npm run icd11:terms）`,
    );
  }
  return p;
}

let CACHE = null;

function load(opts = {}) {
  const dir = opts.dir || OUTDIR;
  if (CACHE && !opts.fresh && CACHE.dir === dir) return CACHE;
  const units = [];
  const byId = new Map();
  for (const line of fs.readFileSync(artifact('units.ndjson', dir), 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const u = JSON.parse(line);
    byId.set(u.id, { ...u, i: units.length });
    units.push(byId.get(u.id));
  }
  const v = JSON.parse(fs.readFileSync(artifact('vocab.json', dir), 'utf8'));
  const idxBuf = fs.readFileSync(artifact('csr_idx.bin', dir));
  const valBuf = fs.readFileSync(artifact('csr_val.bin', dir));
  const offBuf = fs.readFileSync(artifact('csr_offset.bin', dir));
  const idx = new Int32Array(idxBuf.buffer, idxBuf.byteOffset, idxBuf.byteLength / 4);
  const val = new Float32Array(valBuf.buffer, valBuf.byteOffset, valBuf.byteLength / 4);
  const offsets = new Int32Array(offBuf.buffer, offBuf.byteOffset, offBuf.byteLength / 4);
  const meta = JSON.parse(fs.readFileSync(artifact('meta.json', dir), 'utf8'));
  const vocab = { tokens: v.tokens, idf: v.idf, index: new Map(v.tokens.map((t, i) => [t, i])) };
  CACHE = { dir, units, byId, vocab, idx, val, offsets, meta, ftsPath: artifact('terms.fts5.db', dir) };
  return CACHE;
}

/** 查询向量（用建库时的词表与 idf —— 查询与文档必须同空间，论文 §4 第 2 步） */
function queryVector(text, vocab) {
  const tf = new Map();
  for (const t of segment(text)) {
    const i = vocab.index.get(t);
    if (i === undefined) continue;
    tf.set(i, (tf.get(i) || 0) + 1);
  }
  const idx = [...tf.keys()].sort((a, b) => a - b);
  const val = idx.map((i) => tf.get(i) * vocab.idf[i]);
  const norm = Math.sqrt(val.reduce((s, w) => s + w * w, 0)) || 1;
  return { idx, val: val.map((w) => w / norm) };
}

function cosineSparse(q, index, row) {
  let s = 0;
  for (let p = 0; p < q.idx.length; p++) {
    const target = q.idx[p];
    let lo = index.offsets[row], hi = index.offsets[row + 1] - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const at = index.idx[mid];
      if (at === target) { s += q.val[p] * index.val[mid]; break; }
      if (at < target) lo = mid + 1; else hi = mid - 1;
    }
  }
  return s;
}

function rrf(rankLists, k = RRF_K) {
  const score = new Map();
  for (const rl of rankLists) rl.forEach((id, i) => score.set(id, (score.get(id) || 0) + 1 / (k + i + 1)));
  return [...score.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
}

/**
 * 术语检索：字面通道 ∪ 等价通道，各通道内部再（向量 ∪ FTS5），两路 RRF 融合。
 *
 * **等价通道**是本轮新增的那一条：术语层是英文语料，中文查询在字面通道上命中率≈0；
 * 中文先经 `scripts/lib_equivalence.js` 的等价类换成英文（A/B/C 级是翻译，D 级是切词探针），
 * 再去打英文索引。等价类是**同一个张量点**的成员集合，不是相似度近邻 —— 见该文件头注释。
 *
 * @param {string} text
 * @param {{ k?:number, index?:object, kinds?:string[], filter?:Function, equivalence?:boolean, maxProbes?:number }} [opts]
 * @returns {Array} 命中，带 `viaLiteral` / `viaEquivalence` 两条通道的命中标记
 */
function runSearch(text, opts = {}) {
  const k = opts.k || 4;
  const ix = opts.index || load();
  // modules：第 26 章分账筛选。'TM1' = 中医/日韩传统医学（脏腑、六经、卫气营血），
  // 'TM2' = Module II（阿育吠陀/悉达：Vata、Varmam 等）。
  //
  // 语义是「**拦掉不想要的 TM 模块**」，不是「只留这个模块」：
  // 第 1–25 章（西医）的单元没有 module，一律放行 —— 参考指南 §2.23.24 要的就是
  // 「WM 诊断 + TM1 证候」并列编码，把西医章节一起拦掉会让「失眠」找不到 MG41。
  // 中医证候查询该拦的是 TM2：那不是检索噪声，是选错了医学体系。
  const mods = opts.modules ? [].concat(opts.modules) : null;
  // evidenceMin：约束到「有释义」的实体。
  //   'name'（默认）—— 名字级命中即可；
  //   'definition'  —— 只认实体单元且该实体有官方释义，用于「要拿释义当依据」的场景。
  // 注意：第 26 章（TM1/TM2）在 WHO 源头**没有释义**，所以这个约束会把证候全部挡掉 ——
  // 那是事实，不是 bug；要证候就按名字/四轴探针来，并明确标 `evidence:'name'`。
  const evidenceMin = opts.evidenceMin || 'name';
  // 释义挂在**实体单元**上；术语单元（T:code:term）没有。所以判定要回到该码的实体上，
  // 否则「cholera」命中的是术语单元，会被误判成没有释义（实测踩到）。
  const entOf = (u) => (u && u.code ? ix.byId.get(`E:${u.code}`) : null);
  const hasDef = (u) => { const e = entOf(u); return !!(e && e.hasDefinition); };
  const allow = (u) => !!u
    && (!opts.kinds || opts.kinds.includes(u.kind))
    && (!mods || !u.module || mods.includes(u.module))
    && (evidenceMin !== 'definition' || hasDef(u))
    && (!opts.filter || opts.filter(u));

  const rankOf = (qtext) => {
    const q = queryVector(qtext, ix.vocab);
    const vec = q.idx.length
      ? ix.units
        .map((u, row) => ({ id: u.id, s: cosineSparse(q, ix, row) }))
        .filter((x) => x.s > 0 && allow(ix.byId.get(x.id)))
        .sort((a, b) => b.s - a.s || (a.id < b.id ? -1 : 1))
        .slice(0, 40)
        .map((x) => x.id)
      : [];
    let fts = [];
    const DatabaseSync = loadSqlite();
    const db = new DatabaseSync(ix.ftsPath);
    try {
      const expr = [...new Set(segment(qtext))].map((t) => `"${t.replace(/"/g, '""')}"`).join(' OR ');
      if (expr) {
        fts = db.prepare('SELECT doc_id AS id, bm25(docs_terms) AS s FROM docs_terms WHERE docs_terms MATCH ? ORDER BY s ASC, rowid ASC LIMIT 40')
          .all(expr)
          .map((r) => String(r.id))
          .filter((id) => allow(ix.byId.get(id)));
      }
    } finally { db.close(); }
    return { vec, fts, fused: rrf([vec, fts]).map(([id]) => id) };
  };

  // ① 字面通道
  const literal = rankOf(text);

  // ② 等价通道：中文（或任何在等价类里的形式）→ 英文探针 → 英文索引
  //
  // 探针有三种来源，**三种不是一回事，混起来就会把词表直译说成"等价"**：
  //   A/B/C  等价类的成员   —— 同一个张量点上的另一个语种形式（真等价，带出处）
  //   D      等价类的组合探针 —— 切词拼出来的查询串（不是任何一条术语的等价形式）
  //   E      词表直译        —— 把查询里每个中文术语逐条查 WHO 表后拼接（覆盖自由文本，
  //                           如「失眠」「心悸」；**不宣称等价**，只是能查到东西）
  let equiv = { probes: [], fused: [], enabled: opts.equivalence !== false, why: null, referenceOnly: [], gate: opts.gate || 'axes' };
  if (opts.equivalence !== false) {
    const probes = [];
    const seenEn = new Set();
    const push = (p) => {
      const k = p.en.toLowerCase().replace(/\s+/g, ' ').trim();
      if (!k || seenEn.has(k)) return;
      seenEn.add(k);
      probes.push(p);
    };
    let whyEq = null;
    try {
      const EQ = require('./lib_equivalence.js');
      // gate：默认 'axes' —— 只有四轴组合探针进检索；词表切词探针降级为「仅供参考」，
      // 不参与排序，但**照样带回来**（`equiv.referenceOnly`），下游可以显示它而不用假装没有。
      const r = EQ.probes(text, { gate: opts.gate || 'axes' });
      for (const p of r.probes) push({ en: p.en, derived: !!p.derived, strength: p.strength, source: p.source, classId: p.classId, publishable: p.publishable });
      equiv.referenceOnly = (r.referenceOnly || []).map((p) => ({ en: p.en, classId: p.classId, reason: p.reason, axisClean: p.axisClean }));
      whyEq = r.why || null;
    } catch (e) {
      equiv.enabled = false;
      equiv.why = `等价层不可用：${e.message}`;
    }
    // E 级：词表直译（只对含汉字的查询做；英文查询本来就能直接命中）
    if (equiv.enabled && /[㐀-鿿]/.test(String(text))) {
      try {
        const Z = require('./lib_zh_en.js');
        const t = Z.translate(text);
        const minCov = opts.dictMinCoverage == null ? 0.4 : opts.dictMinCoverage;
        if (t.hasTerm && t.coverage >= minCov) {
          push({
            en: t.en, derived: true, strength: 'E', coverage: Number(t.coverage.toFixed(4)),
            source: `WHO ISTT 词表直译（${t.terms.map((x) => `${x.zh}=${Z.stripCode(x.en)}`).join('；').slice(0, 160)}）`,
          });
        }
      } catch (e) { /* 词表缺失不影响等价通道 */ }
    }
    if (equiv.enabled && probes.length) {
      const lists = probes.slice(0, opts.maxProbes || 4).map((p) => rankOf(p.en));
      // 探针可能多条（一词多义 / 多种写法）：先并成一张表，再与字面通道融合
      equiv.fused = rrf(lists.map((l) => l.fused)).map(([id]) => id);
      equiv.probes = probes;
    } else if (equiv.enabled) {
      equiv.why = whyEq || '既不在任何等价类里，词表也译不出（覆盖率不足）';
    }
  }

  const fused = rrf([literal.fused, equiv.fused]);

  // ③ 同名通道：查询串与某个术语**逐字相同**时，它排第一。
  //
  // 这不是「加权重」，是把一个事实搬进来：ICD-11 的官方中文名「胁痛」就是 SA00 的名字。
  // 让 MC86（西医的胸胁痛）靠向量近邻压在它前面，等于说「同一个名字不算同一个东西」。
  // 只做大小写/空白归一，不做形近、不去后缀 —— 否则「胁痛证」会被算成「胁痛」，
  // 而证候（pattern）与病（disorder）在参考指南 §3.2.26 里是两个概念。
  const normName = (s) => String(s || '').toLowerCase().replace(/\s+/g, '');
  const qn = normName(text);
  const exactIds = qn
    ? ix.units.filter((u) => u.term && allow(u) && normName(u.term) === qn).map((u) => u.id)
    : [];
  const ranked = exactIds.length
    ? [...exactIds.map((id) => [id, 1]), ...fused.filter(([id]) => !exactIds.includes(id))]
    : fused;

  // 去重：同一编码在「术语单元」与「实体单元」上会各命中一次，
  // 返回给下游的榜里不该出现同一个病两遍（论文的 top-4 是 4 个疾病）。
  const seenCode = new Set();
  const hits = [];
  for (const [id, score] of ranked) {
    const u = ix.byId.get(id);
    const key = u.code || id;
    if (seenCode.has(key)) continue;
    seenCode.add(key);
    hits.push({
      id, kind: u.kind, code: u.code, title: u.title, term: u.term,
      module: u.module || null,
      lang: u.lang || 'en',
      evidence: hasDef(u) ? 'definition' : 'name',
      hasDefinition: hasDef(u),
      score: Number(score.toFixed(6)),
      inVector: literal.vec.includes(id),
      inFts: literal.fts.includes(id),
      viaLiteral: literal.fused.includes(id),
      viaEquivalence: equiv.fused.includes(id),
      viaExactName: exactIds.includes(id),
    });
    if (hits.length >= k) break;
  }
  return {
    hits,
    probes: equiv.probes,
    channels: {
      literal: literal.fused.length,
      equivalence: equiv.fused.length,
      exactName: exactIds.length,
      literalVector: literal.vec.length,
      literalFts: literal.fts.length,
    },
    equivalenceEnabled: equiv.enabled,
    gate: equiv.gate,
    referenceOnly: equiv.referenceOnly || [],
    why: equiv.why,
  };
}

/** 只取命中（旧口径，供既有调用方与测试） */
function searchHits(text, opts = {}) {
  return runSearch(text, opts).hits;
}

/** 对外主入口：给命中数组；要看通道与探针用 runSearch() */
const search = searchHits;

/** 按编码取实体单元的原文（供上下文工程拼 prompt 用） */
function unitByCode(code) {
  const ix = load();
  return ix.byId.get(`E:${code}`) || null;
}

/**
 * 论文式上下文块：把 top-k 命中拼成一段可塞进 LLM prompt 的文本。
 * 同一编码只送一条 —— 论文的「top 4 disorders」是 4 个**疾病**，不是 4 条 chunk。
 * 术语命中与它的实体同时入榜时，保留先出现的那条（RRF 位次高者）。
 */
function contextBlock(hits, opts = {}) {
  const maxChars = opts.maxChars || 4000;
  const seen = new Set();
  const picked = [];
  for (const h of hits) {
    if (seen.has(h.code)) continue;
    seen.add(h.code);
    picked.push(h);
  }
  const parts = [];
  picked.forEach((h, n) => {
    parts.push(`--- Document ${n + 1} (${h.kind === 'term' ? '术语' : '疾病'}·${h.code}) ---`);
    if (h.kind === 'term') parts.push(`Term: ${h.term}\nMaps to: ${h.title} (${h.code})`);
    else {
      const u = unitByCode(h.code);
      parts.push(u ? u.text : `${h.title} (${h.code})`);
    }
  });
  let s = parts.join('\n');
  if (s.length > maxChars) s = `${s.slice(0, maxChars)}\n…（截断：超出 ${maxChars} 字符预算）`;
  return { text: s, distinctCodes: picked.length, droppedDuplicateCodes: hits.length - picked.length };
}

// ── 评测（中文直查命中率：本层存在的理由就是它）──────────────────

/**
 * 中文直查评测。四类探针，**都固定下来**，换机器换时间跑出来的数可比：
 *   A. 104 个证候名（本仓库 DSU 全集）→ top-1 / top-4 是否落到 TM1（第 26 章传统医学）
 *   B. 症状词（规格端点里出现过的那些）→ top-1 是什么（**不判对错**，只报出来，人工看）
 *   C. 规格记录的 3 条端点查询
 *   D. **官方中文名回查**：拿第 26 章的 216 条官方中文名当查询，看 top-1 是否回到它自己。
 *      这是唯一不需要医生的判据 —— 它量的不是「诊断对不对」，而是「中文面有没有接上」。
 * 判据只用「编码是否在 TM1」——那是可机读的；「医学上对不对」不做自动判定，
 * 因为这个仓库没有临床医生，硬判就是编。
 *
 * 另外每个证候都跑两遍：只回 TM1 vs 全第 26 章（含 TM2 阿育吠陀/悉达）。
 * 两者之差就是**体系混账**的代价 —— 不合并成一个数，因为那是两个问题。
 */
function evaluate() {
  const fs2 = require('node:fs');
  const path2 = require('node:path');
  const ref = JSON.parse(fs2.readFileSync(path2.join(ROOT, 'standards/semtensor/datasets/reference-units.json'), 'utf8'));
  const units = (Array.isArray(ref) ? ref : ref.units).filter((u) => u.kind === 'dsu');
  const ix = load();
  const isTm1 = (code) => {
    const u = ix.byId.get(`E:${code}`);
    return !!u && /\(TM1\)/.test(String(u.title));
  };
  const run = (q, k = 4, extra = {}) => {
    const r = runSearch(q, { k, ...extra });
    return {
      query: q,
      probes: r.probes.map((p) => `${p.strength}:${p.en}`),
      top1: r.hits[0] ? { code: r.hits[0].code, title: r.hits[0].title, tm1: isTm1(r.hits[0].code), module: r.hits[0].module } : null,
      topK: r.hits.map((h) => ({ code: h.code, title: h.title, tm1: isTm1(h.code), module: h.module })),
      anyTm1InTopK: r.hits.some((h) => isTm1(h.code)),
      hits: r.hits.length,
    };
  };

  const syndromes = units.map((u) => {
    const label = String(u.label).replace(/[（(][^（）()]*[）)]/g, '');
    return { uid: u.uid, label, ...run(label, 4, { modules: ['TM1'] }) };
  });
  const syndromesAllModules = units.map((u) => {
    const label = String(u.label).replace(/[（(][^（）()]*[）)]/g, '');
    const r = run(label, 4, {});
    return { uid: u.uid, label, top1Tm1: !!(r.top1 && r.top1.tm1), top1Module: r.top1 ? r.top1.module : null };
  });
  const symptoms = ['失眠', '心悸', '健忘', '口苦', '恶寒', '发热', '无汗', '胁痛', '咽干', '多梦']
    .map((q) => ({ probe: q, ...run(q, 4, { modules: ['TM1'] }) }));
  const endpoints = [
    { ep: '/semantic-search?q=失眠', q: '失眠', expect: '心脾两虚证' },
    { ep: '/bianzheng?q=口苦,咽干', q: '口苦 咽干', expect: '肝胆湿热证' },
    { ep: '/diag?q=恶寒,发热,无汗', q: '恶寒 发热 无汗', expect: '风寒束表证' },
  ].map((e) => ({ ...e, ...run(e.q, 4, { modules: ['TM1'] }) }));

  // D. 官方中文名回查：量的不是诊断，是「中文面接没接上」
  let official = { total: 0, exactTop1: 0, inTop4: 0, rows: [] };
  try {
    const zpath = path2.join(ROOT, 'standards/icd11/zh-names.json');
    const zdoc = JSON.parse(fs2.readFileSync(zpath, 'utf8'));
    for (const n of zdoc.names || []) {
      if (!ix.byId.get(`E:${n.code}`) || !n.zh) continue;   // 只用快照里真有中文的码
      const r = runSearch(n.zh, { k: 4, modules: ['TM1'] });
      const codes = r.hits.map((h) => h.code);
      const top1 = codes[0] === n.code;
      if (top1) official.exactTop1 += 1;
      if (codes.includes(n.code)) official.inTop4 += 1;
      official.total += 1;
      official.rows.push({ code: n.code, zh: n.zh, top1: codes[0] || null, rank: codes.indexOf(n.code) });
    }
  } catch (e) {
    official = { error: `中文名回查跳过：${e.message}` };
  }
  if (official.total) {
    official.top1Rate = Number((official.exactTop1 / official.total).toFixed(4));
    official.top4Rate = Number((official.inTop4 / official.total).toFixed(4));
    official.misses = official.rows.filter((r) => r.rank !== 0).slice(0, 30);
    delete official.rows;
  }

  const top1Tm1 = syndromes.filter((s) => s.top1 && s.top1.tm1).length;
  const top1Tm1All = syndromesAllModules.filter((s) => s.top1Tm1).length;
  const anyTm1 = syndromes.filter((s) => s.anyTm1InTopK).length;
  const noHit = syndromes.filter((s) => !s.hits).length;
  const out = {
    $generated: 'node scripts/icd11_terms.js --eval',
    note: '中文直查：查询串原样进检索（等价通道负责换成英文，官方中文名走字面通道直接命中）。'
      + '「落到 TM1」= top-k 里有 ICD-11 第 26 章（传统医学）编码，这是可机读的判据；'
      + '「医学上对不对」不自动判 —— 本仓库没有临床医生，硬判就是编。'
      + 'syndromes 排除 TM2（第 1–25 章西医不禁，参考指南 §2.23.24 就是 WM+TM1 并列编码）；'
      + 'syndromesWithTm2 是含 TM2 的同批查询，两者之差即体系混账的代价。',
    syndromes: { total: syndromes.length, top1Tm1, anyTm1InTop4: anyTm1, noHit, rows: syndromes },
    syndromesWithTm2: { total: syndromesAllModules.length, top1Tm1: top1Tm1All, rows: syndromesAllModules },
    officialChineseNames: official,
    symptoms: { total: symptoms.length, rows: symptoms },
    endpoints: { rows: endpoints },
  };
  const outPath = path2.join(OUTDIR, 'eval.json');
  fs2.writeFileSync(outPath, `${JSON.stringify(out, null, 2)}
`, 'utf8');
  return out;
}

// ── CLI ────────────────────────────────────────────────────

function main() {
  const argv = process.argv.slice(2);
  const val = (f, d) => (argv.includes(f) ? argv[argv.indexOf(f) + 1] : d);

  if (argv.includes('--eval')) {
    const r = evaluate();
    console.log('═══ ICD-11 术语层 · 中文直查评测 ═══');
    console.log(`  证候 ${r.syndromes.total}（排除 TM2）：top-1 落到 TM1 ${r.syndromes.top1Tm1} · top-4 含 TM1 ${r.syndromes.anyTm1InTop4} · 无命中 ${r.syndromes.noHit}`);
    console.log(`  同一批含 TM2（阿育吠陀/悉达）：top-1 落到 TM1 ${r.syndromesWithTm2.top1Tm1} —— 体系混账吞掉 ${r.syndromes.top1Tm1 - r.syndromesWithTm2.top1Tm1} 个`);
    const o = r.officialChineseNames;
    if (o && o.total) {
      console.log(`  官方中文名回查 ${o.total}：top-1 回到自身 ${o.exactTop1}（${(o.top1Rate * 100).toFixed(1)}%）· top-4 ${o.inTop4}（${(o.top4Rate * 100).toFixed(1)}%）`);
      if (o.misses && o.misses.length) console.log(`    未回自身的前几条：${o.misses.slice(0, 5).map((m) => `${m.zh}→${m.top1 || '无'}`).join(' · ')}`);
    } else if (o && o.error) console.log(`  ${o.error}`);
    console.log('');
    console.log('  症状词（top-1，只报不判）：');
    for (const s2 of r.symptoms.rows) {
      console.log(`    ${s2.probe.padEnd(4)} ${s2.top1 ? `${s2.top1.code} ${s2.top1.title}${s2.top1.tm1 ? ' [TM1]' : ''}` : '（无命中）'}`);
      console.log(`         探针 ${s2.probes.join(' | ') || '—'}`);
    }
    console.log('');
    console.log('  规格端点：');
    for (const e2 of r.endpoints.rows) {
      console.log(`    ${e2.ep}（期望 ${e2.expect}）`);
      console.log(`         探针 ${e2.probes.join(' | ') || '—'}`);
      console.log(`         top-4 ${e2.topK.map((h) => `${h.code}${h.tm1 ? '*' : ''}`).join(', ') || '（无）'}`);
    }
    console.log('');
    console.log('  * = TM1（第 26 章传统医学）');
    return;
  }
  if (argv.includes('--stats')) {
    const ix = load({ fresh: true });
    console.log('═══ ICD-11 术语嵌入层 · 现状 ═══');
    console.log(`  单元 ${ix.meta.docs.unitsTotal}（实体 ${ix.meta.docs.entitiesWithCode} · 术语 ${ix.meta.docs.termUnits}）`);
    console.log(`  第 26 章分账 ${JSON.stringify(ix.meta.modules || {})}（TM1=中医/日韩 · TM2=阿育吠陀/悉达）`);
    console.log(`  官方中文名 ${ix.meta.docs.zhNamedEntities} 个实体（中文术语单元 ${ix.meta.docs.zhTermUnits}）`
      + (ix.meta.zhNames && ix.meta.zhNames.source ? ` · 源 sha256 ${String(ix.meta.zhNames.source.sha256).slice(0, 12)}…` : ''));
    console.log(`  词表 ${ix.meta.vector.vocabSize} · nnz ${ix.meta.vector.nnz} · 余弦`);
    console.log(`  FTS5 ${ix.meta.fts5.fts5 ? '已建' : '缺失'} · sqlite ${ix.meta.fts5.sqliteVersion}`);
    console.log(`  释义 ${ix.meta.docs.withDefinition} 个实体有官方定义段（打印版 PDF 抽出；第 26 章 0 条）`);
    return;
  }

  const q = val('--query', null);
  if (q) {
    const k = Number(val('--k', '4'));
    const mod = val('--module', null);
    const opts = { k };
    if (val('--gate', null)) opts.gate = val('--gate', null);   // axes（默认）/ all（对照实验）
    if (val('--evidence', null)) opts.evidenceMin = val('--evidence', null);   // name（默认）/ definition
    if (mod) opts.modules = mod === 'all' ? null : mod.split(',').map((s) => s.trim().toUpperCase());
    const res = runSearch(q, opts);
    const hits = res.hits;
    if (argv.includes('--json')) { console.log(JSON.stringify(res, null, 2)); return; }
    console.log(`═══ ICD-11 术语检索「${q}」· top-${k}（向量 ∪ FTS5，RRF k=${RRF_K}）═══`);
    hits.forEach((h, n) => {
      const tag = h.kind === 'term' ? '术语' : '疾病';
      console.log(`  ${String(n + 1).padStart(2)}. [${tag}] ${h.code} · ${h.title}`);
      if (h.term) console.log(`      术语：${h.term}`);
      console.log(`      RRF ${h.score} · 通道 vec=${h.inVector ? '✓' : '·'} fts=${h.inFts ? '✓' : '·'}`);
    });
    if (!hits.length) console.log('  （无命中 —— 语料里没有这个词，不美化）');
    // 发布门：被挡下的探针照样显示，让人看见「有但它不可靠」，而不是让它悄悄消失
    if ((res.referenceOnly || []).length) {
      console.log('  ⚠ 仅供参考（发布门挡住，不入检索）：');
      for (const p of res.referenceOnly) console.log(`     ${p.en}\n       ${p.reason}`);
    }
    console.log('\n── 上下文块（可直接塞进 LLM prompt）──');
    console.log(contextBlock(hits, { maxChars: 1200 }).text);
    return;
  }

  const meta = build({ limit: val('--limit', '0') });
  console.log('═══ ICD-11 术语嵌入层 · 构建完成 ═══');
  console.log(`  实体 ${meta.docs.entitiesWithCode} · 术语单元 ${meta.docs.termUnits}（唯一术语 ${meta.docs.uniqueTerms}，跨实体重复合并 ${meta.docs.termDupCollapsed}）`);
  console.log(`  第 26 章分账 ${JSON.stringify(meta.modules)}（TM1=中医/日韩 · TM2=阿育吠陀/悉达）`);
  console.log(`  官方中文名 ${meta.docs.zhNamedEntities} 个实体 · 中文术语单元 ${meta.docs.zhTermUnits}`);
  console.log(`  词表 ${meta.vector.vocabSize} · nnz ${meta.vector.nnz} · CSR ${(meta.vector.csrBytes / 1048576).toFixed(1)} MB`);
  console.log(`  FTS5 sqlite ${meta.fts5.sqliteVersion} · 两表 ${meta.fts5.virtualTables.map((t) => `${t.name}(${t.module})`).join(' + ')}`);
  console.log(`  用时 ${(meta.elapsedMs / 1000).toFixed(1)}s`);
  console.log(`\n  → ${path.relative(ROOT, OUTDIR)}/`);
}

if (require.main === module) {
  try { main(); } catch (e) { console.error(`\n✗ ${e.message}`); process.exit(1); }
}

module.exports = {
  build, load, search, runSearch, evaluate, queryVector, contextBlock, unitByCode, rrf,
  readEntities, splitTerms, entityUnit, termUnit, forEachUnit, moduleOf, loadZhNames,
  OUTDIR, MAX_FEATURES, RRF_K,
};
