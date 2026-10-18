#!/usr/bin/env node
/**
 * scripts/lib_docx.js —— Word .docx（OOXML）读取器（纯 Node 标准库）
 *
 *   const { readDocx } = require('./lib_docx');
 *   const doc = readDocx('伤寒架构.docx');
 *   doc.blocks → [{ type: 'h1'|'h2'|'h3'|'p'|'table', text, level?, rows? }]
 *
 * 为什么自己写：docx 就是 zip + 一个 word/document.xml（外加 docProps 元数据），
 * 而仓库已有 zip 读取器（lib_xlsx 里的 readZipEntries/readZipFile）。为 16 份 docx
 * 引一个第三方库，等于为几百行正则加一个几百 KB 的依赖。
 *
 * 覆盖范围（够读正文即可）：
 *   · 段落 <w:p>，按 <w:pStyle> 判定标题层级（Heading1 / 标题 1 / 1 / h1 … 都认）
 *   · 文本 <w:t>（含 xml:space="preserve"）、<w:tab/>、<w:br/>
 *   · 表格 <w:tbl> → 行 <w:tr> → 单元格 <w:tc>（保留结构，不拍平成文本）
 *   · docProps/core.xml 的标题
 *
 * 明确不支持（退化而不是崩）：批注、修订痕迹（取最终文本）、脚注、题注、
 * 域代码（只取 cached 结果）、图片（只记“有图”不导出）。
 */

'use strict';

const fs = require('node:fs');
const { readZipEntries, readZipFile } = require('./lib_xlsx');

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function unescapeXml(s) {
  return String(s).replace(/&(#x?[0-9a-fA-F]+|[a-z]+);/g, (m, e) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENT[e] !== undefined ? ENT[e] : m;
  });
}

/** 段落里所有 <w:t> 的拼接（<w:tab/> → \t，<w:br/> → \n） */
function paragraphText(inner) {
  let out = '';
  const re = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\s*\/>|<w:br\s*\/>/g;
  let m;
  while ((m = re.exec(inner))) {
    if (m[1] !== undefined) out += unescapeXml(m[1]);
    else if (m[0].startsWith('<w:tab')) out += '\t';
    else out += '\n';
  }
  return out;
}

/** 标题层级：只认「明显是标题」的样式名，避免把正文样式误判成标题 */
function headingLevel(inner) {
  const m = /<w:pStyle\s+w:val="([^"]+)"/.exec(inner);
  if (!m) return 0;
  const s = m[1];
  if (/^(Heading|heading)([1-6])$/.test(s)) return Number(RegExp.$2);
  const zh = /^(标题|heading)\s*([1-6])$/.exec(s);
  if (zh) return Number(zh[2]);
  if (/^a?([1-6])$/.test(s)) return Number(s.slice(-1)); // 少数模板把样式名就叫 "1".."6"
  if (/^Title$/.test(s)) return 1;
  return 0;
}

/** 表格：<w:tbl> → rows（每行是单元格文本数组） */
function parseTable(inner) {
  const rows = [];
  const trRe = /<w:tr[\s>][\s\S]*?<\/w:tr>/g;
  let tr;
  while ((tr = trRe.exec(inner))) {
    const cells = [];
    const tcRe = /<w:tc[\s>][\s\S]*?<\/w:tc>/g;
    let tc;
    while ((tc = tcRe.exec(tr[0]))) {
      // 单元格里可能有多个段落，用空格连接
      const paras = [...tc[0].matchAll(/<w:p[\s>][\s\S]*?<\/w:p>/g)].map((p) => paragraphText(p[0]).trim());
      cells.push(paras.filter(Boolean).join(' '));
    }
    if (cells.some((c) => c)) rows.push(cells);
  }
  return rows;
}

function readDocx(file) {
  const buf = typeof file === 'string' ? fs.readFileSync(file) : file;
  const entries = readZipEntries(buf);
  const docBuf = readZipFile(buf, entries, 'word/document.xml');
  if (!docBuf) throw new Error('不是 docx：缺 word/document.xml');

  // 标题（可选）
  let title = '';
  const coreBuf = readZipFile(buf, entries, 'docProps/core.xml');
  if (coreBuf) {
    const t = /<dc:title[^>]*>([\s\S]*?)<\/dc:title>/.exec(coreBuf.toString('utf8'));
    if (t) title = unescapeXml(t[1]).trim();
  }

  const xml = docBuf.toString('utf8');
  const bodyStart = xml.indexOf('<w:body>');
  const body = bodyStart >= 0 ? xml.slice(bodyStart) : xml;

  const blocks = [];
  const re = /<w:tbl[\s>][\s\S]*?<\/w:tbl>|<w:p[\s>][\s\S]*?<\/w:p>|<w:p\/>/g;
  let m;
  while ((m = re.exec(body))) {
    const chunk = m[0];
    if (chunk.startsWith('<w:tbl')) {
      const rows = parseTable(chunk);
      if (rows.length) blocks.push({ type: 'table', rows });
      continue;
    }
    const text = paragraphText(chunk).trim();
    if (!text) continue;
    const lv = headingLevel(chunk);
    blocks.push(lv ? { type: `h${lv}`, text, level: lv } : { type: 'p', text });
  }

  const chars = blocks.reduce((a, b) => a + (b.type === 'table' ? b.rows.flat().join('').length : b.text.length), 0);
  return {
    title,
    blocks,
    counts: {
      blocks: blocks.length,
      headings: blocks.filter((b) => b.type.startsWith('h')).length,
      paragraphs: blocks.filter((b) => b.type === 'p').length,
      tables: blocks.filter((b) => b.type === 'table').length,
      chars,
    },
  };
}

module.exports = { readDocx, paragraphText, headingLevel, parseTable };

if (require.main === module) {
  const file = process.argv[2];
  if (!file) { console.error('用法: node scripts/lib_docx.js <file.docx> [--max N]'); process.exit(1); }
  const maxIdx = process.argv.indexOf('--max');
  const max = maxIdx > 0 ? Number(process.argv[maxIdx + 1]) : 10;
  const d = readDocx(file);
  console.log(`标题: ${d.title || '(无)'}`);
  console.log(`块 ${d.counts.blocks} · 标题 ${d.counts.headings} · 段落 ${d.counts.paragraphs} · 表 ${d.counts.tables} · ${d.counts.chars} 字`);
  for (const b of d.blocks.slice(0, max)) {
    if (b.type === 'table') console.log(`  [表 ${b.rows.length}×${b.rows[0].length}] ${b.rows[0].slice(0, 3).join(' | ')}`);
    else console.log(`  ${b.type === 'p' ? '  ' : '#'.repeat(Number(b.type[1]) + 1)} ${b.text.slice(0, 70)}`);
  }
}
