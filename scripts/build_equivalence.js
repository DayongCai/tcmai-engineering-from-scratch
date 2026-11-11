#!/usr/bin/env node
/**
 * scripts/build_equivalence.js —— 语义张量 · 等价映射（跨语种等价翻译层）
 *
 * ── 这一层要解决的事 ────────────────────────────────────────────
 * ICD-11 术语层是英文语料（MMS 快照只有英文定义），中文查询在它上面命中率≈0。
 * 上一版的做法是「中文证候 → 该证候的 WHO 英文名字段 → 打术语层」，
 * 而那个字段**只有 26/104 个证候有** —— 桥太窄，等于没有桥。
 *
 * 本层换一个定义方式：**等价 = 同一个语义点**。
 *
 *   三维极坐标语义张量给每个单元一个坐标 (θ, φ, r)（`规范-三维极坐标语义张量-v1.0.md` §5）。
 *   一个等价类绑定**恰好一个**张量点；类里的成员是不同语种/不同写法的同一术语。
 *   于是「翻译」不再是一次语言转换，而是**同一个点在另一个语种里的名字**：
 *
 *       中文查询 ──（等价类）──▶ 同一张量点 ──▶ 英文成员 ──▶ ICD-11 术语层
 *
 * 为什么这样定义而不是「相似度阈值」：相似度阈值会给出「0.83 相似所以要翻译成它」，
 * 而**同一个点**是全等关系 —— 要么在类里，要么不在。没有中间地带，也就没有
 * 「看起来差不多」的假等价。
 *
 * ── 判据分级（每一条都必须有出处，不许推断）─────────────────────
 *   A · 术语表同条   WHO ISTT 同一条目内的 zh ↔ en（书里逐条并列，代码 + 书页可回查）
 *                    —— 定义级等价，这是本层的主证据
 *   B · 编码同源     同一 WHO 条目的中文别名位、同一实体的英文别名（whoEnglishAliases）、
 *                    本仓库登记过的 ICD-11 编码及其官方英文标题
 *   C · 规范化同串   ICD-11 第 26 章（TM1）实体的英文标题与 WHO 英文名在**规范化后逐字相等**
 *                    （规范化规则见 normalizeEn：去代码前缀 / 统一 pattern/syndrome / 去 (TM1) /
 *                     修连字符断裂 / 去 of·the 等虚词后按词排序比较）
 *
 *   **不做**：跨类推断、同义词猜测、机器翻译、按相似度取最近邻。
 *   查不到英文名的单元进 `unresolved`，如实列出 —— 缺就是缺。
 *
 * ── 产物 ────────────────────────────────────────────────────
 *   standards/semtensor/equivalence/classes.json   （入库：等价类 + 张量点 + 成员 + 出处）
 *   standards/semtensor/equivalence/README.md      （口径与实测，手写）
 *
 * 用法：
 *   node scripts/build_equivalence.js            # 构建
 *   node scripts/build_equivalence.js --check    # 只校验既有产物（CI 用）
 *   node scripts/build_equivalence.js --stats    # 只报计数
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const OUTDIR = path.join(ROOT, 'standards/semtensor/equivalence');
const OUT = path.join(OUTDIR, 'classes.json');
const Z = require('./lib_zh_en.js');

/**
 * 四轴词表（`standards/icd11/tm1/axes.json`）。**可选依赖** —— 没建也不该让等价层挂掉，
 * 只是退回旧的切词拼接，并在产物里写明 `probe.method==='glossary'`。
 */
let AX = null;
let AX_AXES = null;
try {
  AX = require('./build_tm1_axes.js');
  AX_AXES = AX.loadAxes();
} catch (e) {
  AX = null;
  AX_AXES = null;
}

// 组合探针的最低覆盖率：低于它就不产出英文探针（宁可空手，不给半截译文）。
// 取 0.6 的依据见 `node scripts/lib_zh_en.js --coverage` 的实测分布。
const PROBE_MIN_COVERAGE = 0.6;

const P = {
  units: path.join(ROOT, 'standards/semtensor/datasets/reference-units.json'),
  desc: path.join(ROOT, 'standards/semtensor/descriptions/dsu-descriptions.json'),
  aliases: path.join(ROOT, 'standards/semtensor/descriptions/aliases.json'),
  whoTcm: path.join(ROOT, 'standards/semtensor/descriptions/who-tcm.json'),
  whoIstt: path.join(ROOT, 'standards/semtensor/descriptions/who-istt-terms.json'),
  icd: path.join(ROOT, 'data/icd11/entities.ndjson'),
};

// ── 规范化（两种语言各一套，规则写死在这里，测试钉死）──────────────

/** 中文：去括注（括注是解释位，不是术语本体）、压空白；繁简由 zhS 键承担 */
function normalizeZh(s) {
  return String(s == null ? '' : s)
    .replace(/[（(][^（）()]*[）)]/g, '')
    .replace(/\s+/g, '')
    .trim();
}

/**
 * 英文：去代码前缀 → 统一 pattern/syndrome 的三种写法 → 去 (TM1) → 修连字符断裂
 * → 只留字母数字 → 去 of/the/a 等虚词 → 词序归一（排序后拼接）。
 *
 * 两个有意的取舍，都有实测理由：
 *   1. **词序归一**：WHO 写 "dampness-heat in the spleen and stomach"，
 *      ICD-11 写 "spleen and stomach dampness-heat"，词序不同但词集相同 —— 排版差异不是语义差异。
 *      前提是**词集完全相同**，多一词少一词都不算。
 *   2. **category 词（pattern / syndrome）进停用词**：两侧对同一概念的 category 词写法不一致
 *      （WHO 有的条目写 "pattern/syndrome"、有的只写 "pattern"，ICD-11 TM1 统一后缀 "(TM1)"），
 *      不剥掉的话同一条术语永远对不上。剥掉后 "Deficiency pattern" 与 "虚"(deficiency) 同串，
 *      而 "Exterior pattern" 与 "Exterior cold with lung heat" 仍然不同 —— 区分度不受损。
 */
function normalizeEn(s) {
  let t = String(s == null ? '' : s).toLowerCase();
  t = t.replace(/^\s*\d{1,2}(\.\d{1,3}){0,2}\s+/, '');
  t = t.replace(/pattern\s*\/\s*syndrome/g, 'pattern syndrome');
  t = t.replace(/\(tm1\)/g, ' ');
  t = t.replace(/(\w)-\s+(\w)/g, '$1-$2');
  t = t.replace(/[^a-z0-9]+/g, ' ');
  const stop = new Set([
    'of', 'the', 'a', 'an', 'with', 'in', 'and', 'due', 'to', 'by', 'or',
    'pattern', 'syndrome', 'patterns', 'syndromes',
  ]);
  const toks = t.split(' ').filter((w) => w && !stop.has(w));
  return toks.sort().join(' ');
}

// ── 读取 ────────────────────────────────────────────────────

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function loadUnits() {
  const raw = readJson(P.units);
  const units = Array.isArray(raw) ? raw : raw.units || raw.items;
  return units.filter((u) => Number.isFinite(u.theta) && Number.isFinite(u.phi));
}

function loadIcd() {
  const byCode = new Map();
  const byNorm = new Map();           // normalizeEn(title|indexTerm) -> [entity]
  if (!fs.existsSync(P.icd)) return { byCode, byNorm, available: false };
  const lines = fs.readFileSync(P.icd, 'utf8').split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    const e = JSON.parse(line);
    if (!e.code) continue;
    byCode.set(e.code, e);
    for (const t of [e.title, ...String(e.indexTerms || '').split(';')]) {
      const k = normalizeEn(t);
      if (!k) continue;
      if (!byNorm.has(k)) byNorm.set(k, []);
      if (!byNorm.get(k).includes(e)) byNorm.get(k).push(e);
    }
  }
  return { byCode, byNorm, available: true };
}

/** WHO ISTT 术语表：简繁两套中文键 → 条目；规范化英文 → 条目 */
function loadWhoIstt() {
  if (!fs.existsSync(P.whoIstt)) {
    throw new Error(
      `缺 WHO ISTT 术语表：${path.relative(ROOT, P.whoIstt)}\n`
      + '  补法：python scripts/who_istt_terms.py build <rows.json>（需 2007 版 PDF + pdftotext -layout）',
    );
  }
  const d = readJson(P.whoIstt);
  const byZh = new Map();
  const byEn = new Map();
  for (const e of d.entries) {
    for (const z of e.zhS) if (!byZh.has(z)) byZh.set(z, e);
    for (const z of e.zh) if (!byZh.has(z)) byZh.set(z, e);
    const k = normalizeEn(e.en);
    if (k && !byEn.has(k)) byEn.set(k, e);
  }
  return { data: d, byZh, byEn };
}

// ── 构建 ────────────────────────────────────────────────────

function member(lang, form, strength, source) {
  return { lang, form: String(form).trim(), strength, source };
}

function build() {
  const units = loadUnits();
  const desc = readJson(P.desc);
  const aliases = fs.existsSync(P.aliases) ? readJson(P.aliases) : { entries: [] };
  const whoTcm = readJson(P.whoTcm);
  const istt = loadWhoIstt();
  const icd = loadIcd();

  // 证候描述记录（按 uid / 去括注证名索引）
  const descByUid = new Map();
  const descByLabel = new Map();
  for (const r of desc.records || []) {
    if (r.canonical) descByUid.set(r.canonical, r);
    if (r.label) descByLabel.set(normalizeZh(r.label), r);
  }
  // who-tcm.json（26 条已核）按 label 索引
  const whoByLabel = new Map();
  for (const e of whoTcm.entries || []) whoByLabel.set(normalizeZh(e.label), e);
  // 别名表：uid -> [{alias, source}]
  const aliasByUid = new Map();
  for (const a of aliases.entries || []) {
    const uid = a.canonical || a.uid;
    if (!uid) continue;
    if (!aliasByUid.has(uid)) aliasByUid.set(uid, []);
    aliasByUid.get(uid).push(a);
  }

  const classes = [];
  const unresolved = [];
  const ambiguousMap = new Map();     // form-key -> {form, lang, classes:Set}
  const formOwner = new Map();        // 规范化表面形式 -> 类 id（多个 = 多义）

  const register = (classId, lang, form, strength, source) => {
    const isZh = lang.startsWith('zh');
    const key = `${isZh ? 'zh' : 'en'}:${isZh ? normalizeZh(form) : normalizeEn(form)}`;
    if (!key.endsWith(':')) {
      if (!formOwner.has(key)) formOwner.set(key, new Set());
      formOwner.get(key).add(classId);
    }
    return member(lang, form, strength, source);
  };

  for (const u of units) {
    const label = u.label;
    const bare = normalizeZh(label);
    const rec = descByUid.get(u.uid) || descByLabel.get(bare) || null;
    const who = whoByLabel.get(bare) || null;
    const members = [];
    const classId = `EQ-${u.uid}`;
    const src = { uid: u.uid, label, kind: u.kind };

    // A0 本仓库证名（简体，来自 reference-units）
    members.push(register(classId, 'zh-Hans', label, 'A', 'standards/semtensor/datasets/reference-units.json'));

    // A1 别名表（本仓库登记过、且每条都能在 source 里字面查到）
    for (const a of aliasByUid.get(u.uid) || []) {
      if (a.alias) members.push(register(classId, 'zh-Hans', a.alias, 'B', `aliases.json（${a.source || '未记来源'}）`));
    }

    // A2 WHO ISTT 同条：中文（繁/简）与英文 —— 定义级等价
    let whoEntry = istt.byZh.get(bare) || null;
    if (!whoEntry && rec && rec.whoTcm && rec.whoTcm.whoCode) {
      whoEntry = istt.data.entries.find((e) => e.code === rec.whoTcm.whoCode) || null;
    }
    if (whoEntry) {
      src.who = { code: whoEntry.code, section: whoEntry.section, bookPage: whoEntry.bookPage };
      const wsrc = `WHO ISTT ${whoEntry.code}${whoEntry.bookPage ? ` 书页 ${whoEntry.bookPage}` : ''}`;
      for (const z of whoEntry.zhS) if (normalizeZh(z) !== bare) members.push(register(classId, 'zh-Hans', z, 'A', wsrc));
      for (const z of whoEntry.zh) members.push(register(classId, 'zh-Hant', z, 'A', wsrc));
      members.push(register(classId, 'en', whoEntry.en.replace(/^\s*\d{1,3}(\.\d{1,3}){0,2}\s+/, ''), 'A', wsrc));
    }

    // B1 who-tcm.json 的英文别名（已核条目里另立的写法）
    if (who && Array.isArray(who.whoEnglishAliases)) {
      for (const en of who.whoEnglishAliases) {
        members.push(register(classId, 'en', en, 'B', `who-tcm.json ${who.whoCode} whoEnglishAliases`));
      }
    }
    if (who && who.whoEnglish) {
      members.push(register(classId, 'en', who.whoEnglish, 'A', `who-tcm.json ${who.whoCode}`));
    }

    // B2 本仓库登记的 ICD-11 编码 + 官方英文标题
    const icdCodes = new Set();
    if (rec && rec.icd) icdCodes.add(String(rec.icd).trim());
    if (who && who.icd) icdCodes.add(String(who.icd).trim());
    for (const code of icdCodes) {
      const e = icd.byCode.get(code);
      if (!e) continue;
      if (!src.icd) src.icd = [];
      src.icd.push({ code, title: e.title });
      members.push(register(classId, 'en', e.title, 'B', `data/icd11（${code} 官方标题）`));
    }

    // C 规范化同串：WHO 英文名 ↔ ICD-11 TM1 标题
    const enForms = members.filter((m) => m.lang === 'en');
    for (const m of enForms) {
      const k = normalizeEn(m.form);
      for (const e of icd.byNorm.get(k) || []) {
        if (!/\(TM1\)/.test(e.title)) continue;
        if (members.some((x) => x.form === e.title)) continue;
        members.push(register(classId, 'en', e.title, 'C', `ICD-11 ${e.code}（与 WHO 英文名规范化后逐字相等）`));
        if (!src.icd) src.icd = [];
        if (!src.icd.some((x) => x.code === e.code)) src.icd.push({ code: e.code, title: e.title });
      }
    }

    // 去重（同语种同形式只留最强证据）
    const RANK = { A: 0, B: 1, C: 2 };
    const seen = new Map();
    for (const m of members) {
      const k = `${m.lang}:${m.lang.startsWith('zh') ? normalizeZh(m.form) : normalizeEn(m.form)}`;
      const prev = seen.get(k);
      if (!prev || RANK[m.strength] < RANK[prev.strength]) seen.set(k, m);
    }
    const uniq = [...seen.values()];

    const cls = {
      id: classId,
      uid: u.uid,
      label,
      kind: u.kind,
      tensor: {
        x: Number(u.x.toFixed(6)), y: Number(u.y.toFixed(6)), z: Number(u.z.toFixed(6)),
        r: Number(u.r.toFixed(6)), theta: Number(u.theta.toFixed(6)), phi: Number(u.phi.toFixed(6)),
        hex: u.colorDerived || u.colorSourceHex || null,
      },
      members: uniq,
      evidence: src,
    };

    // D 级：组合探针。**不是翻译、不是等价**，只给检索用。
    //
    // 旧做法：查 WHO 词表 → 最长匹配切词 → 把英文按出现顺序拼起来。它只保证「每个字都在表里」。
    // 新做法（`build_tm1_axes.js` 的 `probeForZh`）：切出来的英文片段**逐个归轴**
    // （身体结构 / 病因解释 / 属性 / 严重程度），再按**官方题名的轴序**重排，最后检查这个组合
    // 在 472 条官方 TM1 题名里有没有**同构先例**（`attested`）。判据来自 ICD-11 Reference Guide
    // §3.2.26 的命名句，不是我自己定的排序。
    //   axisClean=true  → 每个词都是官方命名法里的词（可直接当探针用）
    //   axisClean=false → 仍可发探针（否则召回掉一半），但把**不在官方词汇里的词**逐条列出来
    if (!uniq.some((m) => m.lang === 'en')) {
      const label2 = String(label).replace(/[（(][^（）()]*[）)]/g, '');
      const t = Z.translate(label2);
      const ax = AX ? AX.probeForZh(label2, AX_AXES) : null;
      const okAxes = ax && ax.en && ax.axisClean;
      const okGloss = t.hasTerm && t.coverage >= PROBE_MIN_COVERAGE;
      if (okAxes || okGloss) {
        cls.probe = {
          strength: 'D',
          en: okAxes ? ax.en : t.en,
          method: okAxes ? 'axes' : 'glossary',
          coverage: Number(t.coverage.toFixed(4)),
          parts: t.terms.map((x) => ({ zh: x.zh, en: Z.stripCode(x.en), code: x.code })),
          unmatched: t.unmatched,
          axisClean: !!(ax && ax.axisClean),
          axes: (ax ? ax.axes : []).map((x) => ({ token: x.token, axis: x.axis, zh: x.zh })),
          uncoveredTokens: ax ? ax.uncovered : [],
          attested: ax ? ax.attested : [],
          axisOrder: AX_AXES ? AX_AXES.grammar.order : null,
          note: okAxes
            ? `四轴组合探针：切词 → 归轴 → 按官方轴序（${(AX_AXES.grammar.order || []).join('>')}）排列；`
              + '**只用于检索**，不宣称与某条 WHO 术语等价'
            : `词表切词探针（覆盖率 ${(t.coverage * 100).toFixed(0)}%）：含官方命名法里没有的词 `
              + `${(ax ? ax.uncovered : []).join('/') || '—'}，只能当查询串用`,
        };
      }
    }

    classes.push(cls);
    if (!uniq.some((m) => m.lang === 'en') && !cls.probe) {
      unresolved.push({
        uid: u.uid, label, hasWho: !!whoEntry, hasAlias: (aliasByUid.get(u.uid) || []).length,
        why: whoEntry ? 'WHO 条目无英文名（不该发生）' : '证名整条与 WHO 表不匹配，且各分段也不同时命中 —— 不推断',
      });
    }
  }

  // 多义登记：同一表面形式（规范化后）落在多个等价类。**这不是错误，是事实** ——
  // 「气滞血瘀证」与「气滞血瘀证(颈部)」是两个单元、两个张量点，名字却相同。
  // 查询时返回全部候选，让下游按上下文选，不静默取第一个。
  const ambiguousForms = [...formOwner.entries()]
    .filter(([, set]) => set.size > 1)
    .map(([key, set]) => {
      const [lang, form] = key.split(':');
      return { lang, form, classes: [...set].sort(), note: '同名多义：各候选的张量点不同，须按上下文择一' };
    })
    .sort((a, b) => (a.form < b.form ? -1 : a.form > b.form ? 1 : 0));

  const tally = (arr, f) => arr.reduce((m, x) => { const k = f(x); m[k] = (m[k] || 0) + 1; return m; }, {});
  const allMembers = classes.flatMap((c) => c.members);
  const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

  const out = {
    $generated: 'node scripts/build_equivalence.js',
    spec: 'standards/semtensor/规范-三维极坐标语义张量-v1.0.md §5（确定性编码）/ §10（张量相似）',
    principle: '等价 = 同一个语义点。一个等价类绑定恰好一个张量点 (θ,φ,r)；类内成员是不同语种/写法下的同一个术语。'
      + '跨语种「翻译」= 读同一个点的另一个语种成员，不做机器翻译、不做相似度取近邻。',
    strengthLegend: {
      A: '术语表同条（WHO ISTT 同一条目的 zh ↔ en，代码与书页可回查）/ 本仓库证名与已核 WHO 编码',
      B: '编码同源（同条目的中文别名位、whoEnglishAliases、本仓库登记的 ICD-11 编码与官方英文标题）',
      C: '规范化同串（ICD-11 TM1 英文标题与 WHO 英文名规范化后逐字相等）',
    },
    normalize: {
      zh: '去括注（括注是解释位不是术语本体）、去空白；繁简两套键都进索引',
      en: '去代码前缀 → pattern/syndrome 三种写法归一 → 去 (TM1) → 修连字符断裂 → 只留字母数字 → 去虚词 → 词序归一',
      enNote: '词序归一成立的前提是词集完全相同；多一词少一词都不算同串。',
    },
    sources: {
      units: { file: 'standards/semtensor/datasets/reference-units.json', sha256: sha(P.units) },
      descriptions: { file: 'standards/semtensor/descriptions/dsu-descriptions.json', sha256: sha(P.desc) },
      whoIstt: {
        file: 'standards/semtensor/descriptions/who-istt-terms.json',
        sha256: sha(P.whoIstt),
        entries: istt.data.entries.length,
        edition: istt.data.source && istt.data.source.title,
      },
      whoTcm: { file: 'standards/semtensor/descriptions/who-tcm.json', sha256: sha(P.whoTcm), entries: (whoTcm.entries || []).length },
      icd: icd.available ? { file: 'data/icd11/entities.ndjson', sha256: sha(P.icd) } : { file: null, note: '本地 ICD-11 快照缺失 → C 级判据未启用' },
    },
    counts: {
      classes: classes.length,
      byKind: tally(classes, (c) => c.kind),
      members: allMembers.length,
      membersByLang: tally(allMembers, (m) => m.lang),
      membersByStrength: tally(allMembers, (m) => m.strength),
      classesWithEnglish: classes.filter((c) => c.members.some((m) => m.lang === 'en')).length,
      classesWithProbeOnly: classes.filter((c) => !c.members.some((m) => m.lang === 'en') && c.probe).length,
      classesWithWhoEntry: classes.filter((c) => c.evidence.who).length,
      classesWithIcd: classes.filter((c) => (c.evidence.icd || []).length).length,
      classesWithTm1: classes.filter((c) => (c.evidence.icd || []).some((x) => /\(TM1\)/.test(x.title || ''))).length,
      unresolved: unresolved.length,
      ambiguousForms: ambiguousForms.length,
      translatableClasses: classes.filter((c) => c.members.some((m) => m.lang === 'en') || c.probe).length,
    },
    unresolved,
    ambiguousForms,
    classes,
  };

  fs.mkdirSync(OUTDIR, { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
  return out;
}

// ── 校验 ────────────────────────────────────────────────────

function check() {
  if (!fs.existsSync(OUT)) return { ok: false, errs: [`缺产物 ${path.relative(ROOT, OUT)} → 跑 node scripts/build_equivalence.js`] };
  const d = readJson(OUT);
  const errs = [];
  const classes = d.classes || [];
  if (!classes.length) errs.push('classes 为空');

  const uids = new Set();
  for (const c of classes) {
    if (uids.has(c.uid)) errs.push(`重复的 uid：${c.uid}`);
    uids.add(c.uid);
    const t = c.tensor || {};
    for (const k of ['x', 'y', 'z', 'r', 'theta', 'phi']) {
      if (!Number.isFinite(t[k])) errs.push(`${c.id}: tensor.${k} 不是有限数`);
    }
    if (!(t.theta >= -90 && t.theta <= 90)) errs.push(`${c.id}: θ 越界 ${t.theta}`);
    if (!(t.phi >= 0 && t.phi < 360)) errs.push(`${c.id}: φ 越界 ${t.phi}`);
    if (!(t.r > 0 && t.r <= 1)) errs.push(`${c.id}: r 越界 ${t.r}`);
    if (!c.members || !c.members.length) errs.push(`${c.id}: 没有成员`);
    for (const m of c.members || []) {
      if (!['A', 'B', 'C'].includes(m.strength)) errs.push(`${c.id}: 成员证据级别非法 ${m.strength}`);
      if (!m.source) errs.push(`${c.id}: 成员「${m.form}」没有出处`);
      if (!m.lang) errs.push(`${c.id}: 成员「${m.form}」没有语种`);
    }
    // 类内必须只有一个语义点：张量点唯一（结构上由 uid 保证），并要求 hex 存在
    if (!c.tensor.hex) errs.push(`${c.id}: 缺颜色分量`);
    // D 级探针：不进成员，但要能对账
    if (c.probe) {
      if (c.probe.strength !== 'D') errs.push(`${c.id}: probe.strength 应为 D`);
      if (!c.probe.en) errs.push(`${c.id}: probe 没有英文串`);
      // 两种方法的门槛**不是一回事**，不能拿一个数字卡两个：
      //   glossary（旧）—— 靠词表覆盖率，够了才拼；
      //   axes（新）  —— 每个英文片段都归到了某条轴（axisClean），这时覆盖率低是**正常的**：
      //                 「壅/痹/瘀」这些构件由官方 zh/en 对补进来，词表本来就不认识它们。
      //                 用 0.6 去卡 axes 探针，等于要求它回到旧方法的水平。
      if (c.probe.method === 'axes') {
        if (c.probe.axisClean !== true) errs.push(`${c.id}: axes 探针 axisClean 不为 true（不该标 axes）`);
        if (!Array.isArray(c.probe.axes) || !c.probe.axes.length) errs.push(`${c.id}: axes 探针缺轴分解`);
        if ((c.probe.axes || []).some((x) => !x.axis)) errs.push(`${c.id}: axes 探针里有片段没归轴`);
      } else if (!(c.probe.coverage >= 0.6)) {
        errs.push(`${c.id}: glossary 探针覆盖率低于门槛 ${c.probe.coverage}`);
      }
      for (const p of c.probe.parts || []) if (!p.code) errs.push(`${c.id}: probe 分段「${p.zh}」没有 WHO 代码`);
    }
  }

  if (d.counts.classes !== classes.length) errs.push('counts.classes 与实际不符');

  // 多义形式：不要求为空（同名不同点是事实），但要求**登记完整且可解析**
  const ids = new Set(classes.map((c) => c.id));
  for (const a of d.ambiguousForms || []) {
    if (!a.form || !a.lang) errs.push('ambiguousForms 有条目缺 form/lang');
    if (!Array.isArray(a.classes) || a.classes.length < 2) errs.push(`多义形式「${a.form}」候选少于 2 个`);
    for (const id of a.classes || []) if (!ids.has(id)) errs.push(`多义形式「${a.form}」指向不存在的类 ${id}`);
  }
  // 反向核对：凡是同一规范化形式落在两个类的，必须在 ambiguousForms 里
  const seenForms = new Map();
  for (const c of classes) {
    for (const m of c.members || []) {
      const key = `${m.lang.startsWith('zh') ? 'zh' : 'en'}:${m.lang.startsWith('zh') ? normalizeZh(m.form) : normalizeEn(m.form)}`;
      if (key.endsWith(':')) continue;
      if (!seenForms.has(key)) seenForms.set(key, new Set());
      seenForms.get(key).add(c.id);
    }
  }
  const multi = [...seenForms.entries()].filter(([, s]) => s.size > 1).length;
  if (multi !== (d.ambiguousForms || []).length) {
    errs.push(`多义形式数量不符：实测 ${multi}，产物记 ${(d.ambiguousForms || []).length}`);
  }

  const descCount = readJson(P.desc).records.length;
  if (classes.length < descCount) errs.push(`等价类 ${classes.length} 少于证候描述记录 ${descCount}`);

  // 与已核 26 条对读：每条 who-tcm 证候选必须能在等价类里找到它的英文
  try {
    const who = readJson(P.whoTcm);
    const byLabel = new Map(classes.map((c) => [normalizeZh(c.label), c]));
    for (const e of who.entries || []) {
      const c = byLabel.get(normalizeZh(e.label));
      if (!c) { errs.push(`who-tcm 条目「${e.label}」没有对应等价类`); continue; }
      const want = normalizeEn(e.whoEnglish);
      if (!c.members.some((m) => m.lang === 'en' && normalizeEn(m.form) === want)) {
        errs.push(`等价类 ${c.id} 缺 who-tcm 的英文名「${e.whoEnglish}」`);
      }
    }
  } catch { /* 缺文件不在这里报 */ }

  return { ok: !errs.length, errs };
}

function stats() {
  const d = readJson(OUT);
  console.log('═══ 语义张量 · 等价映射 ═══');
  console.log(`  等价类 ${d.counts.classes}（${Object.entries(d.counts.byKind).map(([k, v]) => `${k} ${v}`).join(' · ')}）`);
  console.log(`  成员 ${d.counts.members} · 按语种 ${JSON.stringify(d.counts.membersByLang)} · 按证据 ${JSON.stringify(d.counts.membersByStrength)}`);
  console.log(`  有英文成员 ${d.counts.classesWithEnglish}/${d.counts.classes} · 仅组合探针 ${d.counts.classesWithProbeOnly} · 未解析 ${d.counts.unresolved}`);
  console.log(`  有 WHO 条目 ${d.counts.classesWithWhoEntry} · 有 ICD 编码 ${d.counts.classesWithIcd} · 有 TM1 ${d.counts.classesWithTm1}`);
  console.log(`  多义形式 ${d.counts.ambiguousForms} · 可翻译类 ${d.counts.translatableClasses}/${d.counts.classes}`);
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--check')) {
    const r = check();
    if (!r.ok) {
      console.error('✗ 等价映射校验失败：');
      for (const e of r.errs.slice(0, 20)) console.error(`   - ${e}`);
      process.exit(1);
    }
    console.log('✅ 等价映射校验通过');
    stats();
    return;
  }
  if (argv.includes('--stats')) { stats(); return; }

  const out = build();
  console.log('═══ 语义张量 · 等价映射（构建完成）═══');
  stats();
  if (out.unresolved.length) {
    console.log(`\n  未解析 ${out.unresolved.length} 条（无英文等价 —— 缺就是缺，不推断）：`);
    for (const u of out.unresolved.slice(0, 8)) console.log(`    · ${u.uid} ${u.label}`);
    if (out.unresolved.length > 8) console.log(`    … 其余 ${out.unresolved.length - 8} 条见产物 unresolved`);
  }
  if (out.ambiguousForms.length) {
    console.log(`\n  同名多义 ${out.ambiguousForms.length} 处（同一形式落在多个张量点 —— 返回全部候选，不静默取第一个）：`);
    for (const c of out.ambiguousForms.slice(0, 6)) console.log(`    · 「${c.form}」→ ${c.classes.join(' / ')}`);
  }
  console.log(`\n  → ${path.relative(ROOT, OUT)}`);
}

if (require.main === module) {
  try { main(); } catch (e) { console.error(`\n✗ ${e.message}`); process.exit(1); }
}

module.exports = { build, check, normalizeZh, normalizeEn, loadWhoIstt, loadUnits, OUT, OUTDIR };
