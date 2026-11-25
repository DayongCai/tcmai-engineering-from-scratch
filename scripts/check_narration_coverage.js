#!/usr/bin/env node
/** 旁白覆盖率体检：docs 汉字 vs lesson.json spoken 汉字（按章、按课程汇总） */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const target = process.argv[2]; // dept/subject
const han = (s) => (s.match(/[\u4e00-\u9fa5]/g) || []).length;

const depDir = path.join(ROOT, 'departments', target, 'chapters');
const plDir = path.join(ROOT, 'platform', 'courses', target);

let totDoc = 0, totSpoken = 0;
const rows = [];
for (const ch of fs.readdirSync(depDir)) {
  const docP = path.join(depDir, ch, 'docs', 'zh.md');
  const lesP = path.join(plDir, ch, 'narration', 'lesson.json');
  if (!fs.existsSync(docP)) continue;
  const docN = han(fs.readFileSync(docP, 'utf8'));
  let spokenN = 0, segs = 0, secs = 0;
  if (fs.existsSync(lesP)) {
    const j = JSON.parse(fs.readFileSync(lesP, 'utf8'));
    segs = j.segments.length;
    spokenN = j.segments.reduce((a, s) => a + han(s.spoken || ''), 0);
    secs = j.audioMeasuredSeconds || 0;
  }
  totDoc += docN; totSpoken += spokenN;
  rows.push({ ch, docN, spokenN, segs, secs, ratio: docN ? spokenN / docN : 0 });
}
rows.sort((a, b) => a.ratio - b.ratio);
console.log(`课程 ${target}：${rows.length} 章 · docs ${totDoc} 汉字 · 旁白 ${totSpoken} 汉字 · 覆盖率 ${(100 * totSpoken / Math.max(1, totDoc)).toFixed(1)}%`);
for (const r of rows) {
  console.log(`${r.ch.padEnd(28)} docs ${String(r.docN).padStart(5)} · 旁白 ${String(r.spokenN).padStart(5)} · ${(100 * r.ratio).toFixed(0).padStart(3)}% · 段 ${String(r.segs).padStart(2)} · ${(r.secs / 60).toFixed(1)} 分`);
}
