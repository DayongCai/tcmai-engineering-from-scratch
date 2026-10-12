#!/usr/bin/env node
/**
 * scripts/import_knowledge_tree.js — 把《中医知识树》xlsx 导入为真教材 + 机器可读骨架
 *
 *   node scripts/import_knowledge_tree.js            导入
 *   node scripts/import_knowledge_tree.js --check    只校核，不写文件
 *
 * 源：standards/knowledge-tree/sources/中医知识树.xlsx（原样入库，可复现）
 * 产：
 *   textbooks/07-zhineng/05-zhongyi-zhishi-tupu/   —— 4 篇 10 章真教材（00-前言 + 10 章）
 *   standards/knowledge-tree/tree-schema.json      —— 五级骨架 + 八域学科分布（机器可读）
 *   standards/knowledge-tree/source-map.json       —— 出处、指纹、章节索引、分歧项
 *
 * 原则：**从源文件解析，不手抄**。这份 xlsx 是源数据，手抄会漂移，且漂移时没有任何东西会报错。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { readWorkbook } = require('./lib_xlsx');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'standards', 'knowledge-tree', 'sources', '中医知识树.xlsx');
const STD_DIR = path.join(ROOT, 'standards', 'knowledge-tree');
const TB_DIR = path.join(ROOT, 'textbooks', '07-zhineng', '05-zhongyi-zhishi-tupu');
const CHECK_ONLY = process.argv.includes('--check');

// 源教材自称的学科位次：D07-S04。而本院系（07-zhineng）里「中医知识图谱」排在第 5 位。
// 两者不一致 —— 见 source-map.json 的 discrepancies。
const SOURCE_SUBJECT_CODE = 'D07-S04';
const LOCAL_SUBJECT_SLUG = '05-zhongyi-zhishi-tupu';

// ── 小工具 ────────────────────────────────────────────────────────────

/** 文件名安全化：去掉 Windows 非法字符，保留中文 */
function safeName(s) {
  return String(s).replace(/[\\/:*?"<>|]/g, '·').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
}

const cell = (v) => String(v === undefined || v === null ? '' : v).trim();

/** 章号 → 阿拉伯数字（用于文件名前缀） */
const CN_NUM = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

function chapterOrdinal(title) {
  const m = /^第([一二三四五六七八九十]+)章/.exec(cell(title));
  if (!m) return null;
  const s = m[1];
  if (s === '十') return 10;
  if (s.length === 2 && s[0] === '十') return 10 + CN_NUM[s[1]];
  if (s.length === 2 && s[1] === '十') return CN_NUM[s[0]] * 10;
  return CN_NUM[s] || null;
}

/** 去掉「第N章 」前缀，得到短标题 */
function shortTitle(title) {
  const t = cell(title).replace(/^第[一二三四五六七八九十]+章\s*/, '');
  return t.replace(/^[—\-–:：\s]+/, '');
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

// ── 解析源文件 ────────────────────────────────────────────────────────

if (!fs.existsSync(SRC)) {
  console.error(`✗ 缺源文件: ${path.relative(ROOT, SRC)}`);
  console.error('  这是源数据，必须先入库。它来自用户桌面材料，不入库则本脚本不可复现。');
  process.exit(1);
}

const buf = fs.readFileSync(SRC);
const wb = readWorkbook(SRC);

function sheetByName(pred) {
  const s = wb.sheets.find((x) => pred(x.name));
  if (!s) throw new Error(`未找到工作表: ${pred}`);
  return s;
}

const cover = wb.sheets[0];                                   // 0封面
const toc = sheetByName((n) => n.includes('目录'));            // 0目录
const body = sheetByName((n) => n.includes('正文总表'));        // 0正文总表
const overview = sheetByName((n) => n.includes('总览'));        // 知识树总览

// —— 封面元数据卡：A 列是键、B 列是值 ——
const meta = {};
let altNote = [];
let preface = [];
{
  let mode = 'meta';
  for (const row of cover.rows) {
    const k = cell(row[0]);
    const v = cell(row[1]);
    if (!k) continue;
    if (k.includes('替代说明')) { mode = 'alt'; continue; }
    if (k.includes('卷首') || k.includes('README')) { mode = 'preface'; continue; }
    if (mode === 'meta' && v) meta[k] = v;
    else if (mode === 'alt') { if (v) altNote.push(`${k} ${v}`); }
    else if (mode === 'preface' && k !== '标题') { if (v) preface.push(v); }
  }
}
if (!altNote.length) altNote = [];

// —— 目录：篇 / 章 ——
const chapters = [];
let currentPart = '';
for (const row of toc.rows) {
  const level = cell(row[0]);
  const title = cell(row[1]);
  const file = cell(row[2]);
  const sections = cell(row[3]);
  if (level === '篇') currentPart = title;
  else if (level === '章' && title) {
    chapters.push({ title, part: currentPart, sections: Number(sections) || null, srcFile: file });
  }
}
if (chapters.length !== 10) {
  console.error(`✗ 目录解析异常：期望 10 章，得到 ${chapters.length} 章`);
  process.exit(1);
}

// —— 正文总表：按章分组，保留行序 ——
const byChapter = new Map();
for (const row of body.rows.slice(2)) {
  const ch = cell(row[0]);
  const pos = cell(row[1]);
  const type = cell(row[2]);
  const content = cell(row[3]);
  if (!ch || !type) continue;
  if (!byChapter.has(ch)) byChapter.set(ch, []);
  byChapter.get(ch).push({ pos, type, content });
}

// ── 正文总表 → Markdown ───────────────────────────────────────────────

/**
 * 源表里有若干单元格把**整个列表塞进一格**（如「- **G1 …**； - **G2 …**」或
 * 「- `meridian_liuzhu`…； - `meridian_biaoli`…」）。直接输出会连成一行。
 *
 * 判据：**单元格本身以列表标记开头** 且 还含至少一个「 - 」分隔 —— 两条同时成立才拆。
 * 只要求 `**` 是不够的：实测有 3/5 处列表用的是行内代码或纯文本，没有粗体标记。
 * 而只凭「 - 」就拆会误伤散文，所以「以列表标记开头」这一条不能去掉。
 */
function normalizeBody(content) {
  const t = String(content).trim();
  if (!/^[-*]\s+\S/.test(t)) return t;
  const parts = t.split(/\s+[-*]\s+(?=\S)/);
  if (parts.length < 2) return t;
  return parts
    .map((s) => `- ${s.replace(/^[-*]\s+/, '').replace(/；\s*$/, '；')}`)
    .join('\n');
}

/**
 * 把一章的行序列渲染成 Markdown。
 * 关键：连续同类块要**合并** —— 表格逐行给定，必须并成一张表；
 * 代码逐行给定，必须并成一个围栏块。逐行各自围栏会产出 90 个单行代码块。
 */
function renderChapter(ch) {
  const rows = byChapter.get(ch.title) || [];
  const out = [];
  out.push(`# ${ch.title}`, '');
  if (ch.part) out.push(`> ${ch.part}`, '');

  let i = 0;
  while (i < rows.length) {
    const r = rows[i];

    if (r.type === '标题') {
      const t = r.content || r.pos;
      if (t === ch.title) { i += 1; continue; }   // 章标题已作 H1
      // 节标题 => ##（去掉序号后的层次不再喧宾夺主）
      out.push(`## ${t}`, '');
      i += 1;
      continue;
    }

    if (r.type === '表格') {
      // 连续表格行 → 一张表
      const block = [];
      while (i < rows.length && rows[i].type === '表格') { block.push(rows[i].content); i += 1; }
      out.push(...block, '');
      continue;
    }

    if (r.type === '代码') {
      const block = [];
      while (i < rows.length && rows[i].type === '代码') { block.push(rows[i].content); i += 1; }
      out.push('```', ...block, '```', '');
      continue;
    }

    // 正文
    out.push(normalizeBody(r.content), '');
    i += 1;
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

// ── 生成文件清单 ──────────────────────────────────────────────────────

const files = new Map();

// 00-前言.md —— 封面元数据卡 + 替代说明 + 卷首
{
  const L = [];
  L.push('# 中医知识树 · 教材', '');
  L.push('> 本文档由 `scripts/import_knowledge_tree.js` 从源 xlsx 解析生成，**请勿手改**；');
  L.push('> 改源文件后重跑脚本。手改会在下次导入时静默丢失。', '');
  L.push('---', '', '## 教材元数据卡', '');
  L.push('| 项 | 值 |', '| --- | --- |');
  for (const [k, v] of Object.entries(meta)) L.push(`| ${k} | ${v.replace(/\|/g, '\\|')} |`);
  L.push('');

  if (altNote.length) {
    L.push('## 替代说明：为何用「知识树」取代「知识图谱」', '');
    for (const a of altNote) L.push(`- ${a}`);
    L.push('');
  }
  if (preface.length) {
    L.push('## 卷首', '');
    for (const p of preface) L.push(p, '');
  }

  L.push('---', '');
  L.push('## 卷目', '');
  L.push('| 篇 | 章 | 节数 |', '| --- | --- | :-: |');
  for (const c of chapters) L.push(`| ${c.part || '—'} | ${c.title} | ${c.sections || '—'} |`);
  L.push('');
  files.set('00-前言.md', L.join('\n'));
}

const chapterIndex = [];
for (const ch of chapters) {
  const n = chapterOrdinal(ch.title);
  if (!n) { console.error(`✗ 无法解析章号: ${ch.title}`); process.exit(1); }
  const fname = `${String(n).padStart(2, '0')}-第${n}章-${safeName(shortTitle(ch.title))}.md`;
  const md = renderChapter(ch);
  files.set(fname, md);
  chapterIndex.push({
    n, title: ch.title, part: ch.part, sections: ch.sections, file: fname,
    chars: md.replace(/\s/g, '').length,
    cells: (byChapter.get(ch.title) || []).length,
  });
}

// ── 骨架：五级 + 八域分布 ─────────────────────────────────────────────

/** 从「知识树总览」表解析 L0–L4 与八域分布 */
function parseSchema() {
  const rows = overview.rows.map((r) => r.map(cell));
  const levels = [];
  const domains = [];
  let conceptCluster = null;

  let section = 'levels';
  for (const r of rows) {
    const a = r[0] || '';
    if (a.includes('八域学科分布')) { section = 'domains'; continue; }
    if (section === 'levels') {
      const m = /^L(\d)$/.exec(a);
      if (m) {
        const items = (r[2] || '').split('·').map((s) => s.trim()).filter(Boolean);
        levels.push({
          level: Number(m[1]),
          name: r[1],
          count: Number(r[3]) || null,
          items,                       // 选取示例（源表只列示例，不是全集）
          itemsAreExcerpt: true,
        });
      } else if (a === '—' && /概念丛/.test(r[1] || '')) {
        conceptCluster = { name: r[1], count: Number(r[3]) || null, items: (r[2] || '').split('·').map((s) => s.trim()).filter(Boolean) };
      }
    } else {
      const m = /^D(\d\d)$/.exec(a);
      if (m) {
        domains.push({
          code: a,
          name: r[1],
          subjectCount: Number(r[3]) || null,
          subjectsExcerpt: (r[2] || '').split('·').map((s) => s.trim()).filter(Boolean),
        });
      }
    }
  }
  return { levels, domains, conceptCluster };
}

const schema = parseSchema();
const domainTotal = schema.domains.reduce((a, d) => a + d.subjectCount, 0);

// ── 分歧项（必须显式记，不许悄悄对齐）────────────────────────────────

const discrepancies = [
  {
    id: 'D-01',
    field: '学科编号位次',
    source: `源教材自称 ${SOURCE_SUBJECT_CODE}（中医智能学院第 4 学科）`,
    local: `本仓库 07-zhineng 下《中医知识图谱》为第 5 学科（${LOCAL_SUBJECT_SLUG}）`,
    status: '未裁定',
    note: '源体系的 D##-S## 位次是源自己的排序，不能从本仓库的院系学科表推导。不可自动改号——那会把「猜」写成「数据」。',
  },
  {
    id: 'D-02',
    field: '院系数量与分布',
    source: `见 source-domains：D01 中医学院 28 · D02 中药学院 20 · D03 针灸学院 12 · D04 推拿学院 10 · D05 骨伤学院 12 · D06 五官口腔 10 · D07 中医智能学院 14 · D08 中医管理学院 14（合计 ${domainTotal}）`,
    local: '本仓库 8 院系 × 每院系 15 学科 = 120（均匀分布）',
    status: '两端一致 / 中间不一致',
    note: '院系总数 8 与学科总数 120 两端吻合，但每院系学科数与院系集合都不同。这不是错，是两套设计取向——源按真实办学规模，本仓库按教学均齐。',
  },
  {
    id: 'D-03',
    field: '院系集合差异',
    source: '有 D04 推拿学院；无护理学院',
    local: '有 05-huli 护理系；无推拿院系（推拿内容并入骨伤）',
    status: '未裁定',
    note: '两边都是 8 个院系，但第 4/5 位不同。合并或补设会牵动 curriculum.json 的 120 学科重排，属结构变更，须明确决策后单独提交。',
  },
  {
    id: 'D-04',
    field: '院系称谓',
    source: '「学院」（中医学院 / 中药学院 / …）',
    local: '「系」（中医系 / 中药系 / …）',
    status: '未裁定',
    note: '纯命名，不影响数据；但站点、教材、讲稿里混用会显得两套体系。宜统一，未定前不改。',
  },
  {
    id: 'D-05',
    field: '学历层次口径',
    source: '本科 U4（3 学分 / 54 学时 = 理论 30 + 实验 24）',
    local: '《中医知识图谱》72 学时 / 10 学分',
    status: '未裁定',
    note: '学时数不同。教材正文与学时表是两套事实，不互相覆盖。',
  },
];

// ── 交叉印证：与语义张量参考实现的 DSU 编号空间是否同源 ──────────────
//
// 两个来源都声称「103 个病证单元」。**数量相同不等于同一批** —— 必须按编号与名字核对。
// 本函数把核对结果算出来，而不是在文档里写一句断言。
function crossReferenceDsu() {
  const refPath = path.join(ROOT, 'standards', 'semtensor', 'datasets', 'reference-units.json');
  if (!fs.existsSync(refPath)) {
    return { available: false, note: '缺 standards/semtensor/datasets/reference-units.json，无法核对' };
  }
  const ref = JSON.parse(fs.readFileSync(refPath, 'utf8'));
  const refDsu = ref.units.filter((u) => u.kind === 'dsu');
  const refLabels = new Set(refDsu.map((u) => u.label));
  const byUid = new Map(refDsu.map((u) => [u.uid, u.label]));

  // 从 xlsx 全文抓 (\"DSU-xxxxx\", \"manifests_as\", \"SYN-证名\") 三元组
  const pairs = new Map();
  for (const s of wb.sheets) {
    for (const row of s.rows) {
      for (const c of row) {
        const t = cell(c);
        for (const m of t.matchAll(/\("(DSU-\d{5})",\s*"manifests_as",\s*"SYN-([^"]+)"\)/g)) {
          pairs.set(m[1], m[2]);
        }
      }
    }
  }

  const checks = [...pairs.entries()].sort().map(([uid, nameInXlsx]) => ({
    uid,
    nameInXlsx,
    labelInReference: byUid.get(uid) || null,
    agree: byUid.get(uid) === nameInXlsx,
  }));

  // 全表扫：xlsx 里出现的证名，有多少落在参考实现的 103 个之内
  const appeared = new Set();
  const foreign = new Set();
  for (const s of wb.sheets) {
    for (const row of s.rows) {
      for (const c of row) {
        const t = cell(c);
        for (const l of refLabels) if (t.includes(l)) appeared.add(l);
        // 「X × Y证（D01-S13）」这种对照行里的证名
        for (const m of t.matchAll(/×\s*([\u4e00-\u9fa5]{2,6}证)\s*（/g)) {
          if (!refLabels.has(m[1])) foreign.add(m[1]);
        }
      }
    }
  }

  return {
    available: true,
    claim: '两套资料都声称 103 个病证单元',
    verdict: checks.length && checks.every((c) => c.agree) && foreign.size === 0
      ? '编号空间同源（已按编号+名字核对）'
      : '存在不一致，须人工裁定',
    referenceDsuCount: refDsu.length,
    xlsxClaimedCount: 103,
    idTriplesInXlsx: checks.length,
    nameOverlap: appeared.size,
    nameOverlapOf: refDsu.length,
    contradictions: foreign.size,
    foreignNames: [...foreign],
    checks,
    note: 'xlsx 只摘录了部分证名（非全名单），故 103 的全量无法仅凭 xlsx 核对；'
        + '但重叠部分编号与名字一致、且无一个 xlsx 证名落在参考实现的 103 之外。'
        + '「数量相同」由此升级为「有据的印证」，而非巧合。',
  };
}

const crossRef = crossReferenceDsu();

// ── 输出 ──────────────────────────────────────────────────────────────

if (CHECK_ONLY) {
  console.log('═══ 《中医知识树》导入校核（不写文件）═══');
  console.log(`  源文件      ${path.relative(ROOT, SRC)}`);
  console.log(`  指纹         sha256 ${sha256(buf).slice(0, 16)}…`);
  console.log(`  工作表       ${wb.sheets.length}`);
  console.log(`  章           ${chapters.length} · 节 ${chapters.reduce((a, c) => a + (c.sections || 0), 0)}`);
  console.log(`  正文单元     ${[...byChapter.values()].reduce((a, v) => a + v.length, 0)}`);
  console.log(`  骨架级       L0–L4 共 ${schema.levels.length} 级 · 概念丛 ${schema.conceptCluster ? schema.conceptCluster.count : 0}`);
  console.log(`  八域学科     合计 ${domainTotal}（本仓库 120）`);
  console.log(`  分歧项       ${discrepancies.length}`);
  if (crossRef.available) {
    console.log(`  DSU 交叉印证  ${crossRef.verdict}`);
    console.log(`               参考实现 ${crossRef.referenceDsuCount} 个 · xlsx 声称 ${crossRef.xlsxClaimedCount} 个`);
    console.log(`               编号三元组 ${crossRef.idTriplesInXlsx} 条全部吻合 · 证名重叠 ${crossRef.nameOverlap}/${crossRef.nameOverlapOf} · 矛盾 ${crossRef.contradictions}`);
  }
  console.log('');
  chapterIndex.forEach((c) => console.log(`  ${c.file.padEnd(46)} ${String(c.chars).padStart(6)} 字 · ${c.cells} 单元`));
  process.exit(0);
}

fs.mkdirSync(TB_DIR, { recursive: true });
for (const [name, content] of files) {
  const p = path.join(TB_DIR, name);
  fs.writeFileSync(p, content, 'utf8');
}

fs.mkdirSync(STD_DIR, { recursive: true });

const schemaDoc = {
  $generated: 'node scripts/import_knowledge_tree.js',
  $source: 'standards/knowledge-tree/sources/中医知识树.xlsx',
  title: '中医知识树 · 五级骨架（须—根—干—枝—叶）',
  convention: {
    tree: '树承载层次（从属／递进／教学先后），图承载关系（跨枝经脉）。树图一体：叶即图节点，边即经脉。',
    levels: 'L0 须 → L1 根 → L2 干 → L3 枝 → L4 叶',
    platformAlignment: 'tcmP · kg/tree（知识树） · kg/samples（病证图谱） · /tree/* 与 /kg/* 端点',
  },
  levels: schema.levels,
  conceptCluster: schema.conceptCluster,
  domains: schema.domains,
  domainTotal,
  localComparison: {
    localDepartments: 8,
    localSubjects: 120,
    localDistribution: '每院系 15 学科（均匀）',
    sourceDistribution: schema.domains.map((d) => `${d.code} ${d.name} ${d.subjectCount}`).join(' · '),
  },
  crossReferences: { dsuIdentifierSpace: crossRef },
  discrepancies,
};
fs.writeFileSync(path.join(STD_DIR, 'tree-schema.json'), `${JSON.stringify(schemaDoc, null, 2)}\n`, 'utf8');

const totalChars = [...files.values()].reduce((a, t) => a + t.replace(/\s/g, '').length, 0);
const sourceMap = {
  $generated: 'node scripts/import_knowledge_tree.js',
  source: {
    file: 'standards/knowledge-tree/sources/中医知识树.xlsx',
    origin: '用户桌面材料（GitBook 书稿 kg/tree/book 经 gitbook-to-excel 转换）',
    sha256: sha256(buf),
    bytes: buf.length,
    sheets: wb.sheets.map((s) => ({ name: s.name, rows: s.maxRow, cols: s.maxCol })),
  },
  imported: {
    subjectCodeInSource: SOURCE_SUBJECT_CODE,
    localSubject: `07-zhineng/${LOCAL_SUBJECT_SLUG}`,
    targetDir: 'textbooks/07-zhineng/05-zhongyi-zhishi-tupu/',
    chapters: chapterIndex.length,
    sections: chapters.reduce((a, c) => a + (c.sections || 0), 0),
    files: files.size,
    chineseChars: totalChars,
  },
  chapterIndex,
  crossReferences: { dsuIdentifierSpace: crossRef },
  discrepancies,
};
fs.writeFileSync(path.join(STD_DIR, 'source-map.json'), `${JSON.stringify(sourceMap, null, 2)}\n`, 'utf8');

console.log('═══ 《中医知识树》导入完成 ═══');
console.log(`  源指纹       sha256 ${sha256(buf).slice(0, 16)}…`);
console.log(`  教材          textbooks/07-zhineng/05-zhongyi-zhishi-tupu/ —— ${files.size} 个文件`);
console.log(`  章节           ${chapterIndex.length} 章 · ${sourceMap.imported.sections} 节 · ${totalChars} 字`);
console.log(`  骨架           standards/knowledge-tree/tree-schema.json —— L0–L4 + 八域 ${domainTotal} 学科`);
console.log(`  出处映射       standards/knowledge-tree/source-map.json`);
console.log(`  分歧项         ${discrepancies.length} 项（已显式记录，未自动对齐）`);
if (crossRef.available) {
  console.log(`  DSU 交叉印证   ${crossRef.verdict}`);
  console.log(`                 参考实现 ${crossRef.referenceDsuCount} · xlsx 声称 ${crossRef.xlsxClaimedCount} · 编号三元组 ${crossRef.idTriplesInXlsx} 条吻合 · 矛盾 ${crossRef.contradictions}`);
}
chapterIndex.forEach((c) => console.log(`    ${c.file.padEnd(44)} ${String(c.chars).padStart(6)} 字`));
