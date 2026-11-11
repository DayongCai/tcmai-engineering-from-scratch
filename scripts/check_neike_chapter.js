#!/usr/bin/env node
/**
 * scripts/check_neike_chapter.js —— 中医内科学单章体检（写一章验一章）
 *
 *   node scripts/check_neike_chapter.js 04-feixi-bingzheng [更多 slug...]
 *
 * 与 tests/test_neike_chapters.js 同一套判据，只是缩小到指定章。
 *
 * 两条与药理学不同的地方（都来自底本形状）：
 *   · 本章小节最多 55 个 —— 正文必须逐个提到小节号（用「逐条落位」表），不许只写病名；
 *   · 第 13/14 章是综合章，底本无对应章，改为「≥5 个不同章号的引文」。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const SUB = path.join(ROOT, 'departments/01-zhongyi/10-zhongyi-neike-xue');
const DIR = path.join(SUB, 'chapters');
const BASE = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/neike/底本.json'), 'utf8'));
const LIST = JSON.parse(fs.readFileSync(path.join(SUB, 'chapters.json'), 'utf8')).chapters;

const read = (p) => fs.readFileSync(p, 'utf8');
const nonWs = (s) => s.replace(/\s/g, '').length;
const fold = (s) => s.replace(/\s/g, '').replace(/[，,。．；;：:、（）()「」『』""'']/g, '');
const LOC = /教材·中医内科学·第(\d+)章·(\d+)\.(\d+)\.(\d+)/;
const MIN_W = 8000;
const MAX_W = 20000;

const slugs = process.argv.slice(2);
if (!slugs.length) {
  console.error('用法: node scripts/check_neike_chapter.js <slug> [slug...]');
  process.exit(2);
}

let bad = 0;
for (const slug of slugs) {
  const c = LIST.find((x) => x.slug === slug);
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
  if (n < MIN_W) problems.push(`正文只有 ${n} 非空白字（<${MIN_W}）`);
  if (n > MAX_W) problems.push(`正文 ${n} 非空白字（>${MAX_W}）`);

  const synthesis = !c.source || c.source.synthesis;
  const chap = synthesis ? null : BASE.chapters.find((x) => x.no === Number(c.n));

  if (chap) {
    const subs = chap.secs.flatMap((s) => s.subs.map((u) => u.no));
    const missing = subs.filter((s) => !doc.includes(s));
    if (missing.length) problems.push(`未提到小节号 ${missing.slice(0, 8).join('、')}（共缺 ${missing.length}）`);
    const secs = chap.secs.map((s) => s.no);
    const missSec = secs.filter((s) => !doc.includes(s));
    if (missSec.length) problems.push(`未提到节号 ${missSec.join('、')}`);
  }

  // 引文：逐字回查 + locator 真 + 综合章要求跨 ≥5 章
  const quotes = [];
  for (const line of doc.split('\n')) {
    const m = line.match(LOC);
    if (!m) continue;
    for (const q of line.matchAll(/「([^」]{6,})」/g)) quotes.push({ line, text: q[1], ch: Number(m[1]) });
  }
  if (quotes.length < 10) problems.push(`带三级出处的引文只有 ${quotes.length} 条（应 ≥10）`);
  const pool = new Map();
  for (const ch of BASE.chapters) {
    const arr = [];
    for (const s of ch.secs) for (const u of s.subs) for (const it of u.items) arr.push(fold(`${it.title}\n${it.body}`));
    pool.set(ch.no, arr);
  }
  for (const q of quotes) {
    const arr = pool.get(q.ch);
    if (!arr) { problems.push(`引文指向不存在的第 ${q.ch} 章`); continue; }
    if (!arr.some((p) => p.includes(fold(q.text)))) problems.push(`引文回查不到（第${q.ch}章）：${q.text.slice(0, 24)}`);
  }
  if (synthesis) {
    const chs = new Set(quotes.map((q) => q.ch));
    if (chs.size < 5) problems.push(`综合章引文只涉及 ${chs.size} 个章（应 ≥5）`);
  } else {
    const wrong = quotes.filter((q) => q.ch !== Number(c.n));
    if (wrong.length) problems.push(`${wrong.length} 条引文引到了别章（本章应引第 ${c.n} 章）`);
  }

  // 数值口径：底本带量值 → B 支
  const CAL = require('./lib_value_caliber');
  for (const e of CAL.verdict(doc, BASE.counts.valueLike, true)) problems.push(`数值口径：${e}`);

  const q = JSON.parse(read(path.join(dir, 'quiz.json')));
  const qs = q.questions || q;
  if (qs.length !== 6) problems.push(`quiz ${qs.length} 题（应 6）`);
  if (qs.map((x) => x.stage).join(',') !== 'pre,check,check,check,post,post') problems.push('quiz 阶段序列不对');
  qs.forEach((x, i) => {
    if (!x.question) problems.push(`quiz#${i + 1} 缺 question`);
    if ((x.options || []).length !== 4) problems.push(`quiz#${i + 1} 选项非 4`);
    if (!/教材·中医内科学/.test(x.cite || x.explanation || '')) problems.push(`quiz#${i + 1} 缺引证`);
  });

  try {
    const t = execFileSync('node', ['--test', 'code/main.test.js'], { cwd: dir, encoding: 'utf8', env: { ...process.env, NODE_TEST_CONTEXT: undefined } });
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
    console.log(`✗ ${slug}（${n} 字 · 引文 ${quotes.length}）`);
    for (const p of problems) console.log(`   - ${p}`);
  } else {
    console.log(`✅ ${slug}  ${n} 字 · 引文 ${quotes.length} · ${synthesis ? '跨章引文' : '小节齐'} · quiz 6 · 单测过`);
  }
}
process.exit(bad ? 1 : 0);
