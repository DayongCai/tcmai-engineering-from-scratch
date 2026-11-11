#!/usr/bin/env node
/**
 * scripts/check_fangji_chapter.js <slug> —— 单章自检（写章时用，全科门是 tests/test_fangji_chapters.js）
 *
 * 检查：6 文件齐 / 引文逐字回查 / 引用格式 / 本章教材字数出现 / quiz 契约 / outputs / 单测 / 教学边界
 * 用法：node scripts/check_fangji_chapter.js 01-fangfa-ducong
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const SUBJ = path.join(ROOT, 'departments', '02-zhongyao', '03-fangjixue');
const BASE = path.join(ROOT, 'standards', 'fangji', '底本.json');
const MAP = {
  1: ['2', '1'], 2: ['3'], 3: ['5'], 4: ['6', '7'], 5: ['8', '9'], 6: ['10', '12'],
  7: ['13', '14'], 8: ['15', '16'], 9: ['17', '18'], 10: ['19', '20'], 11: ['21', '22'], 12: [],
  13: ['4'], 14: ['11', '23'], 15: ['24'],
};
const fold = (s) => s.replace(/\s/g, '').replace(/[，,。．；;：:、（）()「」『』""'']/g, '');
const nonWs = (s) => s.replace(/\s/g, '').length;

const slug = process.argv[2];
if (!slug) {
  console.log('用法: node scripts/check_fangji_chapter.js <slug>');
  process.exit(1);
}

const list = JSON.parse(fs.readFileSync(path.join(SUBJ, 'chapters.json'), 'utf8')).chapters;
const ch = list.find((c) => c.slug === slug);
if (!ch) {
  console.log(`✗ chapters.json 里没有 ${slug}`);
  process.exit(1);
}

const dir = path.join(SUBJ, 'chapters', slug);
const base = JSON.parse(fs.readFileSync(BASE, 'utf8'));
const byNo = new Map(base.chapters.map((c) => [c.no, c]));
const pool = [];
for (const c of base.chapters) {
  pool.push(...(c.paras || []));
  for (const s of c.secs || []) {
    pool.push(...(s.paras || []));
    for (const u of s.subs || []) pool.push(...(u.paras || []));
  }
}
const P = pool.map((p) => fold(p.text || ''));

const errs = [];
const warns = [];

// 1. 六文件
const short = slug.replace(/^\d+-/, '');
for (const f of ['docs/zh.md', 'quiz.json', 'code/main.js', 'code/main.test.js',
  `outputs/prompt-${short}.md`, `outputs/skill-${short}.md`]) {
  if (!fs.existsSync(path.join(dir, f))) errs.push(`缺 ${f}`);
}
if (errs.length) {
  console.log('✗ ' + errs.join('；'));
  process.exit(1);
}

const doc = fs.readFileSync(path.join(dir, 'docs', 'zh.md'), 'utf8');

// 2. 引文逐字
let checked = 0;
for (const line of doc.split('\n')) {
  if (!/教材·第\d+章/.test(line)) continue;
  for (const m of line.matchAll(/「([^」]{6,})」/g)) {
    checked += 1;
    const q = fold(m[1]);
    if (!P.some((p) => p.includes(q))) errs.push(`引文找不到：${m[1].slice(0, 26)}…`);
  }
}
if (checked < 2) errs.push(`标了教材出处的引文只有 ${checked} 条（至少 2 条）`);

// 3. 引用格式
if (!/教材·第\d+章/.test(doc)) errs.push('docs 没有「教材·第N章」级引用');
if (/「?底本·/.test(doc)) errs.push('docs 出现「底本·」式引用');

// 4. 规模数字
const nos = MAP[ch.n];
if (nos.length) {
  const chars = nos.reduce((n, no) => n + byNo.get(no).counts.hanzi, 0);
  if (!doc.replace(/,/g, '').includes(String(chars))) errs.push(`docs 里没有本章教材字数 ${chars}`);
} else {
  for (const k of ['114', '836', '52']) if (!doc.includes(k)) errs.push(`计算章 docs 里没有关键数字 ${k}`);
}

// 5. quiz
try {
  const q = JSON.parse(fs.readFileSync(path.join(dir, 'quiz.json'), 'utf8'));
  const qs = q.questions || q;
  if (qs.length !== 6) errs.push(`quiz 题数 ${qs.length} ≠ 6`);
  const stages = qs.map((x) => x.stage).join(',');
  if (stages !== 'pre,check,check,check,post,post') errs.push(`quiz 阶段序列 ${stages}`);
  for (const [i, x] of qs.entries()) {
    if ((x.options || []).length !== 4) errs.push(`quiz#${i + 1} 选项数 ${(x.options || []).length}`);
    if (!Number.isInteger(x.correct) || x.correct < 0 || x.correct > 3) errs.push(`quiz#${i + 1} correct 非法`);
    if ((x.explanation || '').length < 10) errs.push(`quiz#${i + 1} explanation 太短`);
  }
} catch (e) {
  errs.push('quiz.json 解析失败：' + e.message);
}

// 6. outputs
const skill = fs.readFileSync(path.join(dir, `outputs/skill-${short}.md`), 'utf8');
if (!skill.startsWith('---')) errs.push('skill 缺 frontmatter');
if (!skill.includes(`name: ${short}`)) errs.push(`skill 的 name 不等于 ${short}`);
if (nonWs(fs.readFileSync(path.join(dir, `outputs/prompt-${short}.md`), 'utf8')) < 300) errs.push('prompt 太短（<300 非空白）');

// 7. 正文篇幅
const body = nonWs(doc);
if (body < 2000) warns.push(`docs 非空白 ${body}，偏薄（建议 ≥2000）`);

// 8. 单测 + 教学边界
try {
  const out = execFileSync('node', ['--test', 'code/main.test.js'], { cwd: dir, encoding: 'utf8' });
  if (!/# fail 0/.test(out)) errs.push('章内单测有失败');
  const run = execFileSync('node', ['code/main.js'], { cwd: dir, encoding: 'utf8' });
  const last = run.trim().split('\n').filter(Boolean).pop();
  if (!/教学边界/.test(last) || !/不构成/.test(last)) errs.push(`最后一行不是教学边界声明：${last}`);
} catch (e) {
  errs.push('单测/运行失败：' + String(e.message).slice(0, 120));
}

console.log(`── ${slug} ──`);
console.log(`  docs 非空白 ${body} · 教材引文 ${checked} 条 · 教材章 ${nos.join('+') || '（计算章）'}`);
if (warns.length) console.log('  ⚠ ' + warns.join('；'));
if (errs.length) {
  console.log('  ✗ ' + errs.join('\n  ✗ '));
  process.exit(1);
}
console.log('  ✓ 通过');
