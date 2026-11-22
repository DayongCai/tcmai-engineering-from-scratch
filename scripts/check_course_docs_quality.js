#!/usr/bin/env node
/**
 * 课程正文成色门：模板残留检测 + 已补实登记对账
 *
 * 背景：55 门课的 chapters/＊/docs/zh.md 是「统计脚手架占位稿」——含
 *   `F:/textbooks/机器学习` 模板句、`这一章要回答什么`、三辨/四位面统计表。
 * 本门做两件事：
 *   1) --report：全库扫一遍，列出仍有模板残留的科目与章数（只读）
 *   2) --check ：对 data/course-docs-rewritten.json 里**登记为已补实**的科目，
 *                 断言模板残留为 0、每章汉字 ≥ 2,500、且不再出现统计脚手架句式；
 *                 未登记科目只警告不判失败（存量在补，不能一上来就红）
 *
 * 用法：
 *   node scripts/check_course_docs_quality.js --report
 *   node scripts/check_course_docs_quality.js --check
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const REG = path.join(ROOT, 'data', 'course-docs-rewritten.json');
const MIN_HZ = 2500;

const TEMPLATE = [
  /F:\/textbooks\/机器学习/,
  /这一章要回答什么/,
  /本章实测/,
  /四位面（章群结构）/,
  /三辨＝\*\*病位与解剖/,
];
const hz = (s) => (s.match(/[\u4e00-\u9fa5]/g) || []).length;

function subjectDirs() {
  const out = [];
  const DEPTS = path.join(ROOT, 'departments');
  for (const dept of fs.readdirSync(DEPTS).filter((d) => fs.statSync(path.join(DEPTS, d)).isDirectory())) {
    for (const sub of fs.readdirSync(path.join(DEPTS, dept))) {
      const cd = path.join(DEPTS, dept, sub, 'chapters');
      if (fs.existsSync(cd)) out.push({ dept, sub, cd });
    }
  }
  return out;
}

function scan(cd) {
  const chapters = [];
  for (const c of fs.readdirSync(cd).filter((d) => fs.statSync(path.join(cd, d)).isDirectory())) {
    const p = path.join(cd, c, 'docs', 'zh.md');
    if (!fs.existsSync(p)) continue;
    const t = fs.readFileSync(p, 'utf8');
    const hits = TEMPLATE.reduce((a, re) => a + (t.match(new RegExp(re.source, 'g')) || []).length, 0);
    chapters.push({ id: c, hz: hz(t), hits });
  }
  return chapters;
}

const mode = process.argv.includes('--check') ? 'check' : 'report';
const registry = fs.existsSync(REG) ? JSON.parse(fs.readFileSync(REG, 'utf8')) : { rewritten: [] };
const done = new Set((registry.rewritten || []).map((r) => `${r.dept}/${r.subject}`));

const rows = [];
for (const s of subjectDirs()) {
  const ch = scan(s.cd);
  if (!ch.length) continue;
  rows.push({
    key: `${s.dept}/${s.sub}`,
    chapters: ch.length,
    dirty: ch.filter((c) => c.hits > 0).length,
    thin: ch.filter((c) => c.hz < MIN_HZ).length,
    hz: ch.reduce((a, c) => a + c.hz, 0),
    registered: done.has(`${s.dept}/${s.sub}`),
    worst: ch.filter((c) => c.hits > 0).map((c) => c.id).slice(0, 4),
  });
}

if (mode === 'report') {
  const dirty = rows.filter((r) => r.dirty > 0);
  console.log(`科目 ${rows.length} · 含模板残留 ${dirty.length} 门 · 章节 ${dirty.reduce((a, r) => a + r.chapters, 0)}`);
  console.log(`已登记补实 ${done.size} 门`);
  for (const r of dirty.sort((a, b) => a.hz / a.chapters - b.hz / b.chapters)) {
    const flag = r.registered ? '登记但仍有残留 ✗' : '未登记';
    console.log(`  ${r.key}\t${r.chapters}章\t${Math.round(r.hz / r.chapters)}字/章\t残留 ${r.dirty} 章\t${flag}`);
  }
  const stale = [...done].filter((k) => !rows.find((r) => r.key === k));
  if (stale.length) console.log('登记里查不到目录的科目：', stale.join(', '));
  process.exit(0);
}

// --check
const fails = [];
for (const k of done) {
  const r = rows.find((x) => x.key === k);
  if (!r) { fails.push(`${k}：登记了但目录不存在`); continue; }
  if (r.dirty > 0) fails.push(`${k}：登记为已补实，但仍有 ${r.dirty}/${r.chapters} 章残留模板句（${r.worst.join(', ')}）`);
  if (r.thin > 0) fails.push(`${k}：登记为已补实，但 ${r.thin} 章不足 ${MIN_HZ} 汉字`);
}
if (fails.length) {
  console.error('✗ 课程正文成色：' + fails.length + ' 处与登记不符');
  fails.forEach((f) => console.error('  - ' + f));
  process.exit(1);
}
console.log(`✅ 已登记补实的 ${done.size} 门：模板残留 0、每章 ≥ ${MIN_HZ} 汉字`);
