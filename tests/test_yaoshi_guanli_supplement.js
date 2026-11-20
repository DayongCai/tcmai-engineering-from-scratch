#!/usr/bin/env node
/**
 * tests/test_yaoshi_guanli_supplement.js —— 药事管理学「法规操作专题」的引用门
 *
 * 为什么需要：外源条文最容易出的两种假交付是 ——
 *   ① 条号看着对，其实登记里没有（或未通过逐字校勘）；
 *   ② 摘句是「大体意思」，不是原文（读者照着条文号去核，核不到）。
 * 这道门把两件事都钉住：
 *
 *   1. 补源登记自洽：clauses 数 = verified 数，unverified 必须为 0；
 *   2. 引用件干净：`原文净值` 里不许残留页眉/页码（PDF 文本层带出来的版式垃圾）；
 *   3. 附录里每个「外源·<标题> 第N条」都能在登记里找到同来源、同条号且 verified 的条目；
 *   4. 附录里每段 `「…」（外源·X 第N条）` 摘句，归一后必须逐字能在该条 `原文净值` 里命中
 *      （`……` 省略号按段切分，逐段核 —— 省略可以，改写不可以）；
 *   5. 附录不是章：文件名不得匹配 `NN-第N章-`，避免把 28 教学章的口径偷偷改掉。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const REG = path.join(ROOT, 'standards/yaoshi-guanli/补源登记.json');
const APP = path.join(ROOT, 'textbooks/02-zhongyao/18-yaoshi-guanli-xue/附录A-法规操作专题.md');

let pass = 0;
let fail = 0;
const reds = [];
const ok = (n) => { pass += 1; console.log(`  ✅ ${n}`); };
const no = (n, why) => { fail += 1; reds.push(`${n} — ${why}`); console.log(`  ❌ ${n} — ${why}`); };

if (!fs.existsSync(REG)) {
  console.log('# pass 0\n# fail 1\n  RED 缺补源登记 —— 先跑 python scripts/build_yaoshi_guanli_sources.py');
  process.exit(1);
}
const reg = JSON.parse(fs.readFileSync(REG, 'utf8'));
const clauses = reg.clauses || [];
const norm = (s) => String(s).replace(/\s+/g, '');

// ── 1. 登记自洽 ───────────────────────────────────────────────────────
{
  const c = reg.counts || {};
  const bad = [];
  if (!clauses.length) bad.push('clauses 为空');
  if (c.clauses !== clauses.length) bad.push(`counts.clauses ${c.clauses} ≠ 实际 ${clauses.length}`);
  if (c.verified !== clauses.filter((x) => x.verified).length) bad.push('counts.verified 与实际不符');
  if ((c.unverified || 0) !== 0) bad.push(`${c.unverified} 条未通过逐字校勘（约定：未通过的条文不许引用）`);
  if (bad.length) no('登记自洽', bad.join('；'));
  else ok(`登记自洽：来源 ${c.sources} · 条文 ${c.clauses} · 逐字可查 ${c.verified} · 未通过 0`);
}

// ── 2. 引用件干净 ─────────────────────────────────────────────────────
{
  const JUNK = /- \d{1,3} -|国家市场监督管理总局发布|国家市场监督管理总局规章|卫生部发布/;
  const dirty = clauses.filter((x) => JUNK.test(x['原文净值'] || ''));
  if (dirty.length) no('原文净值干净', `${dirty.length} 条仍带页眉/页码，如 ${dirty[0].id}`);
  else ok(`原文净值干净：${clauses.length} 条均无页眉/页码残留（登记原文带污染 ${reg.counts.junkPolluted} 条，已由净值剥离）`);
}

// ── 3/4. 附录引用可核 + 摘句逐字 ──────────────────────────────────────
if (!fs.existsSync(APP)) {
  no('附录存在', `缺 ${path.relative(ROOT, APP)}`);
} else {
  const t = fs.readFileSync(APP, 'utf8');
  const base = path.basename(APP);
  if (/^\d+-第\d+章-/.test(base)) no('附录不是章', `${base} 形如章文件，会被计入章数`);

  const byKey = new Map(); // `${shortTitle}||${clause}` → clause
  for (const c of clauses) {
    const short = (reg.sources[c.source] || {}).shortTitle || '';
    if (short) byKey.set(`${short}||${c.clause}`, c);
  }

  // 3) 所有「外源·X 第N条」
  const refs = [...t.matchAll(/外源·([^ ）「」\n]+?)\s*(第[零一二三四五六七八九十百]+条)/g)];
  const unresolved = [];
  const seen = new Set();
  for (const m of refs) {
    const key = `${m[1]}||${m[2]}`;
    seen.add(key);
    const c = byKey.get(key);
    if (!c) unresolved.push(`「外源·${m[1]} ${m[2]}」登记里没有这一条`);
    else if (!c.verified) unresolved.push(`「外源·${m[1]} ${m[2]}」未通过逐字校勘`);
  }
  if (!refs.length) no('附录引用', '附录里没有一处「外源·… 第N条」引用');
  else if (unresolved.length) no('附录引用可核', `${unresolved.length} 处，如 ${unresolved[0]}`);
  else ok(`附录引用可核：${refs.length} 处引用、${seen.size} 个不同条号，全部在登记里 verified`);

  // 4) 摘句逐字（只认「行首 > 「…」 + 紧随（外源·X 第N条）」的形式，避免跨段误配）
  const quotes = [...t.matchAll(/^>\s*「([^「]*?)」\s*（外源·([^ ）\n]+?)\s*(第[零一二三四五六七八九十百]+条)）/gm)];
  const badQ = [];
  for (const m of quotes) {
    const c = byKey.get(`${m[2]}||${m[3]}`);
    if (!c) { badQ.push(`摘句所指条目不存在：外源·${m[2]} ${m[3]}`); continue; }
    const hay = norm(c['原文净值'] || '');
    const parts = m[1].split(/……|\.\.\./).map((x) => norm(x)).filter(Boolean);
    const miss = parts.filter((p) => !hay.includes(p));
    if (miss.length) badQ.push(`摘句与原文不符（外源·${m[2]} ${m[3]}）：${miss[0].slice(0, 30)}…`);
  }
  if (!quotes.length) no('摘句逐字', '附录里没有「…」（外源·X 第N条）形式的摘句');
  else if (badQ.length) no('摘句逐字', `${badQ.length} 处，如 ${badQ[0]}`);
  else ok(`摘句逐字：${quotes.length} 段摘句归一后全部能在对应条的 原文净值 里命中`);
}

console.log(`\n# pass ${pass}\n# fail ${fail}`);
if (reds.length) for (const r of reds) console.log(`  RED ${r}`);
process.exit(fail ? 1 : 0);
