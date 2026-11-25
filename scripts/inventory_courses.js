#!/usr/bin/env node
/**
 * inventory_courses.js —— 逐门课的「教材 / 视频」进度盘点
 *
 *   node scripts/inventory_courses.js            # 只统计
 *   node scripts/inventory_courses.js --todo     # 只列仍有缺口的课
 *
 * 判据（都看磁盘，不看计划）：
 *   章        departments/<dept>/<subject>/chapters.json 的章数
 *   正文      chapters/<slug>/docs/zh.md 存在数
 *   教材      textbooks/<dept>/<subject>/*.md 篇数（源正文层 + 改写层）
 *   改写层    上述文件里含 `<!-- REWRITE:BEGIN` 的篇数（N.1–N.5 判断层）
 *   旁白      platform/courses/.../narration/lesson.json
 *   幻灯片    .../slides/index.html
 *   成片      .../video/lesson.mp4
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DEPTS = path.join(ROOT, 'departments');
const TB = path.join(ROOT, 'textbooks');
const PLAT = path.join(ROOT, 'platform', 'courses');
const onlyTodo = process.argv.includes('--todo');

const listDirs = (p) => (fs.existsSync(p) ? fs.readdirSync(p, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) : []);
const readJson = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } };

const rows = [];
for (const dept of listDirs(DEPTS)) {
  for (const sub of listDirs(path.join(DEPTS, dept))) {
    const dir = path.join(DEPTS, dept, sub);
    const cj = readJson(path.join(dir, 'chapters.json'));
    if (!cj) continue;
    const chapters = cj.chapters || [];
    const slugs = chapters.map((c) => c.slug);
    const haveDocs = slugs.filter((s) => fs.existsSync(path.join(dir, 'chapters', s, 'docs', 'zh.md'))).length;

    // 教材层
    const tbDir = path.join(TB, dept, sub);
    let tbFiles = 0; let rewrite = 0;
    if (fs.existsSync(tbDir)) {
      for (const f of fs.readdirSync(tbDir)) {
        if (!f.endsWith('.md')) continue;
        tbFiles++;
        const txt = fs.readFileSync(path.join(tbDir, f), 'utf8');
        if (txt.includes('<!-- REWRITE:BEGIN')) rewrite++;
      }
    }

    // 平台层
    const pdir = path.join(PLAT, dept, sub);
    const narr = slugs.filter((s) => fs.existsSync(path.join(pdir, s, 'narration', 'lesson.json'))).length;
    const slides = slugs.filter((s) => fs.existsSync(path.join(pdir, s, 'slides', 'index.html'))).length;
    const video = slugs.filter((s) => fs.existsSync(path.join(pdir, s, 'video', 'lesson.mp4'))).length;

    rows.push({ id: `${dept}/${sub}`, title: cj.title || sub, chapters: chapters.length, docs: haveDocs, tbFiles, rewrite, narr, slides, video });
  }
}

rows.sort((a, b) => b.chapters - a.chapters);

const show = onlyTodo
  ? rows.filter((r) => r.docs < r.chapters || r.rewrite < r.tbFiles || r.video < r.chapters)
  : rows;

console.log('课程'.padEnd(42) + '章'.padStart(4) + '正文'.padStart(5) + '教材篇'.padStart(7) + '改写'.padStart(5) + '旁白'.padStart(5) + '幻灯'.padStart(5) + '成片'.padStart(5));
for (const r of show) {
  console.log(
    r.id.padEnd(42)
    + String(r.chapters).padStart(4)
    + String(r.docs).padStart(5)
    + String(r.tbFiles).padStart(7)
    + String(r.rewrite).padStart(5)
    + String(r.narr).padStart(5)
    + String(r.slides).padStart(5)
    + String(r.video).padStart(5));
}

const sum = rows.reduce((a, r) => ({
  ch: a.ch + r.chapters, docs: a.docs + r.docs, tb: a.tb + r.tbFiles, rw: a.rw + r.rewrite,
  narr: a.narr + r.narr, slides: a.slides + r.slides, video: a.video + r.video,
}), { ch: 0, docs: 0, tb: 0, rw: 0, narr: 0, slides: 0, video: 0 });
console.log('-'.repeat(78));
console.log(`合计 ${rows.length} 门：章 ${sum.ch} · 正文 ${sum.docs} · 教材 ${sum.tb}（改写 ${sum.rw}）· 旁白 ${sum.narr} · 幻灯 ${sum.slides} · 成片 ${sum.video}`);
const done = rows.filter((r) => r.video >= r.chapters && r.chapters > 0).length;
const withDocs = rows.filter((r) => r.docs >= r.chapters && r.chapters > 0).length;
console.log(`满科：正文 ${withDocs}/${rows.length} · 成片 ${done}/${rows.length}`);
