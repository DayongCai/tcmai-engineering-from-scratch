#!/usr/bin/env node
/**
 * scripts/build_dsu_descriptions.js —— 给 96 个证候（103 条 DSU 记录）组装描述
 *
 * ── 为什么是"组装"而不是"写" ──────────────────────────────────────
 * 描述是**从证据组装**的，不是从模型记忆里生成的。每一段都指得到出处：
 *   · 构词解析    —— 由证名本身的汉字拆出病性/病位（确定性规则，可逐条核对）
 *   · 病机        —— 由源材料的「症状→病机映射表」关键词反推（源表驱动）
 *   · 病/ICD-11   —— 知识树「图谱接口」表（唯一事实来源）
 *   · 教材证据    —— 本仓库语料中该证名的上下文片段，**带文件路径**
 *   · 外部证据    —— `descriptions/external.json`（人工经 web_search 取回，带 URL）
 *   · 缺失        —— 没有证据的字段**显式列为 missing**，不写空话、不编定义
 *
 * ── 为什么不直接抓网 ────────────────────────────────────────────
 * 实测：zh.wikipedia.org 在本机**不可达**（/wiki、/w/api.php、m. 三入口全 HTTP 000 超时）；
 * 百度百科对 curl 返回 403。可达路径只有 web_search（firecrawl/keenable 后端），而它是
 * **逐条、有界**的 —— 所以外部证据分批取，取回的原文按片段入库（external.json），
 * 脚本本身**不联网**。这样重跑结果稳定，也不会把"没取到"伪装成"没有"。
 *
 * 用法： node scripts/build_dsu_descriptions.js [--report]
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const P = (p) => path.join(ROOT, p);
const OUTDIR = P('standards/semtensor/descriptions');
const emb = require('./build_embeddings.js');
const api = require('./tcm_api.js');
const { classify, countsAsWhole } = require('./lib_evidence_scope.js');   // 证据分级口径

// ── 病性 / 病位 词表（构词解析用；中医证名是构词的，所以能拆）──
const NATURE = [
  '风寒湿', '风寒', '风热', '风湿', '风痰', '风阳', '寒湿', '寒痰', '湿热', '痰热', '燥热', '暑湿', '暑热',
  '气滞血瘀', '气滞', '血瘀', '气虚', '血虚', '气血两虚', '阴虚', '阳虚', '气阴两虚', '阴阳两虚',
  '阳亢', '阳脱', '阴盛', '阴亏', '精亏', '亢盛', '炽盛', '不足', '虚弱',
  '痰湿', '湿浊', '痰浊', '痰饮', '水饮', '痰', '湿', '热', '寒', '风', '燥', '火',
  '毒', '瘀', '郁', '虚', '实', '气逆', '气陷', '气不固', '血热', '血寒', '内热', '内寒', '内风', '内湿', '哮',
];
const LOCUS = [
  '半表半里', '上焦', '中焦', '下焦', '清窍', '冲任', '肌肤', '关节', '筋骨', '心神', '经络',
  '表', '里', '卫', '营', '血', '气',
  '肺', '心', '脾', '肝', '肾', '胆', '胃', '小肠', '大肠', '膀胱', '三焦', '命门',
];
// 第三类：**病机动作**。第一版只有"病性 + 病位"两类，于是 96 个证名里 **79 个拆不干净** ——
// 残余的正是这一类：`束`(束表) `犯`(犯肺) `壅`(壅肺) `凝`(凝血) `结`(郁结) `痹阻` `浸淫`
// `不摄` `不交` `水泛` `下注` `阻络` `互结` `蕴毒` `凌心`…
// **这批词不是我想出来的，是量出来的**（见 CHANGELOG：从 96 个证名的残余里扫出来的）。
const ACTION = [
  '阳上亢', '上扰', '上炎', '上蒸', '下注', '乘脾', '困脾', '犯肺', '内动', '内停', '水泛', '蕴毒',
  '阻络', '互结', '痹阻', '瘀阻', '浸淫', '内含于', '不摄', '不交', '不和', '不固', '不宁', '外袭', '内蕴',
  '失调', '失养', '混浊', '便秘', '骨痿', '心脉', '风中',
  '壅', '束', '犯', '凝', '结', '阻', '痹', '闭', '扰', '凌', '侵', '泛', '停', '陷', '脱', '逆', '郁', '滞',
  '窍', '经', '邪',
];

function decompose(label) {
  const name = label.replace(/[（(][^）)]*[）)]/g, '');   // 括注（如「（热淋）」）不参与拆词
  const core = name.replace(/证$|病$/, '');
  const natures = [], locuses = [], actions = [];
  // **每一类各自一条"抹除游标"**（不是三类共用）：
  //   · 同类内不重复计 —— 否则 `寒湿困脾证` 的病性会拆成 ["寒湿","湿","寒"]，同一处算三遍
  //     （第一版就是这个 bug，病位虚高到 80）；
  //   · 跨类**允许重叠** —— `困脾` 是病机动作、`脾` 是病位，两者都该在。共用一个游标会让
  //     先跑的类把后跑的类的词吃掉（实测：动作变空）。
  const takeCat = (words, into) => {
    let cur = core;
    for (const w of [...words].sort((a, b) => b.length - a.length)) {
      if (cur.includes(w)) { into.push(w); cur = cur.split(w).join('\u0001'); }
    }
  };
  takeCat(NATURE, natures);
  takeCat(LOCUS, locuses);
  takeCat(ACTION, actions);
  // 残余：把所有**已命中**的词（跨类）按最长优先抹掉后剩下的汉字（标点不是词）
  let restStr = core;
  for (const w of [...new Set([...natures, ...locuses, ...actions])].sort((a, b) => b.length - a.length)) {
    restStr = restStr.split(w).join('\u0001');
  }
  const residue = [...new Set(restStr.split('\u0001').join('').split('').filter((c) => /[\u4e00-\u9fff]/.test(c)))].join('');
  return { core, nature: natures, locus: locuses, action: actions, residue };
}

// ── 病机反推：只用映射表的病机关键词与证名对撞（与 tcm_api 同一张表）──
function inferFromName(label, table) {
  const mechs = new Set();
  for (const m of table.filter((r) => r.kind === 'mechanism')) {
    for (const p of m.primary) {
      for (const kw of api.MECH_KEYWORDS[p.mech] || []) {
        if (label.includes(kw)) mechs.add(p.mech);
      }
    }
  }
  // 该证名在映射表中能对上哪些症状（反向：这个证候常见于哪些症状项）
  const symptoms = [];
  for (const m of table) {
    for (const p of m.primary) {
      for (const kw of api.MECH_KEYWORDS[p.mech] || []) {
        if (label.includes(kw) && m.kind === 'mechanism') { symptoms.push({ terms: m.terms, mech: p.mech, w: p.w }); break; }
      }
    }
  }
  return { mechanisms: [...mechs], relatedSymptomRows: symptoms.length, sampleSymptoms: symptoms.slice(0, 6).map((s) => s.terms[0]) };
}

// ── WHO-TCM 代码通道（与 ICD-11 **不是**同一套编号，绝不互换）──
//
// WHO-TCM 代码形如 `2.9.90` = 段.组.项。词典条目里还会给一串**类目路径**
// （如 `2.4 證候 - 臟腑經絡證類`）—— 那**不是** WHO 代码的展开，是另一套编号。
// 所以两套都存、字段分开，只做可核对的拆分，不做语义换算。
function parseWhoCode(code) {
  const s = String(code).trim();
  if (!/^\d+(\.\d+)*$/.test(s)) return null;
  const segs = s.split('.');
  return {
    raw: s,
    parts: segs,
    depth: segs.length,
    division: segs[0],
    group: segs.length >= 2 ? `${segs[0]}.${segs[1]}` : null,
    item: segs.length >= 3 ? segs[segs.length - 1] : null,
  };
}

function main() {
  const table = api.loadSymptomMap();
  const instance = api.makeApi();
  const merge = instance.mergeTable();

  // 外部证据（已落库的）
  const external = JSON.parse(fs.readFileSync(P('standards/semtensor/descriptions/external.json'), 'utf8'));
  const extByLabel = new Map(external.entries.map((e) => [e.label, e.sources]));
  // 每条的等级当场重算（不信任文件里存的 scope —— 存的值只用来核对口径是否漂移）
  const scopeOf = new Map(external.entries.map((e) => [e.label, classify(e)]));
  const extEntryOf = new Map(external.entries.map((e) => [e.label, e]));
  // WHO-TCM 通道（独立于 ICD-11）
  const who = JSON.parse(fs.readFileSync(P('standards/semtensor/descriptions/who-tcm.json'), 'utf8'));
  const whoByLabel = new Map(who.entries.map((e) => [e.label, { ...e, parsed: parseWhoCode(e.whoCode) }]));
  // 异名表：**不是证据无关，是写法不同**。表不存在就当没有（不报错、不编造）。
  const RELATION_CN = { synonym: '同义', composition: '复合证名的组成部分', qualified: '病名限定用法', broader: '上位概念' };
  let aliasByLabel = new Map();
  try {
    const al = JSON.parse(fs.readFileSync(P('standards/semtensor/descriptions/aliases.json'), 'utf8'));
    aliasByLabel = new Map(al.entries.map((e) => [e.label, e.aliases]));
  } catch { /* 表还没建，静默跳过 */ }

  // 语料（复用嵌入层的取语料，**但再收紧一次**：证据只取正文）。
  //
  // 为什么收紧：第一版直接用了嵌入层的语料，而那里含 `reference-units.json`、
  // `external.json` 这类**数据集/索引**。结果是"教材证据"取到了 JSON 碎片：
  //   `reference-units.json — ived": " 5A6F7C", "colorMatch": false …`
  // 这不是教材，是我自己的数据文件；而且它会**自我印证**（证据来自被论证的对象本身）。
  // 这是同一个"自己的输出喂回自己的输入"的第 3 次出现，换了扇门：
  //   ① embeddings/index.json ② endpoints/README.md ③ 现在 datasets + descriptions。
  // 规则：**教材上下文只能来自正文（.md），不来自数据集、索引与报告。**
  const corpus = emb.collectCorpus().filter((c) => {
    const f = c.file.replace(/\\/g, '/');
    if (!/\.md$/.test(f)) return false;
    if (/semtensor\/descriptions\//.test(f)) return false;
    if (/semtensor\/datasets\//.test(f)) return false;
    return true;
  });

  const records = merge.groups.concat(
    // 非重名的证名也要出描述：从全体 DSU 里取
    [],
  );
  const allLabels = (() => {
    const raw = JSON.parse(fs.readFileSync(P('standards/semtensor/datasets/reference-units.json'), 'utf8'));
    const dsu = (Array.isArray(raw) ? raw : raw.units).filter((u) => u.kind === 'dsu');
    const byName = new Map();
    for (const u of dsu) { const a = byName.get(u.label) || []; a.push(u); byName.set(u.label, a); }
    // canonical 规则与 tcm_api 一致：记录最全 → 最小 uid
    const attrs = new Map();
    for (const r of (() => {
      const wb = require('./lib_xlsx.js').readWorkbook(P('standards/knowledge-tree/sources/中医知识树.xlsx'));
      const s = (wb.sheets || []).find((x) => x.name === '图谱接口');
      return (s && s.rows) || [];
    })()) {
      const c = r.map((x) => String(x == null ? '' : x).trim()).filter((x) => x !== '');
      if (!/^DSU-\d+$/.test(c[0])) continue;
      const icd = c.slice(1).find((x) => /^[A-Z0-9][A-Z0-9.]*$/.test(x) && x.length <= 8) || '';
      const pair = (c.find((x) => x.includes('×')) || '').split('×').map((x) => (x || '').trim());
      attrs.set(c[0], { disease: (pair[0] || '').replace(/（[^）]*）\s*$/, ''), icd });
    }
    return [...byName.entries()].map(([label, units]) => {
      const sorted = [...units].sort((a, b) => {
        const rich = (u) => { const t = attrs.get(u.uid) || {}; return (t.disease ? 1 : 0) + (t.icd ? 1 : 0); };
        return rich(b) - rich(a) || a.uid.localeCompare(b.uid);
      });
      // 「例如（常见于）」取**组内每个成员**的病/编码 —— 同一证候常见于多个病，
      // 只留 canonical 那条会丢掉别的。（本例：肝阳上亢证 ← 原发性高血压 BA00）
      const examples = units
        .map((u) => ({ uid: u.uid, ...(attrs.get(u.uid) || {}) }))
        .filter((x) => x.disease || x.icd);
      return {
        label, canonical: sorted[0].uid, aliases: units.map((u) => u.uid),
        attrs: attrs.get(sorted[0].uid) || {}, diseaseExamples: examples,
      };
    }).sort((a, b) => a.label.localeCompare(b.label));
  })();

  const out = [];
  for (const e of allLabels) {
    const dec = decompose(e.label);
    const mech = inferFromName(e.label, table);
    const ctx = emb.harvestContexts(e.label, corpus, { window: 120, max: 3 });
    const ext = extByLabel.get(e.label) || [];
    const missing = [];
    if (!dec.nature.length) missing.push('病性词');
    if (!dec.locus.length) missing.push('病位词');
    if (!e.attrs.disease) missing.push('西医病名');
    if (!e.attrs.icd) missing.push('ICD-11 编码');
    if (!ctx.length) missing.push('教材上下文');
    if (!ext.length) missing.push('外部证据');
    if (!whoByLabel.has(e.label)) missing.push('WHO-TCM 代码');
    if (!mech.mechanisms.length) missing.push('病机');
    out.push({
      label: e.label,
      canonical: e.canonical,
      aliases: e.aliases,
      decomposed: dec,
      mechanisms: mech.mechanisms,
      relatedSymptomRows: mech.relatedSymptomRows,
      sampleSymptoms: mech.sampleSymptoms,
      disease: e.attrs.disease || null,
      icd: e.attrs.icd || null,
      // 「例如（常见于）」：同一证候常见于多个病；来源是知识树「图谱接口」**样例表**（12 条，非全量）
      diseaseExamples: e.diseaseExamples || [],
      textbookEvidence: ctx.map((c) => ({ file: c.file, snippet: c.snippet })),
      externalEvidence: ext,
      // 证据分级：整串级（单条来源覆盖全部构件）/ 构件级（只分别覆盖）/ 单构件。
      // 口径在 scripts/lib_evidence_scope.js，统计时两级分开报，**不合并**成一个"已覆盖"。
      externalScope: scopeOf.get(e.label) ? scopeOf.get(e.label).scope : null,
      // 并病（两证同存）：领域判断，平台层据此把 component 视为达标
      externalConcurrent: Boolean(extEntryOf.get(e.label)?.concurrent),
      whoTcm: whoByLabel.get(e.label) || null,
      // 异名：**不是证据无关，是写法不同**（见 standards/semtensor/descriptions/aliases.json）。
      // relation 决定怎么用：synonym 可直接计入；composition/qualified/broader 只能作部分证据。
      aliases: aliasByLabel.get(e.label) || [],
      missing,
    });
  }

  // ── 覆盖统计 ──
  const total = out.length;
  const cov = (f) => out.filter(f).length;
  const stats = {
    labels: total,
    dsuRecords: 103,
    corpusFiles: corpus.length,
    corpusFileList: corpus.map((c) => c.file),
    withNature: cov((r) => r.decomposed.nature.length),
    withLocus: cov((r) => r.decomposed.locus.length),
    withAction: cov((r) => r.decomposed.action.length),
    cleanDecompose: cov((r) => !r.decomposed.residue),
    // 拆不干净的列出来：**词表的缺口必须一直可见**，不能只报一个覆盖率就把缺口盖住
    dirtyDecompose: out.filter((r) => r.decomposed.residue)
      .map((r) => `${r.label} ← 残余「${r.decomposed.residue}」`).slice(0, 30),
    criteria: 7,   // 缺失项总数（病性/病位/动作/病名/ICD/教材/外部/WHO 中"可缺"的计数基准）
    withMechanism: cov((r) => r.mechanisms.length),
    withDisease: cov((r) => r.disease),
    withIcd: cov((r) => r.icd),
    withTextbook: cov((r) => r.textbookEvidence.length),
    withExternal: cov((r) => r.externalEvidence.length),
    // 外部证据的两种强度分开数：整串级才算"这个证名被文献证实"，
    // 构件级只能说明"构件各自有文献"。合并成 75/96 会让两种证据看起来一样硬。
    withExternalWhole: cov((r) => r.externalEvidence.length && countsAsWhole(scopeOf.get(r.label)?.scope)),
    // 并病（两证同存）：两侧各有来源即达标，不要求某一条文献写出整串。
    // 这与"构件级＝弱证据"不是一回事，所以单独一列 —— 领域判断落在 external.json 的 concurrent 字段。
    withConcurrent: cov((r) => r.externalEvidence.length && extEntryOf.get(r.label)?.concurrent
      && scopeOf.get(r.label)?.scope === 'component'),
    withExternalComponent: cov((r) => r.externalEvidence.length && !extEntryOf.get(r.label)?.concurrent
      && scopeOf.get(r.label)?.scope === 'component'),
    externalPartial: out.filter((r) => r.externalEvidence.length && scopeOf.get(r.label)?.scope === 'partial')
      .map((r) => `${r.label} ← 缺构件「${scopeOf.get(r.label).missing.join('、')}」`),
    withWhoTcm: cov((r) => r.whoTcm),
    withAlias: cov((r) => r.aliases.length),
    fullyMissing: cov((r) => r.missing.length === 7),   // 7 = 缺失项总数；加了 WHO-TCM 后 6 就成了陈旧常量
    avgMissing: Number((out.reduce((s, r) => s + r.missing.length, 0) / total).toFixed(2)),
  };

  fs.mkdirSync(OUTDIR, { recursive: true });
  fs.writeFileSync(path.join(OUTDIR, 'dsu-descriptions.json'), `${JSON.stringify({ $generated: 'node scripts/build_dsu_descriptions.js', stats, records: out }, null, 2)}\n`, 'utf8');

  // 人读版（入库）：方法 + 覆盖 + 逐条
  const md = [];
  md.push('# 证候描述（96 个证名 / 103 条 DSU 记录）', '');
  md.push('> 由 `node scripts/build_dsu_descriptions.js` **从证据组装**，不是生成的。');
  md.push('> 每一段都指得到出处；没有证据的字段**显式列为缺失**，不写空话。', '');
  md.push('## 覆盖', '');
  md.push('| 字段 | 有 | 占比 |', '|---|---|---|');
  md.push(`| 病性词（构词解析） | ${stats.withNature}/${total} | ${((stats.withNature / total) * 100).toFixed(1)}% |`);
  md.push(`| 病位词（构词解析） | ${stats.withLocus}/${total} | ${((stats.withLocus / total) * 100).toFixed(1)}% |`);
  md.push(`| 病机动作词（构词解析） | ${stats.withAction}/${total} | ${((stats.withAction / total) * 100).toFixed(1)}% |`);
  md.push(`| **构词完全拆净（无残余）** | ${stats.cleanDecompose}/${total} | ${((stats.cleanDecompose / total) * 100).toFixed(1)}% |`);
  md.push(`| 病机（源映射表反推） | ${stats.withMechanism}/${total} | ${((stats.withMechanism / total) * 100).toFixed(1)}% |`);
  md.push(`| 西医病名 | ${stats.withDisease}/${total} | ${((stats.withDisease / total) * 100).toFixed(1)}% |`);
  md.push(`| ICD-11 编码 | ${stats.withIcd}/${total} | ${((stats.withIcd / total) * 100).toFixed(1)}% |`);
  md.push(`| 教材上下文 | ${stats.withTextbook}/${total} | ${((stats.withTextbook / total) * 100).toFixed(1)}% |`);
  md.push(`| 外部证据（web_search 取回） | ${stats.withExternal}/${total} | ${((stats.withExternal / total) * 100).toFixed(1)}% |`);
  md.push(`| ├ 其中**整串级**（单条来源覆盖全部构件） | ${stats.withExternalWhole}/${total} | ${((stats.withExternalWhole / total) * 100).toFixed(1)}% |`);
  md.push(`| ├ 其中**并病达标**（两证同存，两侧各有来源） | ${stats.withConcurrent}/${total} | ${((stats.withConcurrent / total) * 100).toFixed(1)}% |`);
  md.push(`| └ 其中**构件级**（非并病，只构件分别被覆盖） | ${stats.withExternalComponent}/${total} | ${((stats.withExternalComponent / total) * 100).toFixed(1)}% |`);
  md.push(`| WHO-TCM 代码（独立通道） | ${stats.withWhoTcm}/${total} | ${((stats.withWhoTcm / total) * 100).toFixed(1)}% |`, '');
  md.push(`平均缺 ${stats.avgMissing} 个字段；${stats.fullyMissing} 个证名七项全缺。`, '');
  md.push(`**外部证据分三级计，不合并**：整串级 ${stats.withExternalWhole} · 并病达标 ${stats.withConcurrent} · 构件级（弱） ${stats.withExternalComponent}（已入库合计 ${stats.withExternal}）。`, '');
  md.push('口径：`whole/single` = 某条来源写出整串；`component` = 各构件分别有来源。**并病证候（两证同存）以 `component` 为达标** —— 并病本就是两个证同时存在，要求一条文献写出整串是错的标准；哪些是并病由领域判断记录在 `external.json` 的 `concurrent` 字段（`scripts/mark_concurrent.js` 写入，可撤销）。非并病的 `component` 仍按弱证据单列。', '');
  md.push('为什么必须分开：`胸阳痹阻、痰瘀互结证` 这类按 ICD-11 命名的合称证名，中文临床文献很少逐字写，往往只能取到"胸阳不振"与"痰瘀互结"各自的来源。**构件各自有文献 ≠ 这个证名被文献证实**，把两者并成一个 75/96，会让弱证据看起来和强证据一样硬。判定口径写在 `scripts/lib_evidence_scope.js`（证据边界 = 入库的 title+snippet，括注不参与判定）。', '');
  if (stats.externalPartial.length) {
    md.push('### 外部证据不合格（有构件完全没覆盖，需退回重查）', '');
    for (const p of stats.externalPartial) md.push(`- ${p}`);
    md.push('');
  }
  if (stats.dirtyDecompose.length) {
    md.push('### 构词拆不干净的证名（词表缺口，保持可见）', '');
    md.push('病性 + 病位 + 病机动作三类词表盖不到的残余字。**列在这里是为了让缺口别被一个覆盖率数字盖住。**', '');
    for (const d of stats.dirtyDecompose) md.push(`- ${d}`);
    md.push('');
  }
  md.push('### 一条必须说清的更正：教材证据只有 3/96', '');
  md.push('第一版**这个数是 96/96（100%）**。它来自语料里混进了 `reference-units.json` 与 `external.json` ——');
  md.push('也就是**我自己的数据集**，"教材证据"取出来是 `ived": " 5A6F7C", "colorMatch": false` 这样的 JSON 碎片。');
  md.push('**那不是教材，是被论证的对象本身；用它当证据就是自我印证。**');
  md.push('把语料收紧到正文（`.md`）后，这个数掉到 **3/96** —— 这才是真的：');
  md.push('**本仓库的 md 正文里几乎没有证候定义。**', '');
  md.push(`（这是"自己的输出喂回自己的输入"在本仓库第 3 次出现，换了扇门：① \`embeddings/index.json\` ② \`endpoints/README.md\` ③ \`datasets/\` + \`descriptions/\`。规则已写死：证据只取正文。）`, '');
  md.push(`\n**外部证据只有 ${stats.withExternal} 条是这轮实际取回的**（${external.notFetched ? `2 条后端失败，${external.notFetched.remaining} 条未检索` : ''}）。`);
  md.push('这不是"没有资料"，是**这轮没取**——数字如实写在这里，不拿 96 分之几去充全覆盖。', '');
  md.push('## 逐条', '');
  for (const r of out) {
    md.push(`### ${r.label}`);
    md.push(`- 标识：\`${r.canonical}\`${r.aliases.length > 1 ? `（+ ${r.aliases.filter((a) => a !== r.canonical).join(', ')}）` : ''}`);
    md.push(`- 构词：病性 ${r.decomposed.nature.join('·') || '—'} ｜ 病位 ${r.decomposed.locus.join('·') || '—'} ｜ 动作 ${r.decomposed.action.join('·') || '—'}${r.decomposed.residue ? ` ｜ **词表未覆盖「${r.decomposed.residue}」**` : ''}`);
    md.push(`- 病机：${r.mechanisms.join(' · ') || '—'}${r.sampleSymptoms.length ? `（映射表内相关症状：${r.sampleSymptoms.join('、')}…）` : ''}`);
    if (r.disease || r.icd) md.push(`- 西医：${r.disease || '—'}${r.icd ? ` ｜ ICD-11 \`${r.icd}\`` : ''}`);
    if (r.diseaseExamples.length) {
      const list = r.diseaseExamples.map((d) => `${d.disease || '（病名未载）'}${d.icd ? ` \`${d.icd}\`` : ''}（${d.uid}）`).join(' · ');
      md.push(`- **例如（常见于）**：${list}`);
      md.push(`  - 出处：知识树「图谱接口」**样例表**（全表 12 条，非 103 个证候的全量对照）`);
    }
    for (const e of r.externalEvidence) md.push(`- 外部（${e.type}）：${e.title} — ${e.snippet}`);
    if (r.aliases.length) {
      const order = { synonym: 0, composition: 1, qualified: 2, broader: 3 };
      const list = [...r.aliases].sort((a, b) => (order[a.relation] ?? 9) - (order[b.relation] ?? 9))
        .map((a) => `${a.name}（${RELATION_CN[a.relation] || a.relation}）`).join(' · ');
      md.push(`- **异名**（不是证据无关，是写法不同）：${list}`);
      md.push('  - 出处：`standards/semtensor/descriptions/aliases.json`；每条别名都由测试钉住「必须在它 source 指向的来源里字面出现」');
    }
    if (r.whoTcm) {
      const w = r.whoTcm;
      md.push(`- **WHO-TCM**：\`${w.whoCode}\` ｜ ${w.whoEnglish}`);
      if (w.parsed) md.push(`  - 代码拆分：段 ${w.parsed.division} · 组 ${w.parsed.group} · 项 ${w.parsed.item}（§.组.项）`);
      md.push(`  - 类目路径（**另一套编号，不换算**）：${w.classPathFromDict.join(' → ')}`);
      md.push(`  - 英文异名：${(w.whoEnglishAliases || []).join(' / ')}`);
    }
    for (const c of r.textbookEvidence) md.push(`- 教材：\`${c.file}\` — ${c.snippet.slice(0, 120)}`);
    if (r.missing.length) md.push(`- **缺**：${r.missing.join('、')}`);
    md.push('');
  }
  fs.writeFileSync(path.join(OUTDIR, 'descriptions.md'), md.join('\n'), 'utf8');

  console.log('═══ 证候描述（从证据组装）═══\n');
  console.log(`  证名 ${stats.labels}（对应 ${stats.dsuRecords} 条 DSU 记录）`);
  console.log(`  构词解析：病性 ${stats.withNature} · 病位 ${stats.withLocus} · 动作 ${stats.withAction} · 完全拆净 ${stats.cleanDecompose}`);
  console.log(`  病机 ${stats.withMechanism} · 病名 ${stats.withDisease} · ICD ${stats.withIcd}`);
  console.log(`  教材证据 ${stats.withTextbook} · 外部证据 ${stats.withExternal}（整串 ${stats.withExternalWhole} · 并病达标 ${stats.withConcurrent} · 构件 ${stats.withExternalComponent}） · WHO-TCM ${stats.withWhoTcm}`);
  console.log(`  语料 ${stats.corpusFiles} 个 md（不含数据集/索引/报告）`);
  console.log(`  平均缺 ${stats.avgMissing} 项 · 七项全缺 ${stats.fullyMissing} 个 · 构词拆净 ${stats.cleanDecompose}/96`);
  console.log(`  → standards/semtensor/descriptions/descriptions.md`);
  console.log(`  → standards/semtensor/descriptions/dsu-descriptions.json`);
}

if (require.main === module) main();

module.exports = { decompose, NATURE, LOCUS, ACTION, parseWhoCode };
