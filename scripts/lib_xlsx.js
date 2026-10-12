#!/usr/bin/env node
/**
 * scripts/lib_xlsx.js — 最小 xlsx 读取器（纯 Node 标准库，零第三方依赖）
 *
 *   const { readWorkbook } = require('./lib_xlsx');
 *   const wb = readWorkbook('中医知识树.xlsx');
 *   wb.sheets → [{ name, rows: [[cell, …], …] }]
 *
 * 为什么要自己写：本项目的硬约束是「纯 Node.js 标准库、无第三方依赖」，
 * 而用户的原始资料大量是 .xlsx（Excel 2007+ 就是 zip + XML）。
 * 这些资料是**源数据**，必须能被脚本直接解析 —— 手抄会漂移，而且漂移时没有任何东西会报错。
 *
 * 覆盖范围（够用即可，不追求完整 OOXML）：
 *   - 读取 xl/workbook.xml 的 sheet 名与 r:id
 *   - 读取 xl/_rels/workbook.xml.rels 解析 r:id → 目标路径
 *   - 读取 xl/sharedStrings.xml（含富文本 <r><t> 拼接）
 *   - 读取单元格：t="s" 共享串 / t="inlineStr" 内联串 / t="str" 公式结果 / 数值 / 日期序列号
 *   - 跳过样式、批注、图表等
 *
 * 明确不支持（遇到会退化而不是报错）：
 *   - 加密工作簿；zip64（>4GB 或 >65535 条目）；xls（旧二进制格式）
 */

'use strict';

const fs = require('node:fs');
const zlib = require('node:zlib');

// ── ZIP 读取（只实现读，够用于 OOXML）────────────────────────────────

const SIG_EOCD = 0x06054b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_LOCAL = 0x04034b50;

function readZipEntries(buf) {
  // 从尾部找 EOCD（可能有注释，故向前搜）
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 22 - 65536; i -= 1) {
    if (buf.readUInt32LE(i) === SIG_EOCD) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('不是 zip：未找到 EOCD 记录');

  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  const entries = new Map();

  for (let i = 0; i < count; i += 1) {
    if (buf.readUInt32LE(off) !== SIG_CENTRAL) throw new Error(`中央目录第 ${i} 项签名不对`);
    const method = buf.readUInt16LE(off + 10);
    const compSize = buf.readUInt32LE(off + 20);
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const cmtLen = buf.readUInt16LE(off + 32);
    const localOff = buf.readUInt32LE(off + 42);
    const name = buf.slice(off + 46, off + 46 + nameLen).toString('utf8');
    entries.set(name, { method, compSize, localOff });
    off += 46 + nameLen + extraLen + cmtLen;
  }
  return entries;
}

function readZipFile(buf, entries, name) {
  const e = entries.get(name);
  if (!e) return null;
  if (buf.readUInt32LE(e.localOff) !== SIG_LOCAL) throw new Error(`本地头签名不对: ${name}`);
  // 本地头的 name/extra 长度可能与中央目录不同，必须从本地头重新读
  const nameLen = buf.readUInt16LE(e.localOff + 26);
  const extraLen = buf.readUInt16LE(e.localOff + 28);
  const start = e.localOff + 30 + nameLen + extraLen;
  const raw = buf.slice(start, start + e.compSize);
  if (e.method === 0) return raw;
  if (e.method === 8) return zlib.inflateRawSync(raw);
  throw new Error(`不支持的压缩方式 ${e.method}: ${name}`);
}

// ── XML 小工具（够用即可，不做通用解析器）────────────────────────────

/** 去掉 XML 声明/注释，并把自闭合标签展开成 <>
 *  这里只做「取片段」和「取属性」，不建树 —— 建树对表格解析是过度设计。 */
function unescapeXml(s) {
  return String(s)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, '&');
}

/** 取 <tag …>…</tag> 里的所有片段：返回 [{ attrs, inner }] */
function findTags(xml, tag) {
  const out = [];
  const re = new RegExp(`<${tag}\\b([^>]*?)(/?)>`, 'g');
  let m;
  while ((m = re.exec(xml))) {
    const attrs = parseAttrs(m[1]);
    if (m[2] === '/') { out.push({ attrs, inner: '' }); continue; }
    const close = `</${tag}>`;
    const end = xml.indexOf(close, re.lastIndex);
    const inner = end < 0 ? '' : xml.slice(re.lastIndex, end);
    out.push({ attrs, inner });
    if (end >= 0) re.lastIndex = end + close.length;
  }
  return out;
}

function parseAttrs(s) {
  const a = {};
  const re = /([A-Za-z_][\w:.-]*)\s*=\s*"([^"]*)"/g;
  let m;
  while ((m = re.exec(s))) a[m[1]] = unescapeXml(m[2]);
  return a;
}

/** 去掉所有标签，只留文本（用于 <si> / <t>） */
const stripTags = (s) => unescapeXml(String(s).replace(/<[^>]*>/g, ''));

// ── 共享字符串 ────────────────────────────────────────────────────────

function readSharedStrings(buf, entries) {
  const xml = readZipFile(buf, entries, 'xl/sharedStrings.xml');
  if (!xml) return [];
  const si = findTags(xml.toString('utf8'), 'si');
  // <si> 可能是 <t>text</t>，也可能是多个 <r><t>段</t></r>（富文本）—— 拼接
  return si.map((s) => findTags(s.inner, 't').map((t) => stripTags(t.inner)).join(''));
}

// ── 工作簿与关系 ──────────────────────────────────────────────────────

function readSheets(buf, entries) {
  const wbXml = readZipFile(buf, entries, 'xl/workbook.xml');
  if (!wbXml) throw new Error('缺 xl/workbook.xml —— 不是有效的 xlsx');
  const relXml = readZipFile(buf, entries, 'xl/_rels/workbook.xml.rels');

  const relTarget = new Map();
  if (relXml) {
    for (const r of findTags(relXml.toString('utf8'), 'Relationship')) {
      // Target 可能是 "worksheets/sheet1.xml" 或 "/xl/worksheets/sheet1.xml"
      let t = r.attrs.Target || '';
      t = t.replace(/^\/?xl\//, '').replace(/^\/+/, '');
      if (!t.startsWith('worksheets/')) t = `worksheets/${t}`;
      relTarget.set(r.attrs.Id, `xl/${t}`);
    }
  }

  // <sheet name="…" sheetId="1" r:id="rId1"/>
  const raw = wbXml.toString('utf8');
  const sheets = [];
  for (const s of findTags(raw, 'sheet')) {
    const rid = s.attrs['r:id'] || s.attrs.id;
    sheets.push({
      name: s.attrs.name || `sheet${sheets.length + 1}`,
      path: relTarget.get(rid) || `xl/worksheets/sheet${sheets.length + 1}.xml`,
    });
  }
  return sheets;
}

// ── 单元格取值 ────────────────────────────────────────────────────────

/**
 * Excel 日期序列号 → 日期（1900 日期系统）
 *
 * **必须处理 1900 闰年幽灵**：Excel 为兼容 Lotus 1-2-3，把 1900 当闰年，
 * 于是序列号 60 对应不存在的 1900-02-29。因此：
 *   serial < 60  → 基准 1899-12-31，直接加天数（已实测：serial 1 = 1900-01-01）
 *   serial ≥ 60  → 基准 1899-12-30（少算一天，正好抵消那个不存在的 2 月 29 日）
 * 统一用 1899-12-30 会让 1900 年 1–2 月的日期全部差一天 —— 这是静默的错误，
 * 没有断言就发现不了。
 */
function serialToDate(n) {
  let days = Math.floor(n);
  const frac = n - days;
  if (days < 60) days += 1;
  const epoch = Date.UTC(1899, 11, 30);
  const ms = epoch + days * 86400000 + Math.round(frac * 86400000);
  const d = new Date(ms);
  const p = (x) => String(x).padStart(2, '0');
  const date = `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
  if (frac === 0) return date;
  return `${date} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

/** "B12" → 1（0 基列号） */
function colIndex(ref) {
  const m = /^([A-Z]+)/.exec(ref || '');
  if (!m) return 0;
  let n = 0;
  for (const ch of m[1]) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function cellValue(c, shared) {
  const t = c.attrs.t;
  const inner = c.inner;
  if (t === 'inlineStr') {
    return findTags(inner, 't').map((x) => stripTags(x.inner)).join('');
  }
  const v = findTags(inner, 'v')[0];
  const text = v ? stripTags(v.inner) : '';
  if (t === 's') {
    const i = Number(text);
    return shared[i] === undefined ? '' : shared[i];
  }
  if (t === 'str' || t === 'e') return text;
  if (t === 'b') return text === '1' ? 'TRUE' : 'FALSE';
  if (text === '') return '';
  const n = Number(text);
  return Number.isFinite(n) ? n : text;
}

function readSheetRows(buf, entries, path, shared, opts) {
  const o = opts || {};
  const xml = readZipFile(buf, entries, path);
  if (!xml) return { rows: [], maxRow: 0, maxCol: 0 };
  const raw = xml.toString('utf8');
  const rows = [];
  // <row r="1">…</row>
  const rowTags = findTags(raw, 'row');
  let maxCol = 0;
  rowTags.forEach((r, ri) => {
    const idx = r.attrs.r ? Number(r.attrs.r) - 1 : ri;
    const cells = [];
    for (const c of findTags(r.inner, 'c')) {
      const ci = c.attrs.r ? colIndex(c.attrs.r) : cells.length;
      cells[ci] = cellValue(c, shared);
      if (ci + 1 > maxCol) maxCol = ci + 1;
    }
    rows[idx] = cells;
  });
  // 补齐空洞，保证 rows 是稠密二维数组
  const dense = [];
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i] || [];
    dense.push(Array.from({ length: maxCol }, (_, j) => (row[j] === undefined ? '' : row[j])));
  }
  return {
    rows: o.raw ? rows : dense,
    maxRow: dense.length,
    maxCol,
  };
}

// ── 对外接口 ──────────────────────────────────────────────────────────

/**
 * @param {string} file xlsx 路径
 * @param {object} [opts] { raw: true 保留稀疏数组与真实行号, maxRows: 只读前 N 行 }
 */
function readWorkbook(file, opts) {
  const buf = fs.readFileSync(file);
  const entries = readZipEntries(buf);
  const shared = readSharedStrings(buf, entries);
  const sheetDefs = readSheets(buf, entries);

  const sheets = sheetDefs.map((s) => {
    const r = readSheetRows(buf, entries, s.path, shared, opts);
    if (opts && opts.maxRows) r.rows.length = Math.min(r.rows.length, opts.maxRows);
    return { name: s.name, path: s.path, rows: r.rows, maxRow: r.maxRow, maxCol: r.maxCol };
  });

  return { file, sharedStrings: shared.length, sheets };
}

module.exports = { readWorkbook, readZipEntries, readZipFile, findTags, stripTags, unescapeXml, serialToDate, colIndex };

// ── CLI：node scripts/lib_xlsx.js <file.xlsx> [--sheet N] [--max N] ──
if (require.main === module) {
  const argv = process.argv.slice(2);
  const file = argv.find((a) => !a.startsWith('--'));
  const sheetIdx = argv.includes('--sheet') ? Number(argv[argv.indexOf('--sheet') + 1]) : -1;
  const max = argv.includes('--max') ? Number(argv[argv.indexOf('--max') + 1]) : 20;
  if (!file) {
    console.error('用法: node scripts/lib_xlsx.js <file.xlsx> [--sheet N] [--max N]');
    process.exit(1);
  }
  const wb = readWorkbook(file, { maxRows: max });
  console.log(`═══ ${file} ═══`);
  console.log(`  共享字符串 ${wb.sharedStrings} · 工作表 ${wb.sheets.length}`);
  wb.sheets.forEach((s, i) => {
    console.log(`\n  [${i}] ${s.name}  ${s.maxRow} 行 × ${s.maxCol} 列`);
    if (sheetIdx >= 0 && i !== sheetIdx) return;
    s.rows.slice(0, max).forEach((row, ri) => {
      console.log(`    ${String(ri + 1).padStart(3)} | ${row.map((c) => String(c).slice(0, 22)).join(' | ')}`);
    });
  });
}
