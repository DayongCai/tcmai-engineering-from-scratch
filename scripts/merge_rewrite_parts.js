#!/usr/bin/env node
/**
 * merge_rewrite_parts.js —— 把分头写好的判断层片段并回 rewrite-plan.json
 *
 *   node scripts/merge_rewrite_parts.js <slug> [--dry]
 *   例：node scripts/merge_rewrite_parts.js yaoli
 *
 * 为什么要分片写：判断层是「一章一段人写的文字」，多人/多代理并行时若都往同一个
 * rewrite-plan.json 里写，最后一个人会覆盖掉前面所有人。所以约定：
 *   标准答案在 standards/<slug>/rewrite-plan.json（骨架：n/title/src）
 *   各人只写 standards/<slug>/parts/*.json（数组，元素 {n,question,n2,n3,n4,n5,check}）
 * 本脚本负责合并、查重、查缺，并把 status 从 draft 改成 complete（仅在全都写满时）。
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const slug = process.argv[2];
const dry = process.argv.includes('--dry');
if (!slug) { console.error('用法：node scripts/merge_rewrite_parts.js <slug> [--dry]'); process.exit(2); }

const planPath = path.join(ROOT, 'standards', slug, 'rewrite-plan.json');
const partsDir = path.join(ROOT, 'standards', slug, 'parts');
if (!fs.existsSync(planPath)) { console.error(`缺 ${planPath}`); process.exit(3); }
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));

const hanzi = (s) => (String(s || '').match(/[\u4e00-\u9fff]/g) || []).length;
const FIELDS = ['question', 'n2', 'n3', 'n4', 'n5'];
const errs = [];
const byN = new Map();

if (fs.existsSync(partsDir)) {
  for (const f of fs.readdirSync(partsDir).filter((x) => x.endsWith('.json')).sort()) {
    let arr;
    try { arr = JSON.parse(fs.readFileSync(path.join(partsDir, f), 'utf8')); }
    catch (e) { errs.push(`${f} 不是合法 JSON：${e.message}`); continue; }
    if (!Array.isArray(arr)) { errs.push(`${f} 顶层不是数组`); continue; }
    for (const ch of arr) {
      const n = Number(ch.n);
      if (!n) { errs.push(`${f} 有元素缺 n`); continue; }
      if (byN.has(n)) errs.push(`${f} 与其它片段重复写了第 ${n} 章`);
      byN.set(n, ch);
      for (const k of FIELDS) {
        // 门槛与官方门（tests/test_rewrite_blocks.js）对齐：N.2/N.5 ≥200 汉字。
        // 早先这里卡 300，比门更严，导致「门能过、合并却退」的自相矛盾（精神科 11–16 章踩过）。
        const need = k === 'n2' || k === 'n5' ? 200 : (k === 'question' ? 20 : 100);
        if (hanzi(ch[k]) < need) errs.push(`第 ${n} 章 ${k} 只有 ${hanzi(ch[k])} 汉字（要 ≥${need}）`);
      }
      const ck = (ch.check || []).length;
      if (ck < 3 || ck > 6) errs.push(`第 ${n} 章 check 有 ${ck} 条（要 3–6）`);
      // 只把「明显是没写完」的词判为占位。「占位性病变」「标注待补充」都是正当术语，
      // 用裸「占位」会把诊断学章节整章误杀（针灸学第 28 章踩过）。
      if (/待补(?!充)|待写|TODO|XXX|占位符|占位文/.test(JSON.stringify(ch))) errs.push(`第 ${n} 章有占位字样`);
    }
  }
}

const missing = plan.chapters.filter((c) => !byN.has(Number(c.n))).map((c) => c.n);
if (missing.length) errs.push(`缺 ${missing.length} 章：${missing.slice(0, 12).join(',')}${missing.length > 12 ? ' …' : ''}`);

if (errs.length) {
  console.log(`✗ 合并前检查未过（${errs.length} 处）：`);
  for (const e of errs.slice(0, 20)) console.log('  · ' + e);
  process.exit(1);
}

// n2/n3/n4/n5 必须是字符串（apply_rewrite_block.py 直接 .strip()）：
// 有的写手把 N.3 写成字符串数组，这里统一拼成「每条一行、空行分隔」的段落，
// 不丢内容、也不改格式约定。
const NL2 = String.fromCharCode(10, 10);
const asText = (v) => (Array.isArray(v) ? v.map((x) => String(x).trim()).join(NL2) : String(v == null ? '' : v));

for (const c of plan.chapters) {
  const src = byN.get(Number(c.n));
  for (const k of FIELDS) c[k] = asText(src[k]);
  c.check = src.check;
}
plan.status = 'complete';
plan.mergedAt = new Date().toISOString();
plan.mergedFrom = fs.readdirSync(partsDir).filter((x) => x.endsWith('.json')).sort();

if (dry) {
  console.log(`[dry] 可合并 ${plan.chapters.length} 章（status→complete），未写盘`);
  process.exit(0);
}
fs.writeFileSync(planPath, JSON.stringify(plan, null, 2) + '\n', 'utf8');
const total = plan.chapters.reduce((a, c) => a + hanzi(c.n2) + hanzi(c.n3) + hanzi(c.n4) + hanzi(c.n5), 0);
console.log(`✅ 合并 ${plan.chapters.length} 章 → standards/${slug}/rewrite-plan.json（判断层合计 ${total} 汉字）`);
