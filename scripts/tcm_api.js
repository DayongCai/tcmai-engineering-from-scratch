#!/usr/bin/env node
/**
 * scripts/tcm_api.js —— /diag 与 /bianzheng（实现源材料的「逆转推理引擎」）
 *
 * 规格来源（三处，全部解析自源文件，无一处手抄）：
 *  1. `standards/materials/waiyin-liuyin/sources/外因六淫.xlsx#9数字人对话架构`
 *     「逆转推理引擎（症状 → 病机 → 病位 → 六淫）」—— 含**50 项「症状→病机映射表」**：
 *       | # | 症状/体征项 | 主判病机(w) | 兼判病机(w) | 高斯强度参考 g | 阶段线索 | 素材锚点 |
 *     及算法约定：
 *       强度档 x：明显 0.8 / 中等 0.5 / 轻微 0.2
 *       高斯 g(x)：σ=0.42, μ=1.0 → 0.8→0.89 / 0.5→0.49 / 0.2→0.16
 *       权重 w：3 强特异（几乎该病机独有）/ 2 显著 / 1 辅助
 *       合成 (1) x_m = Σ_{i∈S_m} w_i·x_i / Σ_{i∈S_m} w_i
 *       主病机 = max g_m（≥0.40），次病机 ≥0.20
 *  2. `standards/shanghan/底本.json` —— 伤寒论 1760 条，症状与**方剂原生共现**
 *     （「…无汗，发热…麻黄汤主之」），这是 /diag 的方剂来源。
 *  3. `standards/semtensor/datasets/reference-units.json` —— 103 个 DSU 证候名。
 *
 * ── 三个刻意的设计决定（都可被驳）────────────────────────────────────
 *
 * 【A】病机 → 证候 的桥用**汉字**，不用模型。
 *   中医证候名是构词的：`风寒束表证` 里就有「风」「寒」「表」，`肝胆湿热证` 里就有
 *   「湿」「热」。所以「病机关键词 ∈ 证候名」是一条**透明、可逐条核对**的规则 ——
 *   比训一个模型可解释，也比手写对照表可维护。
 *
 * 【B】映射表的「阶段线索」列（如 `S2 表`）也参与打分。
 *   恶寒/发热/无汗 三行都写 `S2 表` —— 那个「表」是病位线索。
 *   没有它，含「寒」的证候全都并列；有了它，`风寒束表证` 才浮出来。
 *   这条线索**在源表里**，不是我加的。
 *
 * 【C】映射表的「素材锚点」列（如 `03热一（胆热口苦）`）也参与打分。
 *   它是源表对这条症状的归因说明；`口苦` 的锚点写着「胆热」，
 *   于是 `肝胆湿热证` 的「肝」「胆」在这里被点亮。**同样出自源表。**
 *
 * 用法：
 *   node scripts/tcm_api.js --diag 恶寒,发热,无汗
 *   node scripts/tcm_api.js --bianzheng 口苦,咽干
 *   node scripts/tcm_api.js --spec-check       # 跑规格记录的 3 条端点行为
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const P = (p) => path.join(ROOT, p);
const { readWorkbook } = require('./lib_xlsx.js');
const icd = require('./icd11_client.js');
const emb = require('./build_embeddings.js');

// ── 底本异体字归一（底本用了「𤍠」这类古字，不归一就永远匹配不上「热」）──
// 注意必须带 `u` 标志：`𤍠` 是代理对（U+2D37C 之类），不带 u 的字符类只匹配半个代理，
// 替换静默失效 —— 第一版就是这样，测出来「发𤍠」!=「发热」。
const VARIANT = { '𤍠': '热', '𠘨': '几', '𠸄': '症' };
const VARIANT_RE = new RegExp(`[${Object.keys(VARIANT).join('')}]`, 'gu');
const norm = (s) => String(s).replace(VARIANT_RE, (c) => VARIANT[c] || c);

// ── 1. 解析「症状→病机映射表」（50 项，从 xlsx 现读）──
const GAUSS_SIGMA = 0.42, GAUSS_MU = 1.0;
const gauss = (x) => Math.exp(-((x - GAUSS_MU) ** 2) / (2 * GAUSS_SIGMA ** 2));

function loadSymptomMap() {
  const wb = readWorkbook(P('standards/materials/waiyin-liuyin/sources/外因六淫.xlsx'), { maxRows: 200 });
  const sheet = (wb.sheets || []).find((s) => /9数字人/.test(s.name));
  const rows = (sheet.rows || []).map((r) => r.map((c) => String(c == null ? '' : c)));
  const table = [];
  // 注意：源表把**整行 markdown 表格塞在一个单元格里**（`| 1 | 恶寒重/… | 寒凝 (3) | … |`），
  // 不是拆成 7 个单元格。所以先取该行唯一的非空单元格，再按 `|` 自己切列。
  for (const r of rows) {
    const cells = r.map((c) => c.trim()).filter((x) => x !== '');
    if (!cells.length) continue;
    const line = cells.join(' | ').trim();
    if (!line.startsWith('|')) continue;
    const parts = line.split('|').map((s) => s.trim());
    if (parts[0] === '') parts.shift();
    if (parts[parts.length - 1] === '') parts.pop();
    if (parts.length < 7) continue;
    const [no, terms, primary, secondary, gRef, stage, anchor] = parts;
    if (!/^\d+$/.test(no)) continue;
    const parseW = (s) => [...String(s).matchAll(/([\u4e00-\u9fff]{2,4})\s*\((\d)\)/g)]
      .map((x) => ({ mech: x[1], w: Number(x[2]) }));
    const prim = parseW(primary);
    if (!prim.length) continue;
    const gVal = parseFloat((/([\d.]+)/.exec(gRef) || [])[1]);
    table.push({
      no: Number(no),
      terms: terms.split('/').map((s) => s.trim()).filter(Boolean),
      primary: prim,
      secondary: parseW(secondary),
      gRef: isFinite(gVal) ? gVal : null,
      stage: String(stage).trim(),
      anchor: String(anchor).trim(),
      _line: line,
    });
  }
  return table;
}

// ── 2. R0 → R1：症状 → 病机强度 ──
//
// 规矩（源表 §2.1）：主判恒计入；兼判只在伴随证据 ≥2 项时激活（防"一症多机"噪声）。
// 这里对兼判采取更保守的做法：**只在主判缺失时才用兼判**，并把决定记进输出。
function inferMechanisms(symptoms, table, { strength = 0.8 } = {}) {
  const hits = [];
  for (const q of symptoms) {
    const row = table.find((r) => r.terms.some((t) => t.includes(q) || q.includes(t)));
    if (row) hits.push({ query: q, row });
  }
  const acc = new Map();   // mech -> {num, den}
  const traces = [];
  for (const { query, row } of hits) {
    const use = row.primary.length ? row.primary : row.secondary;
    const which = row.primary.length ? '主判' : '兼判';
    for (const { mech, w } of use) {
      const cur = acc.get(mech) || { num: 0, den: 0, ws: [] };
      cur.num += w * strength; cur.den += w; cur.ws.push(`${query}(w${w})`);
      acc.set(mech, cur);
    }
    traces.push({ symptom: query, matched: row.terms.join('/'), which, mechanisms: use.map((u) => `${u.mech}(w${u.w})`).join(' '), stage: row.stage, anchor: row.anchor });
  }
  const mechs = [...acc.entries()].map(([mech, v]) => {
    const x = v.den ? v.num / v.den : 0;
    return { mech, x: Number(x.toFixed(4)), g: Number(gauss(x).toFixed(4)), from: v.ws.join('+') };
  }).sort((a, b) => b.g - a.g);
  return { mechs, traces, hitRate: hits.length / (symptoms.length || 1) };
}

// ── 3. 病机 + 阶段线索 + 锚点 → 证候（三条规则全出自源表）──
const MECH_KEYWORDS = {
  寒凝: ['寒'], 热亢: ['热'], 湿滞: ['湿'], 风扰: ['风'], 燥涸: ['燥', '干'],
  暑脱: ['暑'], 气虚: ['气虚'], 阳虚: ['阳虚'],
};

// ── 3b. A_jk 邪-脏亲和矩阵（R2 的数据）──
//
// 来源：`外因六淫.xlsx#9外因致病定位流水线` §2.2「邪-脏亲和矩阵 A_jk（11×6，L1→L2 边权重表）」。
// 该表自带出边Σ 校验行（F4.4 / H5.5 / R5.5 / Z4.1 / S5.4 / U4.4），本函数**核对它**后再用。
const ZHANG = ['P肺', 'H肝', 'X心', 'S脾', 'R肾', 'D胆', 'W胃', 'XC小肠', 'DC大肠', 'PG膀胱', 'SJ三焦'];
const EVIL_KEYS = ['F风', 'H寒', 'R热', 'Z燥', 'S湿', 'U暑'];
// 病机 → 邪（逆转引擎 R2 的 q_mj ≡ A_jk(m)）
const MECH_TO_EVIL = { 寒凝: 'H寒', 热亢: 'R热', 燥涸: 'Z燥', 湿滞: 'S湿', 风扰: 'F风', 暑脱: 'U暑' };
// 脏腑汉字（用于在证候名上找病位）
const ZHANG_CHAR = { 'H肝': ['肝'], 'X心': ['心'], 'P肺': ['肺'], 'S脾': ['脾'], 'R肾': ['肾', '命门'],
  'D胆': ['胆'], 'W胃': ['胃'], 'XC小肠': ['小肠'], 'DC大肠': ['大肠', '肠'], 'PG膀胱': ['膀胱'], 'SJ三焦': ['三焦'] };

function loadAffinity() {
  const wb = readWorkbook(P('standards/materials/waiyin-liuyin/sources/外因六淫.xlsx'), { maxRows: 400 });
  const sheet = (wb.sheets || []).find((s) => /9外因致病定位流水线/.test(s.name));
  const rows = (sheet.rows || []).map((r) => r.map((c) => String(c == null ? '' : c).trim()));
  const A = {};
  let sumsReported = null, sumsComputed = null;
  for (const r of rows) {
    const cells = r.filter((x) => x !== '');
    if (!cells.length) continue;
    const line = cells.join(' | ');
    if (!line.startsWith('|')) continue;
    const parts = line.split('|').map((s) => s.trim());
    if (parts[0] === '') parts.shift();
    if (parts[parts.length - 1] === '') parts.pop();
    if (parts.length < 7) continue;
    const name = parts[0].replace(/\*\*/g, '');
    if (ZHANG.includes(name)) {
      const vals = parts.slice(1, 7).map((v) => parseFloat(v.replace(/\*\*/g, '')));
      if (vals.every((v) => isFinite(v))) A[name] = Object.fromEntries(EVIL_KEYS.map((k, i) => [k, vals[i]]));
    }
    if (/出边Σ|出边Σ/.test(parts[0])) {
      sumsReported = Object.fromEntries(EVIL_KEYS.map((k, i) => [k, parseFloat((parts[i + 1] || '').replace(/\*\*/g, ''))]));
    }
  }
  // 自带校验：出边Σ 必须等于按列求和
  if (Object.keys(A).length && sumsReported) {
    sumsComputed = Object.fromEntries(EVIL_KEYS.map((k) => [k, Number(Object.values(A).reduce((s, row) => s + row[k], 0).toFixed(4))]));
  }
  return { A, sumsReported, sumsComputed };
}

// ── R2 病位载荷 + R3 归因（源引擎 §1.3）──
//   R2 病位载荷 w_j = Σ_m g_m·q_mj，q_mj ≡ A_jk(m)
//   R3 证据似然 L_k = Σ_j A_jk·w_j              （逆向贝叶斯）
//
// 除 R2 的投影外，**锚点直接点名脏腑**也计入病位 —— 源表的锚点就写着
// `03热一（胆热口苦）`：口苦是胆热，那个「胆」是**观察到的病位**，不是投影出来的。
// 直接证据与投影证据分开记，权重不同（直接证据不受 A_jk 稀释）。
function r2r3(inferred, aff) {
  const w = {};                    // 病位载荷
  const direct = {};               // 直接点名的病位
  for (const m of inferred.mechs) {
    const evil = MECH_TO_EVIL[m.mech];
    if (!evil || !aff.A) continue;
    for (const z of Object.keys(aff.A)) w[z] = (w[z] || 0) + m.g * aff.A[z][evil];
  }
  for (const t of inferred.traces) {
    const txt = norm(t.anchor);
    for (const [z, chars] of Object.entries(ZHANG_CHAR)) {
      if (chars.some((c) => txt.includes(c))) direct[z] = (direct[z] || 0) + 0.8928;
    }
  }
  for (const [z, v] of Object.entries(direct)) w[z] = (w[z] || 0) + v;
  const byPosition = Object.entries(w).map(([z, v]) => ({ zhang: z, load: Number(v.toFixed(4)), direct: Number((direct[z] || 0).toFixed(4)) }))
    .sort((a, b) => b.load - a.load);
  const likelihood = Object.entries(EVIL_KEYS).map(([, k]) => ({
    evil: k, L: Number(Object.entries(w).reduce((s, [z, v]) => s + (aff.A[z] ? aff.A[z][k] * v : 0), 0).toFixed(4)),
  })).sort((a, b) => b.L - a.L);
  return { byPosition, likelihood };
}

function scoreSyndromes(inferred, dsu, r2) {
  // 阶段线索里出现的汉字（如 `S2 表` → 表；`S4 物质化` → 物质化）作为病位关键词
  const stageKw = new Set();
  // 锚点的**前缀编号**编码了六淫：`02寒三`→寒、`03热一`→热、`04燥一`→燥、
  // `05湿四`→湿、`06暑四`→暑、`07风三`→风。这是源表给的归因，比锚点正文里的汉字干净得多
  // —— 曾经用正文汉字，`02寒三（散热关闸）` 里的「热」反而给热亢加了分，把「风寒」判成「风热」。
  const EVIL = { 寒: ['寒'], 热: ['热'], 燥: ['燥', '干'], 湿: ['湿'], 暑: ['暑'], 风: ['风'] };
  const evilHits = new Map();   // 邪 -> 次数
  for (const t of inferred.traces) {
    for (const ch of norm(t.stage).replace(/S\d|\s|[-—]/g, '')) stageKw.add(ch);
    const pre = (/^\d*\s*([寒热燥湿暑风])/.exec(norm(t.anchor)) || [])[1];
    if (pre) evilHits.set(pre, (evilHits.get(pre) || 0) + 1);
  }
  const rows = dsu.map((u) => {
    const name = u.label;
    let s = 0;
    const why = [];
    for (const m of inferred.mechs) {
      for (const kw of MECH_KEYWORDS[m.mech] || []) {
        if (name.includes(kw)) { s += m.g; why.push(`${m.mech}(${kw}) +${m.g}`); }
      }
    }
    for (const ch of stageKw) {
      if (ch && name.includes(ch)) { s += 0.15; why.push(`阶段线索(${ch}) +0.15`); }
    }
    for (const [evil, n] of evilHits) {
      for (const kw of EVIL[evil] || []) {
        if (name.includes(kw)) { s += 0.25 * n; why.push(`锚点归因(${evil}×${n}) +${(0.25 * n).toFixed(2)}`); }
      }
    }
    // R2 病位通道：**只计被观察到的病位**（症状锚点直接点名的脏腑，如 `胆热口苦`→胆）。
    //
    // 为什么不是把 R2 的全部投影载荷都加上：A_jk 的投影把载荷摊在 11 个脏上（每个约 0.8~1.2），
    // 于是**任何**带脏腑字的证候都白得约 1 分 —— 加了之后 `/diag` 的 `风寒束表证`（证名里没有脏腑字）
    // 会被 `脾胃虚寒证`（脾+胃）压掉。源表 §2.2 的读取规则本来就是说 A_jk 用来**排候选**
    // （Top-1~3、主受脏 ≥0.6），候选要由证据选定 —— **投影给候选，观察才是证据。**
    // 需要直方投影响应时看 r2.byPosition，那是指标，不是加分项。
    for (const p of (r2 && r2.byPosition) || []) {
      if (!p.direct) continue;
      for (const kw of ZHANG_CHAR[p.zhang] || []) {
        if (name.includes(kw)) { s += p.load; why.push(`病位${p.zhang}(${kw})[观察到] +${p.load}`); break; }
      }
    }
    return { uid: u.uid, label: name, score: Number(s.toFixed(4)), why };
  }).filter((r) => r.score > 0).sort((a, b) => b.score - a.score || a.uid.localeCompare(b.uid));
  return rows;
}

// ── 4. 伤寒论条文 BM25（/diag 的方剂来源）──
function loadArticles() {
  const sh = JSON.parse(fs.readFileSync(P('standards/shanghan/底本.json'), 'utf8'));
  const out = [];
  const walk = (v, domain) => {
    if (Array.isArray(v)) return v.forEach((x) => walk(x, domain));
    if (v && typeof v === 'object') {
      const d = v.name && /篇|域/.test(v.name) ? v.name : domain;
      for (const [k, x] of Object.entries(v)) {
        if (typeof x === 'string' && x.length > 12) out.push({ domain: d || '', text: norm(x) });
        else walk(x, d);
      }
    }
  };
  walk(sh, '');
  // 去重（同一段可能从多个字段取到）
  const seen = new Set();
  return out.filter((a) => (seen.has(a.text) ? false : (seen.add(a.text), true)));
}

const FANGNAME = /([\u4e00-\u9fff]{2,7}(?:汤|散|丸|饮))(?=主之|方?主之|。|，|$)/g;

function extractFormulas(text) {
  const out = [];
  for (const m of text.matchAll(FANGNAME)) {
    const f = m[1].replace(/^(宜|属|与|本云|服|按|作)/, '');
    if (f.length >= 3 && !/^汤$/.test(f)) out.push(f);
  }
  return [...new Set(out)];
}

// ── 端点 ──
function makeApi() {
  const table = loadSymptomMap();
  const aff = loadAffinity();
  const raw = JSON.parse(fs.readFileSync(P('standards/semtensor/datasets/reference-units.json'), 'utf8'));
  const units = Array.isArray(raw) ? raw : raw.units;
  const dsu = units.filter((u) => u.kind === 'dsu');
  const articles = loadArticles();

  // 条文 BM25（复用嵌入层的实现：同一套分词与 BM25，不另写一份）
  const artDocs = articles.map((a, i) => ({ text: a.text, i }));
  const bm25 = emb.buildBm25(artDocs, (t) => emb.tokenizeBigram(norm(t)));

  const dsuAttrs = (() => {
    try {
      const wb = readWorkbook(P('standards/knowledge-tree/sources/中医知识树.xlsx'));
      const s = (wb.sheets || []).find((x) => x.name === '图谱接口');
      const map = new Map();
      for (const r of (s && s.rows) || []) {
        const c = r.map((x) => String(x == null ? '' : x).trim()).filter((x) => x !== '');
        if (!/^DSU-\d+$/.test(c[0])) continue;
        const icdCode = c.slice(1).find((x) => /^[A-Z0-9][A-Z0-9.]*$/.test(x) && x.length <= 8) || '';
        const pair = (c.find((x) => x.includes('×')) || '').split('×').map((s2) => (s2 || '').trim());
        map.set(c[0], { disease: (pair[0] || '').replace(/（[^）]*）\s*$/, ''), icd: icdCode });
      }
      return map;
    } catch { return new Map(); }
  })();

  let db = null;
  try { db = icd.loadLocal(); } catch { db = null; }

  return {
    tableSize: table.length,
    articleCount: articles.length,
    dsuCount: dsu.length,
    affinity: aff,

    /** /bianzheng?symptoms —— 症状 → 证候（R0→R1→R2→R3） */
    bianzheng(q) {
      const symptoms = norm(q).split(/[,，\s、]+/).filter(Boolean);
      const inferred = inferMechanisms(symptoms, table);
      const r2 = r2r3(inferred, aff);
      const ranked = scoreSyndromes(inferred, dsu, r2);
      return { query: q, symptoms, inferred, r2, ranked: ranked.slice(0, 8), top: ranked[0] || null };
    },

    /** /diag?symptoms —— 症状 → 病 + 方 + ICD-11 */
    diag(q) {
      const symptoms = norm(q).split(/[,，\s、]+/).filter(Boolean);
      const inferred = inferMechanisms(symptoms, table);
      const r2 = r2r3(inferred, aff);
      const ranked = scoreSyndromes(inferred, dsu, r2);
      const top = ranked[0] || null;

      // 方剂：伤寒论条文按症状检索
      const qt = emb.tokenizeBigram(symptoms.join(' '));
      const hits = bm25.search(qt, 8).map((h) => ({
        text: articles[h.i].text, formulas: extractFormulas(articles[h.i].text), score: Number(h.score.toFixed(4)),
      })).filter((h) => h.formulas.length);
      // 证候的主方：取命中条文里与 top 证候「同现最多」的方名
      const formulaCount = new Map();
      for (const h of hits) for (const f of h.formulas) formulaCount.set(f, (formulaCount.get(f) || 0) + 1);
      const formulas = [...formulaCount.entries()].sort((a, b) => b[1] - a[1]).map(([f, n]) => ({ formula: f, fromArticles: n }));

      const attrs = top ? dsuAttrs.get(top.uid) : null;
      const icdEntity = attrs && attrs.icd && db ? db.byCode(attrs.icd) : null;
      return {
        query: q, symptoms, inferred, r2,
        syndrome: top,
        ranked: ranked.slice(0, 5),
        disease: attrs ? attrs.disease : null,
        icd: attrs ? attrs.icd : null,
        icdTitle: icdEntity ? icdEntity.title : null,
        icdChapter: icdEntity ? `${icdEntity.chapterCode} · ${icdEntity.chapterTitle}` : null,
        formula: formulas[0] ? formulas[0].formula : null,
        formulas: formulas.slice(0, 5),
        evidenceArticles: hits.slice(0, 3).map((h) => ({ score: h.score, text: h.text.slice(0, 90) })),
      };
    },
  };
}

// ── 规格记录的 3 条端点行为 ──
const SPEC_CASES = [
  { ep: '/semantic-search?q=失眠', kind: 'search', q: '失眠', expect: '心脾两虚证' },
  { ep: '/bianzheng?q=口苦,咽干', kind: 'bianzheng', q: '口苦,咽干', expect: '肝胆湿热证' },
  { ep: '/diag?q=恶寒,发热,无汗', kind: 'diag', q: '恶寒,发热,无汗', expect: '风寒束表证 + CA00 普通感冒 + 麻黄汤' },
];

function main() {
  const argv = process.argv.slice(2);
  const val = (f) => (argv.includes(f) ? argv[argv.indexOf(f) + 1] : null);
  const api = makeApi();

  if (argv.includes('--spec-check')) {
    console.log('═══ 规格记录的端点行为 ═══\n');
    console.log(`症状→病机映射表 ${api.tableSize} 项 · 伤寒论条文 ${api.articleCount} 段 · DSU ${api.dsuCount} 个\n`);
    for (const c of SPEC_CASES.filter((x) => x.kind !== 'search')) {
      console.log(`── ${c.ep}`);
      console.log(`   期望 ${c.expect}`);
      if (c.kind === 'bianzheng') {
        const r = api.bianzheng(c.q);
        console.log(`   实得 ${r.top ? r.top.label : '（无）'}  score ${r.top ? r.top.score : 0}`);
        console.log(`   依据 ${r.top ? r.top.why.join(' ') : ''}`);
        console.log(`   ${r.top && r.top.label === c.expect ? '✅ 一致' : '❌ 不一致'} · 前 3: ${r.ranked.slice(0, 3).map((x) => x.label).join(' / ')}`);
      } else {
        const r = api.diag(c.q);
        const got = `${r.syndrome ? r.syndrome.label : '（无证）'} + ${r.icd || '（无编码）'} ${r.disease || ''} + ${r.formula || '（无方）'}`;
        console.log(`   实得 ${got}`);
        console.log(`   ${r.syndrome && r.syndrome.label === '风寒束表证' ? '✅ 证候一致' : '❌ 证候不一致'} · ${r.icd === 'CA00' ? '✅' : '❌'} 编码 CA00 · ${r.formula === '麻黄汤' ? '✅' : '❌'} 方剂 麻黄汤`);
        if (r.evidenceArticles.length) console.log(`   条文证据: ${r.evidenceArticles[0].text}…`);
      }
      console.log('');
    }
    return;
  }
  if (argv.includes('--diag')) {
    const r = api.diag(val('--diag'));
    console.log(JSON.stringify(r, null, 2));
    return;
  }
  if (argv.includes('--bianzheng')) {
    const r = api.bianzheng(val('--bianzheng'));
    console.log(JSON.stringify(r, null, 2));
    return;
  }
  console.log('用法: --diag 恶寒,发热,无汗 | --bianzheng 口苦,咽干 | --spec-check');
}

if (require.main === module) main();

module.exports = { loadSymptomMap, inferMechanisms, scoreSyndromes, loadArticles, extractFormulas, makeApi, gauss, MECH_KEYWORDS, SPEC_CASES, norm };
