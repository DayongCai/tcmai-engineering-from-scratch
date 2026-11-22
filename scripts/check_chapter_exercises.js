#!/usr/bin/env node
/**
 * scripts/check_chapter_exercises.js —— 习题与正文对齐门（只对已补实科目断言）
 *
 * 背景：2026-11-22 79 门课程正文补实后，章节正文里已经没有「三辨／四位面／单元规模」这套
 * 脚手架概念，但 quiz.json 与 code/main.js 仍按旧脚手架生成 —— 学生做题时会看到正文里
 * 根本没有的名目。本门把「习题必须与正文同源」变成可执行判据：
 *
 *   对 data/course-docs-rewritten.json 登记的每一门、每一章：
 *   [1] quiz.json 不含脚手架指纹（三辨／四位面／单元规模／本章实测／本课第 N 章）
 *   [2] 结构齐：≥5 题；stage 覆盖 pre / check / post；每题 4 个选项、correct 为合法下标
 *   [3] explain ≥ 30 汉字（不许「见 code/main.js 输出」这类空话）
 *   [4] 接地：至少 2 道 check 题的正确选项里，有一个 ≥4 字的词组真的出现在当章正文
 *   [5] code/main.js 不含脚手架指纹
 *
 * 用法：
 *   node scripts/check_chapter_exercises.js            # 只报违规（未登记科目跳过）
 *   node scripts/check_chapter_exercises.js --report   # 逐门列数
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEPTS = path.join(ROOT, 'departments');
const REPORT = process.argv.includes('--report');
const REG = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/course-docs-rewritten.json'), 'utf8'));
const REGISTERED = new Set(REG.rewritten.map((r) => `${r.dept}/${r.subject}`));

const FINGERPRINTS = [/三辨/, /四位面/, /单元规模/, /本章实测/, /本课第\s*\d+\s*章/, /见\s*code\/main\.js\s*输出/];
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const hasTpl = (s) => FINGERPRINTS.some((re) => re.test(s));

/** 正文里 4 字以上的连续汉字片段（用于判断「接地」） */
function shingles(text, n = 4) {
  const clean = String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ');
  const out = new Set();
  for (const seg of clean.split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

const problems = [];
const perSubject = [];
let checkedChapters = 0;
let skipped = 0;

for (const dept of fs.readdirSync(DEPTS).sort()) {
  const dd = path.join(DEPTS, dept);
  if (!fs.statSync(dd).isDirectory()) continue;
  for (const subj of fs.readdirSync(dd).sort()) {
    if (!REGISTERED.has(`${dept}/${subj}`)) { skipped += 1; continue; }
    const cdir = path.join(dd, subj, 'chapters');
    if (!fs.existsSync(cdir)) continue;
    let subjBad = 0;
    let subjCh = 0;
    for (const ch of fs.readdirSync(cdir).sort()) {
      const qp = path.join(cdir, ch, 'quiz.json');
      const dp = path.join(cdir, ch, 'docs', 'zh.md');
      const cp = path.join(cdir, ch, 'code', 'main.js');
      if (!fs.existsSync(qp) || !fs.existsSync(dp)) continue;
      subjCh += 1;
      checkedChapters += 1;
      const tag = `${dept}/${subj}/${ch}`;
      const qraw = fs.readFileSync(qp, 'utf8');
      const doc = fs.readFileSync(dp, 'utf8');
      let q;
      try { q = JSON.parse(qraw); } catch (e) { problems.push(`${tag}: quiz.json 非法 JSON`); subjBad += 1; continue; }

      if (hasTpl(qraw)) { problems.push(`${tag}: quiz 仍含脚手架指纹`); subjBad += 1; }
      if (fs.existsSync(cp) && hasTpl(fs.readFileSync(cp, 'utf8'))) {
        problems.push(`${tag}: code/main.js 仍含脚手架指纹`); subjBad += 1;
      }

      const qs = Array.isArray(q.questions) ? q.questions : [];
      if (qs.length < 5) problems.push(`${tag}: 只有 ${qs.length} 题（需 ≥5）`);
      const stages = new Set(qs.map((x) => x.stage));
      for (const s of ['pre', 'check', 'post']) if (!stages.has(s)) problems.push(`${tag}: 缺 ${s} 段`);

      const body = shingles(doc);
      let grounded = 0;
      for (const item of qs) {
        const opts = Array.isArray(item.options) ? item.options : [];
        if (opts.length !== 4) problems.push(`${tag}: 有题不是 4 选项`);
        if (!(Number.isInteger(item.correct) && item.correct >= 0 && item.correct < opts.length)) {
          problems.push(`${tag}: correct 下标非法`);
        }
        if (hanzi(item.explain) < 30) problems.push(`${tag}: explain 过短（${hanzi(item.explain)} 汉字）`);
        if (item.stage === 'check') {
          const right = String(opts[item.correct] || '');
          const grams = [...shingles(right)];
          if (grams.some((g) => body.has(g))) grounded += 1;
        }
      }
      if (grounded < 2) {
        problems.push(`${tag}: 只有 ${grounded} 道 check 题的正确选项能在正文里找到原词（需 ≥2）`);
        subjBad += 1;
      }
    }
    perSubject.push({ key: `${dept}/${subj}`, chapters: subjCh, bad: subjBad });
  }
}

if (REPORT) {
  console.log('\n习题对齐（已登记科目）\n');
  for (const r of perSubject) {
    const flag = r.bad ? '✗' : '✓';
    console.log(`  ${flag} ${r.key.padEnd(44)} ${String(r.chapters).padStart(3)} 章 · 违规 ${r.bad}`);
  }
}

console.log(`\n扫描已登记科目 ${perSubject.length} 门 / ${checkedChapters} 章（跳过未登记 ${skipped} 门）`);
if (problems.length) {
  console.log(`✗ ${problems.length} 处违规，例：`);
  for (const p of problems.slice(0, 12)) console.log('  - ' + p);
  if (problems.length > 12) console.log(`  …… 其余 ${problems.length - 12} 处`);
  process.exit(1);
}
console.log('✅ 习题与正文同源（无脚手架残留、题型齐、解释够长、判据可在正文找到）');
