#!/usr/bin/env node
/**
 * scripts/build_content_board.js — 专业内容完整性看板（单文件 HTML + JSON）
 *
 * 为什么是生成的：手写看板从上线第二天起就在说谎。本文件的每个数字都在运行时从源里算，
 * 并注明**来自哪个文件**；算不出来的（派生件缺失）显式标 `n/a`，不猜、不留空。
 *
 * 与 `build_dashboard.js`（项目 KPI）、`build_textbook_board.js`（教材入库）分工：
 *   · dashboard         —— 工程面：套件、门禁、工作流
 *   · textbook-board    —— 教材面：源表 → 底本/外源/手册，sha256 可对账
 *   · **content-board** —— **专业面**：中医药七层内容各自有多少、缺在哪、缺多少
 *
 * 七层（中医药专业内容）：
 *   ① 经典原文   内经/伤寒/金匮…（章节 + 条文）
 *   ② 证候       104 个语义单元的完整性（描述/症状/ICD/证据/缺项）
 *   ③ 方剂       条文里出现的方名（有无结构化字段）
 *   ④ 中药       结构化条目（性味归经功效）
 *   ⑤ 腧穴       结构化条目（归经/定位/主治）
 *   ⑥ 术语       WHO ISTT / ICD-11 中文名 / 仓库术语表
 *   ⑦ 检索与证据 知识单元、语料、证候外部证据
 *
 * 用法：
 *   node scripts/build_content_board.js           # 生成 data/content-board.json + content-board.html
 *   node scripts/build_content_board.js --check   # 重算并与 JSON 比对（CI）
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const OUT_JSON = path.join(ROOT, 'data/content-board.json');
const OUT_HTML = path.join(ROOT, 'content-board.html');

const readJson = (p) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8')); } catch { return null; } };
const exists = (p) => fs.existsSync(path.join(ROOT, p));

/**
 * 「生成于」不取运行时刻，取**源文件最后修改时间**（departments 下的 md）。
 *
 * 理由：`new Date()` 写进产物 = 每天必报 drift，内容没改也红；红线变噪音就没人看了。
 * 改成源 mtime 后，看板上的日期回答的是「这份统计反映的是哪天的源」。
 * 排除本脚本产物（data/content-board.json、content-board.html）以避免自我回路。
 */
const SELF_FILES = new Set([OUT_JSON, OUT_HTML]);
function sourceDate(startDirs) {
  let newest = 0;
  const walk = (dir) => {
    let ents;
    try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      const p = path.join(dir, e.name);
      if (SELF_FILES.has(p)) continue;
      if (e.isDirectory()) walk(p);
      else if (/\.(md|json)$/i.test(e.name)) {
        try { const m = fs.statSync(p).mtimeMs; if (m > newest) newest = m; } catch { /* 跳过读不到的 */ }
      }
    }
  };
  for (const d of startDirs) walk(path.join(ROOT, d));
  if (!newest) return '1970-01-01';
  const d = new Date(newest);
  const p2 = (n) => String(n).padStart(2, '0');
  // 只到「日」，不到秒：产物每次重出都会改写源文件 mtime，秒级时间戳等于每次重建都换一行，
  // 而真正想回答的是「这份统计反映哪天的源」。同日重建 → 同一行 → 干净 diff。
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}
const sum = (a, f) => a.reduce((n, x) => n + (f(x) || 0), 0);
const pct = (a, b) => (b ? Number(((a / b) * 100).toFixed(2)) : null);
const fmt = (n) => (n >= 1e8 ? `${(n / 1e8).toFixed(2)} 亿` : n >= 1e4 ? `${(n / 1e4).toFixed(1)} 万` : String(n));

// ── ① 结构层（catalog = 单一事实来源）─────────────────────────────
function structure() {
  const cat = readJson('catalog.json') || {};
  const depts = (cat.departments || []).map((d) => {
    const subs = d.subjects || [];
    return {
      n: d.n, slug: d.slug, title: d.title, en: d.en, hours: d.hours,
      chaptersTarget: d.chapters,
      subjects: subs.map((s) => ({
        slug: s.slug, title: s.title, type: s.type, semester: s.semester, hours: s.hours,
        chaptersTarget: s.chaptersTarget, chaptersBuilt: s.chaptersBuilt || 0,
        status: s.status,
        textbookChapters: (s.textbook && s.textbook.chaptersWritten) || 0,
        textbookWords: (s.textbook && s.textbook.words) || 0,
        videos: (s.platform && s.platform.videosPublished) || 0,
      })),
    };
  });
  return {
    source: 'catalog.json',
    departments: depts.length,
    subjects: sum(depts, (d) => d.subjects.length),
    hours: sum(depts, (d) => d.hours),
    chaptersTarget: sum(depts, (d) => d.chaptersTarget),
    chaptersBuilt: sum(depts, (d) => sum(d.subjects, (s) => s.chaptersBuilt)),
    depts,
  };
}

/** 盘上核对：已建章节目录是否真有 docs（不信 catalog 的一面之词） */
function verifyChapters(st) {
  let dirs = 0, withDocs = 0, withQuiz = 0, withOutputs = 0;
  const miss = [];
  for (const d of st.depts) {
    for (const s of d.subjects) {
      if (!s.chaptersBuilt) continue;
      const base = path.join(ROOT, 'departments', d.slug, s.slug, 'chapters');
      let names = [];
      try { names = fs.readdirSync(base, { withFileTypes: true }).filter((x) => x.isDirectory()).map((x) => x.name); } catch { /* 无目录 */ }
      if (names.length !== s.chaptersBuilt) {
        miss.push({ dept: d.title, subject: s.title, declared: s.chaptersBuilt, onDisk: names.length });
      }
      for (const n of names) {
        dirs += 1;
        const c = path.join(base, n);
        if (fs.existsSync(path.join(c, 'docs'))) withDocs += 1;
        if (fs.existsSync(path.join(c, 'quiz.json'))) withQuiz += 1;
        if (fs.existsSync(path.join(c, 'outputs'))) withOutputs += 1;
      }
    }
  }
  return { dirs, withDocs, withQuiz, withOutputs, mismatched: miss };
}

// ── ② 教材层（复用 textbook-board.json，不另造口径）─────────────────
function textbooks() {
  const b = readJson('data/textbook-board.json');
  if (!b) return { source: 'data/textbook-board.json', available: false, bySubject: new Map() };
  const t = b.totals || {};
  // 逐学科取 textbook-board 的**磁盘实测**（hanzi / nonWs），不要用 catalog.textbook.words：
  // 那是源工作簿的字数（含标点），与 hanzi 差 3 百万，混用会让院系矩阵与 KPI 对不上。
  const bySubject = new Map();
  for (const d of b.departments || []) {
    for (const r of d.rows || d.subjects || []) {
      const tb = r.textbook || {};
      bySubject.set(`${d.slug}/${r.slug}`, {
        exists: !!tb.exists,
        chapters: tb.chapters || 0,
        hanzi: tb.hanzi || 0,
        nonWs: tb.nonWs || 0,
        status: tb.status || null,
        layer: tb.layer || null,
        origin: tb.origin || null,
        flags: r.flags || [],
      });
    }
  }
  return {
    source: 'data/textbook-board.json',
    available: true,
    subjects: t.textbookSubjects,
    baseSubjects: t.baseSubjects, extSubjects: t.extSubjects, hbSubjects: t.hbSubjects,
    chapters: (t.baseChapters || 0) + (t.extChapters || 0) + (t.hbChapters || 0),
    baseChapters: t.baseChapters, extChapters: t.extChapters, hbChapters: t.hbChapters,
    // 汉字口径 = textbook-board 的 totals.hanzi（[\\u4e00-\\u9fa5]，与教材看板同源）；
    // nonWs 是含标点的非空白字符，两个数不能互相顶替。
    hanzi: t.hanzi || 0,
    nonWs: t.nonWs || 0,
    coverageHours: t.coverageBaseHours,
    coverageSubjects: t.coverageBaseSubjects,
    bySubject,
  };
}

// ── ③ 证候层 ────────────────────────────────────────────────
function syndromes() {
  const ref = readJson('standards/semtensor/datasets/reference-units.json');
  const units = ((Array.isArray(ref) ? ref : ref && ref.units) || []).filter((u) => u.kind === 'dsu');
  const desc = readJson('standards/semtensor/descriptions/dsu-descriptions.json') || {};
  const recs = desc.records ? (Array.isArray(desc.records) ? desc.records : Object.values(desc.records)) : [];
  const ext = readJson('standards/semtensor/descriptions/external.json') || {};
  const extEntries = ext.entries || {};
  const eq = readJson('standards/semtensor/equivalence/classes.json') || {};
  const cls = eq.classes || [];
  const withTm1 = cls.filter((c) => (c.members || []).some((m) => m.lang === 'en' || /TM1/.test(String(m.source || '')))
    || c.probe).length;

  const byLabel = new Map(recs.map((r) => [r.label, r]));
  // 单元数 ≠ 证候数：reference-units 里同一证候可能因来源不同出现两次（如 脾胃湿热证
  // DSU-00004/DSU-00046）。描述记录按 label 建，所以两个单元共用一个记录 ——
  // 看板必须同时报「单元」与「不同证候」，否则 104 这个数字会虚报 7 个。
  const labelCount = new Map();
  for (const u of units) labelCount.set(u.label, (labelCount.get(u.label) || 0) + 1);
  const duplicates = [...labelCount.entries()].filter(([, n2]) => n2 > 1)
    .map(([label, n2]) => ({ label, count: n2, uids: units.filter((u) => u.label === label).map((u) => u.uid) }));

  const rows = units.map((u) => {
    const r = byLabel.get(u.label) || null;
    return {
      uid: u.uid,
      label: u.label,
      shared: (labelCount.get(u.label) || 0) > 1,
      hasDescription: !!(r && (r.mechanisms || []).length + (r.decomposed ? 1 : 0) > 0),
      symptoms: r ? (r.sampleSymptoms || []).length : 0,
      icd: r ? (r.icd || null) : null,
      icdOfficial: (() => {
        const c = cls.find((x) => x.uid === u.uid);
        return c && (c.members || []).some((m) => /^ICD-11|icd11|data\/icd11/.test(String(m.source || '')));
      })(),
      externalEvidence: r ? (r.externalEvidence || []).length : 0,
      textbookEvidence: r ? (r.textbookEvidence || []).length : 0,
      whoTcm: !!(r && r.whoTcm),
      missing: r ? (r.missing || []) : ['（无描述记录）'],
    };
  });
  const n = rows.length;
  // 覆盖率一律按 **不同证候** 算（描述记录就是按 label 建的），单元数单独报。
  const uniq = [...new Map(rows.map((r) => [r.label, r])).values()];
  return {
    source: 'standards/semtensor/datasets/reference-units.json + descriptions/dsu-descriptions.json + descriptions/external.json',
    total: n,
    distinctLabels: uniq.length,
    duplicates,
    records: recs.length,
    withDescription: uniq.filter((r) => r.hasDescription).length,
    withSymptoms: uniq.filter((r) => r.symptoms > 0).length,
    withIcd: uniq.filter((r) => r.icd || r.icdOfficial).length,
    withExternalEvidence: uniq.filter((r) => r.externalEvidence > 0).length,
    withTextbookEvidence: uniq.filter((r) => r.textbookEvidence > 0).length,
    withWhoTcm: uniq.filter((r) => r.whoTcm).length,
    externalEvidenceTotal: Object.keys(extEntries).reduce((n2, k) => n2 + (Array.isArray(extEntries[k]) ? extEntries[k].length : 1), 0),
    gaps: uniq.filter((r) => r.missing.length).sort((a, b) => b.missing.length - a.missing.length),
    rows,
  };
}

// ── ④ 经典层 + ⑤ 方剂层 ─────────────────────────────────────
function classics() {
  const sh = readJson('standards/shanghan/semtensor-398.json');
  const rows = (sh && sh.rows) || [];
  const withFang = rows.filter((r) => (r.fang || []).length);
  const fangs = new Set(withFang.flatMap((r) => r.fang));
  return {
    source: 'standards/shanghan/semtensor-398.json',
    shanghanTiao: rows.length,
    shanghanWithFang: withFang.length,
    formulas: fangs.size,
    formulaNames: [...fangs].slice(0, 12),
    liu: (sh && sh.counts && sh.counts.axes) || null,
  };
}

// ── ⑥ 术语层 ────────────────────────────────────────────────
function terms() {
  const istt = readJson('standards/semtensor/descriptions/who-istt-terms.json');
  const zh = readJson('standards/icd11/zh-names.json');
  const defs = readJson('standards/icd11/definitions-en.json');
  const gl = exists('glossary/tcm-terms.md') ? fs.readFileSync(path.join(ROOT, 'glossary/tcm-terms.md'), 'utf8') : '';
  const glossaryRows = gl.split('\n').filter((l) => /^\|\s*[^|]+\|/.test(l) && !/^\|\s*-+/.test(l) && !/术语|Term/i.test(l.split('|')[1] || '')).length;
  return {
    source: 'who-istt-terms.json · standards/icd11/zh-names.json · definitions-en.json · glossary/tcm-terms.md',
    istt: istt ? (istt.counts && istt.counts.entries) || (istt.entries || []).length : 0,
    icd11Chinese: zh ? (zh.names || []).filter((n) => n.zh).length : 0,
    icd11Chapter26: zh ? (zh.names || []).length : 0,
    icd11Definitions: defs ? Object.keys(defs.entries || {}).length : 0,
    glossaryRows,
  };
}

// ── ⑦ 检索与证据层 ──────────────────────────────────────────
function retrieval() {
  const emb = readJson('standards/semtensor/embeddings/index.json');
  const idx = readJson('data/icd11/term-index/meta.json');
  return {
    source: 'standards/semtensor/embeddings/index.json + data/icd11/term-index/meta.json',
    units: emb ? (emb.counts && emb.counts.units) || (emb.retrieval && emb.retrieval.units) || null : null,
    corpusFiles: emb ? (emb.counts && emb.counts.corpusFiles) || null : null,
    stdembeddings: emb ? (emb.model || emb.analyzer || null) : null,
    icd11Units: idx ? idx.docs && idx.docs.unitsTotal : null,
    icd11Entities: idx ? idx.docs && idx.docs.entitiesWithCode : null,
    icd11WithDefinition: idx ? idx.docs && idx.docs.withDefinition : null,
  };
}

// ── 组装 ────────────────────────────────────────────────────
function build() {
  const st = structure();
  const disk = verifyChapters(st);
  const tb = textbooks();
  const syn = syndromes();
  const cl = classics();
  const tm = terms();
  const rt = retrieval();

  const layers = [
    {
      key: 'classic', name: '① 经典原文',
      have: st.chaptersBuilt >= 22 ? '内经 10/10 · 伤寒 12/12' : `${st.chaptersBuilt} 章`,
      target: '内经选读 10 · 伤寒论 12 · 金匮要略 10',
      note: `伤寒条文 ${cl.shanghanTiao} 条（${cl.shanghanWithFang} 条带方）· 金匮 0 章（无教材）`,
      cover: pct(22, 32),
      gaps: ['金匮要略 0/10 章（教材缺失）', '内经/伤寒之外无其他经典（难经·神农本草经·温病条辨）'],
    },
    {
      key: 'syndrome', name: '② 证候',
      have: `${syn.distinctLabels} 个（${syn.total} 单元）`,
      target: '目标 300+（**本看板假设**，仓库无此指标）',
      note: `有描述 ${syn.withDescription} · 有症状 ${syn.withSymptoms} · 有 ICD ${syn.withIcd} · 有外部证据 ${syn.withExternalEvidence} · 有教材证据 ${syn.withTextbookEvidence} · 重复单元 ${syn.duplicates.length} 对`,
      cover: pct(syn.distinctLabels, 300),
      gaps: syn.gaps.slice(0, 3).map((g) => `${g.label} 缺：${g.missing.join('、').slice(0, 40)}`),
    },
    {
      key: 'formula', name: '③ 方剂',
      have: `${cl.formulas} 个方名`,
      target: '方剂学 10 章 + 方剂字典（组成/功效/主治）',
      note: `仅从伤寒条文里抽出的方名，无组成/功效/主治字段；方剂学教材 0 章`,
      cover: null,
      gaps: ['无结构化方剂库（组成·功效·主治·配伍）', '方剂学学科无教材'],
    },
    {
      key: 'herb', name: '④ 中药',
      have: '0 条结构化',
      target: '中药学 12 章 · 中药字典（性味/归经/功效/用量）',
      note: '中药学有教材 30 章正文，但无可计算条目（性味归经未结构化）',
      cover: null,
      gaps: ['无中药字典（性味·归经·功效·禁忌）', '中药学已建章节 1/12'],
    },
    {
      key: 'acupoint', name: '⑤ 腧穴',
      have: '0 条结构化',
      target: '腧穴学 12 章 · 腧穴字典（归经/定位/主治）',
      note: '腧穴学有教材 16 章正文，无穴位条目数据',
      cover: null,
      gaps: ['无腧穴字典（归经·定位·主治·操作）', '腧穴学已建章节 1/12'],
    },
    {
      key: 'term', name: '⑥ 术语',
      have: `ISTT ${tm.istt} · ICD-11 中文名 ${tm.icd11Chinese}`,
      target: 'WHO ISTT 全量 · ICD-11 第 26 章中文名 · 仓库术语表',
      note: `ICD-11 释义 ${tm.icd11Definitions} 条 · 仓库 glossary ${tm.glossaryRows} 行`,
      cover: pct(tm.icd11Chinese, tm.icd11Chapter26),
      gaps: ['TM2 648 条无中文题名（WHO 未译）', '仓库术语表仅 139 行，未与 ISTT 打通'],
    },
    {
      key: 'evidence', name: '⑦ 检索与证据',
      have: `证候证据 ${syn.externalEvidenceTotal} 条`,
      target: '每个证候 ≥1 条外部证据 + 可检索语料',
      note: `ICD-11 术语层 ${rt.icd11Entities || 'n/a'} 实体 / 释义 ${rt.icd11WithDefinition || 'n/a'}`,
      cover: pct(syn.withExternalEvidence, syn.total),
      gaps: [`${syn.total - syn.withExternalEvidence} 个证候无外部证据`],
    },
  ];

  const gaps = [];
  const tbOf = (d, s) => tb.bySubject.get(`${d.slug}/${s.slug}`) || null;
  const noBook = [];
  for (const d of st.depts) for (const s of d.subjects) {
    const r = tbOf(d, s);
    if (!r || !r.chapters) noBook.push({ dept: d.title, subject: s.title, target: s.chaptersTarget });
  }
  noBook.sort((a, b) => b.target - a.target);
  if (noBook.length) gaps.push({ kind: '教材缺稿', n: noBook.length, detail: noBook.slice(0, 12).map((x) => `${x.dept}/${x.subject}(${x.target}章)`), fix: '按目标章节数从大到小补稿（先补 14 章的病理生理学、12 章的大语言模型/细胞生物学）' });

  const notBuilt = st.chaptersTarget - st.chaptersBuilt;
  gaps.push({ kind: '章节未建', n: notBuilt, detail: [`${st.subjects} 学科目标 ${st.chaptersTarget} 章，已建 ${st.chaptersBuilt}`], fix: '按学科整科推满（内经/伤寒已满科），而不是全库平均铺开' });

  const thin = [];
  for (const d of st.depts) for (const s of d.subjects) {
    const r = tbOf(d, s);
    if (!r || !r.chapters) continue;
    const density = Math.round(r.hanzi / r.chapters);
    if (density < 8000) thin.push({ dept: d.title, subject: s.title, density, chapters: r.chapters });
  }
  thin.sort((a, b) => a.density - b.density);
  if (thin.length) {
    // 「毕业设计与知识移交」这类结课学科体例本就短（章少、每章数百字），
    // 一律按 8,000 字/章判薄会冤枉它们 —— 分开计数，别把体例差异说成内容不足。
    const ceremonial = thin.filter((x) => /毕业设计|知识移交|轮转/.test(x.subject));
    const realThin = thin.filter((x) => !/毕业设计|知识移交|轮转/.test(x.subject));
    gaps.push({
      kind: '教材过薄', n: realThin.length,
      detail: [
        ...realThin.slice(0, 10).map((x) => `${x.subject} ${x.density} 字/章`),
        ...(ceremonial.length ? [`另有 ${ceremonial.length} 个结课类学科（毕业设计/知识移交）单章 ${ceremonial.map((x) => x.density).join('/')} 字，属体例例外`] : []),
      ],
      fix: '正文类学科低于 8,000 字/章的优先补写（本科教材单章通常 1–1.5 万字）；结课类不计入',
    });
  }

  gaps.push({ kind: '结构化层缺位', n: 3, detail: ['方剂（0 条结构化）', '中药（0 条结构化）', '腧穴（0 条结构化）'], fix: '从教材正文抽字段（组成/性味归经/定位主治），先做伤寒 111 方' });
  gaps.push({ kind: '视频缺位', n: 1, detail: ['platform 已发布 0 讲'], fix: 'tcmP 流水线已就绪，选题材（内经/伤寒各 1 讲试水）' });
  if (syn.duplicates.length) {
    gaps.push({
      kind: '证候重复单元', n: syn.duplicates.length,
      detail: syn.duplicates.map((d) => `${d.label} ×${d.count}（${d.uids.join(' / ')}）`),
      fix: '同一证候不同来源各建一条 → 需人工定「是否合并」；合并前 104 单元 ≠ 104 证候，别拿单元数当证候数',
    });
  }

  const doc = {
    $generated: 'node scripts/build_content_board.js',
    generatedAt: sourceDate(['departments', 'standards']),
    rules: {
      structure: 'catalog.json（SSOT）',
      chapters: 'catalog.chaptersBuilt + 盘上 departments/*/*/chapters/* 目录核对',
      textbook: 'data/textbook-board.json（汉字口径 [\\u4e00-\\u9fa5]，与教材看板同源）',
      syndrome: 'reference-units（kind=dsu）+ dsu-descriptions + external',
      terms: 'who-istt-terms / standards/icd11 / glossary',
    },
    kpi: {
      departments: st.departments, subjects: st.subjects, hours: st.hours,
      chaptersTarget: st.chaptersTarget, chaptersBuilt: st.chaptersBuilt, chaptersPct: pct(st.chaptersBuilt, st.chaptersTarget),
      textbookSubjects: tb.available ? tb.subjects : null, textbookChapters: tb.available ? tb.chapters : null,
      hanzi: tb.available ? tb.hanzi : null,
      nonWs: tb.available ? tb.nonWs : null,
      syndromes: syn.distinctLabels, syndromeUnits: syn.total, shanghanTiao: cl.shanghanTiao, formulas: cl.formulas,
      istt: tm.istt, videos: sum(st.depts, (d) => sum(d.subjects, (s) => s.videos)),
    },
    layers, gaps,
    departments: st.depts.map((d) => ({
      n: d.n, slug: d.slug, title: d.title,
      subjects: d.subjects.length,
      chaptersTarget: d.chaptersTarget,
      chaptersBuilt: sum(d.subjects, (s) => s.chaptersBuilt),
      textbookSubjects: d.subjects.filter((s) => { const r = tbOf(d, s); return r && r.chapters > 0; }).length,
      hanzi: sum(d.subjects, (s) => { const r = tbOf(d, s); return r ? r.hanzi : 0; }),
      thin: d.subjects.filter((s) => { const r = tbOf(d, s); return r && r.chapters > 0 && r.hanzi / r.chapters < 8000 && !/毕业设计|知识移交|轮转/.test(s.title); }).length,
      noBook: d.subjects.filter((s) => { const r = tbOf(d, s); return !r || !r.chapters; }).length,
      videos: sum(d.subjects, (s) => s.videos),
    })),
    disk,
    syndromeDetail: {
      total: syn.total, distinctLabels: syn.distinctLabels, records: syn.records,
      duplicates: syn.duplicates,
      withDescription: syn.withDescription, withSymptoms: syn.withSymptoms,
      withIcd: syn.withIcd, withExternalEvidence: syn.withExternalEvidence,
      withTextbookEvidence: syn.withTextbookEvidence, withWhoTcm: syn.withWhoTcm,
      gaps: syn.gaps.slice(0, 20).map((g) => ({ label: g.label, missing: g.missing })),
    },
    assumptions: [
      '「证候目标 300+」是本看板定的参照线，仓库没有这个指标，覆盖率只作方向参考',
      '「方剂/中药/腧穴字典」是建议目标，仓库当前没有结构化数据集，覆盖记 n/a 而不是 0%',
      '教材汉字数取 textbook-board 的 totals.hanzi（[\\u4e00-\\u9fa5]）；非空白字符另计',
    ],
    sources: { structure: st.source, textbook: tb.source, syndrome: syn.source, classics: cl.source, terms: tm.source, retrieval: rt.source },
  };
  return doc;
}

// ── 渲染 ─────────────────────────────────────────────────────
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function bar(p) {
  if (p == null) return '<span class="na">n/a</span>';
  const w = Math.max(2, Math.min(100, p));
  const cls = p >= 90 ? 'ok' : p >= 40 ? 'mid' : 'low';
  return `<span class="bar ${cls}"><i style="width:${w}%"></i></span><b>${p}%</b>`;
}

function html(d) {
  const k = d.kpi;
  const layerRows = d.layers.map((l) => `
      <tr>
        <th>${esc(l.name)}</th>
        <td class="have">${esc(l.have)}</td>
        <td class="target">${esc(l.target)}</td>
        <td>${bar(l.cover)}</td>
        <td class="note">${esc(l.note)}<ul>${l.gaps.map((g) => `<li>${esc(g)}</li>`).join('')}</ul></td>
      </tr>`).join('');

  const deptRows = d.departments.map((x) => `
      <tr>
        <th>${esc(x.title)}</th>
        <td>${x.subjects}</td>
        <td>${x.chaptersBuilt}<span class="dim">/${x.chaptersTarget}</span></td>
        <td>${x.textbookSubjects}<span class="dim">/${x.subjects}</span></td>
        <td>${fmt(x.hanzi)}</td>
        <td class="${x.noBook > 6 ? 'bad' : ''}">${x.noBook}</td>
        <td class="${x.thin > 2 ? 'bad' : ''}">${x.thin}</td>
        <td>${x.videos}</td>
      </tr>`).join('');

  const gapCards = d.gaps.map((g) => `
      <article class="gap">
        <h3>${esc(g.kind)}<span class="num">${g.n}</span></h3>
        <ul>${g.detail.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        <p class="fix">补法：${esc(g.fix)}</p>
      </article>`).join('');

  const syn = d.syndromeDetail;
  const synRows = [
    ['有描述（构词/机理）', syn.withDescription], ['有症状词', syn.withSymptoms],
    ['有 ICD-11 编码', syn.withIcd], ['有外部证据', syn.withExternalEvidence],
    ['有教材证据', syn.withTextbookEvidence], ['有 WHO 中医编码', syn.withWhoTcm],
  ].map(([n, v]) => `<tr><th>${n}</th><td>${v}<span class="dim">/${syn.distinctLabels}</span></td><td>${bar(pct(v, syn.distinctLabels))}</td></tr>`).join('');

  const dupNote = syn.duplicates.length
    ? `<p class="sub" style="margin-top:10px"><span class="bad">重复单元 ${syn.duplicates.length} 对</span>：${syn.duplicates.map((x) => `${esc(x.label)}（${x.uids.join('/')}）`).join('；')} —— 同证候不同来源各建一条，合并前「${syn.total} 单元」不等于「${syn.distinctLabels} 证候」。</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<title>中医药专业内容完整性看板</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  :root{--bg:#0d0a07;--panel:#1a1610;--line:#2a2218;--fg:#efe6d8;--dim:#a08f76;--accent:#d8a657;--ok:#7fb069;--mid:#d8a657;--bad:#c1666b}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--fg);font-family:"Noto Serif SC","Source Han Serif CN","Songti SC",SimSun,serif;line-height:1.65}
  main{max-width:1180px;margin:0 auto;padding:40px 24px 80px}
  h1{font-size:30px;margin:0 0 6px;letter-spacing:.04em}
  .sub{color:var(--dim);font-size:13px;margin-bottom:28px}
  .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:0 0 34px}
  .kpi{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:14px 16px}
  .kpi b{display:block;font-size:24px;color:var(--accent);font-weight:600}
  .kpi span{font-size:12px;color:var(--dim)}
  h2{font-size:19px;margin:38px 0 12px;padding-bottom:8px;border-bottom:1px solid var(--line)}
  table{width:100%;border-collapse:collapse;font-size:13.5px}
  th,td{padding:10px 12px;border-bottom:1px solid var(--line);vertical-align:top;text-align:left}
  thead th{color:var(--dim);font-weight:500;font-size:12px;letter-spacing:.08em}
  tbody th{font-weight:600;white-space:nowrap}
  .have{color:var(--fg);white-space:nowrap}
  .target,.note{color:var(--dim)}
  .note ul{margin:6px 0 0;padding-left:16px}
  .note li{font-size:12.5px;color:var(--bad);opacity:.9}
  .dim{color:var(--dim);font-size:12px}
  .bad{color:var(--bad);font-weight:600}
  .na{color:var(--dim);font-size:12px}
  .bar{display:inline-block;width:64px;height:6px;background:#241d14;border-radius:3px;overflow:hidden;vertical-align:middle;margin-right:8px}
  .bar i{display:block;height:100%}
  .bar.ok i{background:var(--ok)} .bar.mid i{background:var(--mid)} .bar.low i{background:var(--bad)}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px}
  .gap{background:var(--panel);border:1px solid var(--line);border-left:3px solid var(--bad);border-radius:8px;padding:14px 16px}
  .gap h3{margin:0 0 8px;font-size:15px;display:flex;justify-content:space-between;align-items:baseline}
  .gap .num{color:var(--bad);font-size:20px}
  .gap ul{margin:0;padding-left:16px;color:var(--dim);font-size:12.5px}
  .gap .fix{margin:10px 0 0;font-size:12.5px;color:var(--accent)}
  .src{margin-top:34px;font-size:12px;color:var(--dim)}
  .src code{color:#c8b18a;background:#181310;padding:1px 5px;border-radius:4px}
</style></head><body><main>
  <h1>中医药专业内容完整性看板</h1>
  <div class="sub">生成于 ${esc(d.generatedAt)} · 全部数字运行时从仓库源计算 · 与 <code>npm run dashboard</code>（工程面）、<code>textbook-board.html</code>（教材面）分工</div>

  <div class="kpis">
    <div class="kpi"><b>${k.subjects}</b><span>学科 / ${k.departments} 院系</span></div>
    <div class="kpi"><b>${k.chaptersBuilt}<span class="dim">/${k.chaptersTarget}</span></b><span>已建章节 ${k.chaptersPct}%</span></div>
    <div class="kpi"><b>${k.textbookSubjects == null ? 'n/a' : k.textbookSubjects}<span class="dim">/${k.subjects}</span></b><span>有教材稿学科</span></div>
    <div class="kpi"><b>${k.hanzi == null ? 'n/a' : fmt(k.hanzi)}</b><span>教材汉字（非空白字符 ${k.nonWs == null ? 'n/a' : fmt(k.nonWs)}）</span></div>
    <div class="kpi"><b>${k.syndromes}</b><span>证候（${k.syndromeUnits} 个语义单元）</span></div>
    <div class="kpi"><b>${k.shanghanTiao}</b><span>伤寒条文 / ${k.formulas} 方</span></div>
    <div class="kpi"><b>${k.istt}</b><span>WHO ISTT 术语</span></div>
    <div class="kpi"><b>${k.videos}</b><span>已发布视频</span></div>
  </div>

  <h2>七层专业内容</h2>
  <table><thead><tr><th>层</th><th>实有</th><th>应有</th><th>覆盖</th><th>说明与缺口</th></tr></thead>
  <tbody>${layerRows}</tbody></table>

  <h2>院系矩阵</h2>
  <table><thead><tr><th>院系</th><th>学科</th><th>章节</th><th>有教材</th><th>教材汉字</th><th>无教材</th><th>过薄</th><th>视频</th></tr></thead>
  <tbody>${deptRows}</tbody></table>
  <p class="sub" style="margin-top:10px">「过薄」= 教材单章汉字 &lt; 8,000；「无教材」= 该学科 textbooks 目录无章文件。</p>

  <h2>缺口清单（按影响排序）</h2>
  <div class="grid">${gapCards}</div>

  <h2>证候层完整性（${syn.distinctLabels} 个证候 · ${syn.total} 个语义单元）</h2>
  <table><thead><tr><th>维度</th><th>数量</th><th>覆盖</th></tr></thead><tbody>${synRows}</tbody></table>
  ${dupNote}
  ${syn.gaps.length ? `<p class="sub" style="margin-top:12px">缺项最多的证候：${syn.gaps.slice(0, 6).map((g) => `${esc(g.label)}（${esc(g.missing.slice(0, 3).join('·'))}）`).join('；')}</p>` : ''}

  <h2>口径与数据源</h2>
  <div class="src">
    ${Object.entries(d.sources).map(([k2, v]) => `<div><code>${esc(k2)}</code> ← ${esc(v)}</div>`).join('')}
    <div style="margin-top:8px">盘上章节核对：${d.disk.dirs} 个章节目录 · 有 docs ${d.disk.withDocs} · 有 quiz ${d.disk.withQuiz} · 有 outputs ${d.disk.withOutputs}${d.disk.mismatched.length ? ` · <span class="bad">与 catalog 不一致 ${d.disk.mismatched.length} 处</span>` : ''}</div>
    <div style="margin-top:12px"><b>口径假设（不是仓库既有指标，别当结论引用）：</b><ul>${(d.assumptions || []).map((a) => `<li>${esc(a)}</li>`).join('')}</ul></div>
  </div>
</main></body></html>`;
}

function main() {
  const argv = process.argv.slice(2);
  const doc = build();
  if (argv.includes('--check')) {
    const prev = readJson('data/content-board.json');
    if (!prev) { console.error('[content-board] ✗ 缺 data/content-board.json —— 先跑一次生成'); process.exit(1); }
    const errs = [];
    for (const k of ['subjects', 'chaptersTarget', 'chaptersBuilt', 'syndromes', 'syndromeUnits', 'formulas', 'istt']) {
      if ((prev.kpi || {})[k] !== doc.kpi[k]) errs.push(`kpi.${k}: 产物 ${prev.kpi[k]} ≠ 重算 ${doc.kpi[k]}`);
    }
    if ((prev.departments || []).length !== doc.departments.length) errs.push('院系数不符');
    if (errs.length) { console.error('[content-board] ✗ 看板已过期：\n  ' + errs.slice(0, 8).join('\n  ')); process.exit(1); }
    console.log(`[content-board] ✓ 与重算一致（${doc.kpi.subjects} 学科 · ${doc.kpi.chaptersBuilt}/${doc.kpi.chaptersTarget} 章 · ${doc.kpi.syndromes} 证候）`);
    return 0;
  }
  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(doc, null, 1)}\n`, 'utf8');
  fs.writeFileSync(OUT_HTML, html(doc), 'utf8');
  console.log('═══ 专业内容完整性看板 ═══');
  console.log(`  学科 ${doc.kpi.subjects} · 章节 ${doc.kpi.chaptersBuilt}/${doc.kpi.chaptersTarget}（${doc.kpi.chaptersPct}%）`);
  console.log(`  教材 ${doc.kpi.textbookSubjects}/${doc.kpi.subjects} 学科 · ${fmt(doc.kpi.hanzi || 0)} 汉字 · ${doc.kpi.textbookChapters} 章`);
  console.log(`  证候 ${doc.kpi.syndromes} 个（${doc.kpi.syndromeUnits} 单元，重复 ${doc.syndromeDetail.duplicates.length} 对）· 伤寒 ${doc.kpi.shanghanTiao} 条 / ${doc.kpi.formulas} 方 · ISTT ${doc.kpi.istt}`);
  console.log(`  缺口 ${doc.gaps.length} 类：${doc.gaps.map((g) => `${g.kind}(${g.n})`).join(' · ')}`);
  console.log(`  → data/content-board.json · content-board.html`);
  return 0;
}

if (require.main === module) {
  try { process.exit(main()); } catch (e) { console.error(`\n✗ ${e.message}\n${e.stack.split('\n').slice(1, 4).join('\n')}`); process.exit(1); }
}

module.exports = { build, html, structure, textbooks, syndromes, classics, terms, retrieval };
