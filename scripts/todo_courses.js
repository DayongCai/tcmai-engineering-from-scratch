#!/usr/bin/env node
/**
 * todo_courses.js —— 列出「还没有 rewrite-plan / 还是 draft」的课程，按章数排序
 *
 *   node scripts/todo_courses.js            # 全部待办
 *   node scripts/todo_courses.js --draft    # 只看已有骨架但判断层没写完的
 *   node scripts/todo_courses.js --noplan   # 只看连锁骨架都没有的
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DEP = path.join(ROOT, 'departments');
const STD = path.join(ROOT, 'standards');
const only = process.argv.includes('--draft') ? 'draft' : process.argv.includes('--noplan') ? 'noplan' : 'all';

// 已有 plan → dept/subject
const planByCourse = new Map();
for (const d of fs.readdirSync(STD)) {
  const p = path.join(STD, d, 'rewrite-plan.json');
  if (!fs.existsSync(p)) continue;
  try {
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    planByCourse.set(`${j.dept}/${j.subject}`, { slug: d, status: j.status || '?', n: (j.chapters || []).length, written: (j.chapters || []).filter((c) => c.n2).length });
  } catch { /* 坏 JSON 先跳过，check 会报 */ }
}

const rows = [];
for (const dept of fs.readdirSync(DEP, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)) {
  const ddir = path.join(DEP, dept);
  for (const sub of fs.readdirSync(ddir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)) {
    const cjP = path.join(ddir, sub, 'chapters.json');
    if (!fs.existsSync(cjP)) continue;
    const cj = JSON.parse(fs.readFileSync(cjP, 'utf8'));
    const key = `${dept}/${sub}`;
    const plan = planByCourse.get(key);
    const chapters = (cj.chapters || []).length;
    if (!plan) rows.push({ key, title: cj.title || sub, chapters, state: 'noplan', slug: '', written: 0 });
    else if (plan.status !== 'complete') rows.push({ key, title: cj.title || sub, chapters, state: 'draft', slug: plan.slug, written: plan.written });
  }
}

const pick = rows.filter((r) => only === 'all' || r.state === only).sort((a, b) => b.chapters - a.chapters);
console.log(`待办 ${pick.length} 门（noplan ${rows.filter((r) => r.state === 'noplan').length} · draft ${rows.filter((r) => r.state === 'draft').length}）`);
for (const r of pick) {
  console.log(`${String(r.chapters).padStart(3)} 章  ${r.state.padEnd(6)}  ${r.key.padEnd(40)} ${r.state === 'draft' ? `slug=${r.slug} 已写 ${r.written}/${r.chapters}` : `《${r.title}》`}`);
}
