#!/usr/bin/env node
/**
 * scripts/build_books_data.js —— [textbooks] 成品清单 → 站点「教材」页的数据
 *
 *   node scripts/build_books_data.js
 *
 * 输入：`textbooks/build/series.json`（由 textbooks/build_book.js --all --epub 生成）
 *       + `textbooks/volumes.json`（手工维护的五卷定义，取副标题/阶段/二维码以外的元信息）
 * 输出：`site/books-data.js` → window.TCMAI_BOOKS
 *
 * 为什么要这一层而不是让页面直接读 series.json：
 *   1. series.json 在 textbooks/build/ 里（**不入库**，干净克隆上不存在），
 *      站点若 fetch 它，本地一克隆就是 404 —— 页面必须能优雅地说明「还没构建」；
 *   2. 页面需要知道每份成品**在不在盘上、多大**，这是文件系统的事实，
 *      与「清单里写了什么」是两件事（清单可能过期）。
 *
 * 与 site/build.js 一样**不写生成时间**：带时间戳的产物会让「是否漂移」永远为真。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const BUILD = path.join(ROOT, 'textbooks', 'build');
const SITE = path.join(ROOT, 'site');
const OUT = path.join(SITE, 'books-data.js');

const seriesPath = path.join(BUILD, 'series.json');
const volumesDef = JSON.parse(fs.readFileSync(path.join(ROOT, 'textbooks', 'volumes.json'), 'utf8'));

function stat(rel) {
  if (!rel) return null;
  const abs = path.join(ROOT, rel);
  try {
    const s = fs.statSync(abs);
    return { path: rel, bytes: s.size, ok: s.size > 0 };
  } catch {
    return { path: rel, bytes: 0, ok: false };
  }
}

const defByN = new Map(volumesDef.volumes.map((v) => [v.n, v]));

/**
 * Release 次入口：读发布清单 books-release.json（由 publish_books_github.py 写）。
 * 与 series.json 分开的理由：一个是「本机出了什么书」，一个是「远端真发了什么」——
 * 两者都可能单独缺，页面要分别说清，不能用一个字段兼表两件事。
 */
function readRelease() {
  const p = path.join(BUILD, 'books-release.json');
  if (!fs.existsSync(p)) return null;
  try {
    const r = JSON.parse(fs.readFileSync(p, 'utf8'));
    const assets = (r.assets || []).map((a) => ({
      name: a.name,
      bytes: a.bytes,
      sha256: a.sha256,
      url: `${r.url}/download/${a.name}`,
    }));
    return {
      repo: r.repo,
      tag: r.tag,
      url: r.url,
      assets,
      totalBytes: assets.reduce((n, a) => n + a.bytes, 0),
    };
  } catch {
    return null;
  }
}
const release = readRelease();

let payload;
if (fs.existsSync(seriesPath)) {
  const series = JSON.parse(fs.readFileSync(seriesPath, 'utf8'));
  const volumes = series.volumes.map((v) => {
    const def = defByN.get(v.n) || {};
    return {
      n: v.n,
      title: v.title,
      subtitle: def.subtitle || '',
      glyph: def.glyph || '',
      semesters: v.semesters || def.semesters || [],
      audience: def.audience || '',
      focus: def.focus || '',
      chapters: v.chapters,
      words: v.words,
      epub: stat(v.artifacts && v.artifacts.epub),
      pdf: stat(v.artifacts && v.artifacts.pdf),
      html: stat(v.artifacts && v.artifacts.html),
      md: stat(v.artifacts && v.artifacts.md),
      // 该卷在 Release 上的附件（用于页面上的次入口；资产名是 ASCII 的 volume-N-*）
      release: release
        ? release.assets.filter((a) => a.name.startsWith(`volume-${v.n}-`))
        : [],
    };
  });
  payload = {
    generatedBy: 'scripts/build_books_data.js',
    available: volumes.length > 0,
    series: series.series || '中医药 · 从零工程',
    totals: series.totals || {
      volumes: volumes.length,
      chapters: volumes.reduce((n, v) => n + v.chapters, 0),
      words: volumes.reduce((n, v) => n + v.words, 0),
      epub: volumes.filter((v) => v.epub && v.epub.ok).length,
      pdf: volumes.filter((v) => v.pdf && v.pdf.ok).length,
    },
    volumes,
    // 远端发布事实（可能与本机产物不同步：本机能构建 ≠ 远端已发）
    release: release
      ? { repo: release.repo, tag: release.tag, url: release.url, assets: release.assets, totalBytes: release.totalBytes }
      : null,
  };
  // 清单说有几卷，盘上真有几卷 —— 对不上就在数据里写清楚，由页面显示，不在构建期假装正常
  payload.totals.epubOnDisk = volumes.filter((v) => v.epub && v.epub.ok).length;
  payload.totals.pdfOnDisk = volumes.filter((v) => v.pdf && v.pdf.ok).length;
} else {
  payload = {
    generatedBy: 'scripts/build_books_data.js',
    available: false,
    series: '中医药 · 从零工程',
    reason: 'textbooks/build/series.json 不存在 —— 还没跑过教材构建',
    hint: 'node textbooks/build_book.js --all --epub --pdf',
    volumes: [],
    release: release
      ? { repo: release.repo, tag: release.tag, url: release.url, assets: release.assets, totalBytes: release.totalBytes }
      : null,
    totals: { volumes: 0, chapters: 0, words: 0, epub: 0, pdf: 0 },
  };
}

fs.writeFileSync(OUT, `window.TCMAI_BOOKS = ${JSON.stringify(payload, null, 2)};\n`, 'utf8');

console.log('═══ [textbooks] 站点教材清单 ═══\n');
if (!payload.available) {
  console.log('  ⬚ 未构建教材成品 —— 页面会显示「尚未构建」与重建命令');
  console.log(`     重建: ${payload.hint}`);
} else {
  for (const v of payload.volumes) {
    const f = (a) => (a && a.ok ? `${(a.bytes / 1048576).toFixed(1)} MB` : '—');
    console.log(`  第 ${v.n} 卷 ${v.title}: ${v.chapters} 章 / ${v.words.toLocaleString('en-US')} 字 · EPUB ${f(v.epub)} · PDF ${f(v.pdf)}`);
  }
  console.log(`\n  合计 ${payload.totals.volumes} 卷 / ${payload.totals.chapters} 章 · EPUB 在盘 ${payload.totals.epubOnDisk} · PDF 在盘 ${payload.totals.pdfOnDisk}`);
}
console.log(`  → ${path.relative(ROOT, OUT).replace(/\\/g, '/')}`);
