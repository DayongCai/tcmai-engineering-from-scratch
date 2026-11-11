#!/usr/bin/env node
/**
 * scripts/check_yaoli_chapter.js —— 单章体检（写一章就验一章，不必等 49 章齐）
 *
 *   node scripts/check_yaoli_chapter.js 01-introduction [更多 slug...]
 *
 * 与 tests/test_yaoli_chapters.js 同一套判据，只是缩小到指定章；
 * 门那边是全量硬断言，这边是写稿期的快速回执。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const SUBJ = path.join(ROOT, 'departments', '09-jichu', '12-yaoli-xue');
const DIR = path.join(SUBJ, 'chapters');
const BASE = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards', 'yaoli', '底本.json'), 'utf8'));

const read = (p) => fs.readFileSync(p, 'utf8');
const nonWs = (s) => s.replace(/\s/g, '').length;
const fold = (s) => s.replace(/\s/g, '').replace(/[，,。．；;：:、（）()「」『』""'']/g, '');

const slugs = process.argv.slice(2);
if (!slugs.length) {
  console.error('用法: node scripts/check_yaoli_chapter.js <slug> [slug...]');
  process.exit(2);
}
const list = JSON.parse(read(path.join(SUBJ, 'chapters.json'))).chapters;

let bad = 0;
for (const slug of slugs) {
  const c = list.find((x) => x.slug === slug);
  if (!c) { console.log(`✗ ${slug} 不在 chapters.json`); bad += 1; continue; }
  const dir = path.join(DIR, slug);
  const short = slug.replace(/^\d+-/, '');
  const problems = [];

  for (const f of ['docs/zh.md', 'quiz.json', 'code/main.js', 'code/main.test.js',
    `outputs/prompt-${short}.md`, `outputs/skill-${short}.md`]) {
    if (!fs.existsSync(path.join(dir, f))) problems.push(`缺 ${f}`);
  }
  if (problems.length) { console.log(`✗ ${slug}\n   ${problems.join('\n   ')}`); bad += 1; continue; }

  const doc = read(path.join(dir, 'docs/zh.md'));
  const n = nonWs(doc);
  if (n < 3000) problems.push(`正文只有 ${n} 非空白字（<3,000）`);
  if (n > 15000) problems.push(`正文 ${n} 非空白字（>15,000）`);

  const chap = BASE.chapters.find((x) => x.no === Number(c.n));
  const subs = chap.secs.flatMap((s) => s.subs.map((u) => u.no));
  const missing = subs.filter((s) => !doc.includes(s));
  if (missing.length) problems.push(`未提到小节号 ${missing.join('、')}`);

  const pool = chap.secs.flatMap((s) => s.subs.map((u) => fold(`${u.brief}\n${u.body}`)));
  let quotes = 0;
  for (const line of doc.split('\n')) {
    if (!/教材·药理学·第\d+章/.test(line)) continue;
    for (const m of line.matchAll(/「([^」]{6,})」/g)) {
      quotes += 1;
      if (!pool.some((p) => p.includes(fold(m[1])))) problems.push(`引文回查不到：${m[1].slice(0, 24)}`);
    }
  }
  if (quotes < 6) problems.push(`引文只有 ${quotes} 条（应 ≥6）`);
  if (!/教材·药理学·第\d+章·\d+\.\d+\.\d+/.test(doc)) problems.push('没有三级出处');

  const q = JSON.parse(read(path.join(dir, 'quiz.json')));
  const qs = q.questions || q;
  if (qs.length !== 6) problems.push(`quiz ${qs.length} 题（应 6）`);
  if (qs.map((x) => x.stage).join(',') !== 'pre,check,check,check,post,post') problems.push('quiz 阶段序列不对');
  qs.forEach((x, i) => {
    if (!x.question) problems.push(`quiz#${i + 1} 缺 question`);
    if ((x.options || []).length !== 4) problems.push(`quiz#${i + 1} 选项非 4`);
    if (!/教材·药理学/.test(x.cite || x.explanation || '')) problems.push(`quiz#${i + 1} 缺引证`);
  });

  const CAL = require('./lib_value_caliber');
  for (const e of CAL.verdict(doc, BASE.counts.valueLike, true)) problems.push(`数值口径：${e}`);

  try {
    const t = execFileSync('node', ['--test', 'code/main.test.js'], { cwd: dir, encoding: 'utf8' });
    if (!/# fail 0/.test(t)) problems.push('单测有失败');
  } catch (e) {
    problems.push(`单测跑不起来：${String(e.message).slice(0, 80)}`);
  }
  try {
    const run = execFileSync('node', ['code/main.js'], { cwd: dir, encoding: 'utf8' });
    const last = run.trim().split('\n').filter(Boolean).pop() || '';
    if (!/教学边界/.test(last) || !/不构成/.test(last)) problems.push(`末行不是教学边界：${last.slice(0, 40)}`);
  } catch (e) {
    problems.push('main.js 跑不起来');
  }

  if (problems.length) {
    bad += 1;
    console.log(`✗ ${slug}（${n} 字 · 引文 ${quotes}）`);
    for (const p of problems) console.log(`   - ${p}`);
  } else {
    console.log(`✅ ${slug}  ${n} 字 · 引文 ${quotes} · 12 小节齐 · quiz 6 · 单测过`);
  }
}
process.exit(bad ? 1 : 0);
