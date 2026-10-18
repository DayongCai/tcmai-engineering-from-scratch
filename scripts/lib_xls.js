#!/usr/bin/env node
/**
 * scripts/lib_xls.js —— 旧二进制 .xls（BIFF8 / OLE2 复合文档）读取器（纯 Node 标准库）
 *
 *   const { readWorkbook } = require('./lib_xls');
 *   const wb = readWorkbook('黄帝内经全文.xls');
 *   wb.sheets → [{ name, rows: [[cell, …], …] }]   ← 与 lib_xlsx.js 同形
 *
 * 为什么必须自己写：
 *   桌面上 4 份最重要的原件是 .xls（黄帝内经全文 1.6 MB、素问灵枢 1.7 MB、
 *   HDNJ音频理解 14.7 MB、tcmscheme 7.2 MB）。它们不是「没有资料」，是**工具链读不了**。
 *   而本项目的硬约束是纯 Node 标准库 —— 于是补读取器，而不是把它们转成别的格式再手抄。
 *
 * 实现范围（够读正文即可，不追求完整 BIFF8）：
 *   OLE2：扇区表（DIFAT/FAT）、目录项、mini stream（<4096 字节的流）
 *   BIFF8：BOUNDSHEET / SST(+CONTINUE) / LABELSST / LABEL / RK / MULRK / NUMBER /
 *           FORMULA(+STRING) / BLANK / MULBLANK / BOOLERR
 *   公式只取**缓存结果**（BIFF8 里公式结果就存在记录中），不重算公式。
 *
 * 明确不支持（遇到退化而不是崩）：
 *   加密工作簿（FILEPASS）、密码保护、图表/图片、BIFF5 及更早版本、
 *   富文本格式（只取文字，丢样式）、日期格式（返回序列号）
 */

'use strict';

const fs = require('node:fs');

// ── OLE2 复合文档 ───────────────────────────────────────────────

const CFB_SIG = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

function readCompound(buf) {
  if (buf.length < 512 || !buf.subarray(0, 8).equals(CFB_SIG)) {
    throw new Error('不是 OLE2 复合文档（.xls 的签名不符）');
  }
  const sectorSize = 1 << buf.readUInt16LE(30);
  const miniSize = 1 << buf.readUInt16LE(32);
  const nFat = buf.readUInt32LE(44);
  const dirStart = buf.readUInt32LE(48);
  const miniCutoff = buf.readUInt32LE(56);
  const miniFatStart = buf.readUInt32LE(60);
  const nMiniFat = buf.readUInt32LE(64);
  const difatStart = buf.readUInt32LE(68);
  const nDifat = buf.readUInt32LE(72);

  const sectorOffset = (s) => (s + 1) * sectorSize;
  const sector = (s) => buf.subarray(sectorOffset(s), sectorOffset(s) + sectorSize);

  // DIFAT：头部 109 项 + 链式扇区
  const difat = [];
  for (let i = 0; i < 109; i += 1) {
    const s = buf.readUInt32LE(76 + i * 4);
    if (s !== 0xffffffff) difat.push(s);
  }
  let next = difatStart;
  for (let i = 0; i < nDifat && next !== 0xffffffff && next !== 0xfffffffe; i += 1) {
    const sec = sector(next);
    const per = sectorSize / 4 - 1;
    for (let j = 0; j < per; j += 1) {
      const s = sec.readUInt32LE(j * 4);
      if (s !== 0xffffffff) difat.push(s);
    }
    next = sec.readUInt32LE(sectorSize - 4);
  }

  // FAT
  const fat = [];
  for (const s of difat.slice(0, nFat)) {
    const sec = sector(s);
    for (let j = 0; j < sectorSize / 4; j += 1) fat.push(sec.readUInt32LE(j * 4));
  }

  const chain = (start, table) => {
    const out = [];
    let s = start;
    let guard = 0;
    while (s !== 0xfffffffe && s !== 0xffffffff && s < table.length && guard < 1e6) {
      out.push(s);
      s = table[s];
      guard += 1;
    }
    return out;
  };

  const readStream = (start, size, table, secFn) => {
    const parts = [];
    for (const s of chain(start, table)) parts.push(secFn(s));
    return Buffer.concat(parts).subarray(0, size);
  };

  // 目录
  const dirBuf = Buffer.concat(chain(dirStart, fat).map(sector));
  const entries = [];
  for (let off = 0; off + 128 <= dirBuf.length; off += 128) {
    const nameLen = dirBuf.readUInt16LE(off + 64);
    const type = dirBuf[off + 66];
    if (!type) continue;
    const name = dirBuf.subarray(off, off + Math.max(0, nameLen - 2)).toString('utf16le');
    entries.push({
      name,
      type,
      start: dirBuf.readUInt32LE(off + 116),
      size: dirBuf.readUInt32LE(off + 120), // 高 32 位在 BIFF8 里恒为 0
    });
  }

  const root = entries.find((e) => e.type === 5);
  const miniFat = [];
  if (nMiniFat && miniFatStart !== 0xffffffff) {
    for (const s of chain(miniFatStart, fat)) {
      const sec = sector(s);
      for (let j = 0; j < sectorSize / 4; j += 1) miniFat.push(sec.readUInt32LE(j * 4));
    }
  }
  const miniStream = root ? readStream(root.start, root.size, fat, sector) : Buffer.alloc(0);
  const miniSec = (s) => miniStream.subarray(s * miniSize, (s + 1) * miniSize);

  const streams = new Map();
  for (const e of entries) {
    if (e.type !== 2) continue;
    streams.set(
      e.name,
      e.size >= miniCutoff
        ? readStream(e.start, e.size, fat, sector)
        : readStream(e.start, e.size, miniFat, miniSec),
    );
  }
  return streams;
}

// ── BIFF8 记录 ──────────────────────────────────────────────────

const REC = {
  BOF: 0x0809,
  EOF: 0x000a,
  BOUNDSHEET: 0x0085,
  SST: 0x00fc,
  CONTINUE: 0x003c,
  LABELSST: 0x00fd,
  LABEL: 0x0204,
  RK: 0x027e,
  MULRK: 0x00bd,
  NUMBER: 0x0203,
  FORMULA: 0x0006,
  STRING: 0x0207,
  BLANK: 0x0201,
  MULBLANK: 0x00be,
  BOOLERR: 0x0205,
};

function* records(buf, start = 0) {
  let off = start;
  while (off + 4 <= buf.length) {
    const type = buf.readUInt16LE(off);
    const len = buf.readUInt16LE(off + 2);
    const data = buf.subarray(off + 4, off + 4 + len);
    yield { type, data, off };
    off += 4 + len;
    if (type === REC.EOF && len === 0) {
      // 不在这里停：EOF 既结束 globals 也结束每个 sheet，由调用方决定
    }
  }
}

/** XLUnicodeString（BIFF8）：u16 字符数 + u8 标志（bit0=1 → UTF-16LE，否则压缩为 8 位） */
function readXLUString(buf, off) {
  const cch = buf.readUInt16LE(off);
  const flags = buf[off + 2];
  const wide = flags & 0x01;
  const rich = flags & 0x08;
  const ext = flags & 0x04;
  let p = off + 3;
  let runs = 0;
  let extLen = 0;
  if (rich) { runs = buf.readUInt16LE(p); p += 2; }
  if (ext) { extLen = buf.readUInt32LE(p); p += 4; }
  const bytes = wide ? cch * 2 : cch;
  const text = wide
    ? buf.subarray(p, p + bytes).toString('utf16le')
    : buf.subarray(p, p + bytes).toString('latin1');
  p += bytes + runs * 4 + extLen;
  return { text, next: p };
}

/**
 * SST：跨 CONTINUE 的字符串表。
 * 规则（BIFF8 规范）：字符串被切断时，续记录的**第一个字节**是续段的 grbit，
 * 只表示「剩下的字符用宽/窄哪种编码」，不重复 cch/runs。
 */
function parseSST(chunks) {
  const out = [];
  let ci = 0;
  let p = 8; // 跳过 total / unique 两个 u32

  const ensure = () => {
    while (ci < chunks.length && p >= chunks[ci].length) { ci += 1; p = 0; }
    return ci < chunks.length;
  };

  const readChars = (need, wide) => {
    let text = '';
    let left = need;
    while (left > 0) {
      if (!ensure()) return text;
      const chunk = chunks[ci];
      const avail = Math.floor((chunk.length - p) / (wide ? 2 : 1));
      const take = Math.min(left, avail);
      const bytes = take * (wide ? 2 : 1);
      text += wide
        ? chunk.subarray(p, p + bytes).toString('utf16le')
        : chunk.subarray(p, p + bytes).toString('latin1');
      p += bytes;
      left -= take;
      if (left > 0) {
        // 换段：下一段首字节是续段 grbit
        ci += 1;
        if (ci >= chunks.length) return text;
        wide = chunks[ci][0] & 0x01;
        p = 1;
      }
    }
    return text;
  };

  for (let i = 0; i < 1e7; i += 1) {
    if (!ensure()) break;
    const chunk = chunks[ci];
    if (p + 3 > chunk.length) { ci += 1; p = 0; continue; }
    const cch = chunk.readUInt16LE(p);
    const flags = chunk[p + 2];
    let wide = flags & 0x01;
    const rich = flags & 0x08;
    const ext = flags & 0x04;
    p += 3;
    let runs = 0;
    let extLen = 0;
    if (rich) { runs = chunk.readUInt16LE(p); p += 2; }
    if (ext) { extLen = chunk.readUInt32LE(p); p += 4; }
    const text = readChars(cch, !!wide);
    // 跳过富文本 run 与扩展段（可能跨段，简化：只在当前段内跳过）
    if (ensure()) {
      p += runs * 4 + extLen;
    }
    out.push(text);
    if (out.length >= 0x7fffffff) break;
  }
  return out;
}

function decodeRK(rk) {
  const isInt = rk & 0x02;
  const div100 = rk & 0x01;
  let v;
  if (isInt) {
    v = rk >> 2; // 有符号 30 位
  } else {
    const b = Buffer.alloc(8);
    b.writeUInt32LE((rk & 0xfffffffc) >>> 0, 4);
    v = b.readDoubleLE(0);
  }
  return div100 ? v / 100 : v;
}

function readWorkbook(file) {
  const buf = typeof file === 'string' ? fs.readFileSync(file) : file;
  const streams = readCompound(buf);
  const wb = streams.get('Workbook') || streams.get('Book');
  if (!wb) throw new Error('复合文档里没有 Workbook 流（不是 Excel 文件？）');

  // 1) globals：BOUNDSHEET + SST
  const recs = [...records(wb)];
  const sheets = [];
  const sstChunks = [];
  let inSst = false;
  for (const r of recs) {
    if (r.type === REC.BOUNDSHEET) {
      const pos = r.data.readUInt32LE(0);
      // BOUNDSHEET 的 sheet 名是「短」XLUnicodeString：u8 cch + u8 grbit + 字符
      const cch = r.data[6];
      const wide = r.data[7] & 0x01;
      const name = wide
        ? r.data.subarray(8, 8 + cch * 2).toString('utf16le')
        : r.data.subarray(8, 8 + cch).toString('latin1');
      sheets.push({ name, pos });
    } else if (r.type === REC.SST) {
      inSst = true;
      sstChunks.length = 0;
      sstChunks.push(r.data);
    } else if (r.type === REC.CONTINUE && inSst) {
      sstChunks.push(r.data);
    } else if (r.type === REC.EOF && inSst) {
      inSst = false;
    }
  }
  const sst = sstChunks.length ? parseSST(sstChunks) : [];

  // 2) 每个 sheet：从 BOUNDSHEET 的 pos 起读单元格
  const out = [];
  for (const s of sheets) {
    const cells = [];
    let maxRow = -1;
    let maxCol = -1;
    let pendingFormula = null;
    for (const r of records(wb, s.pos)) {
      const d = r.data;
      if (r.type === REC.EOF) break;
      if (r.type === REC.LABELSST) {
        const row = d.readUInt16LE(0);
        const col = d.readUInt16LE(2);
        const isst = d.readUInt32LE(6);
        cells.push([row, col, sst[isst] ?? '']);
      } else if (r.type === REC.LABEL) {
        const row = d.readUInt16LE(0);
        const col = d.readUInt16LE(2);
        const { text } = readXLUString(d, 6);
        cells.push([row, col, text]);
      } else if (r.type === REC.RK) {
        cells.push([d.readUInt16LE(0), d.readUInt16LE(2), decodeRK(d.readUInt32LE(6))]);
      } else if (r.type === REC.NUMBER) {
        cells.push([d.readUInt16LE(0), d.readUInt16LE(2), d.readDoubleLE(6)]);
      } else if (r.type === REC.MULRK) {
        const row = d.readUInt16LE(0);
        const colFirst = d.readUInt16LE(2);
        const n = (d.length - 6) / 6;
        for (let i = 0; i < n; i += 1) {
          cells.push([row, colFirst + i, decodeRK(d.readUInt32LE(4 + i * 6 + 2))]);
        }
      } else if (r.type === REC.FORMULA) {
        const row = d.readUInt16LE(0);
        const col = d.readUInt16LE(2);
        const resLo = d.readUInt16LE(6);
        const resHi = d.readUInt16LE(8);
        if (resHi === 0xffff) {
          if (resLo === 0x0000) { pendingFormula = [row, col]; continue; } // 字符串在 STRING 记录里
          if (resLo === 0x0001) { cells.push([row, col, !!(d[10])]); continue; } // 布尔
          continue; // 错误值 / 空串：不写
        }
        const b = Buffer.alloc(8);
        b.writeUInt16LE(resHi, 6);
        b.writeUInt16LE(resLo, 4);
        // 公式结果按 IEEE754 double 低 8 字节存
        cells.push([row, col, d.readDoubleLE(6)]);
      } else if (r.type === REC.STRING && pendingFormula) {
        const { text } = readXLUString(d, 0);
        cells.push([pendingFormula[0], pendingFormula[1], text]);
        pendingFormula = null;
      } else if (r.type === REC.BOOLERR) {
        cells.push([d.readUInt16LE(0), d.readUInt16LE(2), d[6] ? null : !!d[7]]);
      }
      for (const [row, col] of cells.slice(-3)) {
        if (row > maxRow) maxRow = row;
        if (col > maxCol) maxCol = col;
      }
    }
    const rows = Array.from({ length: maxRow + 1 }, () => Array(maxCol + 1).fill(''));
    for (const [row, col, v] of cells) rows[row][col] = v;
    out.push({ name: s.name, rows });
  }
  return { sheets: out };
}

module.exports = { readWorkbook, readCompound, parseSST, decodeRK, readXLUString };

if (require.main === module) {
  const file = process.argv[2];
  if (!file) {
    console.error('用法: node scripts/lib_xls.js <file.xls> [--max N]');
    process.exit(1);
  }
  const maxIdx = process.argv.indexOf('--max');
  const max = maxIdx > 0 ? Number(process.argv[maxIdx + 1]) : 5;
  const wb = readWorkbook(file);
  console.log(`工作表 ${wb.sheets.length} 个`);
  for (const s of wb.sheets) {
    console.log(`\n### ${s.name}（${s.rows.length} 行）`);
    for (const row of s.rows.slice(0, max)) {
      console.log('  ' + row.map((c) => String(c).slice(0, 60)).join(' | '));
    }
  }
}
