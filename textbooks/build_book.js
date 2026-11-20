#!/usr/bin/env node
/**
 * textbooks/build_book.js — [textbooks] 教材汇总与校核
 *
 *   node textbooks/build_book.js --volume 1        汇总第一「生」卷为单个 Markdown
 *   node textbooks/build_book.js --all             汇总全部五卷
 *   node textbooks/build_book.js --epub            额外生成 EPUB（含封面 / 目录 / 卷首说明）
 *   node textbooks/build_book.js --publish-check   出版件校核：EPUB 内部结构 + series.json 对账
 *   node textbooks/build_book.js --check           校核：字数统计 + 与章节文档的事实一致性
 *   node textbooks/build_book.js --volume 1 --pdf  额外调用 pandoc 生成 PDF（需 pandoc + xelatex）
 *
 * 缺 pandoc 时明确报错，不生成占位 PDF / 占位 EPUB —— 与 platform/pipeline/build_video.js 同一原则。
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('node:child_process');
const tools = require(path.join(__dirname, '..', 'platform', 'pipeline', 'find_tools.js'));
const { renderCover } = require(path.join(__dirname, 'cover.js'));

const ROOT = path.resolve(__dirname, '..');
// 复用站点自己的 Markdown 渲染器：公式、图注、表格的处理都在那一份里。
// 教材若另起一套渲染，两处迟早不一致，而不一致时只有一边会错。
const mdRenderer = require(path.join(ROOT, 'site', 'md'));
const TBDIR = path.join(ROOT, 'textbooks');
const volumes = JSON.parse(fs.readFileSync(path.join(TBDIR, 'volumes.json'), 'utf8'));

const catalogPath = path.join(ROOT, 'catalog.json');
if (!fs.existsSync(catalogPath)) {
  console.error('✗ 缺 catalog.json，先跑: node scripts/build_catalog.js');
  process.exit(1);
}
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

const argv = process.argv.slice(2);
const checkOnly = argv.includes('--check');
const publishCheck = argv.includes('--publish-check');
const wantPdf = argv.includes('--pdf');
const wantEpub = argv.includes('--epub');
const all = argv.includes('--all');
const volIdx = argv.indexOf('--volume');
const volArg = volIdx >= 0 ? Number(argv[volIdx + 1]) : null;

const PANDOC = tools.findPandoc();
const XELATEX = tools.findXelatex();

if (!checkOnly && !publishCheck && !all && !volArg) {
  console.error('用法: node textbooks/build_book.js [--volume N | --all | --check | --publish-check] [--epub] [--pdf]');
  process.exit(1);
}
if ((wantPdf || wantEpub) && !PANDOC) {
  console.error('✗ 缺 pandoc —— 无法生成 PDF / EPUB。本脚本不生成占位文件。');
  console.error('  安装: winget install JohnMacFarlane.Pandoc');
  console.error('        或下载官方 zip 解到 %LOCALAPPDATA%\\pandoc（platform/README.md 同款做法）');
  console.error('  Markdown 汇总与单文件 HTML 不受影响，去掉 --epub / --pdf 即可。');
  process.exit(1);
}
if (wantPdf && !XELATEX) {
  console.error('✗ 缺 xelatex —— EPUB / Markdown / HTML 都能出，PDF 不行。');
  console.error('  安装: winget install MiKTeX.MiKTeX');
  console.error(`  探测路径: ${['%LOCALAPPDATA%\\Programs\\MiKTeX\\miktex\\bin\\x64', 'C:/Program Files/MiKTeX/miktex/bin/x64'].join(' · ')}`);
  process.exit(1);
}

function which(name) {
  const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [name], { encoding: 'utf8' });
  return r.status === 0 ? String(r.stdout).split(/\r?\n/).find((l) => l.trim()) : null;
}

/** 教材章目录：textbooks/<dept>/<subject>/*.md */
function textbookDir(subject) {
  return path.join(TBDIR, subject.dept.slug, subject.slug);
}

// ── 图片内联 ────────────────────────────────────────────────────────────────
const FIG_MIME = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

/**
 * 把章节里的 <img src="figures/x.svg"> 换成 data URI。
 *
 * 为什么要内联：本 HTML 的定位是「单文件、离线可读」（见 renderBookHtml 的 footer）。
 * 产物落在 textbooks/build/，若保留相对路径就得指回 textbooks/<dept>/<subject>/figures/，
 * 一旦单独传阅或挪动目录立刻断图。内联之后，一本书就是一个可以发出去的文件。
 *
 * 为什么用 base64 而不是把 SVG 源码直接嵌进 HTML：同一卷里会有多张图，
 * 内联 SVG 的 id 与 <style> 会互相污染（渐变、marker、类名撞车），
 * 而 <img src="data:..."> 天然隔离，且不继承页面的 CSS 变量。
 */
function inlineFigures(html, dir) {
  const figures = [];
  const out = html.replace(/<img(\s[^>]*?)src="([^"]+)"([^>]*)>/g, (whole, pre, src, post) => {
    if (/^[a-z][a-z0-9+.-]*:/i.test(src) || src.startsWith('//')) return whole;  // md.js 已挡，双保险
    const abs = path.join(dir, src);
    let buf;
    try {
      buf = fs.readFileSync(abs);
    } catch {
      figures.push({ src, ok: false, reason: '文件不存在' });
      return `<span class="img-missing">［缺图文件］${src}</span>`;
    }
    const mime = FIG_MIME[path.extname(abs).toLowerCase()];
    if (!mime) {
      figures.push({ src, ok: false, reason: '扩展名不在白名单' });
      return `<span class="img-missing">［图格式不支持］${src}</span>`;
    }
    figures.push({ src, ok: true, bytes: buf.length });
    return `<img${pre}src="data:${mime};base64,${buf.toString('base64')}"${post}>`;
  });
  return { html: out, figures };
}

/** 扫描某门学科目录下的图：正文引用 vs 磁盘文件，两边都要对得上 */
function scanFigures(subject) {
  const dir = textbookDir(subject);
  // 扫**全书**的 md，不只是章：凡例（00-）与附录（附录A…）也是书的一部分，
  // 图 1–12 的证据与图注本来就写在 00-凡例与使用.md §8。只扫章会把它们全判成孤儿图
  // ——2026-11-15 实测 12 张图「孤儿」，逐张核对全在凡例里被引用，是扫的范围窄了。
  const refs = new Set();
  const broken = [];
  for (const f of allMdFiles(subject)) {
    const t = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const m of t.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)) {
      const src = m[1];
      refs.add(src);
      if (!fs.existsSync(path.join(dir, src))) broken.push({ file: f, src });
    }
  }
  const figDir = path.join(dir, 'figures');
  let orphans = [];
  if (fs.existsSync(figDir)) {
    for (const f of fs.readdirSync(figDir)) {
      if (!FIG_MIME[path.extname(f).toLowerCase()]) continue;
      const rel = `figures/${f}`;
      if (!refs.has(rel)) orphans.push(rel);
    }
  }
  return { refs: refs.size, broken, orphans };
}


function chapterFiles(subject) {
  const dir = textbookDir(subject);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    // 00-前言.md / 00-凡例.md 不是章：它同样匹配 ^\d{2}-，会把章数虚增一门一份（实测 52 门虚增 52 章）
    // 章号必须允许**三位**：外源古籍类学科章数过百（三字头 382 章），早期写死 ^\d{2}-
    // 会把 100-第100章 之后整段吞掉 —— 2026-11-15 实测漏 286 章（2310 vs 实际 2596，12%），
    // 且与 build_textbook_board.js 的 ^\d+-第\d+章 口径分叉（同一事实两个数）。
    .filter((f) => /^\d{2,}-.*\.md$/.test(f) && !/^00-/.test(f))
    // 字符串序会把 100- 排到 99- 前面 → 卷内章序错乱；按前缀数字排，同号再比文件名。
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10) || a.localeCompare(b, 'zh'));
}

/** 学科目录下全部 md：章 + 00-前言/凡例 + 附录（图对账要按「全书引用」算，不能只看章） */
function allMdFiles(subject) {
  const dir = textbookDir(subject);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => /\.md$/.test(f));
}

/** 中文字数：按非空白字符计（教材统计惯例） */
function wordCount(text) {
  // 图片引用不计入正文：![图注](figures/x.svg) 里的路径与图注都不是被写的字。
  // 不这么做的话，给一章加一张图就会把全书字数改成另一个数，而 meta.json 里的
  // textbook.words 是按正文钉的 —— 「字数可复算」这条契约就当场破了。
  return text.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\s/g, '').length;
}

function volumeSubjects(volume) {
  const sems = new Set(volume.semesters);
  return catalog.departments
    .flatMap((d) => d.subjects.map((s) => ({ ...s, dept: d })))
    .filter((s) => sems.has(s.semester))
    .sort((a, b) => a.semester - b.semester || a.deptN - b.deptN || a.n - b.n);
}

// ── 校核 ────────────────────────────────────────────────────
function runCheck() {
  console.log('═══ [textbooks] 教材校核 ═══\n');

  let totalWords = 0;
  let totalChapters = 0;
  let subjectsWithText = 0;
  let figRefs = 0;
  const figProblems = [];
  const missing = [];

  for (const volume of volumes.volumes) {
    const subjects = volumeSubjects(volume);
    let vWords = 0;
    let vChapters = 0;

    for (const s of subjects) {
      const files = chapterFiles(s);
      if (!files.length) {
        missing.push(`${s.dept.slug}/${s.slug}（第 ${s.semester} 学期，第 ${volume.n} 卷）`);
        continue;
      }
      subjectsWithText += 1;
      for (const f of files) {
        const t = fs.readFileSync(path.join(textbookDir(s), f), 'utf8');
        vWords += wordCount(t);
        vChapters += 1;
      }
      // 图对账：正文引用的图必须在磁盘上，磁盘上的图必须被正文引用（孤儿图同样是缺陷）
      const fig = scanFigures(s);
      figRefs += fig.refs;
      fig.broken.forEach((b) => figProblems.push(`${s.slug}/${b.file} 引用缺图 → ${b.src}`));
      fig.orphans.forEach((o) => figProblems.push(`${s.slug}/${o} 未被任何章节引用（孤儿图）`));
    }
    totalWords += vWords;
    totalChapters += vChapters;
    console.log(`  第 ${volume.n} 卷 ${volume.glyph} ${volume.title}: ${vChapters} 章 / ${vWords} 字 / 覆盖 ${subjects.filter((s) => chapterFiles(s).length).length}/${subjects.length} 门学科`);
  }

  console.log(`\n  合计: ${totalChapters} 章 / ${totalWords} 字 / ${subjectsWithText} 门学科有稿`);

  // 事实一致性抽查：教材里出现的配属关系必须与章节代码一致
  const consistency = checkFactConsistency();
  console.log(`\n  事实一致性抽查: ${consistency.length === 0 ? '通过 ✅' : `${consistency.length} 项 ❌`}`);
  consistency.forEach((c) => console.log(`     - ${c}`));

  // 图对账
  console.log(`\n  教材插图: ${figRefs} 张被正文引用`);
  if (figProblems.length === 0) {
    console.log(`  图对账: 通过 ✅（引用与磁盘文件、孤儿图三方面均无差异）`);
  } else {
    console.log(`  图对账: ${figProblems.length} 项 ❌`);
    figProblems.slice(0, 12).forEach((p) => console.log(`     - ${p}`));
    if (figProblems.length > 12) console.log(`     … 另有 ${figProblems.length - 12} 项`);
  }

  if (missing.length) {
    console.log(`\n  未开稿的学科 (${missing.length}/${catalog.counts.subjects}):`);
    missing.slice(0, 8).forEach((m) => console.log(`     ⬚ ${m}`));
    if (missing.length > 8) console.log(`     … 另有 ${missing.length - 8} 门`);
  }

  // 口径交叉校核：同一条事实（教材章数）不许两个脚本各报一个数。
  // build_textbook_board.js 用 ^\d+-第\d+章 逐学科扫盘；本脚本按卷汇总。两处不等，
  // 必有一处丢章或重复计 —— 2026-11-15 就是这样查出本脚本吞掉 286 章（三位数章号）。
  let boardChapters = null;
  const boardPath = path.join(ROOT, 'data', 'textbook-board.json');
  if (fs.existsSync(boardPath)) {
    try {
      boardChapters = JSON.parse(fs.readFileSync(boardPath, 'utf8')).totals.chapters;
    } catch { /* 看板未生成时跳过，不制造假失败 */ }
  }
  if (boardChapters != null && boardChapters !== totalChapters) {
    console.log(
      `\n  章数口径不一致 ❌: 本脚本按卷汇总 ${totalChapters} 章，教材看板逐学科扫盘 ${boardChapters} 章` +
        `（差 ${totalChapters - boardChapters}）—— 这不是「阈值」，是有一处在丢章或重复计`
    );
  } else if (boardChapters != null) {
    console.log(`\n  章数口径交叉校核: 通过 ✅（按卷 ${totalChapters} = 看板扫盘 ${boardChapters}）`);
  }

  console.log('\n  提示: meta.json 的 textbook.words 必须用上面的实测字数填写，不许估。');
  return {
    totalChapters,
    totalWords,
    subjectsWithText,
    missing: missing.length,
    consistency,
    figProblems,
    boardMismatch: boardChapters != null && boardChapters !== totalChapters,
  };
}

/**
 * 抽查：教材里写的藏象配属，必须与
 * departments/01-zhongyi/01-zhongyi-jichu-lilun/chapters/03-zang-xiang-tupu/code/main.js 的 ZANG 表一致。
 */
function checkFactConsistency() {
  const problems = [];
  const codePath = path.join(
    ROOT, 'departments', '01-zhongyi', '01-zhongyi-jichu-lilun',
    'chapters', '03-zang-xiang-tupu', 'code', 'main.js'
  );
  if (!fs.existsSync(codePath)) return problems;

  const code = fs.readFileSync(codePath, 'utf8');
  const rows = [...code.matchAll(/\{\s*name:\s*'(.+?)',\s*wuxing:\s*'(.+?)',\s*fu:\s*'(.+?)',\s*qiao:\s*'(.+?)',\s*zhi:\s*'(.+?)',\s*ti:\s*'(.+?)',\s*hua:\s*'(.+?)'/g)]
    .map((m) => ({ name: m[1], wuxing: m[2], fu: m[3], qiao: m[4], zhi: m[5], ti: m[6], hua: m[7] }));
  if (rows.length !== 5) {
    problems.push(`未能从章节代码解析出 5 行藏象配属（解析到 ${rows.length} 行），校核跳过`);
    return problems;
  }

  // 教材稿里若出现「X 开窍于 Y」的表述，Y 必须与代码一致
  for (const volume of volumes.volumes) {
    for (const s of volumeSubjects(volume)) {
      for (const f of chapterFiles(s)) {
        const t = fs.readFileSync(path.join(textbookDir(s), f), 'utf8');
        for (const r of rows) {
          // 只认「开窍于 + 单个官窍字」：源正文里常见「心开窍于舌等」「肺开窍于鼻而喉」，
          // 用 {1,3} 贪婪会把「舌等」当成官窍名，造出假失败（实测踩到）。
          const re = new RegExp(`${r.name}\\s*(?:开窍于|开窍在)\\s*([口舌鼻目耳])`, 'g');
          for (const m of t.matchAll(re)) {
            const got = m[1].replace(/[，。、；]$/, '');
            if (got !== r.qiao) {
              problems.push(`${f}: 写「${r.name}开窍于${got}」，但章节代码为「${r.qiao}」—— 两处必有一处错`);
            }
          }
          const reW = new RegExp(`${r.name}[（(]\\s*([木火土金水])\\s*[)）]`, 'g');
          for (const m of t.matchAll(reW)) {
            if (m[1] !== r.wuxing) {
              problems.push(`${f}: 写「${r.name}(${m[1]})」，但章节代码为「${r.wuxing}」`);
            }
          }
        }
      }
    }
  }
  return problems;
}

// ── 汇总 ────────────────────────────────────────────────────
/**
 * 单文件书 HTML：自包含（无外链）、离线可开、带可点目录。
 *
 * 为什么需要：这条交付物线的成品此前只有 Markdown，PDF/EPUB 卡在 pandoc（本机没有）。
 * 一个"只有源码形态的成品"等于没有成品 —— 读者打不开它。
 * HTML 不需要任何外部工具，且能带上公式与图（复用 site/md.js）。
 *
 * 样式**内联**：单文件的意义就是拷走一个文件就能读，外链一个 CSS 就破了这个性质。
 */
function renderBookHtml(volume, subjectCount, chapters, words, chaptersHtml, extras = 0) {
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const toc = chaptersHtml.map((c, i) => `    <li><span class="no">${String(i + 1).padStart(2, '0')}</span> <a href="#ch${i + 1}">${esc(c.title)}</a><span class="sb">${esc(c.subject)}</span></li>`).join('\n');
  const body = chaptersHtml.map((c, i) => `  <section class="chapter" id="ch${i + 1}">\n${c.html}\n  </section>`).join('\n');
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>中医药 · 从零工程 — 第 ${volume.n} 卷 ${esc(volume.title)}</title>
<style>
  :root{--ink:#1f1b16;--muted:#6b6156;--line:#ddd3c4;--paper:#fbf8f2;--accent:#8a5a2b}
  *{box-sizing:border-box}
  body{margin:0;background:var(--paper);color:var(--ink);
    font-family:'Noto Serif SC','Source Han Serif CN','Songti SC','SimSun',serif;line-height:1.9}
  .wrap{max-width:46rem;margin:0 auto;padding:4rem 1.25rem 8rem}
  h1{font-size:1.7rem;margin:0 0 .4rem}
  .meta{color:var(--muted);font-size:.85rem;margin-bottom:2.5rem}
  nav.toc{background:#fff;border:1px solid var(--line);border-radius:10px;padding:1.25rem 1.5rem;margin-bottom:3rem}
  nav.toc h2{margin:0 0 .75rem;font-size:.95rem;color:var(--muted);font-weight:400;letter-spacing:.08em}
  nav.toc ol{list-style:none;margin:0;padding:0}
  nav.toc li{display:flex;gap:.6rem;align-items:baseline;padding:.2rem 0;font-size:.92rem}
  nav.toc .no{color:var(--accent);font-variant-numeric:tabular-nums}
  nav.toc .sb{margin-left:auto;color:var(--muted);font-size:.75rem}
  nav.toc a{color:inherit;text-decoration:none}
  nav.toc a:hover{color:var(--accent);text-decoration:underline}
  section.chapter{border-top:1px solid var(--line);padding-top:2.5rem;margin-top:3rem}
  section.chapter h1{font-size:1.35rem}
  section.chapter h2{font-size:1.1rem;margin-top:2rem}
  section.chapter h3{font-size:1rem;margin-top:1.5rem}
  figure.fig{margin:1.8rem 0;text-align:center}
  figure.fig img{max-width:100%;height:auto;border:1px solid var(--line);border-radius:8px;background:#fff}
  figure.fig figcaption{color:var(--muted);font-size:.82rem;margin-top:.55rem;line-height:1.6}
  figure.fig-broken{border:1px dashed #c0392b;background:#fdf1ef;border-radius:8px;padding:.7rem 1rem}
  figure.fig-broken figcaption{color:#c0392b;margin-top:0}
  img.inline-fig{max-width:100%;vertical-align:middle}
  .img-missing,.img-broken{color:#c0392b;font-size:.85em;border:1px dashed #c0392b;border-radius:4px;padding:.05rem .3rem}
  table{width:100%;border-collapse:collapse;margin:1rem 0;font-size:.88rem}
  th,td{border:1px solid var(--line);padding:.4rem .6rem;text-align:left}
  th{background:#f3ede2}
  code{background:#f1e9dc;padding:.1rem .3rem;border-radius:3px;font-size:.88em;
    font-family:ui-monospace,'Cascadia Code',Consolas,monospace}
  pre{background:#2b2622;color:#f0e9dd;padding:1rem;border-radius:8px;overflow-x:auto}
  pre code{background:none;color:inherit}
  blockquote{border-left:3px solid var(--accent);margin:1rem 0;padding:.2rem 0 .2rem 1rem;color:var(--muted)}
  .notice{border:1px solid #e2c9a0;background:#fdf6e8;border-radius:8px;padding:.8rem 1rem;font-size:.9rem}
  footer{margin-top:5rem;border-top:1px solid var(--line);padding-top:1rem;color:var(--muted);font-size:.78rem}
</style>
</head>
<body>
<div class="wrap">
  <h1>中医药 · 从零工程</h1>
  <h1>第 ${volume.n} 卷 · ${esc(volume.title)}</h1>
  <div class="meta">${esc(volume.subtitle)} · 覆盖第 ${esc(volume.semesters.join('、'))} 学期 ·
    ${subjectCount} 门学科 · 已写 ${chapters} 章 / ${words} 字${extras ? ` · 另含 ${extras} 份前置/附录` : ''}</div>

  <nav class="toc">
    <h2>目录</h2>
    <ol>
${toc}
    </ol>
  </nav>

${body}

  <footer>
    <p><strong>免责声明：</strong>本教材仅用于教育与科研，不构成临床诊疗建议。
    任何基于本教材内容的临床决策，必须由具备合法执业资格的医师复核。</p>
    <p>由 <code>textbooks/build_book.js</code> 生成（单文件、离线可读、不入版本库）。</p>
  </footer>
</div>
</body>
</html>
`;
}

// ── EPUB 出版件 ─────────────────────────────────────────────
/** catalog 的类型代码 → 中文（教材导语里读得懂的字） */
const TYPE_ZH = { Core: '核心', Build: '构建', Clinic: '临床', Reference: '参考', Engineering: '工程', Project: '实践' };

/**
 * 图路径改成「仓库根相对」。
 * 聚合后的 EPUB 源 md 只有一个文件，章内的 `figures/x.svg` 已不成立（相对的是学科目录）；
 * pandoc 用 --resource-path 仓库根解析，所以这里补上 textbooks/<dept>/<subject>/ 前缀。
 * 同样的理由也适用于章内偶发的 <img src="figures/..."> 原图标签。
 */
function rewriteFigurePaths(text, subject) {
  const prefix = `textbooks/${subject.dept.slug}/${subject.slug}/`;
  return text
    .replace(/\]\((figures\/[^)\s]+)/g, `](${prefix}$1`)
    .replace(/src="(figures\/[^"]+)"/g, `src="${prefix}$1"`);
}

/** 卷首说明：五卷对照 + 怎么用 + 与站点/代码的关系（对应参考项目的 how_to_use） */
function epubFrontMatter(volume) {
  const rows = volumes.volumes.map((v) => {
    const mark = v.n === volume.n;
    const cell = (x) => (mark ? `**${x}**` : String(x));
    return `| ${cell(v.n)} | ${cell(`${v.glyph} ${v.title}`)} | ${v.semesters.join('、')} | ${v.subtitle} |`;
  });
  return [
    '# 关于本卷 {.unnumbered}',
    '',
    `这一卷是《中医药 · 从零工程》五卷本的第 ${volume.n} 卷：**${volume.title}** —— ${volume.subtitle}。`,
    '',
    `本卷覆盖第 ${volume.semesters.join('、')} 学期，读者对象是${volume.audience}。卷内各门学科按院系分部排列，每部先列学科页（学期 / 类型 / 学时 / 实到章数），再列该学科的章。`,
    '',
    '## 五卷对照 {.unnumbered}',
    '',
    '| 卷 | 阶段 | 学期 | 主题 |',
    '|---|---|---|---|',
    ...rows,
    '',
    '## 怎么读这本书 {.unnumbered}',
    '',
    '1. **先读学科页再读章。** 学科页给出这门课在本卷里的位置（第几学期、多少学时、实到几章），章里不再重复交代。',
    '2. **章首块是这本书的信用凭证。** 每章开头写明底本表名 / 外源书名、抽取指纹与该章字数——数字可复算，写错就过不了门。',
    '3. **改写层与源正文层分开看。** 源正文层逐字来自底本，不许手改；改写层（本章要回答的问题、N.1–N.5）是在正文之上加的判断，文末 RE-WRITE 块内自成一段。',
    '4. **临床内容有边界。** 每卷卷末与每章免责句都写明：教材只用于教育与科研，不替代执业医师的判断。',
    '',
    '> 本卷数字（章数 / 字数）由 `node textbooks/build_book.js --volume ' + volume.n + '` 实测生成，封面与学科页取的是同一份数字。',
  ].join('\n');
}

/** 聚合 EPUB 源 md：卷首 → 院系部 → 学科页 → 前置/章/附录 */
function assembleEpub(volume, subjects) {
  const parts = [epubFrontMatter(volume)];
  const byDept = new Map();
  for (const s of subjects) {
    if (!byDept.has(s.dept.slug)) byDept.set(s.dept.slug, { dept: s.dept, list: [] });
    byDept.get(s.dept.slug).list.push(s);
  }
  for (const { dept, list } of byDept.values()) {
    const sems = [...new Set(list.map((s) => s.semester))].join('、');
    parts.push([
      `# ${dept.title} {.unnumbered .part}`,
      '',
      `> ${dept.icon ? `${dept.icon} ` : ''}${dept.focus || ''}  `,
      `> 第 ${sems} 学期 · ${list.length} 门学科有教材稿`,
    ].join('\n'));
    for (const s of list) {
      const dir = textbookDir(s);
      const files = chapterFiles(s);
      const extras = allMdFiles(s).filter((f) => !files.includes(f));
      const pre = extras.filter((f) => /^00-/.test(f)).sort();
      const post = extras.filter((f) => !/^00-/.test(f)).sort((a, b) => a.localeCompare(b, 'zh'));
      let sWords = 0;
      for (const f of files) sWords += wordCount(fs.readFileSync(path.join(dir, f), 'utf8'));
      parts.push([
        `# ${s.title} {.unnumbered}`,
        '',
        `> 第 ${s.semester} 学期 · ${TYPE_ZH[s.type] || s.type} · ${s.hours} 学时 · 教材 ${files.length} 章 / ${sWords} 字` +
          (extras.length ? ` · 另含 ${extras.length} 份前置/附录` : ''),
      ].join('\n'));
      for (const f of [...pre, ...files, ...post]) {
        parts.push(rewriteFigurePaths(fs.readFileSync(path.join(dir, f), 'utf8').trim(), s));
      }
    }
  }
  return parts.join('\n\n');
}

/** EPUB 元数据（书名页与 OPF 都取自这里，不重复写两处） */
function epubMetadata(volume) {
  const q = (s) => String(s).replace(/"/g, '\\"');
  return [
    '---',
    'title: "中医药 · 从零工程"',
    `subtitle: "${q(`第 ${volume.n} 卷 · ${volume.title} —— ${volume.subtitle}`)}"`,
    'author: "《中医药 · 从零工程》编写组"',
    'lang: zh-CN',
    'toc-title: 目录',
    'rights: "仅用于教育与科研，不构成临床诊疗建议"',
    '---',
  ].join('\n');
}

/**
 * 生成 EPUB。返回 { path, bytes, cover } 或 null。
 * 任何一步失败都返回 null 并打印原因 —— 不产出半成品。
 */
function buildEpub(volume, stats) {
  const buildDir = path.join(TBDIR, 'build');
  fs.mkdirSync(buildDir, { recursive: true });
  const base = `volume-${volume.n}-${volume.id}`;
  const mdPath = path.join(buildDir, `${base}.epub.md`);
  const metaPath = path.join(buildDir, `${base}.meta.yaml`);
  const epubPath = path.join(buildDir, `${base}.epub`);

  const subjects = volumeSubjects(volume).filter((s) => chapterFiles(s).length);
  if (!subjects.length) return null;

  fs.writeFileSync(mdPath, assembleEpub(volume, subjects), 'utf8');
  fs.writeFileSync(metaPath, epubMetadata(volume), 'utf8');

  // 封面：无头浏览器截图；没有浏览器就出无封面 EPUB，并在控制台说清楚
  const coverPath = path.join(buildDir, `cover-${base}.png`);
  const cover = renderCover(volume, coverPath, stats);
  if (!cover.ok) console.log(`     ⚠ 封面未生成（${cover.reason}）—— 本卷 EPUB 无封面`);

  const args = [
    mdPath, '-o', epubPath,
    // -yaml_metadata_block 是必须的：pandoc 默认允许 YAML 元数据块出现在文档**任意位置**，
    // 而教材章里 `---` + `键: 值` 这种排版很常见（章首块、附录对照表），
    // 会被当元数据块解析并整卷失败（2026-11-18 第一卷 798 章就是这么红的）。
    // 元数据因此改走 --metadata-file，与正文解析彻底分开。
    '--from', 'markdown+fenced_divs+pipe_tables-yaml_metadata_block-raw_tex',
    '--metadata-file', metaPath,
    '--toc', '--toc-depth=1',
    '--top-level-division=chapter',
    '--split-level=1',
    '--css', path.join(TBDIR, 'epub.css'),
    '--resource-path', ROOT,
  ];
  if (cover.ok) args.push('--epub-cover-image', coverPath);

  const r = spawnSync(PANDOC, args, { encoding: 'utf8', timeout: 30 * 60 * 1000 });
  if (r.status !== 0 || !fs.existsSync(epubPath) || fs.statSync(epubPath).size < 1024) {
    console.error(`  ✗ 第 ${volume.n} 卷 EPUB 生成失败 (exit ${r.status}):`);
    console.error(`     ${String(r.stderr || '').trim().split('\n').slice(-4).join('\n     ')}`);
    try { if (fs.existsSync(epubPath)) fs.unlinkSync(epubPath); } catch { /* 删不掉就留给下一版覆盖 */ }
    return null;
  }
  return { path: epubPath, bytes: fs.statSync(epubPath).size, cover: cover.ok };
}

// ── 出版件校核 ──────────────────────────────────────────────
/**
 * 最小 zip 目录读取：EPUB 就是 zip，这里只取条目名。
 * 为什么不 shell 出去调 unzip：Windows git-bash 不保证有 unzip，而「校核工具缺失 ⇒ 门失效」
 * 正是本项目一直在避免的事。中央目录格式固定（EOCD 0x06054b50 / 条目 0x02014b50）。
 */
function zipEntryNames(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 66000); i -= 1) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) return null;
  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  const names = [];
  for (let i = 0; i < count; i += 1) {
    if (off + 46 > buf.length || buf.readUInt32LE(off) !== 0x02014b50) return null;
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const cmtLen = buf.readUInt16LE(off + 32);
    names.push(buf.subarray(off + 46, off + 46 + nameLen).toString('utf8'));
    off += 46 + nameLen + extraLen + cmtLen;
  }
  return names;
}

function readJsonSafe(p, fallback = null) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; }
}

/**
 * 出版件校核：EPUB 是「真的书」还是「空壳」。
 * 只认六件：zip 结构、mimetype、container.xml、OPF、XHTML 章数 ≥ 教材章数、封面图在包里。
 * 这不是「文件存在即通过」——存在但打不开的 EPUB 是最常见的假成品。
 */
function runPublishCheck() {
  console.log('═══ [textbooks] 出版件校核 ═══\n');
  const buildDir = path.join(TBDIR, 'build');
  const seriesPath = path.join(buildDir, 'series.json');
  const series = readJsonSafe(seriesPath);
  if (!series) {
    console.error('✗ 缺 textbooks/build/series.json —— 先跑一次出版件构建：');
    console.error('    node textbooks/build_book.js --all --epub');
    process.exit(1);
  }
  let bad = 0;
  const list = series.volumes.filter((v) => v.artifacts && v.artifacts.epub);
  if (!list.length) {
    console.error('✗ series.json 里没有任何 EPUB —— 先跑 node textbooks/build_book.js --all --epub');
    process.exit(1);
  }
  for (const v of list) {
    const epubPath = path.join(ROOT, v.artifacts.epub);
    const rel = v.artifacts.epub;
    if (!fs.existsSync(epubPath)) {
      console.log(`  ✗ 第 ${v.n} 卷: 清单登记了 ${rel}，文件却不存在`);
      bad += 1;
      continue;
    }
    const buf = fs.readFileSync(epubPath);
    const names = zipEntryNames(buf);
    const problems = [];
    if (!names) problems.push('不是合法 zip（找不到中央目录）');
    else {
      if (!names.includes('mimetype')) problems.push('缺 mimetype');
      if (!names.some((n) => /META-INF\/container\.xml$/.test(n))) problems.push('缺 META-INF/container.xml');
      const opf = names.find((n) => /\.opf$/.test(n));
      if (!opf) problems.push('缺 OPF（content.opf）');
      const xhtml = names.filter((n) => /\.x?html$/.test(n)).length;
      if (xhtml < v.chapters) problems.push(`XHTML 文档 ${xhtml} 份 < 教材 ${v.chapters} 章（拆分失败或吞章）`);
      if (v.artifacts.cover && !names.some((n) => /(^|\/)cover[^/]*\.(png|jpe?g)$/i.test(n))) problems.push('清单说带封面，包里没有 cover.png/jpg');
    }
    if (problems.length) {
      console.log(`  ✗ 第 ${v.n} 卷 ${v.title}: ${problems.join(' · ')}`);
      bad += 1;
    } else {
      console.log(`  ✅ 第 ${v.n} 卷 ${v.title}: ${v.chapters} 章 → ${names.filter((n) => /\.x?html$/.test(n)).length} 份 XHTML / ${(buf.length / 1048576).toFixed(1)} MB / 封面 ${v.artifacts.cover ? '有' : '无'}`);
    }
  }
  if (bad) {
    console.error(`\n✗ 出版件校核未通过：${bad} 卷有问题`);
    process.exit(1);
  }
  console.log('\n✅ 出版件校核通过（zip 结构、目录、章数、封面四项均对得上）');
  return true;
}

/**
 * PDF 专用字符替换：LaTeX 缺字不报错，只往日志里写「Missing character」然后**静默丢字**。
 * 2026-11-18 实测：卷一单卷丢了 2,818 个字符（①②③④⑤ 672/670/546/296/68、⬚ 80、α 67、↔ 54）。
 * 这些都不是装饰：①②③ 是方剂序号，⬚ 是「未开稿」标记，α 是受体亚型。
 *
 * 处理分两层：
 *   1. 换字体（mainfont 也设成 SimSun）：①–⑩、α、↔ 这类 GB2312 内字符就都有了；
 *   2. 换字形（下表）：SimSun 也没有的符号换成同义的常见字形，宁可字形差一点，不许丢字。
 * 只对 PDF 生效 —— EPUB / HTML 用系统字体渲染，原字符本来就在。
 */
const PDF_CHAR_FIX = [
  ['⬚', '□'],   // U+2B1A 未开稿标记 → 空框
  ['✓', '√'],
  ['✗', '×'],
  ['✅', '√'],
  ['❌', '×'],
  ['🚧', '△'],
  ['↔', '<->'],           // SimSun 没有双向箭头，用 ASCII 双箭头代替（保留「双向」语义）
  // 五个阶段 emoji 纯装饰（旁边就写着「生 · 启蒙」），LaTeX 里没有对应字形 → 直接去掉，
  // 好过留一个空白方块。
  ['🌱', ''],
  ['🌿', ''],
  ['🌳', ''],
  ['🍂', ''],
  ['🔄', ''],
];

function sanitizeForPdf(text) {
  let out = text;
  for (const [from, to] of PDF_CHAR_FIX) {
    if (from !== to) out = out.split(from).join(to);
  }
  // 连体替换后再扫一遍：有些 emoji 是 ZWJ 组合（🚧‍️ 之类），拆开后可能留下孤立变体选择符
  out = out.replace(/[\uFE0F\u200D]/g, '');
  return out;
}

function buildVolume(volume, { pdf, epub: epubFlag }) {
  const subjects = volumeSubjects(volume);
  const sections = [];
  const chaptersHtml = [];   // 单文件书 HTML 用：逐章渲染，另出目录

  sections.push(`# 中医药 · 从零工程`);
  sections.push(`# 第 ${volume.n} 卷 · ${volume.title}`);
  sections.push('');
  sections.push(`> ${volume.subtitle}`);
  sections.push('>');
  sections.push(`> 本卷覆盖第 ${volume.semesters.join('、')} 学期（${volume.glyph} ${volume.title.split(' ')[0]}阶段），` +
    `共 ${subjects.length} 门学科。`);
  sections.push('');
  sections.push(`**读者:** ${volume.audience}`);
  sections.push('');
  sections.push(`**本卷重点:** ${volume.focus}`);
  sections.push('');
  sections.push('---');
  sections.push('');

  let chapters = 0;
  let words = 0;
  let figCount = 0;
  let extrasCount = 0;
  const figBroken = [];

  for (const s of subjects) {
    const files = chapterFiles(s);
    if (!files.length) continue;
    const dir = textbookDir(s);
    // 一本书不只是章：前置（00-前言/凡例）与附录（附录A…）同样属正文层。
    // 2026-11-15 前这里只遍历 chapterFiles，128 份学科前言与 9 份附录全不进书 ——
    // 证候学的 12 张图与附录 A–I（总表/索引/手册/书目）在成品里一张都看不到（卷三内联图 0）。
    // 前置排章前、附录排章后；但**章数与字数只统计章**，否则与教材看板的扫盘口径打架。
    const extras = allMdFiles(s).filter((f) => !files.includes(f));
    const pre = extras.filter((f) => /^00-/.test(f)).sort();
    const post = extras.filter((f) => !/^00-/.test(f)).sort((a, b) => a.localeCompare(b, 'zh'));
    const ordered = [...pre, ...files, ...post];
    for (const f of ordered) {
      const isChapter = files.includes(f);
      const t = fs.readFileSync(path.join(dir, f), 'utf8');
      sections.push(t.trim());
      sections.push('');
      sections.push('---');
      sections.push('');
      if (isChapter) {
        chapters += 1;
        words += wordCount(t);
      } else {
        extrasCount += 1;
      }
      const h1 = /^#\s+(.+)$/m.exec(t);
      const rendered = inlineFigures(mdRenderer.render(t), dir);
      for (const fg of rendered.figures) {
        figCount += fg.ok ? 1 : 0;
        if (!fg.ok) figBroken.push(`${s.slug}/${f}: ${fg.reason}`);
      }
      chaptersHtml.push({
        subject: isChapter ? s.title : `${s.title} · ${/^00-/.test(f) ? '前置' : '附录'}`,
        title: h1 ? h1[1].trim() : f,
        html: rendered.html,
      });
    }
  }

  if (chapters === 0) return { chapters: 0, words: 0, out: null };

  sections.push('');
  sections.push('> **免责声明:** 本教材仅用于教育与科研，不构成临床诊疗建议。');
  sections.push('> 任何基于本教材内容的临床决策，必须由具备合法执业资格的医师复核。');

  const buildDir = path.join(TBDIR, 'build');
  fs.mkdirSync(buildDir, { recursive: true });
  const base = `volume-${volume.n}-${volume.id}`;
  const mdPath = path.join(buildDir, `${base}.md`);
  fs.writeFileSync(mdPath, sections.join('\n'), 'utf8');

  // ── 单文件书 HTML（不需要 pandoc）──
  // [textbooks] 此前的最终产物只有 Markdown，而 PDF/EPUB 卡在 pandoc 上（本机没有）。
  // 于是这条交付物线**没有一个能读的成品**：写了却打不开，与没写等价。
  // 这里补一个自包含 HTML —— 复用站点自己的渲染器（公式/图注都在），
  // 单文件、离线可开、不进版本库（textbooks/build/ 已在 .gitignore 里）。
  const bookHtml = renderBookHtml(volume, subjects.length, chapters, words, chaptersHtml, extrasCount);
  const htmlPath = path.join(buildDir, `${base}.html`);
  fs.writeFileSync(htmlPath, bookHtml, 'utf8');

  let pdfPath = null;
  if (pdf) {
    pdfPath = path.join(buildDir, `${base}.pdf`);
    // PDF 源用「清过字形」的一份副本：不改 md 成品（EPUB/HTML 用原字符），
    // 只把 LaTeX 会丢的字先换掉。见 sanitizeForPdf 的注释。
    const pdfSrc = path.join(buildDir, `${base}.pdf.md`);
    const orig = fs.readFileSync(mdPath, 'utf8');
    const clean = sanitizeForPdf(orig);
    if (clean === orig) fs.copyFileSync(mdPath, pdfSrc);
    else fs.writeFileSync(pdfSrc, clean, 'utf8');

    const r = spawnSync(PANDOC, [
      pdfSrc, '-o', pdfPath,
      `--pdf-engine=${XELATEX}`,
      '-V', 'mainfont=SimSun',
      '-V', 'CJKmainfont=SimSun',
      '-V', 'geometry:margin=2.5cm',
      '--toc', '--toc-depth=2',
      '-f', 'markdown+pipe_tables-yaml_metadata_block-raw_tex',
    ], { encoding: 'utf8', timeout: 6 * 60 * 60 * 1000 });
    if (r.status !== 0) {
      console.error(`  ✗ 第 ${volume.n} 卷 PDF 生成失败:`);
      console.error(`     ${(r.stderr || '').split('\n').slice(-5).join('\n     ')}`);
      pdfPath = null;
    }
  }

  // EPUB：五卷各自的完整电子书（封面 / 目录 / 卷首说明 / 院系部 / 学科页）。
  // 与 md / html 同源：读的是同一批章文件，只是多了一层「部 → 学科 → 章」的编排。
  let epub = null;
  if (epubFlag) epub = buildEpub(volume, { chapters, words, subjects: subjects.length });

  return { chapters, words, figures: figCount, figBroken, extras: extrasCount, out: mdPath, pdf: pdfPath, epub };
}

console.log('═══ [textbooks] 教材汇总 ═══\n');

if (checkOnly) {
  const r = runCheck();
  // 打印 ❌ 却 exit 0 = 没有门。2026-11-15 之前这里恒为 0，12 项图对账 ❌ 与口径不一致
  // 都只是「看着红」，`npm run check` 一直是绿的。
  const failures = r.consistency.length + r.figProblems.length + (r.boardMismatch ? 1 : 0);
  if (failures) {
    console.error(`\n✗ 教材校核未通过：${failures} 项（一致性 ${r.consistency.length} · 图对账 ${r.figProblems.length}${r.boardMismatch ? ' · 章数口径 1' : ''}）`);
    process.exit(1);
  }
  console.log('\n✅ 教材校核通过（章数口径、事实一致性、图对账三项均无差异）');
  process.exit(0);
}

if (publishCheck) {
  runPublishCheck();
  process.exit(0);
}

/**
 * 单实例锁：--all --pdf 是小时级任务，两个并发构建会同时写
 * textbooks/build/volume-N-*.{md,html,epub,pdf}，最后谁写完谁赢，另一个纯属白烧 CPU。
 * 2026-11-18 实测踩过：前一轮的 pandoc 在 xelatex 被杀后自己重启，和新一轮并行排同一批卷。
 * 锁只覆盖「构建」类调用 —— --check / --publish-check 是只读，不该被锁挡住。
 */
function acquireBuildLock() {
  const lockPath = path.join(TBDIR, 'build', '.build.lock');
  try {
    const pid = Number(fs.readFileSync(lockPath, 'utf8').trim());
    if (pid && pid !== process.pid) {
      const probe = spawnSync(process.platform === 'win32' ? 'tasklist' : 'ps',
        process.platform === 'win32' ? ['/FI', `PID eq ${pid}`] : ['-p', String(pid)],
        { encoding: 'utf8' });
      const alive = process.platform === 'win32'
        ? new RegExp(`\\b${pid}\\b`).test(String(probe.stdout || '')) && !/No tasks/i.test(String(probe.stdout || ''))
        : probe.status === 0;
      if (alive) {
        console.error(`✗ 已有教材构建在跑（PID ${pid}）—— 本次退出，不并行。`);
        console.error('  确认是残留锁（进程已不在）时，直接删 textbooks/build/.build.lock 再跑。');
        process.exit(0);
      }
    }
  } catch { /* 没有锁就是没在跑 */ }
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  fs.writeFileSync(lockPath, String(process.pid), 'utf8');
  const release = () => { try { fs.unlinkSync(lockPath); } catch { /* 已删 */ } };
  process.on('exit', release);
  process.on('SIGINT', () => { release(); process.exit(130); });
  process.on('SIGTERM', () => { release(); process.exit(143); });
}

const targets = all ? volumes.volumes : volumes.volumes.filter((v) => v.n === volArg);
if (!targets.length) {
  console.error(`✗ 未找到第 ${volArg} 卷`);
  process.exit(1);
}
acquireBuildLock();

/**
 * 出版件清单（series.json）：让「出了几卷、每卷多少章、成品在哪」不靠人记。
 * 不写生成时间：这份文件要被 --publish-check 逐项重算比对，写时间戳就等于每天自报漂移。
 */
const series = {
  schema: 'tcm-textbook-series/1',
  series: '中医药 · 从零工程',
  note: '由 textbooks/build_book.js 生成；卷内章数/字数与 --check 的实测口径一致。',
  volumes: [],
};

// 只构建单卷时，其余卷的登记要从上一版清单里保留 —— 否则 `--volume 4 --epub` 会把
// series.json 写成一卷，站内「教材」页随之只剩一卷。这里先读旧清单，构建完再合并。
const prevSeries = readJsonSafe(path.join(TBDIR, 'build', 'series.json')) || { volumes: [] };

let any = false;
for (const v of targets) {
  const r = buildVolume(v, { pdf: wantPdf, epub: wantEpub });
  if (!r.chapters) {
    console.log(`  ⬚ 第 ${v.n} 卷 ${v.title}: 尚无教材稿，未生成`);
    continue;
  }
  any = true;
  console.log(`  ✅ 第 ${v.n} 卷 ${v.title}: ${r.chapters} 章 / ${r.words} 字`);
  console.log(`     → ${path.relative(ROOT, r.out).replace(/\\/g, '/')}`);
  const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/');
  const entry = {
    n: v.n,
    id: v.id,
    title: v.title,
    semesters: v.semesters,
    chapters: r.chapters,
    words: r.words,
    artifacts: {
      md: rel(r.out),
      html: rel(r.out.replace(/\.md$/, '.html')),
    },
  };
  if (r.pdf) {
    entry.artifacts.pdf = rel(r.pdf);
    console.log(`     → ${entry.artifacts.pdf}`);
  }
  if (r.epub) {
    entry.artifacts.epub = rel(r.epub.path);
    entry.artifacts.cover = r.epub.cover;
    console.log(`     → ${entry.artifacts.epub}（${(r.epub.bytes / 1048576).toFixed(1)} MB · 封面${r.epub.cover ? '有' : '无'}）`);
  }
  series.volumes.push(entry);
}

const builtN = new Set(series.volumes.map((v) => v.n));
for (const pv of prevSeries.volumes || []) {
  if (!builtN.has(pv.n)) series.volumes.push(pv);
}
for (const e of series.volumes) {
  e.artifacts = e.artifacts || {};
  const base = (e.artifacts.md || `textbooks/build/volume-${e.n}-${e.id}.md`).replace(/\.md$/, '');
  for (const kind of ['html', 'epub', 'pdf']) {
    const relPath = `${base}.${kind}`;
    if (!e.artifacts[kind] && fs.existsSync(path.join(ROOT, relPath))) e.artifacts[kind] = relPath;
  }
}
series.volumes.sort((a, b) => a.n - b.n);

if (!any) {
  console.log('\n  五卷都还没有教材稿。开一篇:');
  console.log('    textbooks/01-zhongyi/01-zhongyi-jichu-lilun/00-前言.md');
  process.exit(0);
}

if (wantEpub) {
  series.totals = {
    volumes: series.volumes.length,
    chapters: series.volumes.reduce((n, v) => n + v.chapters, 0),
    words: series.volumes.reduce((n, v) => n + v.words, 0),
    epub: series.volumes.filter((v) => v.artifacts.epub).length,
  };
  const seriesPath = path.join(TBDIR, 'build', 'series.json');
  fs.writeFileSync(seriesPath, JSON.stringify(series, null, 2) + '\n', 'utf8');
  console.log(`\n  出版件清单: ${path.relative(ROOT, seriesPath).replace(/\\/g, '/')}（${series.totals.epub} 卷 EPUB / ${series.totals.chapters} 章）`);
  console.log('  校核: node textbooks/build_book.js --publish-check');

  // 要了 EPUB 却没出全 → 退出码 1。打了红字却 exit 0 等于没有门（本项目的老教训）。
  const missingEpub = series.volumes.filter((v) => !v.artifacts.epub);
  if (missingEpub.length) {
    console.error(`\n✗ ${missingEpub.length} 卷 EPUB 未生成：${missingEpub.map((v) => `第 ${v.n} 卷`).join('、')}（原因见上方日志）`);
    process.exit(1);
  }
}
console.log('\n下一步: node textbooks/build_book.js --check   # 字数与事实一致性校核');
