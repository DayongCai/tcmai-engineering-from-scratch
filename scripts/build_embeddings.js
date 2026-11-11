#!/usr/bin/env node
/**
 * scripts/build_embeddings.js —— 嵌入层 + 上下文工程（RAG 检索侧）
 *
 * 两份规格，一层实现：
 *
 * 【甲】`standards/knowledge-tree/sources/中医知识树.xlsx` 工作表 `embedding-code`
 *   「embedding-code · ICD-11 / TF-IDF / FTS5 / RRF / 上下文工程（tcmP 真实实现）」
 *   八个编号组件：
 *     ① Document 构建（病侧＋证侧 → 单文本）
 *     ② 中文分词（字符 bigram + 英文词）
 *     ③ TF-IDF 字符 n-gram 向量
 *     ④ SQLite FTS5 全文索引（BM25）      ← **本轮由「等价物」改为真 FTS5**
 *     ⑤ RRF 融合（k=60）
 *     ⑥ 上下文工程（只送 Top-5 叶 ≈1.5K token）
 *     ⑦ ICD-11 双通道客户端
 *     ⑧ 知识树查询（path / neighbors）
 *
 * 【乙】Cremaschi et al. (2025) *Decoding the mind: A RAG-LLM on ICD-11 for decision
 *   support in psychology*, Expert Systems With Applications 279:127191
 *   与检索侧直接相关的是 §3.1（prompt 工程）、§4（RAG）、§4.1（模块化单元库）：
 *     · 一条疾病 = 向量库里的**一条 chunk**，文本按固定字段顺序拼成单串（Listing 2）
 *     · 查询与文档**必须同一嵌入模型/同一空间**（§4 第 2 步）
 *     · 余弦相似度，**top-4**（论文说是经验值）
 *     · top-k 命中被拼成上下文块塞进 LLM prompt；top-k 可配（§4.1）
 *   本层照此实现：`buildPromptUnit()` 是论文式 prompt 单元，
 *   `contextBlock()` 是论文式上下文块，`icd11Channel()` 是论文式「检索到的疾病带编码回来」。
 *
 * ── 本轮改动（相对上一版）────────────────────────────────────
 * 1. **④ 从等价物改成真 FTS5。** 上一版写「本机没有 SQLite，所以在进程内实现 BM25」。
 *    那句话当时为真，现在为假：Node 22 自带 `node:sqlite`，其捆绑 SQLite 已编入 FTS5
 *    （实测 sqlite 3.50.4）。依赖没加一个，偏离可以撤销。见 `scripts/lib_fts5.js`。
 * 2. **① 有了真正的「描述」。** 上一版 README 的结论是「这不是嵌入模型选得不好，
 *    是还没有东西可嵌入」——103 个 DSU 的文本只能靠证名在教材语料里的上下文窗口拼。
 *    现在 `standards/semtensor/descriptions/dsu-descriptions.json` 给出了
 *    病性/病位/动作/病机/主症/WHO 术语/外源释义，正是论文所说「descriptions」。
 *    于是文档文本改用 **论文式 prompt 单元**（主）＋ 语料窗口（仅当无描述时兜底）。
 * 3. **⑦ 的 ICD-11 侧接上了。** `scripts/icd11_terms.js` 把 13,960 条实体与
 *    6.1 万条索引词做成术语嵌入层；本层把它作为**第 4 条检索通道**启用：
 *    「查询 → 术语 → 编码」直接可达；中文查询经**语义张量等价映射**换成英文（
 *    `scripts/lib_equivalence.js`：等价 = 同一个张量点，不是相似度近邻）。
 * 4. **新增 k 扫描**（k=1/3/4/5/8/10 的期望命中率）——论文给 top-4 是经验值，
 *    那就把 k 的变化量出来，而不是照抄一个数字。
 *
 * ── 仍然存在的偏离（不藏）────────────────────────────────────
 * 偏离 1 · 输入字段不全。规格 build_document() 吃 10 个字段
 *   （disease/icd/dcat/dsym/syndrome/pat/zf/six/ssym/formula），来自源平台 `kg/` 下的
 *   7 个病证单元文件。**那批文件不在本仓库的资料里。** 现在的供给（97 条描述记录）：
 *     syndrome 97/97 · 病性 nature 92 · 病位 locus 80 · 动作 action 73 · 病机 60
 *     主症 60 · 病 12 · ICD 7 · WHO 术语 26
 *   `dcat/dsym/pat/zf/six/ssym/formula` 里仍有 0 供给的位（dsym 西医症状、six 六经、
 *   formula 主方）。空字段**不占位、不倒推**：写「疾病：未知」会让「未知」拿到自己的
 *   IDF，污染整个向量空间 —— 缺席必须表现为缺席。
 *
 * 偏离 2 · ③ 与论文的稠密向量不是一回事。论文用 LangChain + ChromaDB + 稠密 embedding；
 *   这里是 TF-IDF 稀疏向量 + 余弦。**语义泛化能力弱于稠密向量**，是口径差不是等价实现。
 *
 * 偏离 3 · ② 与 ③ 在源材料里就不一致。②写 bigram，③用 ngram_range=(1,3)。
 *   两个都实现，默认用 ③（1–3）出向量，②的 bigram 单独可调、并且**同时是 FTS5 的写入侧分词器** ——
 *   不做取舍，因为取舍的依据不在我手上。
 *
 * 用法：
 *   node scripts/build_embeddings.js                      # 出向量 + 评测 + 报告
 *   node scripts/build_embeddings.js --query 失眠          # 检索（三通道 RRF）
 *   node scripts/build_embeddings.js --context 失眠         # 出论文式上下文块（含 ICD-11 侧）
 *   node scripts/build_embeddings.js --topk 4             # 上下文只送 4 条（论文默认值）
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const OUTDIR = path.join(ROOT, 'standards/semtensor/embeddings');
const DOC_FTS = path.join(OUTDIR, 'docs.fts5.db');
const { readWorkbook } = require('./lib_xlsx.js');
const { Fts5Index } = require('./lib_fts5.js');
// 嵌入质量指标：**与上游 vectorization-ICD11 的 embedding_analysis.py 同口径**
// （轮廓 / CH / DB / 簇内簇间距离 / 分离比 / 熵 / 符号准确率）。
const M = require('./lib_metrics.js');

const TOPK_SPEC = 5;    // 甲规格 ⑥：只送 Top-5 叶
const TOPK_PAPER = 4;   // 乙论文 §4 第 3 步：top 4 most similar disorders
const RRF_K = 60;       // 甲规格 ⑤：k=60

// ─────────────────────────── ① Document 构建 ───────────────────────────
//
// 甲规格模板（源材料原文，逐字保留，改一行就要说明为什么）：
//   text = (f"疾病：{disease}；ICD-11编码：{icd}；{dcat}。"
//           f"西医症状：{dsym}。"
//           f"中医证候：{syndrome}（{pat}），脏腑：{zf}，六经：{six}。"
//           f"主症：{ssym}。主方：{formula}。")
//
// 乙论文模板（Listing 2 原文，同样逐字保留）：
//   Disorder Name: {title}
//   Disorder Code: {code}
//   Disorder symptoms:
//   {definition}
//   For this disorder the diagnostical requirements are:
//   {content}
//
// 两个都实现：`buildDocument()` = 甲，`buildPromptUnit()` = 乙。

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

/**
 * 乙论文式 prompt 单元：把一条证候压成**单串**（向量库的一条 chunk）。
 *
 * 与论文 Listing 2 的字段一一对应，只把「Diorder Name/Code/symptoms/requirements」
 * 换成中医侧的同义字段；映射关系写在这里，不做暗换：
 *   Disorder Name          ← 证候名（+ 括注病名）
 *   Disorder Code          ← DSU 编码；WHO 中医药术语编码另起一行（两套编号空间，不混用）
 *   Disorder symptoms      ← 主症 sampleSymptoms（+ 病位/病性/动作拆解）
 *   diagnostical req.      ← 病机 mechanisms + 外源释义片段（论文那一段来自 CDDR 正文，
 *                             本仓库无 CDDR；**不拿别的文字冒充它**，改用真实可核的字段）
 *
 * @param {{uid:string,label:string}} unit
 * @param {object} rec dsu-descriptions 记录（可能为 null）
 * @param {object} attrs 知识树「图谱接口」属性（disease/icd/branch）
 */
function buildPromptUnit(unit, rec, attrs = {}) {
  const lines = [];
  const name = rec && rec.label ? rec.label : unit.label;
  lines.push(`证候名称：${name}`);

  const codes = [`证候编码：${unit.uid}`];
  const who = rec && rec.whoTcm;
  if (who && who.whoCode) codes.push(`WHO中医药术语编码：${who.whoCode}`);
  lines.push(codes.join('；'));

  const sym = (rec && rec.sampleSymptoms) || [];
  if (sym.length) lines.push(`主症：${sym.slice(0, 30).join('、')}`);

  const dec = rec && rec.decomposed;
  if (dec) {
    const bits = [];
    if (dec.nature && dec.nature.length) bits.push(`病性：${dec.nature.join('、')}`);
    if (dec.locus && dec.locus.length) bits.push(`病位：${dec.locus.join('、')}`);
    if (dec.action && dec.action.length) bits.push(`病机动作：${dec.action.join('、')}`);
    if (bits.length) lines.push(bits.join('；'));
  }

  const mech = (rec && rec.mechanisms) || [];
  if (mech.length) lines.push(`病机：${mech.join('、')}`);

  // 外源释义：只取被本仓库登记过的片段（每条都带 type/url，可回查）
  const ev = (rec && rec.externalEvidence) || [];
  const defs = ev.filter((e) => e && e.snippet).slice(0, 2).map((e) => `外源释义（${e.type}）：${e.snippet}`);
  lines.push(...defs);

  if (who && who.whoEnglish) lines.push(`WHO英文名：${who.whoEnglish}`);
  if (who && who.whoDefinitionEn) lines.push(`WHO英文释义：${who.whoDefinitionEn}`);

  const disease = (rec && rec.disease) || attrs.disease;
  if (disease) lines.push(`西医疾病：${disease}`);
  const icd = attrs.icd || (rec && rec.icd);
  if (icd) lines.push(`ICD-11编码：${icd}`);

  const tbx = (rec && rec.textbookEvidence) || [];
  const tbxTitles = tbx
    .map((t) => (typeof t === 'string' ? t : (t && (t.title || t.source || t.file)) || ''))
    .filter(Boolean);
  if (tbxTitles.length) lines.push(`教材依据：${tbxTitles.slice(0, 2).join('；')}`);

  return lines.join('\n');
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

// ───────────────────── ④ BM25 倒排索引（进程内 · 对照用）─────────────────────
//
// 甲规格 ④ 要的是 SQLite FTS5，现在由 lib_fts5.js 真实现。
// 这一份**保留**是因为：(a) 现有测试钉死了它的语义；(b) 它能在没有 SQLite 的运行时
// 里继续工作，(c) 与 FTS5 的 BM25 对读可以看出两者排序是否同源。
// 报告里「④ 是 FTS5」这句话只指向 lib_fts5 —— 不指向这里。

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

/** 建真 FTS5 文档索引（两个虚拟表：docs_terms 词袋 + docs_substr 子串） */
function buildDocIndex(docs, dbPath = DOC_FTS) {
  const ix = new Fts5Index(dbPath);
  ix.addMany(docs.map((d, i) => ({ id: String(i), text: d.text, body: d.body || d.text })));
  ix.finish();
  return ix;
}

// ────────────────── ⑤ RRF 融合（k=60，规格原文） ──────────────────

function rrf(rankLists, k = RRF_K) {
  const score = new Map();
  for (const rl of rankLists) {
    rl.forEach((docIdx, i) => score.set(docIdx, (score.get(docIdx) || 0) + 1 / (k + i + 1)));
  }
  return [...score.entries()].sort((a, b) => b[1] - a[1]).map(([i, s]) => ({ i, score: s }));
}

// ─────────────────────── 语料抽取（①的兜底与证据）───────────────────────

function collectCorpus() {
  const files = [];
  // **排除派生件**：语料只能来自源。
  // 第一版把 standards/semtensor/embeddings/index.json 也读了进去 —— 那是一份
  // 报告，里面写着 "DSU-00035 · 心脾两虚证" 这类字符串，于是下一轮它变成了
  // 心脾两虚证的"语料证据"。**自己的输出喂回自己的输入**，是个反馈环。
  const DERIVED = [
    /semtensor[\\/]embeddings[\\/]/,
    // 等价映射的 README 里全是「心脾两虚证 ↔ dual deficiency of the heart and spleen」这类例子。
    // 把它喂进语料，检索会因为**读到了自己的答案**而变好 —— 那不是学到东西，是回音。
    // （上一轮加了这个目录，忘了加这条排除；靠语料文件数 3658→3661 才发现。）
    /semtensor[\\/]equivalence[\\/]/,
    /site[\\/]stats\.json$/,
    /outputs[\\/]index\.json$/,
    /icd11[\\/]meta\.json$/,
    /icd11[\\/]embedding-metrics/,
    /dashboard\.html$/,
    /manifest\.json$/,
    /standards[\\/][^\\/]*README\.md$/,
    /standards[\\/][^\\/]+[\\/]README\.md$/,
    /endpoints[\\/]/,
    /source-inventory\.md$/,
  ];
  const walk = (d) => {
    let e; try { e = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const x of e) {
      const p = path.join(d, x.name);
      if (x.isDirectory()) {
        if (!/node_modules|\.git$|build$|snapshot/.test(x.name)) walk(p);
      } else if (/\.(md|json|txt)$/.test(x.name)) {
        if (!DERIVED.some((re) => re.test(p))) files.push(p);
      }
    }
  };
  for (const d of ['textbooks', 'standards', 'glossary', 'departments']) walk(path.join(ROOT, d));
  const out = [];
  for (const f of files) { try { out.push({ file: path.relative(ROOT, f), text: fs.readFileSync(f, 'utf8') }); } catch {} }
  return out;
}

/** 取证名在语料中的上下文窗口（**仅当没有描述记录时兜底**） */
function harvestContexts(label, corpus, { window = 140, max = 4, maxSnippet = 0 } = {}) {
  const found = [];
  const seen = new Set();
  for (const { file, text } of corpus) {
    let from = 0;
    for (;;) {
      const i = text.indexOf(label, from);
      if (i < 0) break;
      from = i + label.length;
      let snippet = text.slice(Math.max(0, i - window), i + label.length + window)
        .replace(/[\r\n]+/g, ' ')
        .replace(/!?\[[^\]]*\]\([^)]*\)/g, ' ')
        .replace(/[#>|*`_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (maxSnippet && snippet.length > maxSnippet) snippet = `${snippet.slice(0, maxSnippet)}…`;
      const key = snippet.slice(0, 60);
      if (seen.has(key)) continue;
      seen.add(key);
      found.push({ file, snippet });
    }
  }
  return found.sort((a, b) => b.snippet.length - a.snippet.length).slice(0, max);
}

// ─────────────────────── ⑧ 知识树属性 ───────────────────────

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

/** 证候描述记录（论文所说 "descriptions" 在本仓库的落点） */
function loadDescriptions() {
  const p = path.join(ROOT, 'standards/semtensor/descriptions/dsu-descriptions.json');
  if (!fs.existsSync(p)) return { byLabel: new Map(), byUid: new Map(), stats: null, available: false };
  const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
  const byLabel = new Map();
  const byUid = new Map();
  for (const r of raw.records || []) {
    if (r.label) byLabel.set(r.label, r);
    if (r.canonical) byUid.set(r.canonical, r);
  }
  return { byLabel, byUid, stats: raw.stats || null, available: true, $generated: raw.$generated };
}

/**
 * 查一条 DSU 的描述记录。
 * 证名带括注（「膀胱湿热证（热淋）」）时要能对上不带括注的写法 —— 两种都试，
 * 但**不做模糊匹配**：对不上就是没有描述，走语料窗口兜底，而不是凑一个最像的。
 */
function findRecord(unit, desc) {
  if (!desc.available) return null;
  if (desc.byUid.has(unit.uid)) return desc.byUid.get(unit.uid);
  if (desc.byLabel.has(unit.label)) return desc.byLabel.get(unit.label);
  const bare = unit.label.replace(/（[^）]*）/g, '').trim();
  if (desc.byLabel.has(bare)) return desc.byLabel.get(bare);
  for (const [label, rec] of desc.byLabel) {
    if (label.replace(/（[^）]*）/g, '').trim() === bare) return rec;
  }
  return null;
}

// ─────────────── ⑦ ICD-11 术语通道（论文式：检索到疾病带编码回来）───────────────

let ICD = null;
let ICD_LOAD_ERROR = null;

function icdIndex() {
  if (ICD || ICD_LOAD_ERROR) return ICD;
  try {
    ICD = require('./icd11_terms.js');
    ICD.load();                       // 早失败：库没建就在这里报
    return ICD;
  } catch (e) {
    ICD_LOAD_ERROR = e.message;
    ICD = null;
    return null;
  }
}

/**
 * ICD-11 通道（⑦ 的可用那一半）。
 *
 * **本轮改法**：不再依赖「该证候恰好有 WHO 英文名字段」这条窄桥（那只有 26/104）。
 * 中文查询原样交给术语层，由 `scripts/lib_equivalence.js` 的**等价映射**换成语种等价的英文：
 *
 *   中文查询 ──等价类（同一个张量点）──▶ 英文成员 / 组合探针 ──▶ ICD-11 术语层
 *
 *   A/B/C 级 = 同一个语义点上的另一个语种形式（真等价，带 WHO 代码与书页）
 *   D 级     = 切词拼出来的组合探针（不是等价，只用于检索）
 *   E 级     = 词表直译（覆盖「失眠」「心悸」这类自由文本，不宣称等价）
 *
 * 纯中文查询时限定 ICD-11 第 26 章（TM1，传统医学补充章）—— 不限定会把 2 型糖尿病、
 * 压疮之类拽进来（实测过）。TM1 无命中时再打一次不限制的，并把回退记在 `fallbackUnfiltered`。
 *
 * @param {string} query
 * @param {string[]} [_anchors] 已废弃（上一版用它传 WHO 英文名）；保留参数名以免调用方报错
 */
function icd11Channel(query, opts = {}) {
  const icd = icdIndex();
  if (!icd) return { enabled: false, why: ICD_LOAD_ERROR, hits: [] };
  const latin = /[A-Za-z]{2,}/.test(query);
  // 拦 TM2（同一章 26 的 Module II：阿育吠陀/悉达），**不拦第 1–25 章**：
  // 参考指南 §2.23.24 的编码方案就是「WM 诊断 + TM1 证候」并列，把西医章节一起拦掉
  // 会让「失眠」找不到 MG41。上一版用 title 里是否有 "(TM1)" 当滤网，两件事一起做了。
  const MODULES = ['TM1'];

  // requireDefinition：只让**有官方释义**的库条目参与「主诉那条腿」。
  // 证候那条腿不加这个约束 —— 第 26 章在 WHO 源头就没有释义（打印版、全表、API 三处一致），
  // 加上去等于把证候全过滤掉。所以约束是**分腿**的，不是全局的。
  const qOpts = { k: TOPK_PAPER, modules: MODULES };
  if (opts.requireDefinition) qOpts.evidenceMin = 'definition';
  const r = icd.runSearch(query, qOpts);
  let hits = r.hits;
  let fallbackUnfiltered = false;
  if (!latin && !hits.length) {
    const r2 = icd.runSearch(query, { k: TOPK_PAPER });
    if (r2.hits.length) { hits = r2.hits; fallbackUnfiltered = true; }
  }

  // 第二条腿：**查询命中的证候**自带的 TM1 编码。
  // 查询是症状（「失眠」）时，直接查术语层会落到「睡眠障碍」这类症状条目；
  // 而决策支持真正要的是**证**（心脾两虚证 → SF62）。两条都出，各自标 `via`：
  //   via:'syndrome' = 该证候的等价类给出的编码（更贴证）
  //   via:'query'    = 查询本身译成英文后命中的编码（更贴主诉）
  // 不合并成一个「最佳答案」—— 谁是主诊断要靠人看，代码不替人裁决。
  const syndromeHits = [];
  for (const label of (opts.syndromeLabels || []).slice(0, 2)) {
    if (!label) continue;
    // 每个证候**只取 1 条**：证候名对应的是它自己那个编码，多取只是同族的近邻。
    // 取 2 条会把 top-4 全占满，主诉那条腿（失眠 → MG41）被挤出去 —— 实测踩到。
    const r2 = icd.runSearch(label, { k: 1, modules: MODULES });
    for (const h of r2.hits) syndromeHits.push({ ...h, via: 'syndrome', from: label });
  }

  // 同一编码在「术语单元」与「实体单元」上会各命中一次：按编码去重，
  // 送给数据的上下文块不该出现「同一个病两遍」（论文的 top-4 是 4 个疾病）。
  const seen = new Set();
  const uniq = [];
  for (const h of [...syndromeHits, ...hits.map((x) => ({ ...x, via: 'query', from: null }))]) {
    if (seen.has(h.code)) continue;
    seen.add(h.code);
    uniq.push(h);
  }
  return {
    enabled: true,
    path: latin ? 'direct' : 'equivalence',
    filter: latin ? null : '排除 TM2（第 26 章 Module II 阿育吠陀/悉达）；第 1–25 章不禁',
    fallbackUnfiltered,
    // 发布门：只有四轴组合探针（axisClean）进检索；词表切词探针降级为「仅供参考」，
    // 照样列出来（`referenceOnly`），但下游不许拿它当检索依据。
    gate: r.gate || 'axes',
    probes: (r.probes || []).map((p) => ({
      strength: p.strength, en: p.en, derived: !!p.derived, publishable: p.publishable !== false,
    })),
    requireDefinition: !!opts.requireDefinition,
    evidence: {
      definition: uniq.filter((h) => h.evidence === 'definition').length,
      name: uniq.filter((h) => h.evidence !== 'definition').length,
    },
    referenceOnly: (r.referenceOnly || []).map((p) => ({ en: p.en, reason: p.reason })),
    why: r.why || null,
    hits: uniq.slice(0, TOPK_PAPER).map((h) => ({
      code: h.code, title: h.title, kind: h.kind, term: h.term, score: h.score,
      via: h.via, from: h.from || null,
    })),
  };
}

// ─────────────────────────── 上下文工程 ⑥ ───────────────────────────

/**
 * 论文式上下文块：把 top-k 检索结果拼成一段**可直接塞进 LLM prompt** 的文本。
 * 同时报字符数，好跟论文的「平均 prompt 长度 1013 字符」对读。
 *
 * @param {object[]} docs
 * @param {{i:number,score:number}[]} hits
 * @param {{k?:number, maxChars?:number, kind?:string}} [opts]
 *   `kind` 默认 'dsu'：论文的单元库是**一个疾病一条 chunk**；本仓库的 13 个概念单元
 *   （DOM-SYS-六经 / DOM-SIX-少阳病 …）是知识树的域节点，不是疾病，不往病历上下文里送。
 */
function contextBlock(docs, hits, { k = TOPK_SPEC, maxChars = 6000, kind = 'dsu' } = {}) {
  const eligible = hits.filter((h) => !kind || docs[h.i].kind === kind);
  const picked = eligible.slice(0, k);
  const parts = [];
  picked.forEach((h, n) => {
    const d = docs[h.i];
    parts.push(`--- Document ${n + 1}（${d.uid} · ${d.label}）---`);
    parts.push(d.text);
  });
  let text = parts.join('\n');
  const truncated = text.length > maxChars;
  if (truncated) text = `${text.slice(0, maxChars)}\n…（截断：超出 ${maxChars} 字符预算）`;
  return {
    text, chars: text.length, docs: picked.length, truncated,
    skippedNonDsu: hits.length - eligible.length,
  };
}

// ─────────────────────── 评测（借上游指标） ───────────────────────

/** 保留 4 位小数；非有限值返回 null（不许把 NaN 写进产物） */
function num(x) {
  return Number.isFinite(x) ? Number(x.toFixed(4)) : null;
}

/** kNN 纯度：最近邻中同标签的比例 */
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

// ─────────────────────────── 主流程 ───────────────────────────

/**
 * 一套文档集的完整评测（②③两种分词各算一遍）。
 * 抽成函数是为了做 A/B：「补教材语境」这一手对聚类指标与检索位次各是什么代价，
 * 得在同一份代码里同时量出来，而不是只报对检索有利的那一半。
 */
function evaluateDocSet(docs, tok) {
  const tfidf = buildTfidf(docs, tok);
  const dsuIdx = docs.map((d, i) => (d.kind === 'dsu' ? i : -1)).filter((i) => i >= 0);
  const vecs = dsuIdx.map((i) => tfidf.vectors[i]);

  const byDisease = dsuIdx.map((i) => docs[i].attrs.disease || '__unknown__');
  const known = byDisease.filter((d) => d !== '__unknown__').length;

  let bySuffix = dsuIdx.map((i) => {
    const l = docs[i].label.replace(/证$/, '');
    return l.slice(-2) || l;
  });
  const cnt = new Map();
  bySuffix.forEach((s) => cnt.set(s, (cnt.get(s) || 0) + 1));
  bySuffix = bySuffix.map((s) => (cnt.get(s) >= 2 ? s : '__single__'));

  const silent = M.clusterDistances(vecs, bySuffix);
  const ent = M.entropy(bySuffix);
  return {
    tokensPerDoc: docs.map((d) => tok(d.text).length),
    vocabulary: tfidf.vocabulary.length,
    knnPurityBySuffix: knnPurity(vecs, bySuffix, 5),
    silhouetteBySuffix: num(M.silhouette(vecs, bySuffix)),
    calinskiHarabaszBySuffix: num(M.calinskiHarabasz(vecs, bySuffix)),
    daviesBouldinBySuffix: num(M.daviesBouldin(vecs, bySuffix)),
    clusterSeparationRatio: num(silent.intra && silent.inter ? silent.inter / silent.intra : null),
    meanIntraClusterDistance: num(silent.intra),
    meanInterClusterDistance: num(silent.inter),
    suffixFamilyEntropy: num(ent.chapterEntropy),
    effectiveNumFamilies: num(ent.effectiveNumChapters),
    knnPurityByDisease: known >= 3 ? knnPurity(vecs, byDisease, 5) : null,
    diseaseCoverage: known,
  };
}

function main() {
  const argv = process.argv.slice(2);
  const val = (f, d) => (argv.includes(f) ? argv[argv.indexOf(f) + 1] : d);
  const qIdx = argv.indexOf('--query');
  const query = qIdx >= 0 ? argv[qIdx + 1] : null;
  const cIdx = argv.indexOf('--context');
  const contextQuery = cIdx >= 0 ? argv[cIdx + 1] : null;
  const topk = Number(val('--topk', String(TOPK_SPEC)));

  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/semtensor/datasets/reference-units.json'), 'utf8'));
  const units = Array.isArray(raw) ? raw : raw.units || raw.items || Object.values(raw).find(Array.isArray);
  const { attrs, edgeTypes } = loadTreeAttrs();
  const desc = loadDescriptions();
  const corpus = collectCorpus();

  // ── 文档集：描述记录覆盖的走论文式 prompt，其余兜底 ──
  // 降级链（每一级都记在 promptSource 里，可对账）：
  //   description            描述记录齐备
  //   description+corpus     描述记录在，但**缺主症**（60/104 有主症）→ 补教材语境窗口
  //   corpus-window          无描述记录 → 模板 + 语料窗口
  //   legacy-only            两者都无 → 只有模板（缺席表现为缺席）
  let nPrompt = 0, nFallback = 0, nSupplemented = 0;
  const docs = units.map((u) => {
    const a = attrs.get(u.uid) || {};
    const rec = findRecord(u, desc);
    const legacy = buildDocument(u, a);
    let text, source, supplement = null;
    if (rec) {
      text = buildPromptUnit(u, rec, a);
      source = 'description';
      nPrompt += 1;
      const hasSymptoms = (rec.sampleSymptoms || []).length > 0;
      if (!hasSymptoms) {
        // 主症缺失时，查询侧最常见的入口（「失眠」「口苦」这类症状词）就无处可落。
        // 补**教材语境窗口**并显式标注来源 —— 这是「描述缺一项」的补救，不是拿共现冒充定义。
        const ctx = harvestContexts(u.label, corpus, { max: 2, window: 90, maxSnippet: 300 });
        if (ctx.length) {
          supplement = ctx;
          text = `${text}\n教材语境：${ctx.map((c) => c.snippet).join(' ')}`;
          source = 'description+corpus';
          nSupplemented += 1;
        }
      }
    } else {
      const ctx = harvestContexts(u.label, corpus, { max: 3, window: 120, maxSnippet: 400 });
      text = ctx.length ? `${legacy} 语料：${ctx.map((c) => c.snippet).join(' ')}` : legacy;
      nFallback += 1;
      source = ctx.length ? 'corpus-window' : 'legacy-only';
    }
    // 单元文本长度上限：论文每条 prompt 平均 1013 字符（Table 1）。
    // 本层的语料窗口片段有时整段粘过来（无换行的 md 表格），不设上限会一个单元吃掉
    // 几千字符、把 top-4 的上下文预算撑爆。片段本身已在 harvestContexts 里限长，
    // 这里留一道 2400 的安全网（论文量级的 2 倍），超出显式标截断。
    const MAX_DOC_CHARS = 2400;
    if (text.length > MAX_DOC_CHARS) text = `${text.slice(0, MAX_DOC_CHARS)}…（截断）`;

    return {
      uid: u.uid, label: u.label, kind: u.kind,
      attrs: a, rec, promptSource: source, supplement,
      legacy, baseText: text.split('\n教材语境：')[0],
      // 子串检索只吃短摘要：trigram 索引是原文的 3–5 倍大
      body: [u.label, rec && rec.label, (rec && rec.sampleSymptoms || []).slice(0, 20).join(' '),
        (rec && rec.whoTcm && rec.whoTcm.whoEnglish) || '', a.disease || '', a.icd || '']
        .filter(Boolean).join(' | '),
      text,
      hasDisease: !!(a.disease || (rec && rec.disease)),
      hasIcd: !!(a.icd || (rec && rec.icd)),
      icdSource: a.icd ? 'xlsx-图谱接口' : (rec && rec.icd ? 'dsu-descriptions' : null),
    };
  });

  const dsuDocs = docs.filter((d) => d.kind === 'dsu');

  // ── 变体对比（②与③在源材料里不一致，两个都跑）──
  const variants = {
    ngram13: (t) => tokenizeNGram(t, 1, 3),
    bigram2: (t) => tokenizeBigram(t),
  };
  const reports = {};
  for (const [name, tok] of Object.entries(variants)) reports[name] = evaluateDocSet(docs, tok);

  // ── A/B：不补教材语境的那一版（同一套代码、同一批描述，只差补丁）──
  // 补丁对检索是净收益（见建库报告），对聚类指标是净损失。两个都量、都记，
  // 不挑对自己结论有利的那一列。
  const docsNoSupp = docs.map((d) => ({ ...d, text: d.baseText }));
  const reportsNoSupp = {};
  for (const [name, tok] of Object.entries(variants)) reportsNoSupp[name] = evaluateDocSet(docsNoSupp, tok);

  const tok = variants.ngram13;
  const tfidf = buildTfidf(docs, tok);
  const fts = buildDocIndex(docs);
  const ftsStats = fts.stats();
  const bm25 = buildBm25(docs, variants.bigram2);   // 进程内对照，仅用于对读排序

  // ── 三通道检索 ──
  const retrieve = (q, opts = {}) => {
    const k = opts.pool || 40;
    const qt = tok(q);
    const qv = sparseFromTokens(qt, tfidf);
    const vecRank = docs
      .map((d, i) => ({ i, s: cosine(tfidf.vectors[i], qv) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || a.i - b.i)
      .slice(0, k)
      .map((x) => x.i);
    const ftsRank = fts.search(q, { k }).map((h) => Number(h.id));
    const subRank = fts.searchSubstring(q, { k }).map((h) => Number(h.id));
    const fused = rrf([vecRank, ftsRank, subRank]);
    return {
      fused,
      channels: {
        vector: vecRank.length, fts: ftsRank.length, substr: subRank.length,
        inAll3: fused.filter((x) => vecRank.includes(x.i) && ftsRank.includes(x.i) && subRank.includes(x.i)).length,
      },
    };
  };

  // ── 检索冒烟：规格记录的 3 条端点行为 ──
  const endpoints = [
    { ep: '/semantic-search?q=失眠', q: '失眠', expect: '心脾两虚证' },
    { ep: '/bianzheng?q=口苦,咽干', q: '口苦 咽干', expect: '肝胆湿热证' },
    { ep: '/diag?q=恶寒,发热,无汗', q: '恶寒 发热 无汗', expect: '风寒束表证' },
  ];

  // A/B 归因：只开**向量通道**（单通道、两边同参数），看「补教材语境」这一手
  // 对位次到底是正是负。三通道融合的绝对位次会随通道数变化，不适合做归因。
  const tfidfNoSupp = buildTfidf(docsNoSupp, tok);
  const vectorRank = (docSet, tf, q, label) => {
    const qv = sparseFromTokens(tok(q), tf);
    const ranked = docSet
      .map((d, i) => ({ i, s: cosine(tf.vectors[i], qv) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || a.i - b.i);
    const at = ranked.findIndex((x) => docSet[x.i].label === label);
    return at < 0 ? null : at + 1;
  };
  const ablation = endpoints.map((e) => ({
    query: e.q,
    expectedInSpec: e.expect,
    vectorOnlyRank: {
      withSupplement: vectorRank(docs, tfidf, e.q, e.expect),
      descriptionOnly: vectorRank(docsNoSupp, tfidfNoSupp, e.q, e.expect),
    },
  }));

  const smoke = endpoints.map((e) => {
    const { fused, channels } = retrieve(e.q);
    const rankOf = (lst, label) => {
      const i = lst.findIndex((x) => docs[x.i].label === label);
      return i < 0 ? null : i + 1;
    };
    const allRank = rankOf(fused, e.expect);
    const dsuFused = fused.filter((x) => docs[x.i].kind === 'dsu');
    const dsuRank = rankOf(dsuFused, e.expect);

    // 论文式上下文块（⑥）：只送 top-k
    const ctx = contextBlock(docs, fused, { k: topk });

    // ⑦ ICD-11 术语通道：中文经等价映射换英文，不再依赖「该证候有 WHO 英文名」。
    // syndromeLabels = 前序命中的前两个证候，用来取「证的编码」那条腿。
    const icd = icd11Channel(e.q, {
      syndromeLabels: fused.filter((x) => docs[x.i].kind === 'dsu').slice(0, 2).map((x) => docs[x.i].label),
    });

    return {
      endpoint: e.ep, query: e.q, expectedInSpec: e.expect,
      expectedRank: allRank,
      expectedRankDsuOnly: dsuRank,
      channels,
      contextBlock: { k: topk, chars: ctx.chars, truncated: ctx.truncated, docs: ctx.docs, preview: ctx.text.slice(0, 240) },
      icd11: icd,
      allUnits: {
        top1: fused[0] ? `${docs[fused[0].i].uid} · ${docs[fused[0].i].label}` : null,
        top5: fused.slice(0, 5).map((x) => `${docs[x.i].uid} · ${docs[x.i].label}`),
      },
    };
  });

  // ── k 扫描：论文给 top-4 是经验值，那就把 k 的变化量出来 ──
  const kSweep = [1, 3, 4, 5, 8, 10].map((k) => {
    const hit = smoke.filter((s) => s.expectedRank != null && s.expectedRank <= k).length;
    const hitDsu = smoke.filter((s) => s.expectedRankDsuOnly != null && s.expectedRankDsuOnly <= k).length;
    return { k, hit, hitDsuOnly: hitDsu, of: smoke.length };
  });

  const out = {
    $generated: 'node scripts/build_embeddings.js',
    specSource: 'standards/knowledge-tree/sources/中医知识树.xlsx#embedding-code',
    specComponents: [
      '① Document 构建（甲·规格模板 / 乙·论文 prompt 单元）',
      '② 中文分词（字符 bigram + 英文词）',
      '③ TF-IDF n-gram',
      '④ SQLite FTS5 全文索引（BM25）—— 真 FTS5，非等价物',
      '⑤ RRF 融合 k=60（三通道：向量 / FTS5 词袋 / FTS5 子串）',
      '⑥ 上下文工程（Top-k 叶 → 上下文块）',
      '⑧ 知识树查询 path/neighbors',
    ],
    paperLayer: {
      reference: 'Cremaschi et al. (2025) Decoding the mind: A RAG-LLM on ICD-11 for decision support in psychology. Expert Systems With Applications 279:127191',
      doi: '10.1016/j.eswa.2025.127191',
      takenFrom: [
        '§3.1 prompt 工程：一条疾病 → 一条单串 chunk（Listing 2 字段顺序）',
        '§4 第 2 步：查询与文档必须同一嵌入空间（本层共用一套分词器与 IDF）',
        '§4 第 3 步：余弦相似度，top-k = 4（论文称经验值）',
        '§4 第 4 步：top-k 拼成上下文块送 LLM',
        '§4.1 单元库可增删而不动模型权重 → 上下文块与单元文本分离，可换库不换代码',
        '§5.1 评测口径：主诊断单值判定（accuracy/precision/recall/F1）',
      ],
      notTaken: [
        '不做 LLM 生成（本仓库无推理端）——只实现检索与上下文工程，不假装会出诊断',
        '不用稠密 embedding（零第三方依赖）——TF-IDF 稀疏向量，语义泛化弱于论文',
        '不评 76.1% 人工分（需要 4 名心理专业人员，本仓库没有评分人）',
      ],
      topkSpec: TOPK_SPEC,
      topkPaper: TOPK_PAPER,
    },
    notImplemented: [
      {
        component: '⑦ ICD-11 双通道客户端（通道 1）',
        why: 'WHO ICD-API 需要 OAuth2 凭据（id.who.int 无凭据一律 401）；通道 2 本地库已建（13,960 条 MMS 快照）。',
      },
      {
        component: '⑧ neighbors_full()',
        why: '知识树只给出边型的**条数**，不含逐边端点，无法还原邻接；path() 可用（12 个 DSU 有学科枝）。',
      },
    ],
    deviations: [
      `① 输入字段不全：证候 97/97；病性 92 · 病位 80 · 动作 73 · 病机 60 · 主症 60 · 病 ${dsuDocs.filter((d) => d.hasDisease).length} · ICD ${dsuDocs.filter((d) => d.hasIcd).length} · WHO 术语 26。dcat/dsym/six/formula 仍 0。空字段不占位、不倒推。`,
      '③ 不是稠密向量：TF-IDF 稀疏 + 余弦。语义泛化弱于论文的 LangChain embedding，是口径差不是等价实现。',
      '② 与③在源材料里互不一致（bigram vs 1–3gram），两个都实现，向量默认 1–3gram，FTS5 写入侧用 bigram，不做取舍。',
    ],
    counts: {
      units: units.length,
      dsu: dsuDocs.length,
      docsFromDescription: nPrompt,
      docsSupplementedWithCorpus: nSupplemented,
      docsFromFallback: nFallback,
      corpusFiles: corpus.length,
      corpusFileList: corpus.map((c) => c.file),
      edgesReportedBySource: edgeTypes,
    },
    fts5: ftsStats,
    evaluation: reports,
    evaluationAblation: {
      note: '同一套代码、同一批描述，只差「缺主症时补教材语境」这一手。聚类指标（上表）与位次（下表）分别记，不合并成一个「更好」。',
      descriptionOnly: reportsNoSupp,
      vectorOnlyRank: ablation,
    },
    retrievalSmoke: smoke,
    kSweep,
    kSweepNote: 'hit=全单元榜（含概念单元）；hitDsuOnly=只算 DSU。论文的 top-4 在本仓库的数据上是否够用，看这张表，不照抄。',
    icd11TermLayer: (() => {
      const icd = icdIndex();
      if (!icd) return { enabled: false, why: ICD_LOAD_ERROR };
      const m = icd.load().meta;
      return {
        enabled: true,
        artifacts: 'data/icd11/term-index/',
        units: m.docs.unitsTotal,
        entities: m.docs.entitiesWithCode,
        termUnits: m.docs.termUnits,
        vocabSize: m.vector.vocabSize,
        fts5: m.fts5.fts5,
        topk: TOPK_PAPER,
        // 第 26 章分账 + 官方中文名：这两个数是「中文面到底接了多少」的硬指标，
        // 写进产物方便对账，免得报告里再手抄一遍数字。
        modules: m.modules || null,
        zhNames: m.docs.zhNamedEntities || 0,
        zhTermUnits: m.docs.zhTermUnits || 0,
        // 释义覆盖：WHO 的 TM1 源头没有定义段，所以这个数只反映第 1–25 章
        withDefinition: m.docs.withDefinition || 0,
        definitionSource: 'WHO 打印版 PDF（免 API 凭据）· standards/icd11/definitions-en.json',
        note: '术语层语料以英文为主（ICD-11 MMS 快照）——中文查询两条路：'
          + '① 150 条官方中文名走字面/同名通道直接命中（名字级，不涉及语义）；'
          + '② 其余中文走**等价映射**：中文形式 → 同一个张量点上的英文成员 / 组合探针 → 术语层。',
        equivalence: (() => {
          try {
            const EQ = require('./lib_equivalence.js');
            const st = EQ.stats();
            return {
              classes: st.classes, members: st.members,
              translatableClasses: st.translatableClasses,
              withEnglishMembers: st.classesWithEnglish,
              probeOnly: st.classesWithProbeOnly,
              unresolved: st.unresolved,
              ambiguousForms: st.ambiguousForms,
            };
          } catch (e) { return { enabled: false, why: e.message }; }
        })(),
      };
    })(),
    documents: docs.map((d) => ({
      uid: d.uid, label: d.label, kind: d.kind,
      fields: {
        disease: d.attrs.disease || null,
        icd: d.attrs.icd || null,
        branch: d.attrs.branch || null,
        icdFromDescription: (d.rec && d.rec.icd) || null,
      },
      promptSource: d.promptSource,
      descriptionFields: d.rec ? {
        nature: (d.rec.decomposed && d.rec.decomposed.nature) || [],
        locus: (d.rec.decomposed && d.rec.decomposed.locus) || [],
        action: (d.rec.decomposed && d.rec.decomposed.action) || [],
        mechanisms: d.rec.mechanisms || [],
        symptoms: (d.rec.sampleSymptoms || []).length,
        whoCode: (d.rec.whoTcm && d.rec.whoTcm.whoCode) || null,
        whoEnglish: (d.rec.whoTcm && d.rec.whoTcm.whoEnglish) || null,
      } : null,
      textLength: d.text.length,
      text: d.text.slice(0, 400),
    })),
  };

  fs.mkdirSync(OUTDIR, { recursive: true });
  fs.writeFileSync(path.join(OUTDIR, 'index.json'), `${JSON.stringify(out, null, 2)}\n`, 'utf8');

  // ── 终端报告 ──
  console.log('═══ 嵌入层 · 甲（规格八组件）+ 乙（Decoding the mind · RAG 检索侧）═══\n');
  console.log(`语料 ${corpus.length} 文件 · 单元 ${units.length}（DSU ${dsuDocs.length}）`);
  console.log(`文档来源：描述记录 ${nPrompt} · 语料窗口/模板兜底 ${nFallback}`);
  console.log(`④ FTS5：sqlite ${ftsStats.sqliteVersion} · 两虚拟表 ${ftsStats.virtualTables.map((t) => t.name).join(' + ')} · ${ftsStats.docCount} 文档\n`);
  console.log('变体对比：');
  for (const [n, r] of Object.entries(reports)) {
    const alt = reportsNoSupp[n];
    console.log(`  ${n}  词表 ${String(r.vocabulary).padStart(5)} · 每篇 ${Math.round(r.tokensPerDoc.reduce((a, b) => a + b, 0) / r.tokensPerDoc.length)} token`);
    console.log(`      kNN 纯度(证尾族) ${r.knnPurityBySuffix.toFixed(4)}（不补语境 ${alt.knnPurityBySuffix.toFixed(4)}）· 轮廓 ${r.silhouetteBySuffix == null ? 'n/a' : r.silhouetteBySuffix.toFixed(4)}（不补语境 ${alt.silhouetteBySuffix == null ? 'n/a' : alt.silhouetteBySuffix.toFixed(4)}）`);
  }
  console.log('\nA/B · 只开向量通道，期望答案的位次：');
  for (const a of ablation) {
    const f = (x) => (x == null ? '未入榜' : x);
    console.log(`  ${a.expectedInSpec}  补语境 ${f(a.vectorOnlyRank.withSupplement)} · 仅描述 ${f(a.vectorOnlyRank.descriptionOnly)}`);
  }
  console.log('\n检索冒烟（三通道 RRF k=60）· 记「期望答案排第几」而不是「top1 是不是它」：');
  for (const s of smoke) {
    console.log(`  ${s.endpoint}   期望 ${s.expectedInSpec}`);
    console.log(`     rank ${s.expectedRank == null ? '未入榜' : s.expectedRank} · top1 = ${s.allUnits.top1}`);
    const icdLine = s.icd11.enabled
      ? `${s.icd11.path}${s.icd11.hits.length ? ` → ${s.icd11.hits.map((h) => h.code).join(',')}` : ' 无命中'}`
      : '未启用';
    const probeLine = (s.icd11.probes || []).map((p) => `${p.strength}:${p.en}`).join(' | ');
    console.log(`     上下文块 ${s.contextBlock.docs} 条 / ${s.contextBlock.chars} 字符 · ICD-11 ${icdLine}`);
    if (probeLine) console.log(`     等价探针 ${probeLine}`);
  }
  console.log('\nk 扫描（期望答案进 top-k 的条数）：');
  for (const r of kSweep) console.log(`  k=${String(r.k).padStart(2)}  全单元 ${r.hit}/${r.of} · 仅 DSU ${r.hitDsuOnly}/${r.of}`);
  console.log(`\n  → ${path.relative(ROOT, path.join(OUTDIR, 'index.json'))}`);
  console.log(`  → ${path.relative(ROOT, DOC_FTS)}`);

  if (query || contextQuery) {
    const q = query || contextQuery;
    const { fused, channels } = retrieve(q);
    console.log(`\n═══ 查询「${q}」· 三通道（向量 ${channels.vector} / FTS5 ${channels.fts} / 子串 ${channels.substr}）═══`);
    fused.slice(0, 8).forEach((x, n) => {
      const d = docs[x.i];
      console.log(`  ${String(n + 1).padStart(2)}. ${d.uid} · ${d.label} · RRF ${x.score.toFixed(5)}`);
    });
    const ctx = contextBlock(docs, fused, { k: topk });
    console.log(`\n── 上下文块（top-${topk} · ${ctx.chars} 字符）──`);
    console.log(ctx.text);
    const icd = icd11Channel(q, {
      syndromeLabels: fused.filter((x) => docs[x.i].kind === 'dsu').slice(0, 2).map((x) => docs[x.i].label),
    });
    console.log(`\n── ICD-11 术语通道（${icd.enabled ? icd.path : '未启用 ' + icd.why}）──`);
    if (icd.enabled && icd.hits && icd.hits.length) {
      console.log(`  探针「${icd.probe}」${icd.probeFrom ? `（来自${icd.probeFrom}）` : '（直查）'}`);
      for (const h of icd.hits) console.log(`  · ${h.code} · ${h.title}${h.term ? ` （术语：${h.term}）` : ''}`);
    } else {
      console.log(`  ${(icd.why || '无命中 —— 不美化')}`);
    }
  }

  fts.close();
}

if (require.main === module) main();

module.exports = {
  buildDocument, buildPromptUnit, tokenizeBigram, tokenizeNGram, buildTfidf, buildBm25,
  buildDocIndex, rrf, cosine, silhouette: M.silhouette, knnPurity, harvestContexts, collectCorpus,
  loadDescriptions, findRecord, contextBlock, icd11Channel, evaluateDocSet,
  BM25_K1, BM25_B, TOPK_SPEC, TOPK_PAPER, RRF_K, DOC_FTS,
  metrics: M,
};
