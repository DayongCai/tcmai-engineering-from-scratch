#!/usr/bin/env node
'use strict';
/**
 * scripts/extract_bingli_unit_notes.js —— 把每章 docs 里已有的「十二个小节：逐条落位」
 * 抽成 standards/bingli/unit-notes/<章>.json（与生理学同一层，便于同一套门去管）
 *
 * 为什么不重写：21 章建章时已经逐单元写过一段（`#### N.M.K 标题` + 一段正文），
 * 内容就在 docs 里。重写一遍等于用同一份底本再创作一次，只会让两份文本互相矛盾。
 * 这里做的是「把已有的那段提出来、单独立层」，然后由门核三件事：
 *   ① 12 段齐；② 每段够长（≥120 非空白字）；③ docs 与 unit-notes 现算一致。
 * 任何一段太短，都会在测量里现形，成为要补的具体条目——而不是靠感觉判断「写够了没有」。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CH = path.join(ROOT, 'departments', '09-jichu', '10-bingli-xue', 'chapters');
const OUT = path.join(ROOT, 'standards', 'bingli', 'unit-notes');
const U = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards', 'bingli', 'units.json'), 'utf8'));

const HEAD = /^#{2,4}\s*(?:[一二三四五六七八九十]+、)?\s*十二个小节[:：]\s*逐条落位\s*$/m;

function parseDoc(doc) {
  const lines = doc.split(String.fromCharCode(13)).join('').split('\n');
  const start = lines.findIndex((l) => HEAD.test(l.trim()));
  if (start < 0) return null;
  const units = [];
  let cur = null;
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i];
    if (/^##\s/.test(l)) break;                       // 下一个二级标题 = 本节结束
    const m = l.match(/^####\s+(\d+\.\d+\.\d+)\s+(.+?)\s*$/);
    if (m) {
      if (cur) units.push(cur);
      cur = { sub: m[1], title: m[2], paras: [] };
      continue;
    }
    if (cur && l.trim()) cur.paras.push(l.trim());
  }
  if (cur) units.push(cur);
  return units;
}

fs.mkdirSync(OUT, { recursive: true });
let report = [];
for (const d of fs.readdirSync(CH).sort()) {
  const ch = parseInt(d.slice(0, 2), 10);
  const doc = fs.readFileSync(path.join(CH, d, 'docs', 'zh.md'), 'utf8');
  const units = parseDoc(doc);
  const truth = U.units.filter((u) => u.chapter === String(ch));
  if (!units) { report.push([d, '缺「十二个小节：逐条落位」一节', 0, 0]); continue; }
  const rows = units.map((u) => {
    const note = u.paras.join('\n\n').replace(/\s+/g, ' ').trim();
    return { sub: u.sub, title: u.title, note, len: note.replace(/\s/g, '').length };
  });
  const missing = truth.map((t) => t.sub).filter((s) => !rows.some((r) => r.sub === s));
  const extra = rows.map((r) => r.sub).filter((s) => !truth.some((t) => t.sub === s));
  const short = rows.filter((r) => r.len < 120).map((r) => `${r.sub}:${r.len}`);
  fs.writeFileSync(path.join(OUT, `${String(ch).padStart(2, '0')}.json`),
    JSON.stringify({ chapter: ch, units: rows.map(({ sub, title, note }) => ({ sub, title, note })) }, null, 1) + '\n');
  report.push([d, rows.length, Math.min(...rows.map((r) => r.len)), missing.length + extra.length, short.join(',')]);
}
console.log('章'.padEnd(32) + '段数  最短字  号错  过短段');
for (const r of report) console.log(String(r[0]).padEnd(32) + String(r[1]).padEnd(6) + String(r[2]).padEnd(8) + String(r[3]).padEnd(6) + (r[4] || ''));
const all = report.filter((r) => typeof r[1] === 'number');
console.log('');
console.log('合计章 ' + all.length + ' · 总段 ' + all.reduce((n, r) => n + r[1], 0)
  + ' · 最短 ' + Math.min(...all.map((r) => r[2])) + ' · 过短段 ' + all.reduce((n, r) => n + (r[4] ? r[4].split(',').length : 0), 0));
