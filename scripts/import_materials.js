#!/usr/bin/env node
/**
 * scripts/import_materials.js — 批量导入「格式乙」源材料（注册表驱动）
 *
 *   node scripts/import_materials.js                 导入全部
 *   node scripts/import_materials.js --check         只核对不写文件
 *   node scripts/import_materials.js --only <slug>   只导一份
 *
 * 为什么是「注册表驱动」而不是一个通用规则：
 * 实测 7 份材料的**目录形态**与**分表形态**各不相同（元数据卡 / 表格目录 / 键值目录 /
 * 无目录散文；宽表 / 键值窄表 / 长文 / 字幕带时间码）。写一条「什么都能认」的规则
 * 等于把猜测藏进代码 —— 而没有断言会告诉你猜错了。
 * 所以每份材料的形态都**逐份看过并写在下面的 REGISTRY 里**，附上它实际的样子。
 *
 * 产物（每份材料一套）：
 *   standards/materials/<slug>/sources/<原文件>   源数据原样入库
 *   standards/materials/<slug>/content.json       解析结果（结构化）
 *   standards/materials/<slug>/<标题>.md          人可读全本
 *   standards/materials/<slug>/source-map.json    出处 · 指纹 · 形态 · 计数
 *   standards/materials/registry.json             全量注册表 + 汇总
 *
 * 原则：源文件只读；不删备份；不猜形态（形态来自逐份实测）。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { readWorkbook: readXlsx } = require('./lib_xlsx');
const { readWorkbook: readXls } = require('./lib_xls');

// 读取器按扩展名分派：.xlsx 是 zip+XML，.xls 是 OLE2+BIFF8，两套完全不同的容器。
// 桌面那 4 份最重要的原件恰好是 .xls —— 读不了它们时，「1075 章没正文」会被误当成
// 「没有资料」，实际是工具链缺一段。分派放在这里，调用方不该关心容器格式。
const readWorkbook = (file) => (/\.xls$/i.test(file) ? readXls(file) : readXlsx(file));

const ROOT = path.resolve(__dirname, '..');
const DESKTOP = 'J:/Users/user/Desktop';
const OUTROOT = path.join(ROOT, 'standards', 'materials');
const CHECK_ONLY = process.argv.includes('--check');
const onlyIdx = process.argv.indexOf('--only');
const ONLY = onlyIdx >= 0 ? process.argv[onlyIdx + 1] : null;

// ─────────────────────────────────────────────────────────────────────
// 注册表：每份材料的形态都在这里写明（来自逐份实测，不是推断）
//   toc.shape  : meta（元数据卡）| table（表格目录）| kv（序号|标题）| none（无目录）
//   body.shape : wide（列即字段 → 表格）| kv（标签|内容）| prose（长文）| subtitle（字幕带时间码）
// ─────────────────────────────────────────────────────────────────────
const REGISTRY = [
  {
    slug: 'leijing-tuyi',
    file: '类经图翼_v1.0定稿.xlsx',
    altFile: '类经图翼.xlsx',
    title: '类经图翼',
    note: '明·张介宾撰，天启四年（1624）刊。分表 15 列宽表：序号|卷次|篇目|层级|类型|'
        + '原文（校正）|原文（原字）|图名|图形方位|图注文本|语义标注|一致性校正记录|图像URN|备注|术语对齐。'
        + '「语义标注」列即 16 类语义范畴（阴阳/五行/河洛数术…），与 14语义方位交叉表同源。',
    toc: { sheet: '00目录', shape: 'meta' },
    body: { sheets: 'rest', shape: 'wide', headerRow: 1 },
  },
  {
    slug: 'neiyin-qiqing',
    file: '内因七情.xlsx',
    title: '内因七情',
    note: '每讲一个分表（心喜/肝怒/肝嗔/肺悲/肺障/过忧不及/肾欲/肾痴/脾思/脾疑…），'
        + '分表前几行是视频元数据（视频标题/链接/作者/时长），后接讲稿正文；另有「内因病机泛函」。',
    toc: { sheet: '00目录', shape: 'kv' },
    body: { sheets: 'rest', shape: 'kv' },
  },
  {
    slug: 'waiyin-liuyin',
    file: '外因六淫.xlsx',
    title: '外因六淫',
    note: '表头为空、目录用「标题」列；分表多为单列长文（含「外因病机泛函」791 行）。',
    toc: { sheet: '00目录', shape: 'table', headerRow: 0, cols: ['no', 'title'] },
    body: { sheets: 'rest', shape: 'kv' },
  },
  {
    slug: 'wuyishan-suwen30',
    file: '武夷山.xlsx',
    title: '武夷山 · 素问30',
    note: '31 讲视频字幕（序号|开始时间|结束时间|文本内容），每讲 600–1500 行；'
        + '目录含每讲时长（小时）。这是 [tcmP] 字幕流水线的**真实输入形态**。',
    toc: { sheet: '0目录', shape: 'table', headerRow: 0, cols: ['no', 'title', 'hours'] },
    body: { sheets: 'rest', shape: 'subtitle', headerRow: 0 },
    skipSheets: ['0认知特色'],
    extraSheets: ['0认知特色'],
  },
  {
    slug: 'zhongyiyao-ai-daolun',
    file: '中医药AI导论.xlsx',
    title: '中医药AI导论',
    note: 'D07-S01 教材。目录是 篇|章|节|段|主题内容 四级树；'
        + 'AI-med-introduce / ha-list 是英文课程目录（10 列宽表），PART01–06 是章节内容。',
    toc: { sheet: '00目录', shape: 'table', headerRow: 0, cols: ['part', 'chapter', 'section', 'para', 'topic'] },
    body: { sheets: 'rest', shape: 'autoWide' },
  },
  {
    slug: 'lingjichu-ai',
    file: 'ai-intro.xlsx',
    title: '零基础学 AI',
    note: 'GitBook 全书正文（来源 yeasy.gitbook.io），按章分表，每表 2 列长文；'
        + '目录 118 行含来源 URL、正文字数、页面图数。',
    toc: { sheet: '00目录', shape: 'table', headerRow: 3, cols: ['no', 'part', 'title', 'sheet', 'startRow', 'chars', 'figs', 'url'] },
    body: { sheets: 'rest', shape: 'kv' },
  },
  {
    slug: 'neijing-jizhen',
    file: '内经急诊.xlsx',
    title: '黄帝内经急症救命',
    note: '3 表：原文 / 病理生理 / 健康计划。无标准目录，正文为散文提纲（散文形态）。',
    toc: { sheet: null, shape: 'none' },
    body: { sheets: 'all', shape: 'prose' },
  },
  {
    slug: 'neijing-quanwen',
    file: '黄帝内经全文.xls',
    altFile: '素问灵枢.xls',
    title: '黄帝内经全文（素问81篇 · 灵枢81篇）',
    note: '旧二进制 .xls（BIFF8），由 scripts/lib_xls.js 读取。162 张表 = 素问 81 篇 + 灵枢 81 篇，'
        + '每表第 1 行是「篇名 | 出处」，其后按「序号 | 类型 | 内容」逐条给 原文 / 译文 / 按语。'
        + '同内容的 `素问灵枢.xls` 与 `黄帝内经全文.xls` 逐表逐行一致（sha256 不同，是两次导出的字节差异），'
        + '本导入取后者入库，前者作 altFile 记在 source-map 里。',
    toc: { sheet: null, shape: 'none' },
    body: { sheets: 'all', shape: 'pian' },
  },
  {
    slug: 'hdnj-yinpin',
    file: 'HDNJ音频理解.xls',
    title: '黄帝内经音频理解（逐句字幕 · 165 表）',
    note: '旧二进制 .xls（BIFF8），14.7 MB，是本目录里体量最大的一份。'
        + '「0目录」为篇名索引；其余 164 表按篇给逐句字幕（序号 | 开始时间 | 结束时间 | 文本内容），'
        + '夹有不带时间码的注释块（【…】），照实分开记，不伪造时间码。',
    toc: { sheet: '0目录', shape: 'kv' },
    body: { sheets: 'rest', shape: 'subtitle', headerRow: 0 },
  },
  {
    slug: 'tcmscheme',
    file: 'tcmscheme.xls',
    title: '中医课程图式（tcmscheme · 17 表）',
    note: '旧二进制 .xls（BIFF8），7.2 MB。16 张课程表 + 1 张「形式语言-自动机理论」（非中医院课程，已跳过）。'
        + '列为 章 | 节 | 段 | 内涵 | 知识点 | 数学逻辑 | 物理场论 | 网络智能 | 个体感知 | 群体特征 | '
        + '生态环境 | 身心德道 | 典型样例 —— 即「中医概念 → 数学/物理/AI」的逐段桥接表。'
        + '注意：只有 中诊 375 行、中药 646 行、方剂 589 行、经络腧穴 1213 行是实结构，'
        + '其余 12 表仅 46 行左右（前言 + 编写说明 + 学科清单），不是完整章节。',
    toc: { sheet: null, shape: 'none' },
    body: { sheets: 'rest', shape: 'wide', headerRow: 1 },
    skipSheets: ['形式语言-自动机理论'],
  },
];

// ── 工具 ──────────────────────────────────────────────────────────────

const cell = (v) => String(v === undefined || v === null ? '' : v).replace(/\s+/g, ' ').trim();
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const safeFile = (s) => String(s).replace(/[\\/:*?"<>|]/g, '·').trim();

/** 取表头行：1 基行号 → 找列名（列名可能带括号说明，用包含匹配） */
function columnIndex(header, names) {
  return names.map((n) => header.findIndex((h) => cell(h).includes(n)));
}

// ── 各形态的渲染 ──────────────────────────────────────────────────────

/** wide：列即字段。第 headerRow 行是表头（1 基），其后每行一条记录 */
function parseWide(sheet, headerRow) {
  const hIdx = (headerRow || 1) - 1;
  const header = (sheet.rows[hIdx] || []).map(cell);
  const records = [];
  for (const row of sheet.rows.slice(hIdx + 1)) {
    if (!row.some((c) => cell(c))) continue;
    const r = {};
    header.forEach((h, i) => { r[h || `col${i}`] = cell(row[i]); });
    records.push(r);
  }
  return { header, records };
}

/** pian：一表一篇（《黄帝内经》全文的形态）
 *  第 1 行：篇名 | 出处（如「素问·上古天真论 | 《素问》第1篇」）
 *  第 2 行：表头（序号 | 类型 | 内容）
 *  其后： 原文 / 译文 / 按语 … 一条一行
 *  为什么单列一个形态：它不是「宽表」（列不是字段，条目类型在行里），
 *  也不是 kv（第一篇第 1 行是标题而不是标签）—— 硬塞进任一形态都会丢掉「类型」这一维，
 *  而「原文 vs 译文 vs 按语」正是内经篇章最要紧的区分。
 */
function parsePian(sheet) {
  const head = (sheet.rows[0] || []).map(cell);
  const title = head[0] || sheet.name;
  const origin = head[1] || '';
  const hIdx = (sheet.rows[1] || []).some((c) => cell(c) === '类型') ? 1 : -1;
  const header = hIdx >= 0 ? sheet.rows[hIdx].map(cell) : [];
  const typeC = header.findIndex((h) => h.includes('类型'));
  const textC = header.findIndex((h) => h.includes('内容'));
  const nC = header.findIndex((h) => h.includes('序号'));
  const blocks = [];
  for (const row of sheet.rows.slice(hIdx + 1)) {
    const text = cell(row[textC >= 0 ? textC : 2]);
    if (!text) continue;
    blocks.push({
      n: cell(row[nC >= 0 ? nC : 0]),
      type: cell(row[typeC >= 0 ? typeC : 1]),
      text,
    });
  }
  return { title, origin, header, blocks };
}

/** kv / prose：标签|内容 或纯长文 */
function parseKv(sheet) {
  const blocks = [];
  for (const row of sheet.rows) {
    const cells = row.map(cell).filter(Boolean);
    if (!cells.length) { blocks.push({ kind: 'gap' }); continue; }
    const first = cells[0];
    // 短标签 + 有其余内容 → 标签块；否则整行当段落
    if (cells.length >= 2 && first.length <= 16 && !/[。；，]$/.test(first)) {
      blocks.push({ kind: 'label', label: first, text: cells.slice(1).join(' ') });
    } else {
      blocks.push({ kind: 'para', text: cells.join(' ') });
    }
  }
  return blocks;
}

/** subtitle：序号|开始|结束|文本
 *  注意：源表里除了真字幕，还夹着**无时间码的块**（【正文内容总结】【…独到注释】）。
 *  它们不是坏字幕 —— 是另一种内容。必须分开记，否则渲染出来就是 `- ``→`` …` 这种空时间码行。
 */
function parseSubtitle(sheet, headerRow) {
  const hIdx = (headerRow || 0);
  const header = (sheet.rows[hIdx] || []).map(cell);
  const c = columnIndex(header, ['开始', '结束', '文本', '内容']);
  const startC = c[0] >= 0 ? c[0] : 1;
  const endC = c[1] >= 0 ? c[1] : 2;
  const textC = c[2] >= 0 ? c[2] : 3;
  const cues = [];
  for (const row of sheet.rows.slice(hIdx + 1)) {
    const t = cell(row[textC]);
    if (!t) continue;
    const start = cell(row[startC]);
    const end = cell(row[endC]);
    const timed = /^\d{1,2}:\d{2}/.test(start) && /^\d{1,2}:\d{2}/.test(end);
    cues.push(timed ? { start, end, text: t, timed: true } : { text: t, timed: false });
  }
  return {
    header,
    cues,
    timed: cues.filter((x) => x.timed).length,
    notes: cues.filter((x) => !x.timed).length,
  };
}

/** autoWide：有 ≥4 列表头就按 wide，否则按 kv（中医药AI导论的分表混着两者） */
function parseAutoWide(sheet) {
  const first = (sheet.rows[0] || []).map(cell);
  const nonEmptyCols = (sheet.rows[1] || []).filter((x) => cell(x)).length;
  if (sheet.maxCol >= 4 && nonEmptyCols >= 4) {
    const header = (sheet.rows[0] || []).map(cell);
    const records = [];
    for (const row of sheet.rows.slice(1)) {
      if (!row.some((c) => cell(c))) continue;
      const r = {};
      header.forEach((h, i) => { r[h || `col${i}`] = cell(row[i]); });
      records.push(r);
    }
    return { shape: 'wide', header, records };
  }
  return { shape: 'kv', blocks: parseKv(sheet) };
}

// ── 主流程 ────────────────────────────────────────────────────────────

const results = [];
const problems = [];

for (const spec of REGISTRY) {
  if (ONLY && spec.slug !== ONLY) continue;
  const src = path.join(DESKTOP, spec.file);
  if (!fs.existsSync(src)) {
    // 允许用 altFile 兜底（同名两份时取其一）
    const alt = spec.altFile ? path.join(DESKTOP, spec.altFile) : null;
    if (alt && fs.existsSync(alt)) { spec.__used = spec.altFile; }
    else { problems.push(`${spec.file}: 源文件不存在`); continue; }
  }
  const usedFile = spec.__used || spec.file;
  const buf = fs.readFileSync(path.join(DESKTOP, usedFile));
  const wb = readWorkbook(path.join(DESKTOP, usedFile));

  const tocSheet = spec.toc.sheet ? wb.sheets.find((s) => s.name === spec.toc.sheet) : null;
  if (spec.toc.sheet && !tocSheet) { problems.push(`${usedFile}: 找不到目录表 ${spec.toc.sheet}`); continue; }

  // 目录
  let toc = { shape: spec.toc.shape, rows: [] };
  if (tocSheet) {
    if (spec.toc.shape === 'meta') {
      toc.rows = tocSheet.rows.map((r) => [cell(r[0]), cell(r[1])]).filter(([k, v]) => k || v);
    } else if (spec.toc.shape === 'kv') {
      toc.rows = tocSheet.rows.map((r) => [cell(r[0]), cell(r[1])]).filter(([k]) => k);
    } else if (spec.toc.shape === 'table') {
      const hIdx = spec.toc.headerRow || 0;
      toc.header = (tocSheet.rows[hIdx] || []).map(cell);
      toc.rows = [];
      for (const r of tocSheet.rows.slice(hIdx + 1)) {
        const c = r.map(cell);
        if (!c.some(Boolean)) continue;
        toc.rows.push(c);
      }
    }
  }

  // 正文分表
  const skip = new Set(spec.skipSheets || []);
  const bodySheets = wb.sheets.filter((s) => s !== tocSheet && !skip.has(s.name)
    && !(spec.toc.sheet && s.name === spec.toc.sheet));

  const sections = [];
  for (const sh of bodySheets) {
    const shape = spec.body.shape;
    if (shape === 'pian') {
      const { title, origin, header, blocks } = parsePian(sh);
      sections.push({ sheet: sh.name, shape, title, origin, header, count: blocks.length, blocks });
    } else if (shape === 'wide') {
      const { header, records } = parseWide(sh, spec.body.headerRow);
      sections.push({ sheet: sh.name, shape, header, count: records.length, records });
    } else if (shape === 'subtitle') {
      const { header, cues, timed, notes } = parseSubtitle(sh, spec.body.headerRow);
      sections.push({ sheet: sh.name, shape, header, count: cues.length, timed, notes, cues });
    } else if (shape === 'autoWide') {
      const r = parseAutoWide(sh);
      sections.push({ sheet: sh.name, shape: r.shape, count: r.records ? r.records.length : (r.blocks || []).length, ...r });
    } else {
      const blocks = parseKv(sh);
      sections.push({ sheet: sh.name, shape: 'kv', count: blocks.filter((b) => b.kind !== 'gap').length, blocks });
    }
  }

  const totalUnits = sections.reduce((a, s) => a + (s.count || 0), 0);
  const emptySections = sections.filter((s) => !s.count).map((s) => s.sheet);

  results.push({
    slug: spec.slug, file: usedFile, title: spec.title, note: spec.note,
    sha256: sha256(buf), bytes: buf.length,
    sheetCount: wb.sheets.length,
    sheetNames: wb.sheets.map((s) => s.name),
    toc: { shape: toc.shape, sheet: tocSheet ? tocSheet.name : null, rows: toc.rows.length, header: toc.header || null },
    body: { shape: spec.body.shape, sections: sections.length, units: totalUnits },
    emptySections,
    data: { toc, sections },
  });
}

if (problems.length) {
  console.log('⚠ 有问题：');
  problems.forEach((p) => console.log('  ' + p));
}

if (CHECK_ONLY) {
  console.log('\n═══ 批量导入核对（不写文件）═══\n');
  for (const r of results) {
    console.log(`  ${r.slug.padEnd(22)} ${r.file}`);
    console.log(`    ${r.sheetCount} 表 · 目录形态 ${r.toc.shape}(${r.toc.rows} 行) · 正文形态 ${r.body.shape} · ${r.body.sections} 节 · ${r.body.units} 单元`);
    if (r.emptySections.length) console.log(`    ⚠ 空分表 ${r.emptySections.length}: ${r.emptySections.slice(0, 6).join(', ')}`);
  }
  const tot = results.reduce((a, r) => a + r.body.units, 0);
  console.log(`\n  合计 ${results.length} 份材料 · ${tot} 个正文单元`);
  process.exit(problems.length ? 1 : 0);
}

// ── 写盘 ──────────────────────────────────────────────────────────────

fs.mkdirSync(OUTROOT, { recursive: true });
const written = [];

for (const r of results) {
  const dir = path.join(OUTROOT, r.slug);
  fs.mkdirSync(path.join(dir, 'sources'), { recursive: true });

  // 源数据原样入库
  fs.copyFileSync(path.join(DESKTOP, r.file), path.join(dir, 'sources', r.file));

  // content.json
  fs.writeFileSync(path.join(dir, 'content.json'), `${JSON.stringify({
    $generated: 'node scripts/import_materials.js',
    slug: r.slug, title: r.title, note: r.note,
    source: { file: `sources/${r.file}`, sha256: r.sha256, bytes: r.bytes, sheets: r.sheetNames },
    toc: r.data.toc,
    sections: r.data.sections,
  }, null, 2)}\n`, 'utf8');

  // 人可读全本
  const L = [];
  L.push(`# ${r.title}`, '');
  L.push('> 由 `scripts/import_materials.js` 从 xlsx 解析生成，**请勿手改**；改源文件后重跑脚本。', '');
  L.push(`> 源：\`sources/${r.file}\` · ${r.sheetCount} 个工作表 · ${r.body.sections} 个正文分表 · ${r.body.units} 个正文单元`, '');
  if (r.note) L.push(`> ${r.note}`, '');

  if (r.data.toc.rows.length) {
    L.push('## 目录', '');
    if (r.data.toc.shape === 'meta') {
      L.push('| 项 | 值 |', '| --- | --- |');
      for (const [k, v] of r.data.toc.rows) L.push(`| ${k.replace(/\|/g, '\\|')} | ${v.replace(/\|/g, '\\|')} |`);
    } else if (r.data.toc.shape === 'kv') {
      L.push('| 序号 | 标题 |', '| :-: | --- |');
      for (const [k, v] of r.data.toc.rows) L.push(`| ${k} | ${v.replace(/\|/g, '\\|')} |`);
    } else {
      const h = r.data.toc.header;
      L.push(`| ${h.join(' | ')} |`, `| ${h.map(() => '---').join(' | ')} |`);
      for (const row of r.data.toc.rows) L.push(`| ${row.slice(0, h.length).map((c) => c.replace(/\|/g, '\\|')).join(' | ')} |`);
    }
    L.push('');
  }

  for (const sec of r.data.sections) {
    if (sec.shape === 'pian') {
      L.push(`## ${sec.title}${sec.origin ? `（${sec.origin}）` : ''}`, '');
      for (const b of sec.blocks) {
        L.push(`**${b.type || '内容'}${b.n ? ` ${b.n}` : ''}**`, '', b.text, '');
      }
      continue;
    }
    L.push(`## ${sec.sheet}`, '');
    if (sec.shape === 'wide') {
      if (!sec.records.length) { L.push('（空表）', ''); continue; }
      L.push(`| ${sec.header.join(' | ')} |`, `| ${sec.header.map(() => '---').join(' | ')} |`);
      for (const rec of sec.records) {
        L.push(`| ${sec.header.map((h) => String(rec[h] || '').replace(/\|/g, '\\|')).join(' | ')} |`);
      }
      L.push('');
    } else if (sec.shape === 'subtitle') {
      if (sec.timed) L.push(`> 带时间码字幕 ${sec.timed} 条 · 无时间码注释块 ${sec.notes} 个`, '');
      for (const c of sec.cues) {
        if (c.timed) L.push(`- \`${c.start}\`→\`${c.end}\` ${c.text}`);
        else { L.push('', c.text, ''); }   // 注释块按段落渲染，不伪造时间码
      }
      L.push('');
    } else {
      const blocks = sec.blocks || [];
      for (const b of blocks) {
        if (b.kind === 'gap') continue;
        if (b.kind === 'label') L.push(`**${b.label}**`, '', b.text, '');
        else L.push(b.text, '');
      }
    }
  }

  const mdName = `${safeFile(r.title)}.md`;
  fs.writeFileSync(path.join(dir, mdName), `${L.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`, 'utf8');

  // source-map.json
  const md = fs.readFileSync(path.join(dir, mdName), 'utf8');
  fs.writeFileSync(path.join(dir, 'source-map.json'), `${JSON.stringify({
    $generated: 'node scripts/import_materials.js',
    slug: r.slug, title: r.title,
    source: { file: `sources/${r.file}`, origin: '用户桌面材料', sha256: r.sha256, bytes: r.bytes },
    shape: { toc: r.toc.shape, tocSheet: r.toc.sheet, body: r.body.shape },
    counts: { sheets: r.sheetCount, tocRows: r.toc.rows, bodySections: r.body.sections, bodyUnits: r.body.units },
    emptySections: r.emptySections,
    readme: { file: mdName, chars: md.replace(/\s/g, '').length },
    note: 'content.json 是纯派生产物（体量大、可由源重跑得到），**不入库**；'
        + '重建命令：node scripts/import_materials.js',
  }, null, 2)}\n`, 'utf8');

  const timedCues = r.data.sections.reduce((a, s) => a + (s.timed || 0), 0);
  const noteBlocks = r.data.sections.reduce((a, s) => a + (s.notes || 0), 0);

  written.push({
    slug: r.slug, title: r.title, file: r.file,
    sections: r.body.sections, units: r.body.units, chars: md.replace(/\s/g, '').length,
    empty: r.emptySections.length,
    ...(timedCues || noteBlocks ? { timedCues, noteBlocks } : {}),
  });
}

// registry.json
fs.writeFileSync(path.join(OUTROOT, 'registry.json'), `${JSON.stringify({
  $generated: 'node scripts/import_materials.js',
  note: '源资料「格式乙」（00目录 + 分表）批量导入注册表。形态逐份实测，不是推断。',
  materials: written,
  totals: {
    materials: written.length,
    sections: written.reduce((a, w) => a + w.sections, 0),
    units: written.reduce((a, w) => a + w.units, 0),
    chars: written.reduce((a, w) => a + w.chars, 0),
  },
}, null, 2)}\n`, 'utf8');

console.log('═══ 批量导入完成 ═══\n');
for (const w of written) {
  console.log(`  ${w.slug.padEnd(22)} ${String(w.sections).padStart(3)} 节 · ${String(w.units).padStart(6)} 单元 · ${String(w.chars).padStart(8)} 字 ${w.empty ? `· ⚠ ${w.empty} 个空分表` : ''}`);
}
const t = { m: written.length, s: written.reduce((a, w) => a + w.sections, 0), u: written.reduce((a, w) => a + w.units, 0), c: written.reduce((a, w) => a + w.chars, 0) };
console.log(`\n  合计 ${t.m} 份 · ${t.s} 节 · ${t.u} 单元 · ${t.c} 字`);
