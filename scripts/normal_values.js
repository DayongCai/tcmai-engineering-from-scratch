#!/usr/bin/env node
'use strict';
/**
 * 生理学·中国成人正常值 查询 CLI
 *
 *   node scripts/normal_values.js                列出全部条目（按章分组计数）
 *   node scripts/normal_values.js 血压           按关键词查（匹配项目名/id/分组）
 *   node scripts/normal_values.js --ch 4         查某一章挂靠的全部条目
 *   node scripts/normal_values.js --pending      列出还缺的项与所需来源
 *   node scripts/normal_values.js --source S1    某条来源的登记信息（含 sha256）
 *
 * 设计要点：只输出数据层里已有的东西。查不到就说查不到，并提示 pending——
 * 这门课最容易犯的错是「书上没写，我顺手给个 120/80」，CLI 的存在就是为了让那种值无处可来。
 */
const fs = require('fs');
const path = require('path');

const DB = path.join(__dirname, '..', 'standards/shengli/normal-values/normal-values.json');
const db = JSON.parse(fs.readFileSync(DB, 'utf8'));

const args = process.argv.slice(2);
const fmt = (e) => `${e.id}\t${e.item}\t${e.value} ${e.unit}\t[${e.group}]\t${db.sources[e.source].number}·${e.locator}${e.provenance === 'oral' ? '（口授·无原文）' : ''}`;

function usageCounts() {
  const per = {};
  for (const e of db.entries) for (const c of e.chapters) per[c] = (per[c] || 0) + 1;
  return per;
}

function main() {
  if (args.includes('--pending')) {
    console.log(`还缺 ${db.pending.length} 项（未取到可核验来源，一律不写数值）：\n`);
    for (const p of db.pending) console.log(`· ${p.item}（第${p.chapters.join('/')}章）\n  为什么缺：${p.why}\n  需要什么：${p.need}\n`);
    return;
  }
  if (args[0] === '--source') {
    const id = args[1];
    const s = db.sources[id];
    if (!s) { console.error(`没有来源 ${id}；已登记：${Object.keys(db.sources).join('、')}`); process.exit(2); }
    console.log(`${id}  ${s.number}  ${s.title}`);
    console.log(`发布：${s.issuer}`);
    if (s.provenance === 'oral') {
      console.log(`口授：${s.attestedBy} · ${s.attestedAt}（无原文页，无 sha256）`);
      console.log(`升级路径：${(db.entries.find((e) => e.source === id) || {}).upgradeTo || '—'}`);
    } else {
      console.log(`留档：standards/shengli/normal-values/sources/${s.file}（${s.bytes} B）`);
      console.log(`sha256：${s.sha256}`);
      console.log(`原始 URL：${s.url}`);
    }
    console.log(`读法：${s.readHow}`);
    console.log(`定位：${s.locator}`);
    if (s.note) console.log(`备注：${s.note}`);
    console.log(`\n引用该来源的条目 ${db.entries.filter((e) => e.source === id).length} 条`);
    return;
  }
  if (args[0] === '--ch') {
    const ch = Number(args[1]);
    const rows = db.entries.filter((e) => e.chapters.includes(ch));
    console.log(`第${ch}章：${rows.length} 条\n`);
    for (const e of rows) console.log(fmt(e));
    const pend = db.pending.filter((p) => p.chapters.includes(ch));
    if (pend.length) console.log(`\n仍缺：${pend.map((p) => p.item).join('、')}`);
    return;
  }
  if (args.length) {
    const q = args.join(' ').toLowerCase();
    const rows = db.entries.filter((e) => (e.id + e.item + e.group + e.value).toLowerCase().includes(q));
    if (!rows.length) {
      console.log(`没有匹配「${q}」的条目。`);
      const near = db.pending.filter((p) => p.item.toLowerCase().includes(q));
      if (near.length) for (const p of near) console.log(`但 pending 里有：${p.item} —— ${p.why}（需 ${p.need}）`);
      process.exit(1);
    }
    for (const e of rows) console.log(fmt(e));
    return;
  }
  const per = usageCounts();
  console.log(`生理学·中国成人正常值数据层 v${db.meta.version}（${db.entries.length} 条 / ${Object.keys(db.sources).length} 个来源）\n`);
  for (let c = 1; c <= 11; c++) console.log(`  第${String(c).padStart(2)}章  ${String(per[c] || 0).padStart(2)} 条`);
  console.log(`\n未取到来源（不写数值）${db.pending.length} 项；--pending 看清单，--ch N 看单章，<关键词> 查条目。`);
  console.log(`MOOC（山东大学生理学）：${db.mooc.status} —— ${db.mooc.blocker}`);
}

main();
