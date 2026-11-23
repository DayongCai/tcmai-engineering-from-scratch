#!/usr/bin/env node
/**
 * tests/test_binglishengli_chapters.js —— 病理生理学 53 章契约（讲义为第一文本）
 *
 * 2026-10-30 章目切换：课程原为传统 14 章（旧稿已归档 standards/binglishengli/legacy-14-chapters/），
 * 现改为讲义 15 单元 53 章。章目由 scripts/plan_binglishengli_53.py 从
 * standards/binglishengli/supplements/jiangyi.json 生成，所以本测试先从讲义对账，
 * 再逐章核 6 文件契约。
 *
 * 为什么引文只认讲义：讲义是本仓原创的教学正文，一章一节都有实体；代用底本
 * 《疾病学基础》是病理学与病理生理学的合并本，缺生殖、神经、精神心理、骨骼肌肉、
 * 皮肤五大块，53 章里近半数在它那儿没有对应文字。若允许两套引文混用，读者会
 * 分不清哪句话有正文支撑、哪句是转述。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const SUB = path.join(ROOT, 'departments/09-jichu/11-bingli-shengli-xue');
const IDX = path.join(ROOT, 'standards/binglishengli/supplements/jiangyi.json');

const idx = JSON.parse(fs.readFileSync(IDX, 'utf8'));
const chaptersJson = JSON.parse(fs.readFileSync(path.join(SUB, 'chapters.json'), 'utf8'));

// 讲义：章号 → {title, secs:{ "N.M": text }}
const BOOK = new Map();
for (const u of idx.units) {
  for (const c of u.chapters) {
    const secs = new Map();
    for (const s of c.secs) secs.set(s.no, (s.paras || []).join('\n'));
    BOOK.set(Number(c.no), { title: c.title, secs, unit: u.unit });
  }
}

let pass = 0;
let fail = 0;
const reds = [];
function ok(name) { pass++; console.log('  ✅ ' + name); }
function no(name, why) { fail++; reds.push(name + ' — ' + why); console.log('  ❌ ' + name + ' — ' + why); }

const isCite = (line) => /补充·hermes-病理生理学讲义·第\s*(\d+)\s*章·(\d+\.\d+)/.test(line);
const CITE_RE = /补充·hermes-病理生理学讲义·第\s*(\d+)\s*章·(\d+\.\d+)/g;
const isQuoteLine = (line) => /^\s*>/.test(line);

const want = chaptersJson.chapters;

// ── 1. 章目与讲义对齐 ────────────────────────────────────────────────
{
  const nos = want.map((c) => c.n);
  const seq = nos.join(',');
  const expect = Array.from({ length: BOOK.size }, (_, i) => i + 1).join(',');
  if (seq !== expect) {
    no('章目：53 章连续', `chapters.json 是 ${nos.length} 章（${seq.slice(0, 40)}…），讲义是 ${BOOK.size} 章`);
  } else {
    const bad = want.filter((c) => !BOOK.has(c.n));
    // 章题口径（2026-11-22 起）：docs/zh.md 首行改成「观点式标题」（讲义题 + 「：一句论断」），
    // chapters.json 已由 scripts/sync_chapter_titles.js 全量对齐 docs（实测 2169 章 0 漂移）。
    // 所以这里不再要求「与讲义逐字相同」，而要求「**不得脱离讲义另起一题**」：
    //   讲义题（去掉末尾的（English）括注）必须与章题相等，或是章题的前缀（后接「：」）。
    // 这样既容纳观点式扩写，又挡住"复制别的章题/自己编一个章名"。
    const core = (t) => String(t || '').replace(/\s*[（(][^）)]*[）)]\s*$/, '').trim();
    // 除「无空格全等」外，允许两种合法的观点式改写：
    //   ① 讲义题原样 + 「：一句论断」（49 章属这类）
    //   ② 只保留讲义题的**主词或限定词**（如「休克」→「休克是灌注问题…」；
    //      「骨骼肌肉功能异常：风湿性疾病」→「风湿性疾病：两种范式…」）
    // 仍会拦住「另起一题」——章题里必须出现讲义题的主词或限定词。
    const norm = (s) => String(s || '').replace(/\s+/g, '').replace(/[（(][^）)]*[）)]$/, '');
    const parts = (t) => norm(core(t)).split(/[：:]/).filter((x) => x.length >= 2);
    const titles = want.filter((c) => {
      const j = core(BOOK.get(c.n).title);
      const d = String(c.title || '').trim();
      if (d === j || norm(d) === norm(j)) return false;
      const dn = norm(d);
      if (dn.startsWith(norm(j))) return false;           // 讲义题 + 冒号观点
      const segs = parts(j);
      return !segs.some((s) => s.length >= 2 && dn.includes(s));  // 主词/限定词必须在
    });
    const slugs = new Set(want.map((c) => c.slug));
    if (bad.length) no('章目：章号在讲义里存在', `${bad.length} 章找不到`);
    else if (titles.length) no('章目：标题以讲义题为基（可加「：观点」）', `${titles.length} 章脱离讲义题，如 ${titles[0].n}「${titles[0].title}」`);
    else if (slugs.size !== want.length) no('章目：slug 唯一', `${want.length} 章只有 ${slugs.size} 个 slug`);
    else ok(`章目：${want.length} 章连续 · 标题以讲义题为基 · slug 唯一`);
  }
}

// ── 2. 6 文件契约 + 逐章检查 ─────────────────────────────────────────
const FILES = (slug) => [
  'docs/zh.md',
  'quiz.json',
  'code/main.js',
  'code/main.test.js',
  `outputs/prompt-${slug}.md`,
  `outputs/skill-${slug}.md`,
];
const END_GROUPS = [/代价与边界/, /边界/, /免责/]; // 各章末节标题不统一
const BARE = /[0-9]+(\.[0-9]+)?\s*(mmHg|kPa|℃|mmol|μmol|mg|μg|ng|g\/L|mol|%|次\/分|mL|ml|L\/min|kg|cm|mm|U\/L|IU)/;

const miss = [];
const probs = [];
let docsChars = 0;
let citesTotal = 0;
const quizStats = { cited: 0, total: 0 };

for (const c of want) {
  const dir = path.join(SUB, 'chapters', c.slug);
  const absent = FILES(c.slug).filter((f) => !fs.existsSync(path.join(dir, f)));
  if (absent.length) { miss.push(`${c.slug}: 缺 ${absent.join(', ')}`); continue; }

  const doc = fs.readFileSync(path.join(dir, 'docs/zh.md'), 'utf8');
  const lines = doc.split(/\r?\n/);
  const issue = [];

  // 必备段
  for (const key of ['MOTTO', 'PROBLEM', '双根因定位']) {
    if (!doc.includes(key)) issue.push(`缺 ${key}`);
  }
  if (!END_GROUPS.some((re) => lines.some((l) => /^##\s/.test(l) && re.test(l)))) {
    issue.push('缺末节（代价与边界/边界/免责）');
  }
  if (!/运行与验证/.test(doc)) issue.push('缺「运行与验证」');

  // 规模：下限 3,000（低于此写不清一条机制链）；上限 14,000（高于此多半是复述讲义而非加工）
  const chars = doc.replace(/\s/g, '').length;
  docsChars += chars;
  if (chars < 3000) issue.push(`正文 ${chars} 非空白字 < 3000`);
  if (chars > 14000) issue.push(`正文 ${chars} 非空白字 > 14000（复述讲义？）`);

  // 讲义引文：≥3 条，节号必须属本章
  const book = BOOK.get(c.n);
  const cites = [...doc.matchAll(CITE_RE)].map((m) => ({ ch: Number(m[1]), sec: m[2] }));
  citesTotal += cites.length;
  const wrongCh = cites.filter((x) => x.ch !== c.n);
  if (cites.length < 3) issue.push(`讲义引文 ${cites.length} 条 < 3`);
  if (wrongCh.length) issue.push(`${wrongCh.length} 条引文引到了第 ${wrongCh[0].ch} 章（本章是第 ${c.n} 章）`);
  const noSec = cites.filter((x) => x.ch === c.n && !book.secs.has(x.sec));
  if (noSec.length) issue.push(`引文节号不存在：${noSec[0].sec}`);

  // 讲义不能写成教材
  if (/教材·[^\n]*讲义/.test(doc)) issue.push('把讲义标成了「教材」');

  // 引语逐字：非引用行里「」内 ≥6 字的句子，必须能在被引节的正文里找到
  const flat = [...book.secs.values()].join('\n');
  const quotes = [];
  for (const l of lines) {
    if (isCite(l) || isQuoteLine(l)) continue;
    for (const m of l.matchAll(/「([^「」]{6,})」/g)) quotes.push(m[1]);
  }
  const lost = quotes.filter((q) => !flat.includes(q));
  if (lost.length) issue.push(`${lost.length}/${quotes.length} 条引语在讲义里找不到，如「${lost[0].slice(0, 18)}…」`);

  // 正文零裸值（引用行豁免：那是在引讲义原话）
  const bare = lines.filter((l) => !isCite(l) && !isQuoteLine(l) && BARE.test(l));
  if (bare.length) issue.push(`${bare.length} 行正文带数值/单位`);

  // 讲义节覆盖：该章每一节都应在 docs 里出现节号
  const uncovered = [...book.secs.keys()].filter((s) => !doc.includes(s));
  if (uncovered.length) issue.push(`讲义 ${uncovered.length}/${book.secs.size} 节未在 docs 出现（如 ${uncovered[0]}）`);

  // quiz 契约
  const quiz = JSON.parse(fs.readFileSync(path.join(dir, 'quiz.json'), 'utf8'));
  const qs = quiz.questions || [];
  quizStats.total += qs.length;
  const cited = qs.filter((q) => /(依据|口径见|前提|算见)/.test(q.explanation || ''));
  quizStats.cited += cited.length;
  if (qs.length !== 6) issue.push(`quiz ${qs.length} 题 ≠ 6`);
  const stages = qs.map((q) => q.stage).join(' ');
  if (!/pre/.test(stages) || !/post/.test(stages)) issue.push('quiz 缺 pre/post');
  if (qs.some((q) => !q.question)) issue.push('quiz 有用 question 以外键名作题干');
  if (cited.length < qs.length) issue.push(`quiz ${qs.length - cited.length} 题无引证`);

  // code 末行教学边界 + 单测
  const main = fs.readFileSync(path.join(dir, 'code/main.js'), 'utf8').trimEnd();
  if (!/教学边界/.test(main.split(/\r?\n/).slice(-3).join('\n'))) issue.push('main.js 末行未打印教学边界');

  if (issue.length) probs.push(`${c.slug}: ${issue.join('；')}`);
}

if (!miss.length && !probs.length) {
  const sizes = want.map((c) => {
    const dp = path.join(SUB, 'chapters', c.slug, 'docs/zh.md');
    return fs.existsSync(dp) ? fs.readFileSync(dp, 'utf8').replace(/\s/g, '').length : 0;
  });
  ok(`逐章契约：${want.length} 章 × 6 文件 · 正文合计 ${docsChars.toLocaleString('en-US')} 非空白字`
    + `（最短 ${Math.min(...sizes).toLocaleString('en-US')} / 最长 ${Math.max(...sizes).toLocaleString('en-US')}）`);
} else {
  if (miss.length) no('6 文件齐', `${miss.length} 章缺文件，如 ${miss[0]}`);
  if (probs.length) {
    no('逐章契约', `${probs.length} 章有问题`);
    for (const p of probs.slice(0, 8)) console.log('     · ' + p);
  }
  if (!miss.length && !probs.length) ok('逐章契约');
}

// ── 3. quiz 引证覆盖率 ───────────────────────────────────────────────
if (quizStats.total && quizStats.cited === quizStats.total) {
  ok(`quiz 引证：${quizStats.cited}/${quizStats.total} 题带引证`);
} else {
  no('quiz 引证', `${quizStats.cited}/${quizStats.total}`);
}

console.log(`\n# pass ${pass}\n# fail ${fail}`);
if (reds.length) for (const r of reds) console.log('  RED ' + r);
process.exit(fail ? 1 : 0);
