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

// ── 病性 / 病位 词表（构词解析用；中医证名是构词的，所以能拆）──
const NATURE = [
  '风寒湿', '风寒', '风热', '风湿', '风痰', '寒湿', '寒痰', '湿热', '痰热', '燥热', '暑湿', '暑热',
  '气滞血瘀', '气滞', '血瘀', '气虚', '血虚', '气血两虚', '阴虚', '阳虚', '气阴两虚', '阴阳两虚',
  '阳亢', '阳脱', '阴盛', '痰湿', '痰浊', '痰饮', '水饮', '痰', '湿', '热', '寒', '风', '燥', '火',
  '毒', '瘀', '郁', '虚', '实', '气逆', '气陷', '气不固', '血热', '血寒', '内热', '内寒', '内风', '内湿',
];
const LOCUS = [
  '半表半里', '上焦', '中焦', '下焦', '清窍', '冲任', '肌肤', '关节', '筋骨', '心神', '经络',
  '表', '里', '卫', '营', '血', '气',
  '肺', '心', '脾', '肝', '肾', '胆', '胃', '小肠', '大肠', '膀胱', '三焦', '命门',
];

function decompose(label) {
  const name = label;
  const natures = [], locuses = [];
  let rest = name;
  // 病性：按词表长度降序做最长匹配（避免"寒湿"被拆成"寒"+"湿"后重复计）
  for (const w of [...NATURE].sort((a, b) => b.length - a.length)) {
    if (rest.includes(w)) { natures.push(w); rest = rest.split(w).join('\u0001'); }
  }
  rest = name;
  for (const w of [...LOCUS].sort((a, b) => b.length - a.length)) {
    if (rest.includes(w)) { locuses.push(w); rest = rest.split(w).join('\u0001'); }
  }
  // 去掉证名后缀
  const core = name.replace(/证$|病$/, '');
  return {
    core,
    nature: [...new Set(natures)],
    locus: [...new Set(locuses)],
    // 未被词表覆盖的残余汉字（提示词表不全，不假装覆盖完整）
    residue: [...new Set(core.split('').filter((c) => !NATURE.some((w) => w.includes(c)) && !LOCUS.some((w) => w.includes(c)) && !/[...(]/u.test(c)))].join(''),
  };
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

function main() {
  const table = api.loadSymptomMap();
  const instance = api.makeApi();
  const merge = instance.mergeTable();

  // 外部证据（已落库的）
  const external = JSON.parse(fs.readFileSync(P('standards/semtensor/descriptions/external.json'), 'utf8'));
  const extByLabel = new Map(external.entries.map((e) => [e.label, e.sources]));

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
      return { label, canonical: sorted[0].uid, aliases: units.map((u) => u.uid), attrs: attrs.get(sorted[0].uid) || {} };
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
      textbookEvidence: ctx.map((c) => ({ file: c.file, snippet: c.snippet })),
      externalEvidence: ext,
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
    withMechanism: cov((r) => r.mechanisms.length),
    withDisease: cov((r) => r.disease),
    withIcd: cov((r) => r.icd),
    withTextbook: cov((r) => r.textbookEvidence.length),
    withExternal: cov((r) => r.externalEvidence.length),
    fullyMissing: cov((r) => r.missing.length === 6),
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
  md.push(`| 病机（源映射表反推） | ${stats.withMechanism}/${total} | ${((stats.withMechanism / total) * 100).toFixed(1)}% |`);
  md.push(`| 西医病名 | ${stats.withDisease}/${total} | ${((stats.withDisease / total) * 100).toFixed(1)}% |`);
  md.push(`| ICD-11 编码 | ${stats.withIcd}/${total} | ${((stats.withIcd / total) * 100).toFixed(1)}% |`);
  md.push(`| 教材上下文 | ${stats.withTextbook}/${total} | ${((stats.withTextbook / total) * 100).toFixed(1)}% |`);
  md.push(`| 外部证据（web_search 取回） | ${stats.withExternal}/${total} | ${((stats.withExternal / total) * 100).toFixed(1)}% |`, '');
  md.push(`平均缺 ${stats.avgMissing} 个字段；${stats.fullyMissing} 个证名六项全缺。`, '');
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
    md.push(`- 构词：病性 ${r.decomposed.nature.join('·') || '—'} ｜ 病位 ${r.decomposed.locus.join('·') || '—'}${r.decomposed.residue ? ` ｜ 词表未覆盖「${r.decomposed.residue}」` : ''}`);
    md.push(`- 病机：${r.mechanisms.join(' · ') || '—'}${r.sampleSymptoms.length ? `（映射表内相关症状：${r.sampleSymptoms.join('、')}…）` : ''}`);
    if (r.disease || r.icd) md.push(`- 西医：${r.disease || '—'}${r.icd ? ` ｜ ICD-11 \`${r.icd}\`` : ''}`);
    for (const e of r.externalEvidence) md.push(`- 外部（${e.type}）：${e.title} — ${e.snippet}`);
    for (const c of r.textbookEvidence) md.push(`- 教材：\`${c.file}\` — ${c.snippet.slice(0, 120)}`);
    if (r.missing.length) md.push(`- **缺**：${r.missing.join('、')}`);
    md.push('');
  }
  fs.writeFileSync(path.join(OUTDIR, 'descriptions.md'), md.join('\n'), 'utf8');

  console.log('═══ 证候描述（从证据组装）═══\n');
  console.log(`  证名 ${stats.labels}（对应 ${stats.dsuRecords} 条 DSU 记录）`);
  console.log(`  构词解析：病性 ${stats.withNature} · 病位 ${stats.withLocus}`);
  console.log(`  病机 ${stats.withMechanism} · 病名 ${stats.withDisease} · ICD ${stats.withIcd}`);
  console.log(`  教材证据 ${stats.withTextbook} · 外部证据 ${stats.withExternal}   ← 教材证据收紧到 .md 正文后只有这么多`);
  console.log(`  语料 ${stats.corpusFiles} 个 md（不含数据集/索引/报告）`);
  console.log(`  平均缺 ${stats.avgMissing} 项 · 六项全缺 ${stats.fullyMissing} 个`);
  console.log(`  → standards/semtensor/descriptions/descriptions.md`);
  console.log(`  → standards/semtensor/descriptions/dsu-descriptions.json`);
}

if (require.main === module) main();

module.exports = { decompose, NATURE, LOCUS };
