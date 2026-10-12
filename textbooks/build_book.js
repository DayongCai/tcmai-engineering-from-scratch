#!/usr/bin/env node
/**
 * textbooks/build_book.js — [textbooks] 教材汇总与校核
 *
 *   node textbooks/build_book.js --volume 1        汇总第一「生」卷为单个 Markdown
 *   node textbooks/build_book.js --all             汇总全部五卷
 *   node textbooks/build_book.js --check           校核：字数统计 + 与章节文档的事实一致性
 *   node textbooks/build_book.js --volume 1 --pdf  额外调用 pandoc 生成 PDF（需 pandoc）
 *
 * 缺 pandoc 时明确报错，不生成占位 PDF —— 与 platform/build_video.js 同一原则。
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
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
const wantPdf = argv.includes('--pdf');
const all = argv.includes('--all');
const volIdx = argv.indexOf('--volume');
const volArg = volIdx >= 0 ? Number(argv[volIdx + 1]) : null;

if (!checkOnly && !all && !volArg) {
  console.error('用法: node textbooks/build_book.js [--volume N | --all | --check] [--pdf]');
  process.exit(1);
}
if (wantPdf && which('pandoc') === null) {
  console.error('✗ 缺 pandoc —— 无法生成 PDF / EPUB。本脚本不生成占位 PDF。');
  console.error('  安装: winget install JohnMacFarlane.Pandoc');
  console.error('  Markdown 汇总不受影响，去掉 --pdf 即可。');
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

function chapterFiles(subject) {
  const dir = textbookDir(subject);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /^\d{2}-.*\.md$/.test(f))
    .sort();
}

/** 中文字数：按非空白字符计（教材统计惯例） */
function wordCount(text) {
  return text.replace(/\s/g, '').length;
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

  if (missing.length) {
    console.log(`\n  未开稿的学科 (${missing.length}/${catalog.counts.subjects}):`);
    missing.slice(0, 8).forEach((m) => console.log(`     ⬚ ${m}`));
    if (missing.length > 8) console.log(`     … 另有 ${missing.length - 8} 门`);
  }

  console.log('\n  提示: meta.json 的 textbook.words 必须用上面的实测字数填写，不许估。');
  return { totalChapters, totalWords, subjectsWithText, missing: missing.length, consistency };
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
          const re = new RegExp(`${r.name}\\s*(?:开窍于|开窍在)\\s*([\\u4e00-\\u9fa5]{1,3})`, 'g');
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
function buildVolume(volume, { pdf }) {
  const subjects = volumeSubjects(volume);
  const sections = [];

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

  for (const s of subjects) {
    const files = chapterFiles(s);
    if (!files.length) continue;
    const dir = textbookDir(s);
    for (const f of files) {
      const t = fs.readFileSync(path.join(dir, f), 'utf8');
      sections.push(t.trim());
      sections.push('');
      sections.push('---');
      sections.push('');
      chapters += 1;
      words += wordCount(t);
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

  let pdfPath = null;
  if (pdf) {
    pdfPath = path.join(buildDir, `${base}.pdf`);
    const r = spawnSync('pandoc', [
      mdPath, '-o', pdfPath,
      '--pdf-engine=xelatex',
      '-V', 'CJKmainfont=SimSun',
      '-V', 'geometry:margin=2.5cm',
      '--toc', '--toc-depth=2',
      '-f', 'markdown+pipe_tables',
    ], { encoding: 'utf8' });
    if (r.status !== 0) {
      console.error(`  ✗ 第 ${volume.n} 卷 PDF 生成失败:`);
      console.error(`     ${(r.stderr || '').split('\n').slice(-5).join('\n     ')}`);
      pdfPath = null;
    }
  }

  return { chapters, words, out: mdPath, pdf: pdfPath };
}

console.log('═══ [textbooks] 教材汇总 ═══\n');

if (checkOnly) {
  runCheck();
  process.exit(0);
}

const targets = all ? volumes.volumes : volumes.volumes.filter((v) => v.n === volArg);
if (!targets.length) {
  console.error(`✗ 未找到第 ${volArg} 卷`);
  process.exit(1);
}

let any = false;
for (const v of targets) {
  const r = buildVolume(v, { pdf: wantPdf });
  if (!r.chapters) {
    console.log(`  ⬚ 第 ${v.n} 卷 ${v.title}: 尚无教材稿，未生成`);
    continue;
  }
  any = true;
  console.log(`  ✅ 第 ${v.n} 卷 ${v.title}: ${r.chapters} 章 / ${r.words} 字`);
  console.log(`     → ${path.relative(ROOT, r.out).replace(/\\/g, '/')}`);
  if (r.pdf) console.log(`     → ${path.relative(ROOT, r.pdf).replace(/\\/g, '/')}`);
}

if (!any) {
  console.log('\n  五卷都还没有教材稿。开一篇:');
  console.log('    textbooks/01-zhongyi/01-zhongyi-jichu-lilun/00-前言.md');
  process.exit(0);
}
console.log('\n下一步: node textbooks/build_book.js --check   # 字数与事实一致性校核');
