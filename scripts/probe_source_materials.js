#!/usr/bin/env node
/**
 * scripts/probe_source_materials.js — 清点源资料目录里的表格类材料
 *
 *   node scripts/probe_source_materials.js [目录]        默认 J:/Users/user/Desktop
 *   node scripts/probe_source_materials.js --json        机器可读输出
 *
 * 目的：用户的原始资料里混着大量 Excel 备份（`_bak`、带时间戳），
 * 而真正的材料往往只有一个。**先清点，再决定收哪些** ——
 * 逐个手点既慢又会漏，而且「哪个是最新版」光看文件名会猜错。
 *
 * 判定「同格式教材」的签名：工作表名里同时有「封面」「目录」「正文总表」。
 * 这是《中医知识树》的形态；同格式的可以直接走 import_knowledge_tree.js 的解析路径。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { readWorkbook: readXlsx } = require('./lib_xlsx');
const { readWorkbook: readXls } = require('./lib_xls');
// 清点必须按扩展名分派：只认 .xlsx 时，4 份 .xls 会一直显示"读取失败"，
// 而这个假信号会让人以为"资料读不了"，实际只是探测脚本没接上读取器。
const readWorkbook = (file) => (/\.xls$/i.test(file) ? readXls(file) : readXlsx(file));

const argv = process.argv.slice(2);
const asJson = argv.includes('--json');
const dir = argv.find((a) => !a.startsWith('--')) || 'J:/Users/user/Desktop';

if (!fs.existsSync(dir)) {
  console.error(`✗ 目录不存在: ${dir}`);
  process.exit(1);
}

// ── 排除项 ────────────────────────────────────────────────────────────
// `~$` 是 Excel 打开文件时的锁文件；`_bak` / 时间戳是备份。
// 备份**不丢**，但要标出来 —— 由人决定留哪个，脚本不替人删。
const LOCK_RE = /^~\$/;
const BAK_RE = /(_bak(_|\.|$)|_\d{8}(_\d{6})?(_bak)?\.)/i;

function classify(name) {
  if (LOCK_RE.test(name)) return 'lock';
  if (BAK_RE.test(name)) return 'backup';
  return 'primary';
}

/** 「同格式教材」签名 + 学科编号 */
function profile(xlsxPath) {
  const out = { ok: false, sheets: 0, textbookFormat: false, subjectCode: null, title: null, error: null };
  try {
    const wb = readWorkbook(xlsxPath);
    out.sheets = wb.sheets.length;
    const names = wb.sheets.map((s) => s.name);
    out.textbookFormat = names.some((n) => n.includes('封面'))
      && names.some((n) => n.includes('目录'))
      && names.some((n) => n.includes('正文总表'));

    // 从封面抽学科编号 / 教材编号 / 书名
    const cover = wb.sheets.find((s) => n_(s.name, '封面'));
    if (cover) {
      for (const row of cover.rows) {
        const k = String(row[0] || '').trim();
        const v = String(row[1] || '').trim();
        if (/^学科编号/.test(k) && v) out.subjectCode = v;
        if (/教材编号/.test(k) && v) out.title = out.title || `教材编号 ${v}`;
      }
      // 首行常是书名
      const first = String((cover.rows[0] || [])[0] || '').trim();
      if (first && !/^【/.test(first)) out.title = first.slice(0, 60);
    }
    out.ok = true;
  } catch (e) {
    out.error = e.message;
  }
  return out;
}

/** 简单包含判断（避免把 n 用成未定义） */
function n_(s, t) { return String(s).includes(t); }

// ── 主流程 ────────────────────────────────────────────────────────────

const entries = fs.readdirSync(dir)
  .filter((f) => /\.(xlsx|xls)$/i.test(f) && !LOCK_RE.test(f))
  .sort();

const rows = [];
for (const f of entries) {
  const full = path.join(dir, f);
  const st = fs.statSync(full);
  const kind = classify(f);
  let sha = null;
  let prof = { ok: false, textbookFormat: false, sheets: 0 };
  if (/\.xlsx?$/i.test(f)) {
    sha = crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex').slice(0, 12);
    prof = profile(full);
  } else {
    prof.error = '非表格文件';
  }
  rows.push({
    file: f, kind, kb: Math.round(st.size / 1024), mtime: st.mtime.toISOString().slice(0, 10),
    sha, ...prof,
  });
}

// 同内容去重：sha 相同的是同一份材料的多个副本
const bySha = new Map();
for (const r of rows) if (r.sha) {
  if (!bySha.has(r.sha)) bySha.set(r.sha, []);
  bySha.get(r.sha).push(r.file);
}

if (asJson) {
  console.log(JSON.stringify({ dir, rows, duplicates: [...bySha.entries()].filter(([, v]) => v.length > 1) }, null, 2));
  process.exit(0);
}

const prim = rows.filter((r) => r.kind === 'primary');
const bak = rows.filter((r) => r.kind === 'backup');

console.log(`═══ 源资料清点：${dir} ═══\n`);
console.log(`  表格文件   ${rows.length} 个 → 主材料 ${prim.length} · 备份 ${bak.length}`);
console.log(`  同格式教材 ${rows.filter((r) => r.textbookFormat).length} 个（有「封面/目录/正文总表」签名）`);
console.log(`  读取失败   ${rows.filter((r) => !r.ok).length} 个\n`);

console.log('── 主材料（去掉备份与锁文件）──');
for (const r of prim) {
  const tags = [];
  if (r.textbookFormat) tags.push('📚同格式教材');
  if (r.subjectCode) tags.push(r.subjectCode);
  if (!r.ok) tags.push(`✗ ${r.error}`);
  console.log(`  ${r.file.padEnd(34)} ${String(r.kb).padStart(5)}KB ${r.mtime}  ${String(r.sheets).padStart(2)}表  ${tags.join(' · ')}`);
  if (r.title && r.textbookFormat) console.log(`      └ ${r.title}`);
}

console.log('\n── 备份（同名材料的旧版本，未删）──');
const bakNames = [...new Set(bak.map((r) => r.file.replace(/_\d{8}(_\d{6})?(_bak)?\.xlsx$|_bak(\.\d+)?\.xlsx$/i, '')))];
for (const n of bakNames) {
  const group = bak.filter((r) => r.file.startsWith(n));
  console.log(`  ${n}  →  ${group.length} 个备份`);
}

const dups = [...bySha.entries()].filter(([, v]) => v.length > 1);
if (dups.length) {
  console.log('\n── 内容完全相同的重复（sha 一致）──');
  for (const [sha, files] of dups) console.log(`  ${sha}  ${files.join('  =  ')}`);
}
