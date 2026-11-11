#!/usr/bin/env node
/**
 * scripts/lib_xlsx_write.js — 最小 xlsx **写出器**（纯 Node 标准库，零依赖）
 *
 * 为什么要有它：本仓库长期只有 `lib_xlsx.js`（读），产出一律走 Markdown/JSON。
 * 《伤寒论临床应用》这份交付物要求**回到 xlsx**（格式乙的 00目录 + 分表签名），
 * 于是补上写出侧。写的是 OOXML 的最小子集，只用三件必需品：
 *   [Content_Types].xml · _rels/.rels · xl/{workbook.xml,_rels/*,worksheets/*,styles.xml}
 *
 * 取巧的地方只说一次：字符串一律用 `t="inlineStr"`（不建 sharedStrings），
 * 数字写 `<v>`，因此读回时 `lib_xlsx.js#cellValue` 走 inlineStr 分支 —— 两边必须一致，
 * 由 tests/test_xlsx_writer.js 往返断言看住。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

// ── crc32（zip 必需） ──────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0 ^ -1;
  for (let i = 0; i < buf.length; i += 1) c = (c >>> 8) ^ CRC_TABLE[(c ^ buf[i]) & 0xff];
  return (c ^ -1) >>> 0;
}

// ── zip（store 目录 + deflate 数据） ───────────────────────────────────
function dosDateTime(d) {
  const time = ((d.getHours() << 11) | (d.getMinutes() << 5) | (Math.floor(d.getSeconds() / 2))) & 0xffff;
  const date = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff;
  return { time, date };
}

/** @param {Array<{name: string, data: Buffer}>} files */
function makeZip(files, when) {
  const d = when || new Date();
  const { time, date } = dosDateTime(d);
  const locals = [];
  const centrals = [];
  let offset = 0;

  files.forEach((f, i) => {
    const nameBuf = Buffer.from(f.name, 'utf8');
    const crc = crc32(f.data);
    const comp = zlib.deflateRawSync(f.data, { level: 9 });
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);          // version needed
    local.writeUInt16LE(0x0800, 6);      // UTF-8 名字
    local.writeUInt16LE(8, 8);           // deflate
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comp.length, 18);
    local.writeUInt32LE(f.data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, nameBuf, comp);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);        // version made by
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(comp.length, 20);
    central.writeUInt32LE(f.data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);        // extra
    central.writeUInt16LE(0, 32);        // comment
    central.writeUInt16LE(0, 34);        // disk
    central.writeUInt16LE(0, 36);        // internal attrs
    central.writeUInt32LE(0, 38);        // external attrs
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);

    offset += local.length + nameBuf.length + comp.length;
    if (i === files.length - 1) return;
  });

  const centralBuf = Buffer.concat(centrals);
  const localBuf = Buffer.concat(locals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(localBuf.length, 16);
  eocd.writeUInt16LE(0, 20);
  return Buffer.concat([localBuf, centralBuf, eocd]);
}

// ── XML ───────────────────────────────────────────────────────────────
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    // 控制字符会让 Excel 直接报「文件损坏」——静默剔掉比事后排错便宜
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
}

function colName(n) {
  let s = '';
  let x = n + 1;
  while (x > 0) {
    const r = (x - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s;
}

/** A1 风格引用 */
function ref(rowIdx, colIdx) {
  return `${colName(colIdx)}${rowIdx + 1}`;
}

/** 不允许出现在工作表名里的字符；空名/超长直接回退 */
function safeSheetName(name, i) {
  const cleaned = String(name).replace(/[\\/?*[\]:]/g, '-').slice(0, 31);
  return cleaned || `Sheet${i + 1}`;
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="2"><font><sz val="11"/><name val="宋体"/></font><font><b/><sz val="11"/><name val="宋体"/></font></fonts>
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="3">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

function cellXml(value, r, c, styleId) {
  const sAttr = styleId ? ` s="${styleId}"` : '';
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${ref(r, c)}"${sAttr}><v>${value}</v></c>`;
  }
  if (typeof value === 'boolean') {
    return `<c r="${ref(r, c)}"${sAttr} t="b"><v>${value ? 1 : 0}</v></c>`;
  }
  return `<c r="${ref(r, c)}"${sAttr} t="inlineStr"><is><t xml:space="preserve">${esc(value)}</t></is></c>`;
}

/**
 * @param {string} file 输出路径
 * @param {Array<{name:string, rows:Array<Array<any>>, cols?:number[], header?:boolean, wrap?:number[]}>} sheets
 *        header 默认 true（第 1 行加粗）；wrap 给出需要自动换行的列号（0 基）
 */
function writeWorkbook(file, sheets) {
  const files = [];
  const sheetMeta = sheets.map((s, i) => ({ name: safeSheetName(s.name, i), id: i + 1, def: s }));

  files.push({
    name: '[Content_Types].xml',
    data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
${sheetMeta.map((s) => `<Override PartName="/xl/worksheets/sheet${s.id}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('\n')}
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`, 'utf8'),
  });

  files.push({
    name: '_rels/.rels',
    data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`, 'utf8'),
  });

  files.push({
    name: 'xl/workbook.xml',
    data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${sheetMeta.map((s) => `<sheet name="${esc(s.name)}" sheetId="${s.id}" r:id="rId${s.id}"/>`).join('')}</sheets>
</workbook>`, 'utf8'),
  });

  files.push({
    name: 'xl/_rels/workbook.xml.rels',
    data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${sheetMeta.map((s) => `<Relationship Id="rId${s.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${s.id}.xml"/>`).join('\n')}
<Relationship Id="rId${sheetMeta.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`, 'utf8'),
  });

  files.push({ name: 'xl/styles.xml', data: Buffer.from(STYLES, 'utf8') });

  sheetMeta.forEach((s) => {
    const rows = s.def.rows || [];
    const header = s.def.header !== false;
    const wrap = new Set(s.def.wrap || []);
    const body = rows
      .map((cells, r) => {
        const xml = (cells || [])
          .map((v, c) => {
            const styleId = header && r === 0 ? 1 : (wrap.has(c) ? 2 : 0);
            return cellXml(v, r, c, styleId);
          })
          .join('');
        return xml ? `<row r="${r + 1}">${xml}</row>` : '';
      })
      .filter(Boolean)
      .join('');

    const colXml = (s.def.cols || []).length
      ? `<cols>${s.def.cols.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`
      : '';
    const freeze = header ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' : '';

    files.push({
      name: `xl/worksheets/sheet${s.id}.xml`,
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
${freeze}${colXml}<sheetData>${body}</sheetData></worksheet>`, 'utf8'),
    });
  });

  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, makeZip(files));
  return { file, sheets: sheetMeta.length, bytes: fs.statSync(file).size };
}

module.exports = { writeWorkbook, makeZip, crc32, colName, esc };
