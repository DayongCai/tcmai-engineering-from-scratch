#!/usr/bin/env node
/**
 * tests/test_jichu_textbook.js —— 中医基础理论 教材层（源正文层 + 改写层）的门
 *
 * 与 tests/test_binglishengli_textbook.js 同级：同一套要求，按本册的实际情况定阈值。
 * 为什么需要：本册在 import_textbooks.js 的映射表里标着 authoredFinal（声称「全书改写层已写成」），
 * 而 2026-11-15 实测只有第 2 章是改写层，其余 12 章是纯源正文层 —— 没有任何门能发现这件事。
 * 这道门就是用来钉住「声称」与「实际」的差：
 *
 *   1. 篇目：00-前言 + 13 章，章号连续；
 *   2. 溯源头：每章前 10 行带 源/抽取/层次，sha256 与底本工作簿一致（底本换了没重渲染即红）；
 *   3. 改写层：13 章全有（第 2 章为「整章改写层」，须在前言声明）；
 *      八节齐 · 每章 ≥1,800 汉字 · 免责句在 N.5 之后 / 思考题之前 · 文末块形态；
 *   4. 出处可核：块内用反引号引的源节号**必须在本章源正文的标题里真实存在**；
 *      不许出现页码类不可核出处；每章 N.1 至少一处《书名·篇名》级出处；
 *   5. 前言诚实：写明改写层已写多少章、写明「字数只证明有字」、写明第 2 章的特例；
 *   6. 图：≥12 章有 Mermaid，图型合法，没有把 ASCII 框线塞进代码块。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'textbooks/01-zhongyi/01-zhongyi-jichu-lilun');
const UNITS = path.join(ROOT, 'standards/jichu/units.json');

const units = JSON.parse(fs.readFileSync(UNITS, 'utf8'));
const bookSha = (units.source && units.source.dibenSource && units.source.dibenSource.sha256) || '';
if (!bookSha) {
  console.log('# pass 0\n# fail 1\n  RED 底本 sha256 读不到（standards/jichu/units.json → source.dibenSource.sha256）');
  process.exit(1);
}

let pass = 0;
let fail = 0;
const reds = [];
const ok = (n) => { pass += 1; console.log(`  ✅ ${n}`); };
const no = (n, why) => { fail += 1; reds.push(`${n} — ${why}`); console.log(`  ❌ ${n} — ${why}`); };

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.md')).sort();
const chapters = files.filter((f) => /^\d+-第\d+章.*\.md$/.test(f) && !/^00-/.test(f))
  .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
const chapterNo = (f) => Number(f.match(/^(\d+)-第(\d+)章/)[2]);

// ── 1. 篇目 ───────────────────────────────────────────────────────────
{
  const nums = chapters.map(chapterNo);
  const expect = Array.from({ length: 13 }, (_, i) => i + 1);
  if (!files.includes('00-前言.md')) no('前言', '缺 00-前言.md');
  else if (nums.join(',') !== expect.join(',')) no('13 章齐', `实得 ${nums.length} 章 / 章号 ${nums.join(',')}`);
  else ok(`篇目：1 篇前言 + ${nums.length} 章 · 章号 1–13 连续`);
}

// ── 2. 溯源头 ─────────────────────────────────────────────────────────
const HEAD_KEYS = ['**源**', '**抽取**', '**层次**'];
const HAND_WRITTEN = new Set([2]); // 第 2 章：整章改写层，无源正文层（前言须声明）
{
  const bad = [];
  for (const f of chapters) {
    const no = chapterNo(f);
    const head = fs.readFileSync(path.join(DIR, f), 'utf8').split('\n').slice(0, 10).join('\n');
    if (HAND_WRITTEN.has(no)) {
      if (!/整章改写层|手写/.test(head)) bad.push(`${f} 手写章未在章首声明「整章改写层」`);
      continue;
    }
    for (const k of HEAD_KEYS) if (!head.includes(k)) bad.push(`${f} 缺 ${k}`);
    const sha = (head.match(/sha256 `([0-9a-f]{8,})/) || [])[1];
    if (!sha) bad.push(`${f} 缺 sha256`);
    else if (!bookSha.startsWith(sha)) bad.push(`${f} sha256 与底本不符（写 ${sha}，底本 ${bookSha.slice(0, 12)}）`);
  }
  if (bad.length) no('溯源头可对账', `${bad.length} 处，如 ${bad[0]}`);
  else ok(`溯源头：12 章源正文层带 源/抽取/层次 + sha256 与底本一致（第 2 章声明为整章改写层）`);
}

// ── 3. 改写层：块结构 · 八节 · 篇幅 · 免责位置 ────────────────────────
const NEED = ['## 本章要回答的问题', '## N.1 概念与出处', '## N.2 为什么可以这样翻译',
  '## N.3 这个翻译丢掉了什么', '## N.4 与相邻学科的接口', '## N.5 争议与本项目立场',
  '## 思考题', '## 延伸阅读'];
const REWRITE = /<!-- REWRITE:BEGIN -->([\s\S]*?)<!-- REWRITE:END -->/;
const bodies = new Map(); // no → { body, hasBlock, text }
{
  const bad = [];
  let withBlock = 0;
  for (const f of chapters) {
    const no = chapterNo(f);
    const t = fs.readFileSync(path.join(DIR, f), 'utf8');
    const m = t.match(REWRITE);
    const body = m ? m[1] : HAND_WRITTEN.has(no) ? t : null;
    if (!body) { bad.push(`第 ${no} 章 没有改写层（既无 REWRITE 块，也不在整章改写清单里）`); continue; }
    bodies.set(no, { body, hasBlock: Boolean(m), text: t });
    if (m) withBlock += 1;

    for (const n of NEED) if (!body.includes(n)) bad.push(`第 ${no} 章 缺「${n}」`);

    const i5 = body.indexOf('## N.5');
    const iq = body.indexOf('## 思考题');
    const idis = body.indexOf('不构成诊断');
    if (idis < 0) bad.push(`第 ${no} 章 改写层缺免责句（须含「不构成诊断」）`);
    else if (!(i5 >= 0 && iq > i5 && idis > i5 && idis < iq)) bad.push(`第 ${no} 章 免责句不在「N.5 之后、思考题之前」`);

    const hanzi = (body.match(/[\u4e00-\u9fff]/g) || []).length;
    if (hanzi < 1800) bad.push(`第 ${no} 章 改写层 ${hanzi} 汉字 < 1800`);

    // 文末块：块必须是文件的最后一节（整章改写层不适用）
    if (m && !t.trimEnd().endsWith('<!-- REWRITE:END -->')) bad.push(`第 ${no} 章 改写块不在文末`);
  }
  const missing = Array.from({ length: 13 }, (_, i) => i + 1).filter((n) => !bodies.has(n));
  if (missing.length) no('改写层覆盖面', `${bodies.size}/13 章有改写层，缺第 ${missing.join('、')} 章`);
  else if (bad.length) no('改写层结构', `${bad.length} 处，如 ${bad[0]}`);
  else ok(`改写层：13/13 章 · 八节齐 · 各 ≥1,800 汉字 · 免责句位置正确 · ${withBlock} 章为文末块`);
}

// ── 4. 出处可核 ───────────────────────────────────────────────────────
const BANNED = [/第\s*\d+\s*页/, /原书第/, /\[citation needed\]/i];
{
  const bad = [];
  for (const f of chapters) {
    const no = chapterNo(f);
    const rec = bodies.get(no);
    if (!rec) continue;
    const { body, text } = rec;
    for (const b of BANNED) if (b.test(body)) bad.push(`第 ${no} 章 出现不可核出处 ${b}`);

    // 本章源正文的节号集合：##/###/#### 标题里的数字
    const secs = new Set();
    for (const mm of text.matchAll(/^#{2,4}\s+(\d+(?:\.\d+){1,2})\b/gm)) secs.add(mm[1]);
    // 块内用反引号引的节号，必须是本章真实存在的节
    for (const mm of body.matchAll(/`(\d+(?:\.\d+){1,2})`/g)) {
      const sec = mm[1];
      if (![...secs].some((s) => s === sec || s.startsWith(`${sec}.`))) {
        bad.push(`第 ${no} 章 引到不存在的源节 \`${sec}\`（本章有 ${secs.size} 个节号）`);
      }
    }
    // 每章 N.1 至少一处《书名·篇名》级出处
    const n1 = body.split('## N.2')[0] || '';
    if (!/《[^》]+·[^》]+》/.test(n1)) bad.push(`第 ${no} 章 N.1 没有《书名·篇名》级出处`);
  }
  if (bad.length) no('出处可核', `${bad.length} 处，如 ${bad[0]}`);
  else ok('出处：块内反引号节号全部真实存在 · 无页码类出处 · 每章 N.1 有篇名级引文');
}

// ── 5. 前言诚实度 ────────────────────────────────────────────────────
{
  const fm = fs.readFileSync(path.join(DIR, '00-前言.md'), 'utf8');
  const need = ['源正文层', '改写层', 'N.3', '只证明「有字」'];
  const miss = need.filter((k) => !fm.includes(k));
  if (miss.length) no('前言诚实度', `缺 ${miss.join('、')}`);
  else if (!/改写层：\d+ 章已写/.test(fm)) no('前言诚实度', '没写明改写层已写多少章');
  else if (!/整章改写层/.test(fm)) no('前言诚实度', '没写明第 2 章是整章改写层（无源正文层）');
  else ok('前言：两层分账、改写层章数、第 2 章特例与「字数只证明有字」都在');
}

// ── 6. 图 ────────────────────────────────────────────────────────────
{
  const OKTYPE = /^(flowchart|graph|stateDiagram(-v2)?|sequenceDiagram|classDiagram|journey|mindmap)\b/;
  const drawn = [];
  const bad = [];
  for (const f of chapters) {
    const no = chapterNo(f);
    const t = fs.readFileSync(path.join(DIR, f), 'utf8');
    const blocks = [...t.matchAll(/```mermaid\n([\s\S]*?)```/g)].map((m) => m[1].trim());
    if (!blocks.length) continue;
    drawn.push(no);
    for (const b of blocks) {
      const lines = b.split('\n');
      if (!OKTYPE.test(lines[0].trim())) bad.push(`第 ${no} 章 mermaid 首行不是合法图型：${lines[0].trim().slice(0, 24)}`);
      if (lines.length < 4) bad.push(`第 ${no} 章 mermaid 只有 ${lines.length} 行（太简，画不出链）`);
      if (/[┌┐└┘├┤┬┴┼─│]/.test(b)) bad.push(`第 ${no} 章 mermaid 里混入 ASCII 框线`);
    }
  }
  if (drawn.length < 12) no('图：Mermaid 覆盖', `只有 ${drawn.length} 章有图，要求 ≥12`);
  else if (bad.length) no('图：Mermaid 合法', `${bad.length} 处，如 ${bad[0]}`);
  else ok(`图：${drawn.length} 章有 Mermaid · 图型合法 · 无 ASCII 框线`);
}

console.log(`\n# pass ${pass}\n# fail ${fail}`);
if (reds.length) for (const r of reds) console.log(`  RED ${r}`);
process.exit(fail ? 1 : 0);
