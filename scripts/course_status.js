#!/usr/bin/env node
/**
 * scripts/course_status.js —— 逐门课的「真完成」判定（三层合并，正文层以 audit_course_docs 为唯一真源）
 *
 * 为什么要有这个脚本：批量子代理会中断、会半途而废、会自称完成。
 * 只有把「正文 / 习题 / 产出 / 登记」四件事并到一门课上，才有单一结论。
 *
 * 用法：
 *   node scripts/course_status.js                  # 只列非「真完成」
 *   node scripts/course_status.js --dept=09-jichu  # 只看一个院系
 *   node scripts/course_status.js --all            # 全列
 *   node scripts/course_status.js --json           # 机器可读
 *
 * 判定：
 *   真完成 = 正文审计不合格 0 且 已登记 且 习题违规 0 且 产出违规 0
 *   半成品 = 正文已成形（不合格 < 半数）但上述有一条不满足
 *   未写   = 半数以上章仍是模板稿
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split('=').slice(1).join('=');
const onlyDept = arg('dept', '');
const showAll = process.argv.includes('--all');
const asJson = process.argv.includes('--json');

function runTask(script, argv) {
  try {
    return execFileSync(process.execPath, [path.join(__dirname, script), ...argv], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (e) {
    return (e.stdout || '') + (e.stderr || '');
  }
}

/** 正文层：audit_course_docs.js --dept=<d>，行形如「  ✗ 01-x  10 章 · ≥2500字 10 · 不合格 10」 */
function auditDept(dept) {
  const out = new Map();
  for (const line of runTask('audit_course_docs.js', [`--dept=${dept}`]).split(/\r?\n/)) {
    const m = line.match(/^\s*[✓✗]\s+([\w-]+)\s+(\d+)\s*章\s*·.*?不合格\s*(\d+)/);
    if (m) out.set(m[1], { chapters: Number(m[2]), bad: Number(m[3]) });
  }
  return out;
}

/** 习题层：行形如「  ✗ dept/x  8 章 · 违规 3」 */
function parseChapterGate(text) {
  const out = new Map();
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*[✓✗]\s+([\w-]+\/[\w-]+)\s+\d+\s*章\s*·\s*违规\s*(\d+)/);
    if (m) out.set(m[1], Number(m[2]));
  }
  return out;
}

/** 产出门：行形如「✗ dept/x   18 处」 */
function parseOutputs(text) {
  const out = new Map();
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*[✓✗]\s+([\w-]+\/[\w-]+)\s+(\d+)\s*处/);
    if (m) out.set(m[1], Number(m[2]));
  }
  return out;
}

const exMap = parseChapterGate(runTask('check_chapter_exercises.js', ['--report']));
const outMap = parseOutputs(runTask('check_chapter_outputs.js', ['--report']));
const REG = new Set(
  JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'course-docs-rewritten.json'), 'utf8')).rewritten.map((r) => `${r.dept}/${r.subject}`)
);

const rows = [];
const DEPTS = path.join(ROOT, 'departments');
for (const dept of fs.readdirSync(DEPTS)) {
  const dp = path.join(DEPTS, dept);
  if (!fs.statSync(dp).isDirectory()) continue;
  if (onlyDept && dept !== onlyDept) continue;
  const audited = auditDept(dept);
  for (const sub of fs.readdirSync(dp)) {
    const sp = path.join(dp, sub);
    if (!fs.statSync(sp).isDirectory()) continue;
    if (!fs.existsSync(path.join(sp, 'chapters'))) continue;
    const key = `${dept}/${sub}`;
    const a = audited.get(sub) || { chapters: 0, bad: 0 };
    const ex = exMap.get(key);
    const ou = outMap.get(key);
    const registered = REG.has(key);
    const why = [];
    if (a.bad > 0) why.push(`正文不合格 ${a.bad}/${a.chapters}`);
    if (!registered) why.push('未登记');
    if ((ex || 0) > 0) why.push(`习题 ${ex}`);
    if ((ou || 0) > 0) why.push(`产出 ${ou}`);
    let verdict = '真完成';
    if (a.bad >= Math.ceil(a.chapters / 2) && a.chapters > 0) verdict = '未写';
    else if (why.length) verdict = '半成品';
    rows.push({ key, chapters: a.chapters, docsBad: a.bad, ex, out: ou, registered, verdict, why });
  }
}

rows.sort((a, b) => (a.verdict === b.verdict ? a.key.localeCompare(b.key) : a.verdict.localeCompare(b.verdict)));

if (asJson) {
  console.log(JSON.stringify(rows, null, 2));
} else {
  const shown = showAll ? rows : rows.filter((r) => r.verdict !== '真完成');
  for (const r of shown) {
    const gate = `习题${r.ex === undefined ? '—' : r.ex} 产出${r.out === undefined ? '—' : r.out}`;
    const doc = r.docsBad ? `正文不合格${r.docsBad}/${r.chapters}` : `正文${r.chapters}章OK`;
    console.log(`${r.verdict.padEnd(4)} ${r.key.padEnd(46)} ${doc.padEnd(18)} ${gate}${r.why.length ? '  ← ' + r.why.join('，') : ''}`);
  }
  const n = (v) => rows.filter((r) => r.verdict === v).length;
  const ch = (v) => rows.filter((r) => r.verdict === v).reduce((s, r) => s + r.chapters, 0);
  console.log(`\n真完成 ${n('真完成')} 门/${ch('真完成')} 章 · 半成品 ${n('半成品')} 门/${ch('半成品')} 章 · 未写 ${n('未写')} 门/${ch('未写')} 章 · 共 ${rows.length} 门`);
}
