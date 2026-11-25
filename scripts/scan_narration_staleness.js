#!/usr/bin/env node
/**
 * scan_narration_staleness.js —— 全库体检：成片层是不是「旧稿做的空壳」
 *
 * 判据（两条都是硬的）：
 *   1. 覆盖率 = 旁白汉字 / docs 汉字；低于 50% 说明片子只讲了文档的一小部分；
 *   2. 陈旧 = docs/zh.md 的 mtime 晚于 narration/lesson.json 的 mtime；
 *      晚于就说明正文改过、讲稿没重抽，片子一定过期。
 *
 *   node scripts/scan_narration_staleness.js [--limit N] [--dept 05-huli]
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);
const argOf = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const deptFilter = argOf('--dept');

const han = (s) => (s.match(/[\u4e00-\u9fa5]/g) || []).length;
const DEP = path.join(ROOT, 'departments');
const PLC = path.join(ROOT, 'platform', 'courses');

const totals = { chapters: 0, noLesson: 0, stale: 0, thin: 0, docHan: 0, spokenHan: 0 };
const perCourse = [];

for (const dept of fs.readdirSync(DEP)) {
  if (deptFilter && dept !== deptFilter) continue;
  const ddir = path.join(DEP, dept);
  if (!fs.statSync(ddir).isDirectory()) continue;
  for (const sub of fs.readdirSync(ddir)) {
    const chDir = path.join(ddir, sub, 'chapters');
    if (!fs.existsSync(chDir)) continue;
    const plDir = path.join(PLC, dept, sub);
    const row = { key: `${dept}/${sub}`, chapters: 0, stale: 0, thin: 0, noLesson: 0, docHan: 0, spokenHan: 0 };
    for (const ch of fs.readdirSync(chDir)) {
      const docP = path.join(chDir, ch, 'docs', 'zh.md');
      if (!fs.existsSync(docP)) continue;
      const lesP = path.join(plDir, ch, 'narration', 'lesson.json');
      const docHan = han(fs.readFileSync(docP, 'utf8'));
      row.chapters++; totals.chapters++;
      row.docHan += docHan; totals.docHan += docHan;
      if (!fs.existsSync(lesP)) { row.noLesson++; totals.noLesson++; continue; }
      const j = JSON.parse(fs.readFileSync(lesP, 'utf8'));
      const spoken = j.segments.reduce((a, s) => a + han(s.spoken || s.text || ''), 0);
      row.spokenHan += spoken; totals.spokenHan += spoken;
      const stale = fs.statSync(docP).mtimeMs > fs.statSync(lesP).mtimeMs;
      if (stale) { row.stale++; totals.stale++; }
      if (docHan > 0 && spoken / docHan < 0.5) { row.thin++; totals.thin++; }
    }
    if (row.chapters) perCourse.push(row);
  }
}

perCourse.sort((a, b) => b.thin - a.thin || b.stale - a.stale);
console.log(`全库 ${totals.chapters} 章 · docs ${totals.docHan} 汉字 · 旁白 ${totals.spokenHan} 汉字 · 覆盖率 ${(100 * totals.spokenHan / Math.max(1, totals.docHan)).toFixed(1)}%`);
console.log(`陈旧（docs 比讲稿新）${totals.stale} 章 · 空壳（覆盖<50%）${totals.thin} 章 · 无讲稿 ${totals.noLesson} 章`);
console.log('\n按空壳章数排序（前 25 门）：');
for (const r of perCourse.slice(0, 25)) {
  console.log(`${r.key.padEnd(42)} 章 ${String(r.chapters).padStart(3)} · 空壳 ${String(r.thin).padStart(3)} · 陈旧 ${String(r.stale).padStart(3)} · 覆盖 ${(100 * r.spokenHan / Math.max(1, r.docHan)).toFixed(0).padStart(3)}%`);
}
