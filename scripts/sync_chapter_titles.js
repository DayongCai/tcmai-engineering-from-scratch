#!/usr/bin/env node
/**
 * scripts/sync_chapter_titles.js —— 把 chapters.json 的章题与字数同步到 docs/zh.md 实物
 *
 * 背景：2026-11-22 全库课程正文补实（79 门 / 778 章）后，正文 H1 已改为「观点式标题」，
 * 而 chapters.json 仍是补实前的描述性章题。目录页、课程 YAML、视频标题都从 chapters.json
 * 取章名，于是「正文写的是 A，目录写的是 B」。
 *
 * 本脚本以 docs/zh.md 为唯一真源：
 *   [1] 首行 `# 第 N 章 · 标题` → chapters.json 对应条目（按 slug 匹配）的 title
 *   [2] 汉字数 → `hanzi` 字段（**只在该课已有 hanzi 字段时更新**，不新增字段，避免 schema 漂移）
 *
 * 用法：
 *   node scripts/sync_chapter_titles.js --check   # 只报漂移，退 1
 *   node scripts/sync_chapter_titles.js           # 写回
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEPTS = path.join(ROOT, 'departments');
const CHECK = process.argv.includes('--check');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

/** 从 docs/zh.md 首行取章题；非「第 N 章 · X」形态则退回去掉 `# ` 的首行。 */
function titleFromDoc(text) {
  const first = String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/).find((l) => /^#\s+/.test(l));
  if (!first) return null;
  const m = first.match(/^#\s*第\s*[0-9一二三四五六七八九十百]+\s*章\s*[·・:：\-—]?\s*(.+?)\s*$/);
  if (m && m[1]) return m[1];
  const raw = first.replace(/^#\s+/, '').trim();
  // 形如 `# 1) 本章自检…` 的是代码块注释，不是章题
  if (/^[0-9]+\s*[)）]/.test(raw)) return null;
  return raw || null;
}

/** 保留原文件的缩进风格（1 空格 / 2 空格）。 */
function indentOf(text) {
  const m = text.match(/\n( +)"/);
  return m ? m[1].length : 1;
}

const drift = [];
const changedFiles = [];
let scanned = 0;
let retitled = 0;
let rehanzi = 0;

for (const dept of fs.readdirSync(DEPTS).sort()) {
  const deptDir = path.join(DEPTS, dept);
  if (!fs.statSync(deptDir).isDirectory()) continue;
  for (const subj of fs.readdirSync(deptDir).sort()) {
    const cjPath = path.join(deptDir, subj, 'chapters.json');
    if (!fs.existsSync(cjPath)) continue;
    const raw = fs.readFileSync(cjPath, 'utf8');
    let j;
    try {
      j = JSON.parse(raw);
    } catch (e) {
      drift.push(`${dept}/${subj}: chapters.json 不是合法 JSON（${e.message}）`);
      continue;
    }
    if (!Array.isArray(j.chapters)) continue;
    const hasHanzi = j.chapters.some((c) => c && typeof c.hanzi === 'number');
    let dirty = false;
    for (const ch of j.chapters) {
      if (!ch || !ch.slug) continue;
      const doc = path.join(deptDir, subj, 'chapters', ch.slug, 'docs', 'zh.md');
      if (!fs.existsSync(doc)) continue;
      const text = fs.readFileSync(doc, 'utf8');
      scanned += 1;
      const want = titleFromDoc(text);
      if (want && want !== ch.title) {
        drift.push(`${dept}/${subj}/${ch.slug}: 「${ch.title}」→「${want}」`);
        ch.title = want;
        dirty = true;
        retitled += 1;
      }
      if (hasHanzi) {
        const hz = hanzi(text);
        if (ch.hanzi !== hz) {
          drift.push(`${dept}/${subj}/${ch.slug}: hanzi ${ch.hanzi} → ${hz}`);
          ch.hanzi = hz;
          dirty = true;
          rehanzi += 1;
        }
      }
    }
    if (dirty && !CHECK) {
      const out = JSON.stringify(j, null, indentOf(raw)) + '\n';
      fs.writeFileSync(cjPath, out, 'utf8');
      changedFiles.push(`${dept}/${subj}`);
    }
  }
}

console.log(`\n章题同步（chapters.json ← docs/zh.md 首行）`);
console.log(`  扫描章 ${scanned} · 章题改动 ${retitled} · 字数改动 ${rehanzi} · 漂移 ${drift.length}`);

// ---- 第 9/10 学期骨架：data/new-subjects-chapters.json 的章名也须与正文一致 ----
const PLAN = path.join(ROOT, 'data', 'new-subjects-chapters.json');
let planChanged = 0;
if (fs.existsSync(PLAN)) {
  const praw = fs.readFileSync(PLAN, 'utf8');
  const pj = JSON.parse(praw);
  for (const sub of pj.subjects || []) {
    const [deptSlug, subjSlug] = String(sub.key).split('/');
    const cdir = path.join(DEPTS, deptSlug, subjSlug, 'chapters');
    if (!fs.existsSync(cdir)) continue;
    const dirs = fs.readdirSync(cdir);
    for (const pair of sub.chapters || []) {
      const slug = pair[0];
      const dir = dirs.find((d) => d === slug) || dirs.find((d) => d.endsWith('-' + slug));
      if (!dir) continue;
      const doc = path.join(cdir, dir, 'docs', 'zh.md');
      if (!fs.existsSync(doc)) continue;
      const want = titleFromDoc(fs.readFileSync(doc, 'utf8'));
      if (want && want !== pair[1]) {
        drift.push(`data/new-subjects-chapters.json ${sub.key}/${slug}: 「${pair[1]}」→「${want}」`);
        pair[1] = want;
        planChanged += 1;
      }
    }
  }
  if (planChanged && !CHECK) {
    fs.writeFileSync(PLAN, JSON.stringify(pj, null, indentOf(praw)) + '\n', 'utf8');
    console.log(`  第 9/10 学期骨架：写回 ${planChanged} 条章名`);
  } else if (planChanged) {
    console.log(`  第 9/10 学期骨架：${planChanged} 条章名漂移`);
  }
}

if (drift.length) {
  for (const d of drift.slice(0, 12)) console.log('  - ' + d);
  if (drift.length > 12) console.log(`  …… 其余 ${drift.length - 12} 条`);
}
if (CHECK) {
  if (drift.length) {
    console.log('\n✗ 漂移未同步（跑 node scripts/sync_chapter_titles.js）');
    process.exit(1);
  }
  console.log('\n✅ 章题与字数均与 docs/zh.md 一致');
} else {
  console.log(`\n✅ 已写回 ${changedFiles.length} 个 chapters.json`);
}
