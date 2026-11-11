#!/usr/bin/env node
/**
 * scripts/probe_textbooks.js —— 测量桌面 textbooks/ 下 qhzy-*.xlsx 的形态（**只读，不生成**）
 *
 *   node scripts/probe_textbooks.js              汇总
 *   node scripts/probe_textbooks.js --json       全量明细
 *   node scripts/probe_textbooks.js --one 方剂学  单份逐表
 *
 * 为什么先测量：这批 100 份工作簿是「多智能体协同种子内容」，
 * 每份的表结构看似相同（0封面/0目录/0映射/章表），但 Chapters 从 8 到 90 不等、
 * 正文是否齐全也无法从文件名推断。先量：表数、章表数、正文段数、正文字数、
 * 目录章数 ↔ 章表数 是否一致、空段数。数字对不上就写进 gaps，不猜。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { readWorkbook } = require('./lib_xlsx');

const DIR = 'C:/Users/user/Desktop/textbooks';
const JSON_OUT = process.argv.includes('--json');
const oneIdx = process.argv.indexOf('--one');
const ONE = oneIdx >= 0 ? process.argv[oneIdx + 1] : null;

// 章表：名字以 1–2 位序号开头（"01 方剂学绪论" / "1绪论" / "1.素问·养生总纲"），
// 排除 n=0 的元数据表（0封面/0目录/0映射1/0历史/0改写说明/0分布式体系）
// 与 3 位序号开头的非章表（"120门教材互适矩阵"）。
const chapterNo = (name) => {
  const m = /^(\d{1,2})(?!\d)/.exec(name);
  if (!m) return 0;
  const n = Number(m[1]);
  return n >= 1 ? n : 0;
};
const isChapterSheet = (name) => chapterNo(name) > 0;

/** 表内正文抽取：章/节/小节/段 四列定位层级，内容列取文字。 */
function parseChapterSheet(sheet) {
  const out = { title: '', sections: [], paras: 0, chars: 0, empty: 0, kinds: {} };
  for (const row of sheet.rows) {
    const text = String(row[4] == null ? '' : row[4]).trim();
    const seg = row[3] == null ? '' : String(row[3]).trim();
    const sub = row[2] == null ? '' : String(row[2]).trim();
    const sec = row[1] == null ? '' : String(row[1]).trim();
    const chap = row[0] == null ? '' : String(row[0]).trim();
    if (!text) continue;
    if (!out.title && /^第\s*\d+\s*章/.test(text)) { out.title = text; continue; }
    const kind = seg ? (Number(seg) >= 10 ? 'body' : 'h4')
      : sub ? 'h3' : sec ? 'h2' : chap ? 'h1' : 'body';
    out.kinds[kind] = (out.kinds[kind] || 0) + 1;
    if (kind === 'body') { out.paras += 1; out.chars += text.length; }
    if (kind === 'h2' || kind === 'h3') out.sections.push(text);
  }
  if (!out.title && sheet.rows[0] && sheet.rows[0][4]) out.title = String(sheet.rows[0][4]).trim();
  return out;
}

function probeFile(file) {
  const wb = readWorkbook(path.join(DIR, file));
  const names = wb.sheets.map((s) => s.name);
  const chSheets = wb.sheets.filter((s) => isChapterSheet(s.name));
  const chapters = chSheets.map((s) => {
    const p = parseChapterSheet(s);
    return { sheet: s.name, title: p.title, sections: p.sections.length, paras: p.paras, chars: p.chars, kinds: p.kinds };
  });
  const toc = wb.sheets.find((s) => s.name === '0目录');
  let tocChapters = 0;
  const tocChapterTitles = [];
  if (toc) {
    const seen = new Set();
    for (const row of toc.rows) {
      const n = row[0] == null ? '' : String(row[0]).trim();
      const t = row[1] == null ? '' : String(row[1]).trim();
      if (!/^\d+$/.test(n) || !/^第\s*\d+\s*章/.test(t)) continue;
      if (seen.has(t)) continue;
      seen.add(t);
      tocChapterTitles.push(t);
    }
    tocChapters = tocChapterTitles.length;
  }
  const title = file.replace(/^qhzy-/, '').replace(/\.xlsx$/, '');
  const chars = chapters.reduce((a, c) => a + c.chars, 0);
  const paras = chapters.reduce((a, c) => a + c.paras, 0);
  const gaps = [];
  if (!chSheets.length) gaps.push('无章表');
  if (chapters.some((c) => c.chars === 0)) gaps.push(`空正文章表 ${chapters.filter((c) => c.chars === 0).map((c) => c.sheet).join('、')}`);
  if (tocChapters && tocChapters !== chapters.length) gaps.push(`目录章数 ${tocChapters} ≠ 章表数 ${chapters.length}`);
  const bare = chapters.filter((c) => c.chars < 800);
  if (bare.length) gaps.push(`正文<800字章表 ${bare.length} 张：${bare.map((c) => c.sheet).join('、')}`);
  return {
    file, title, sheets: wb.sheets.length, sheetNames: names,
    chapterSheets: chapters.length, tocChapters, chars, paras, gaps, chapters,
  };
}

const files = fs.readdirSync(DIR).filter((f) => /^qhzy-.*\.xlsx$/i.test(f)).sort();
const targets = ONE ? files.filter((f) => f.includes(ONE)) : files;

const results = [];
for (const f of targets) {
  try {
    results.push(probeFile(f));
  } catch (e) {
    results.push({ file: f, error: e.message });
  }
}

if (JSON_OUT) {
  console.log(JSON.stringify(results, null, 2));
} else if (ONE) {
  for (const r of results) {
    if (r.error) { console.log(r.file, 'ERROR', r.error); continue; }
    console.log(`═══ ${r.file} · ${r.title}`);
    console.log(`  表 ${r.sheets} · 章表 ${r.chapterSheets} · 目录章 ${r.tocChapters} · 正文 ${r.chars.toLocaleString()} 字 / ${r.paras} 段`);
    for (const c of r.chapters) console.log(`   ${c.sheet.padEnd(28)} ${String(c.chars).padStart(7)} 字 ${String(c.paras).padStart(4)} 段 节 ${c.sections}`);
    if (r.gaps.length) console.log('  ⚠ ' + r.gaps.join(' | '));
  }
} else {
  const ok = results.filter((r) => !r.error);
  const totalChars = ok.reduce((a, r) => a + r.chars, 0);
  const totalCh = ok.reduce((a, r) => a + r.chapterSheets, 0);
  const withGaps = ok.filter((r) => r.gaps.length);
  console.log('═══ 桌面 textbooks/ · 形态测量 ═══');
  console.log(`  文件 ${results.length} 份 · 可解析 ${ok.length} · 失败 ${results.length - ok.length}`);
  console.log(`  章表 ${totalCh} 张 · 正文 ${totalChars.toLocaleString()} 字`);
  console.log(`  有缺口的文件 ${withGaps.length} 份`);
  for (const r of results) {
    if (r.error) { console.log(`  ✗ ${r.file}  ${r.error}`); continue; }
    const flag = r.gaps.length ? '⚠' : ' ';
    console.log(`${flag} ${String(r.chapterSheets).padStart(3)}章 ${String(r.chars).padStart(8)}字  ${r.title}`);
  }
  for (const r of withGaps) console.log(`  ⚠ ${r.title}: ${r.gaps.join(' | ')}`);
}
