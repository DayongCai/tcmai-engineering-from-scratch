#!/usr/bin/env node
/**
 * tests/test_binglishengli_textbook.js —— 教材层（源正文层 + 改写层）的门
 *
 * 为什么需要：教材目录最容易出的两种假交付是——
 *   ① 源正文照抄一遍就宣称「按契约写完」；
 *   ② 改写层写了几段话，但「出处」是编的（写个书名页码，谁也核不了）。
 *
 * 这道门守四件事：
 *   1. 53 篇齐、文件名合契约、每篇溯源头带可复算的 sha256（讲义改了没重渲染即红）；
 *   2. 改写层只认 `<!-- REWRITE:BEGIN/END -->` 之间的块，且块内 N.1–N.5 与
 *      「本章要回答的问题」「思考题」「延伸阅读」齐；
 *   3. 改写层里引到的讲义节号**必须真实存在**（对着 jiangyi.json 核，不认手写）；
 *   4. 不许出现「课本第 N 页」这类本仓无法核对的出处。
 *
 * 改写层目前是 5 章样板（第 1、2、19、20、48 章）。其余章节只有源正文——
 * 门里明说这件事，不把「源正文齐」当作「教材写完」。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'textbooks/09-jichu/11-bingli-shengli-xue');
const IDX = path.join(ROOT, 'standards/binglishengli/supplements/jiangyi.json');

const idx = JSON.parse(fs.readFileSync(IDX, 'utf8'));
const book = new Map();
const unitFile = new Map();
for (const u of idx.units) {
  for (const c of u.chapters) {
    const secs = new Set(c.secs.map((s) => s.no));
    book.set(Number(c.no), { title: c.title, secs, unit: u.unit, file: u.file });
    unitFile.set(u.unit, u.file);
  }
}

let pass = 0;
let fail = 0;
const reds = [];
const ok = (n) => { pass++; console.log('  ✅ ' + n); };
const no = (n, why) => { fail++; reds.push(n + ' — ' + why); console.log('  ❌ ' + n + ' — ' + why); };

// 只禁「本仓无法核对」的出处写法：页码、原书第 N 章、待补引。
// 不禁「教材原文」这个词——本章用它来声明「讲义不是教材原文」，那是否定用法，不是假引。
const BANNED = [/第\s*\d+\s*页/, /原书第/, /\[citation needed\]/i];
const REWRITE = /<!-- REWRITE:BEGIN -->([\s\S]*?)<!-- REWRITE:END -->/;

// ── 1. 篇数与命名 ────────────────────────────────────────────────────
const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.md')).sort();
const front = files.filter((f) => f === '00-前言.md');
const chapters = files.filter((f) => /^\d+-第\d+章.*\.md$/.test(f) && !/^00-/.test(f));
{
  const nums = chapters.map((f) => Number(f.match(/^(\d+)-第(\d+)章/)[2]));
  const expect = Array.from({ length: book.size }, (_, i) => i + 1);
  if (front.length !== 1) no('前言', `00-前言.md 有 ${front.length} 篇`);
  else if (nums.join(',') !== expect.join(',')) no('53 篇齐', `${nums.length} 篇 / 章号 ${nums.slice(0, 5)}…`);
  else ok(`篇目：1 篇前言 + ${nums.length} 章 · 章号连续`);
}

// ── 2. 溯源头：sha256 可复算 ─────────────────────────────────────────
const crypto = require('node:crypto');
const shaOf = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const metaBad = [];
for (const f of chapters) {
  const no = Number(f.match(/^(\d+)-第(\d+)章/)[2]);
  const t = fs.readFileSync(path.join(DIR, f), 'utf8');
  const head = t.split('\n').slice(0, 8).join('\n');
  for (const k of ['**源**', '**抽取**', '**层次**', '**规模**', '**免责**']) {
    if (!head.includes(k)) metaBad.push(`${f} 缺 ${k}`);
  }
  const sha = (head.match(/sha256 `([0-9a-f]{8,})/) || [])[1];
  const act = shaOf(path.join(ROOT, unitFile.get(book.get(no).unit)));
  if (!sha || !act.startsWith(sha)) metaBad.push(`${f} sha256 不符（写 ${sha}，实 ${act.slice(0, 12)}）`);
  const title = book.get(no).title.replace(/\s*[（(][^）)]*[）)]\s*$/, '');
  if (!t.startsWith('# 第 ' + no + ' 章 · ')) metaBad.push(`${f} H1 不是「# 第 ${no} 章 · …」`);
  if (title && !t.split('\n')[0].includes(title)) metaBad.push(`${f} H1 题名与讲义不一致`);
}
if (metaBad.length) no('溯源头可对账', `${metaBad.length} 处，如 ${metaBad[0]}`);
else ok(`溯源头：${chapters.length} 篇都有源/抽取/层次/规模/免责，sha256 与讲义一致`);

// ── 3. 改写层：块结构 + 必备节 ───────────────────────────────────────
const NEED = ['## 本章要回答的问题', '## N.1 概念与出处', '## N.2 为什么可以这样翻译',
  '## N.3 这个翻译丢掉了什么', '## N.4 与相邻学科的接口', '## N.5 争议与本项目立场',
  '## 思考题', '## 延伸阅读'];
const rwChapters = [];
const rwBad = [];
for (const f of chapters) {
  const no = Number(f.match(/^(\d+)-第(\d+)章/)[2]);
  const t = fs.readFileSync(path.join(DIR, f), 'utf8');
  const m = t.match(REWRITE);
  if (!m) continue;
  rwChapters.push(no);
  const body = m[1];
  for (const n of NEED) if (!body.includes(n)) rwBad.push(`第 ${no} 章 缺「${n}」`);
  // 免责句位置固定：N.5 之后、思考题之前。
  // 这条是 2026-10-31 定下来的——此前 51 章放这个位置、2 章放到文末，
  // 两种都「块内含免责句」，但读者看到的位置不同。定成一条，门就核得住。
  const i5 = body.indexOf('## N.5'), iq = body.indexOf('## 思考题'), idis = body.indexOf('不构成诊断');
  if (idis < 0) rwBad.push(`第 ${no} 章 改写层缺免责句`);
  else if (!(i5 >= 0 && iq > i5 && idis > i5 && idis < iq)) {
    rwBad.push(`第 ${no} 章 免责句不在「N.5 之后、思考题之前」`);
  }
  const hanzi = (body.match(/[\u4e00-\u9fff]/g) || []).length;
  // 下限取自样板实测：五章 1,840–2,195 汉字，门设在最薄那章之下。
  // 后续 48 章要按这个粒度写，低于它就不是「同等改写」。
  if (hanzi < 1800) rwBad.push(`第 ${no} 章 改写层 ${hanzi} 汉字 < 1800（样板最薄 1,840）`);
  // 块必须在文末（脚本重渲染后仍应保持：块是最后一节）
  if (t.trimEnd().replace(REWRITE, '').trimEnd().length > 0 && !t.trimEnd().endsWith('<!-- REWRITE:END -->')) {
    rwBad.push(`第 ${no} 章 改写层不在文末`);
  }
}
{
  // 2026-10-30 扩到全册：53 章都要有改写层。样板五章（1/2/19/20/48）是写法基准，
  // 判定不靠「有没有那五章」，而靠「每一章都过同一套结构/篇幅/出处检查」。
  rwChapters.sort((a, b) => a - b);
  const missing = Array.from({ length: book.size }, (_, i) => i + 1).filter((n) => !rwChapters.includes(n));
  if (missing.length) {
    no('改写层覆盖面', `${book.size - missing.length}/${book.size} 章有改写层，缺第 ${missing.slice(0, 8).join('、')} 章`);
  } else if (rwBad.length) {
    no('改写层结构', `${rwBad.length} 处，如 ${rwBad[0]}`);
  } else {
    ok(`改写层：${rwChapters.length}/${book.size} 章 · 八节齐 · 各 ≥1,800 汉字 · 含免责`);
  }
}

// ── 4. 出处可核：讲义节号必须真实存在，且不许写页码 ─────────────────
const citeBad = [];
for (const f of chapters) {
  const no = Number(f.match(/^(\d+)-第(\d+)章/)[2]);
  const t = fs.readFileSync(path.join(DIR, f), 'utf8');
  const m = t.match(REWRITE);
  if (!m) continue;
  const body = m[1];
  for (const b of BANNED) {
    if (b.test(body)) citeBad.push(`第 ${no} 章 出现不可核出处 ${b}`);
  }
  // 「第N章·M.K」形式的讲义节号（N.1 表里那种简写，章号省略时取本章）
  for (const mm of body.matchAll(/第(\d+)章·(\d+\.\d+)/g)) {
    const ch = Number(mm[1]);
    const sec = mm[2];
    const c = book.get(ch);
    if (!c) citeBad.push(`第 ${no} 章 引到不存在的第 ${ch} 章`);
    else if (!c.secs.has(sec)) citeBad.push(`第 ${no} 章 引到不存在的节 第${ch}章·${sec}`);
  }
  for (const mm of body.matchAll(/`?(\d+)\.(\d+)`?\s*[、，,]/g)) {
    const sec = `${mm[1]}.${mm[2]}`;
    if (Number(mm[1]) === no && !book.get(no).secs.has(sec)) citeBad.push(`第 ${no} 章 引到不存在的节 ${sec}`);
  }
}
if (citeBad.length) no('出处可核', `${citeBad.length} 处，如 ${citeBad[0]}`);
else ok('出处：改写层引到的讲义节号都存在 · 无页码类不可核出处');

// ── 5. 前言必须诚实报进度 ──────────────────────────────────────────
{
  const fm = fs.readFileSync(path.join(DIR, '00-前言.md'), 'utf8');
  const miss = [];
  for (const k of ['源正文层', '改写层', 'N.3 这个翻译丢掉了什么', '只证明「有字」']) {
    if (!fm.includes(k)) miss.push(k);
  }
  if (miss.length) no('前言诚实度', `缺 ${miss.join('、')}`);
  else if (!/改写层：\d+ 章已写/.test(fm)) no('前言诚实度', '没写明改写层已写多少章');
  else if (!/首批五章（第 1、2、19、20、48 章）/.test(fm)) no('前言诚实度', '没写明写法基准是哪五章');
  else ok('前言：层次、契约对照表、样板章清单与「字数只证明有字」都在');
}

// ── 6. 图：只认 Mermaid，且类型合法 ────────────────────────────────
// 契约要求「图只用 Mermaid 或 SVG」。这里核三件事：图型合法、行数够（画得出链）、
// 没有把 ASCII 框线塞进代码块（那是「看着像图」的假图）。
{
  const OKTYPE = /^(flowchart|graph|stateDiagram(-v2)?|sequenceDiagram|classDiagram|journey|mindmap)\b/;
  const drawn = [];
  const figBad = [];
  for (const f of chapters) {
    const no = Number(f.match(/^(\d+)-第(\d+)章/)[2]);
    const t = fs.readFileSync(path.join(DIR, f), 'utf8');
    const blocks = [...t.matchAll(/```mermaid\n([\s\S]*?)```/g)].map((m) => m[1].trim());
    if (!blocks.length) continue;
    drawn.push(no);
    for (const b of blocks) {
      const lines = b.split('\n');
      if (!OKTYPE.test(lines[0].trim())) figBad.push(`第 ${no} 章 mermaid 首行不是合法图型：${lines[0].trim().slice(0, 24)}`);
      if (lines.length < 4) figBad.push(`第 ${no} 章 mermaid 只有 ${lines.length} 行（太简，画不出链）`);
      if (/[┌┐└┘├┤┬┴┼─│]/.test(b)) figBad.push(`第 ${no} 章 mermaid 里混入 ASCII 框线`);
    }
  }
  if (drawn.length < 15) no('图：Mermaid 覆盖', `只有 ${drawn.length} 章有图，要求 ≥15`);
  else if (figBad.length) no('图：Mermaid 合法', `${figBad.length} 处，如 ${figBad[0]}`);
  else ok(`图：${drawn.length} 章有 Mermaid · 图型合法 · 无 ASCII 框线`);
}

console.log(`\n# pass ${pass}\n# fail ${fail}`);
if (reds.length) for (const r of reds) console.log('  RED ' + r);
process.exit(fail ? 1 : 0);
