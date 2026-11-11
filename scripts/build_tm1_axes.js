#!/usr/bin/env node
/**
 * scripts/build_tm1_axes.js — 四轴词表 + 探针组合器
 *
 * ICD-11 Reference Guide §3.2.26（PDF p.331）原话：
 *   "Traditional Medicine disorder and pattern are named after the **body structures,
 *    causal explanations, properties and severity** which present for clinical investigation
 *    and diagnosis."
 *
 * 本模块把这句话落成两样东西：
 *   ① **四轴词表** —— 英文轴词 + 在 472 条官方 TM1 题名里的出现次数（零次的自动剔除）；
 *   ② **探针组合器** —— 中文证名 → 切词 → 每个英文片段归到某条轴上 → 按官方轴序重排 → 拼探针，
 *      并检查这个组合在官方题名里**有没有同构先例**（attest）。它替掉的是此前
 *      「查 WHO 词表、把英文词按出现顺序拼起来」的做法：那样只能保证「每个字都在表里」，
 *      不保证拼出来的东西符合命名法。
 *
 * ── 词表怎么来的（不许凭空列） ────────────────────────────────
 *   ① 英文种子由人列出（中医常识：liver / heat / deficiency …）；
 *   ② **只保留在 472 条官方 TM1 题名里真出现过的项**，每条记出现次数与示例编码；
 *      零次的自动剔除 —— 所以「六腑」「heart system」这类臆造写法进不来；
 *   ③ 轴序不手排：只用「出现了 ≥2 个不同轴」的官方题名两两计先后，按多数排定。
 *
 * ── 中文词怎么补（这是本轮真正动的刀） ────────────────────────
 * WHO 词表（ISTT）里没有「壅 / 痹 / 瘀 / 阻 / 亏 / 淫 / 犯」这些**证名构件**，
 * 所以 11 个复合证名切不动。这些词的中文形式**不靠猜**，靠官方 zh/en 对：
 *
 *   SF89  痰热壅肺证 = Phlegm heat **obstructing** the lung pattern      → 壅 = obstructing
 *   SA2Y  胸痹        = Chest **impediment** disorders                   → 痹 = impediment
 *   SF01  血瘀证      = Blood **stasis** pattern                         → 瘀 = stasis
 *   SF63  心脉痹阻证  = Heart meridian **obstruction** pattern            → 阻 = obstruction
 *   SF75  脾虚血亏证  = Spleen deficiency and blood **depletion** pattern → 亏 = depletion
 *   SE80  风淫证      = Wind **factor** pattern                          → 淫 = factor
 *   SF5L  肝火犯胃证  = Liver fire **invading** the stomach system        → 犯 = invading
 *
 * 每条都在 `PAIR_CITED` 里带出处编码，`--check` 会重新核对这些码里确实同时含中文片段与英文词。
 * 官方 472 条里**没有**的词（内停 / 失养 / 浸淫 / 互结 / 晶珠混浊）就不补 —— 没有出处，
 * 硬造一个英文词只会把「查不到」变成「查错了」。
 *
 * 用法：
 *   node scripts/build_tm1_axes.js                 # 建表 + 组合器自检
 *   node scripts/build_tm1_axes.js --check         # CI：重算并与产物比对
 *   node scripts/build_tm1_axes.js --probe 痰热壅肺证
 *   node scripts/build_tm1_axes.js --decompose "Phlegm heat obstructing the lung pattern"
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const ZH_NAMES = path.join(ROOT, 'standards/icd11/zh-names.json');
const OUT = path.join(ROOT, 'standards/icd11/tm1/axes.json');

/**
 * 英文种子。**这不是词表本身** —— 词表 = 种子 ∩ 官方题名里出现过。
 * 列宽一点没关系，零次的会被剔除并记进 `audit.droppedSeeds`。
 */
const SEED = {
  locus: [
    'liver', 'lung', 'heart', 'spleen', 'kidney', 'stomach', 'intestine', 'gallbladder',
    'bladder', 'uterus', 'brain', 'skin', 'muscle', 'bone', 'joint', 'eye', 'ear', 'nose',
    'throat', 'chest', 'hypochondrium', 'abdomen', 'meridian', 'vessel', 'menstruation',
    'mouth', 'tongue', 'tooth', 'hair', 'nail', 'anus', 'genitals', 'neck', 'back', 'limb',
    'marrow', 'sinew', 'collateral', 'small intestine', 'large intestine', 'triple energizer',
    'phase', 'stage', 'body', 'reproductive', 'organ', 'systems',
  ],
  cause: [
    'heat', 'cold', 'wind', 'dampness', 'fire', 'dryness', 'phlegm', 'food', 'alcohol',
    'emotion', 'anger', 'worry', 'fright', 'overwork', 'fatigue', 'trauma', 'insect',
    'parasite', 'pestilence', 'summerheat', 'toxin', 'poison', 'factor', 'water',
  ],
  property: [
    'deficiency', 'excess', 'stasis', 'stagnation', 'binding', 'retention', 'depletion',
    'collapse', 'obstruction', 'blockage', 'rebellion', 'sinking', 'prolapse', 'qi', 'blood',
    'fluid', 'yin', 'yang', 'essence', 'impediment', 'accumulation', 'invading', 'obstructing',
    'harassing', 'failing', 'unstable', 'interior', 'exterior', 'distension', 'edema',
    'defense', 'nutrient', 'pain', 'abscess', 'consumption', 'atrophy', 'flaccidity',
    'convulsion', 'spasm', 'paralysis', 'numbness', 'itching', 'ulcer', 'erosion',
    // 官方题名里高频出现、但上面没列的属性词（郁/上亢/两虚/不摄/不交/水泛/失和/浊/结块…）
    'depression', 'ascendant', 'hyperactivity', 'dual', 'failure', 'constrain', 'constraint',
    'interaction', 'flood', 'flooding', 'wheezing', 'disharmony', 'combined', 'turbid', 'block',
    'spirit', 'damaging', 'warmth', 'entering', 'true',
  ],
  severity: [
    'severe', 'mild', 'acute', 'chronic', 'recurrent', 'profuse', 'sudden', 'protracted',
    'persistent', 'intractable',
  ],
};

/**
 * 官方 zh/en 对里能直接读出来的 zh→en 构件。**每条必须带出处编码**，
 * `--check` 会核对：该码的中文名含 `zh`、英文名含 `en`。
 */
const PAIR_CITED = [
  { zh: '壅', en: 'obstructing', codes: ['SF89'], why: '痰热壅肺证 = Phlegm heat obstructing the lung pattern' },
  { zh: '痹', en: 'impediment', codes: ['SA2Y', 'SC50'], why: '胸痹 / 痛痹 = chest / cold impediment disorder' },
  { zh: '瘀', en: 'stasis', codes: ['SF01'], why: '血瘀证 = Blood stasis pattern' },
  { zh: '阻', en: 'obstruction', codes: ['SF63'], why: '心脉痹阻证 = Heart meridian obstruction pattern' },
  { zh: '亏', en: 'depletion', codes: ['SF75', 'SF95'], why: '脾虚血亏证 = spleen deficiency and blood depletion' },
  { zh: '淫', en: 'factor', codes: ['SE80', 'SE82'], why: '风淫证 / 湿淫证 = Wind / Dampness factor pattern' },
  { zh: '犯', en: 'invading', codes: ['SF5L', 'SF8A'], why: '肝火犯胃证 = liver fire invading the stomach system' },
  { zh: '束', en: 'exterior', codes: [], why: '（无直接对：风寒束表证在 WHO 表里写作 exterior cold pattern，靠词表原有条目）' },
].filter((x) => x.codes.length);

const STOP = new Set(['pattern', 'patterns', 'disorder', 'disorders', 'and', 'of', 'the', 'with',
  'in', 'type', 'other', 'specified', 'unspecified', 'system', 'tm1', 'associated', 'due', 'to',
  'which', 'present', 'for', 'clinical', 'investigation', 'diagnosis']);

const AXES = ['locus', 'cause', 'property', 'severity'];
const AXIS_ZH = { locus: '身体结构', cause: '病因解释', property: '属性', severity: '严重程度' };

function words(title) {
  return String(title).replace(/\(TM[12]\)/g, ' ').toLowerCase()
    .replace(/[-/]/g, ' ').replace(/[^a-z\s]/g, ' ')
    .split(/\s+/).filter((w) => w && !STOP.has(w));
}

function readZhNames() {
  if (!fs.existsSync(ZH_NAMES)) throw new Error(`缺 ${path.relative(ROOT, ZH_NAMES)} —— 先跑 npm run icd11:zh-names`);
  return JSON.parse(fs.readFileSync(ZH_NAMES, 'utf8'));
}

// ── ① 词表：种子 ∩ 官方题名 ────────────────────────────────

function buildLexicon(tm1) {
  const toksByCode = new Map(tm1.map((n) => [n.code, words(n.en)]));
  const lexicon = {};
  const dropped = [];
  for (const axis of AXES) {
    lexicon[axis] = [];
    for (const e of SEED[axis]) {
      const parts = e.split(' ');
      const codes = [];
      for (const [code, toks] of toksByCode) if (parts.every((p) => toks.includes(p))) codes.push(code);
      if (!codes.length) { dropped.push({ axis, en: e, why: '官方 472 条题名里 0 次' }); continue; }
      lexicon[axis].push({ en: e, n: codes.length, codes: codes.sort() });
    }
    lexicon[axis].sort((a, b) => b.n - a.n || (a.en < b.en ? -1 : 1));
  }
  return { lexicon, dropped };
}

/** 英文题名 → 轴序列（两词组合优先，再单词） */
function decomposeEn(title, lexicon) {
  const toks = words(title);
  const hits = [];
  const taken = new Array(toks.length).fill(false);
  const pairs = [];
  for (const axis of AXES) for (const e of lexicon[axis]) {
    const parts = e.en.split(' ');
    if (parts.length === 2) pairs.push({ axis, en: e.en, parts });
  }
  pairs.sort((a, b) => b.en.length - a.en.length);
  for (const p of pairs) {
    for (let i = 0; i + 1 < toks.length; i++) {
      if (taken[i] || taken[i + 1]) continue;
      if (toks[i] === p.parts[0] && toks[i + 1] === p.parts[1]) {
        hits.push({ axis: p.axis, en: p.en, at: i });
        taken[i] = taken[i + 1] = true;
      }
    }
  }
  for (let i = 0; i < toks.length; i++) {
    if (taken[i]) continue;
    for (const axis of AXES) {
      const e = lexicon[axis].find((x) => x.en === toks[i]);
      if (e) { hits.push({ axis, en: e.en, at: i }); taken[i] = true; break; }
    }
  }
  hits.sort((a, b) => a.at - b.at);
  return { hits, residual: toks.filter((t, i) => !taken[i]), order: hits.map((h) => h.axis) };
}

/** 轴序：只用 ≥2 个不同轴的题名，两两计先后 */
function learnOrder(parsedTitles) {
  const prec = new Map();
  for (const t of parsedTitles) {
    const distinct = [...new Set(t.axes)];
    if (distinct.length < 2) continue;
    for (let i = 0; i < distinct.length; i++) {
      for (let j = i + 1; j < distinct.length; j++) {
        const k = `${distinct[i]}>${distinct[j]}`;
        prec.set(k, (prec.get(k) || 0) + 1);
      }
    }
  }
  const wins = new Map(AXES.map((a) => [a, 0]));
  for (const [k, n] of prec) {
    const [a, b] = k.split('>');
    wins.set(a, (wins.get(a) || 0) + n);
    wins.set(b, (wins.get(b) || 0) - n);
  }
  const order = [...AXES].sort((a, b) => (wins.get(b) - wins.get(a)) || AXES.indexOf(a) - AXES.indexOf(b));
  return { order, precedence: [...prec.entries()].sort((a, b) => b[1] - a[1]).map(([pair, n]) => ({ pair, n })) };
}

// ── ② 中文 → 英文片段（词表 + 官方对里读出来的构件）──────────

let Z = null;
function glossary() { if (!Z) Z = require('./lib_zh_en.js'); return Z; }

/**
 * 把证名切成英文片段。先走 WHO 词表（有代码可回查），再补 `PAIR_CITED` 里那些
 * 词表没有但官方 zh/en 对里读得出来的构件。
 * @returns {{segments:Array<{zh:string,en:string,source:string,code?:string}>, unmatched:string}}
 */
function segmentsOf(zhLabel, axesDoc) {
  const G = glossary();
  const label = String(zhLabel).replace(/[（(][^（）()]*[）)]/g, '').replace(/[、，,]/g, '');
  const cited = (axesDoc && axesDoc.zhExtensions) || PAIR_CITED;
  const out = [];
  let unmatched = '';
  // 先把 PAIR_CITED 的构件替换成占位，剩下的交给词表 —— 否则「瘀」会被词表切成「瘀血」
  // 之类更长的条目，或干脆整段落进 unmatched。
  let work = label;
  const marks = [];
  const sorted = [...cited].sort((a, b) => b.zh.length - a.zh.length);
  for (const c of sorted) {
    while (work.includes(c.zh)) {
      const idx = work.indexOf(c.zh);
      const key = `\u0001${marks.length}\u0001`;
      marks.push({ ...c, at: idx });
      work = work.slice(0, idx) + key + work.slice(idx + c.zh.length);
    }
  }
  // 词表切剩下的部分
  const chunks = work.split(/\u0001\d+\u0001/);
  const segs = [];
  for (const ch of chunks) {
    if (!ch) continue;
    const t = G.translate(ch);
    if (t.hasTerm || (t.terms && t.terms.length)) {
      for (const term of t.terms) segs.push({ zh: term.zh, en: G.stripCode(term.en), source: 'who-istt', code: term.code });
      if (t.unmatched) unmatched += t.unmatched;
    } else {
      unmatched += ch;
    }
  }
  for (const m of marks) segs.push({ zh: m.zh, en: m.en, source: 'pair-cited', code: m.codes[0], codes: m.codes });
  // 去掉「证 / 病 / pattern」这类壳
  const cleaned = segs.filter((s) => !/^(证|病症|病|证候)$/.test(s.zh)
    && !/^(pattern\/syndrome|pattern|patterns|syndrome|disease|disorder)$/i.test(String(s.en).trim()));
  for (const s of cleaned) {
    // 复合英文（wind-heat / dampness-heat / heat toxin）拆成轴词，便于归轴
    for (const w of String(s.en).toLowerCase().replace(/[^a-z]+/g, ' ').trim().split(' ')) {
      if (!w || /^(and|of|the|with|in|pattern|patterns|syndrome|disease|disorder)$/.test(w)) continue;
      out.push({ ...s, token: w });
    }
  }
  return { segments: cleaned, tokens: out, unmatched };
}

/** 英文 token → 轴（词表精确匹配；复合词按 token 分别归） */
function axisOfToken(tok, lexicon) {
  for (const axis of AXES) {
    if (lexicon[axis].some((x) => x.en === tok)) return axis;
  }
  return null;
}

/**
 * 组合探针：中文证名 → 英文字段（按官方轴序排列）→ 检索串 + 证据。
 * @returns {{
 *   en:string|null, segments:Array, axes:Array<{token:string,axis:string|null}>,
 *   uncovered:string[], axisClean:boolean, attested:string[], order:string[]
 * }}
 */
function probeForZh(zhLabel, axesDoc) {
  const A = axesDoc || loadAxes();
  const seg = segmentsOf(zhLabel, A);
  const toks = [];
  const seen = new Set();
  for (const s of seg.tokens) {
    const key = `${s.token}|${s.source}`;
    if (seen.has(key)) continue;
    seen.add(key);
    toks.push({ token: s.token, axis: axisOfToken(s.token, A.lexicon), source: s.source, zh: s.zh });
  }
  const order = (A.grammar && A.grammar.order) || AXES;
  const rank = (t) => (t.axis ? order.indexOf(t.axis) : 99);
  const sorted = [...toks].sort((a, b) => rank(a) - rank(b));
  const en = sorted.length ? `${sorted.map((t) => t.token).join(' ')} pattern` : null;
  const axed = sorted.filter((t) => t.axis);
  const uncovered = sorted.filter((t) => !t.axis).map((t) => t.token);
  // 「干净」= 每个英文片段都落在某条轴上，且至少两个片段。
  // 不要求「两个**不同**的轴」——「water dampness pattern」是两个病因的组合，
  // 官方里就有这种写法（dampness-heat）；拿不同轴当门槛会把它们误判成不干净。
  const axisClean = !!en && uncovered.length === 0 && axed.length >= 2;
  return {
    en,
    segments: seg.segments,
    axes: sorted.map((t) => ({ token: t.token, axis: t.axis, zh: t.zh, source: t.source })),
    uncovered,
    unmatchedZh: seg.unmatched,
    axisClean,
    order: sorted.map((t) => t.axis || '?'),
    attested: en ? attestTokens(axed.map((t) => t.token), A) : [],
  };
}

/** 同构先例：官方题名里轴词集合 ⊇ 本组合的码（是证据，不是相似度） */
function attestTokens(tokens, A) {
  const want = new Set(tokens);
  const out = [];
  for (const t of (A.audit && A.audit.parsedTitles) || []) {
    const have = new Set(t.values.map((v) => v.en));
    let ok = true;
    for (const w of want) if (!have.has(w)) { ok = false; break; }
    if (ok) out.push(t.code);
  }
  return out.slice(0, 8);
}

// ── ③ 建表 ────────────────────────────────────────────────

function build() {
  const doc = readZhNames();
  const tm1 = (doc.names || []).filter((n) => n.module === 'TM1' && n.zh && n.en);
  if (tm1.length < 400) throw new Error(`TM1 条目过少（${tm1.length}）—— 先重建 zh-names.json`);

  const { lexicon, dropped } = buildLexicon(tm1);

  const parsedTitles = [];
  const unparsed = [];
  for (const n of tm1) {
    const d = decomposeEn(n.en, lexicon);
    if (!d.order.length) { unparsed.push(n.code); continue; }
    parsedTitles.push({
      code: n.code, zh: n.zh, en: n.en, axes: d.order,
      values: d.hits.map((h) => ({ axis: h.axis, en: h.en })), residual: d.residual,
    });
  }
  const g = learnOrder(parsedTitles);

  // 构件核对：PAIR_CITED 的每个码里必须同时含中文片段与英文词
  const byCode = new Map(tm1.map((n) => [n.code, n]));
  const extIssues = [];
  for (const c of PAIR_CITED) {
    for (const code of c.codes) {
      const n = byCode.get(code);
      if (!n) { extIssues.push(`${c.zh}→${c.en}: 快照里没有 ${code}`); continue; }
      if (!n.zh.includes(c.zh)) extIssues.push(`${code} 的中文名「${n.zh}」不含「${c.zh}」`);
      if (!words(n.en).includes(c.en) && !n.en.toLowerCase().includes(c.en)) {
        extIssues.push(`${code} 的英文名「${n.en}」不含「${c.en}」`);
      }
    }
  }

  const out = {
    $about: 'ICD-11 TM1 四轴词表（body structures / causal explanations / properties / severity）'
      + ' + 探针组合器：词项与轴序全部来自官方 472 条 TM1 题名的统计，中文构件来自官方 zh/en 对',
    meta: {
      rule: 'Traditional Medicine disorder and pattern are named after the body structures, '
        + 'causal explanations, properties and severity (ICD-11 Reference Guide §3.2.26, PDF p.331)',
      source: { zhNames: path.relative(ROOT, ZH_NAMES) },
      policy: '英文种子人工列，只保留官方题名里 ≥1 次的项（零次进 dropped）；'
        + '轴序由 ≥2 轴的题名两两计先后；中文构件只收**官方 zh/en 对里读得出来**的（每条带码），'
        + '官方 472 条里没有的构件（内停/失养/浸淫/互结/晶珠混浊）不补 —— 没有出处就不造',
      counts: {
        tm1Titles: tm1.length,
        parsed: parsedTitles.length,
        unparsed: unparsed.length,
        perAxis: Object.fromEntries(AXES.map((a) => [a, lexicon[a].length])),
        dropped: dropped.length,
        zhExtensions: PAIR_CITED.length,
      },
    },
    lexicon,
    zhExtensions: PAIR_CITED,
    grammar: {
      order: g.order,
      note: '轴序由「出现了 ≥2 个不同轴的官方题名」两两计先后、按多数排定；单轴题名不参与',
      precedence: g.precedence,
    },
    audit: {
      droppedSeeds: dropped,
      extensionIssues: extIssues,
      unparsedCodes: unparsed.slice(0, 120),
      parsedTitles,
    },
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(out, null, 1)}\n`, 'utf8');

  console.log('═══ TM1 四轴词表 ═══');
  for (const axis of AXES) {
    const L = lexicon[axis];
    console.log(`  ${axis.padEnd(9)} ${AXIS_ZH[axis]} · ${L.length} 项 · `
      + L.slice(0, 8).map((x) => `${x.en}(${x.n})`).join(' '));
  }
  console.log(`  题名解析 ${parsedTitles.length}/${tm1.length}（未解析 ${unparsed.length}）· 轴序 ${g.order.join(' → ')}`);
  console.log(`  剔除种子 ${dropped.length} · 中文构件 ${PAIR_CITED.length}（出处核对问题 ${extIssues.length}）`);
  console.log(`  → ${path.relative(ROOT, OUT)}`);
  return out;
}

function loadAxes() {
  if (!fs.existsSync(OUT)) {
    throw new Error(`四轴词表未构建：缺 ${path.relative(ROOT, OUT)}\n  先跑 npm run icd11:axes`);
  }
  return JSON.parse(fs.readFileSync(OUT, 'utf8'));
}

function check() {
  const doc = build();
  const errs = [...(doc.audit.extensionIssues || [])];
  const c = doc.meta.counts;
  for (const axis of AXES) {
    for (const e of doc.lexicon[axis]) if (!e.n) errs.push(`${axis}/${e.en} 出现次数为 0 却留在词表里`);
  }
  if (c.parsed / c.tm1Titles < 0.5) errs.push(`题名解析率过低 ${c.parsed}/${c.tm1Titles}`);
  if (!doc.grammar.order.length) errs.push('轴序为空');
  if (errs.length) {
    console.error(`[axes] ✗ ${errs.slice(0, 8).join('；')}`);
    process.exit(1);
  }
  console.log(`[axes] ✓ ${AXES.reduce((n, a) => n + c.perAxis[a], 0)} 项轴词 · 解析 ${c.parsed}/${c.tm1Titles} · `
    + `轴序 ${doc.grammar.order.join('→')} · 中文构件 ${c.zhExtensions} 条全部有出处`);
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--check')) return check();
  if (argv.includes('--probe')) {
    const A = loadAxes();
    for (const label of argv.slice(argv.indexOf('--probe') + 1)) {
      const p = probeForZh(label, A);
      console.log(`${label}  →  ${p.en || '（无）'}`);
      console.log(`   轴：${p.axes.map((a) => `${a.token}[${a.axis || '?'}]`).join(' ')}`);
      console.log(`   未归轴：${p.uncovered.join(' ') || '—'} · 中文未匹配：${p.unmatchedZh || '—'}`);
      console.log(`   axisClean=${p.axisClean} · 先例：${p.attested.join(',') || '—'}`);
    }
    return undefined;
  }
  if (argv.includes('--decompose')) {
    const A = loadAxes();
    const t = argv[argv.indexOf('--decompose') + 1] || '';
    const d = decomposeEn(t, A.lexicon);
    console.log(d.hits.map((h) => `[${h.axis}] ${h.en}`).join('  '), '| residual:', d.residual.join(' '));
    return undefined;
  }
  return build();
}

if (require.main === module) {
  try { main(); } catch (e) { console.error(`\n✗ ${e.message}`); process.exit(1); }
}

module.exports = {
  build, check, loadAxes, decomposeEn, segmentsOf, probeForZh, attestTokens, axisOfToken,
  SEED, AXES, AXIS_ZH, PAIR_CITED, OUT,
};
