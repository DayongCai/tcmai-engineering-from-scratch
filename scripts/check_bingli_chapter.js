#!/usr/bin/env node
/**
 * scripts/check_bingli_chapter.js <slug> —— 病理学单章自检（写章时用）
 *
 * 与生理学同形，但数值口径是**分支判断**（本书底本 valueLike = 0，走 A 支）：
 *   A 支（教材 0 数值）：docs 正文出现「数字＋计量单位」即红，除非该值落在带
 *     「教材·第N章·N.M.K」的引文行里（那种行必须是逐字引文，由引文门先验）。
 *   B 支（教材带数值，本层预留）：数值**只允许**出现在带 locator 的引文行；
 *     其余位置裸写、把教材观察值改写成「正常值/参考区间」、换算或四舍五入，都判红。
 * 为什么写成两支而不是一句「不许写数字」：口径要能跟着教材变。同一套课程模板
 * 要能接住「教材零数值」和「教材带数值」两类母本，规则必须在门里自动换档，
 * 不然换一本教材就得重写门，等于门槛随人走。
 *
 * 用法：node scripts/check_bingli_chapter.js 05-yanzheng
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const SUBJ = path.join(ROOT, 'departments', '09-jichu', '10-bingli-xue');
const BASE = path.join(ROOT, 'standards', 'bingli', '底本.json');

const fold = (s) => s.replace(/\s/g, '').replace(/[，,。．；;：:、（）()「」『』""'']/g, '');
const nonWs = (s) => s.replace(/\s/g, '').length;
const VALUE_RE = /\d+(?:\.\d+)?\s*(?:mmHg|kPa|℃|°C|‰|%|mmol|mOsm|mol|mV|Hz|次\/分|个\/L|g\/L|mg\/ml|mg|ml|mL|kg|cm|mm|μm|um|ms|min|小时|秒钟|升|毫升|倍|周|天|年)/g;
const BOUNDARY_RE = /教材不给值|不写数值|不给正常值|数值不在本书|本书不含数值|不提供数值|不给单位|逐字引/;
const LOCATOR = /教材·第\d+章/;

const slug = process.argv[2];
if (!slug) {
  console.log('用法: node scripts/check_bingli_chapter.js <slug>');
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
for (const c of base.chapters) for (const s of c.secs) for (const u of s.subs) {
  pool.push(u.brief || '', u.body || '');
}
const P = pool.map(fold);

const errs = [];
const warns = [];
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

// 1. 引文逐字
let checked = 0;
for (const line of doc.split('\n')) {
  if (!LOCATOR.test(line)) continue;
  for (const m of line.matchAll(/「([^」]{6,})」/g)) {
    checked += 1;
    if (!P.some((p) => p.includes(fold(m[1])))) errs.push(`引文找不到：${m[1].slice(0, 26)}…`);
  }
}
if (checked < 2) errs.push(`标了教材出处的引文只有 ${checked} 条（至少 2 条）`);

// 2. 引用格式
if (!LOCATOR.test(doc)) errs.push('docs 没有「教材·第N章」级引用');
if (/「?底本·/.test(doc)) errs.push('docs 出现「底本·」式引用');

// 3. 本章教材字数
const chars = byNo.get(String(ch.n)).counts.hanzi;
if (!doc.replace(/,/g, '').includes(String(chars))) errs.push(`docs 里没有本章教材字数 ${chars}`);

// 4. 契约段落
for (const k of ['MOTTO', 'PROBLEM', '环境逼迫', '知识积累']) {
  if (!doc.includes(k)) errs.push(`docs 缺 ${k}`);
}
if (!/丢掉了什么|丢失|边界声明|不构成/.test(doc)) errs.push('docs 未声明翻译代价或临床边界');

// 5. 数值口径（分支判断，判定逻辑在 scripts/lib_value_caliber.js）
const CAL = require('./lib_value_caliber');
const branch = CAL.branchOf(base.counts && base.counts.valueLike || 0);
const cal = CAL.classify(doc, base.counts && base.counts.valueLike || 0);
const values = cal.values;
const hasBoundary = BOUNDARY_RE.test(doc);
for (const e of CAL.verdict(doc, base.counts && base.counts.valueLike || 0, hasBoundary)) errs.push(e);

// 6. quiz
try {
  const q = JSON.parse(fs.readFileSync(path.join(dir, 'quiz.json'), 'utf8'));
  const qs = q.questions || q;
  if (qs.length !== 6) errs.push(`quiz 题数 ${qs.length} ≠ 6`);
  const st = qs.map((x) => x.stage).join(',');
  if (st !== 'pre,check,check,check,post,post') errs.push(`quiz 阶段序列 ${st}`);
  for (const [i, x] of qs.entries()) {
    if (!x.question || String(x.question).length < 6) errs.push(`quiz#${i + 1} 题干键必须是 question 且不空`);
    if ((x.options || []).length !== 4) errs.push(`quiz#${i + 1} 选项数 ${(x.options || []).length}`);
    if (!Number.isInteger(x.correct) || x.correct < 0 || x.correct > 3) errs.push(`quiz#${i + 1} correct 非法`);
    if ((x.explanation || '').length < 10) errs.push(`quiz#${i + 1} explanation 太短`);
  }
} catch (e) {
  errs.push('quiz.json 解析失败：' + e.message);
}

// 6b. quiz 语义一致性（解析点名单元须与正确项同主题；选项不许抄重）
try {
  const Q = require('./lib_quiz_semantics');
  const U = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards', 'bingli', 'units.json'), 'utf8'));
  const units = U.units.filter((u) => u.chapter === String(ch.n)).map((u) => ({ sub: u.sub, title: u.title, rawBody: u.rawBody }));
  const qs = (JSON.parse(fs.readFileSync(path.join(dir, 'quiz.json'), 'utf8')).questions) || [];
  const r = Q.auditQuiz(qs, units);
  for (const e of r.errors) errs.push(e);
  for (const w of r.warns) warns.push(w);
} catch (e) {
  errs.push('quiz 语义检查失败：' + String(e.message).slice(0, 100));
}

// 7. outputs
const skill = fs.readFileSync(path.join(dir, `outputs/skill-${short}.md`), 'utf8');
if (!skill.startsWith('---')) errs.push('skill 缺 frontmatter');
const fm = skill.split('---')[1] || '';
for (const k of ['name', 'description', 'version']) if (!fm.includes(`${k}:`)) errs.push(`skill frontmatter 缺 ${k}`);
if (!fm.includes(`name: ${short}`)) errs.push(`skill 的 name 不等于 ${short}`);
if (nonWs(fs.readFileSync(path.join(dir, `outputs/prompt-${short}.md`), 'utf8')) < 300) errs.push('prompt 太短（<300 非空白）');

// 8. 篇幅
const body = nonWs(doc);
if (body < 2000) warns.push(`docs 非空白 ${body}，偏薄（建议 ≥2000）`);

// 9. 单测 + 教学边界
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
console.log(`  docs 非空白 ${body} · 教材引文 ${checked} 条 · 教材第${ch.n}章 ${chars} 字 · 数值口径 ${branch} 支 · 数值 ${values} 处`);
if (warns.length) console.log('  ⚠ ' + warns.join('；'));
if (errs.length) {
  console.log('  ✗ ' + errs.join('\n  ✗ '));
  process.exit(1);
}
console.log('  ✓ 通过');
