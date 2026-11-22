#!/usr/bin/env node
/**
 * 医学数据安全与隐私 · 第 6 章 权限不是发给岗位的，是发给任务的
 * 正文: departments/07-zhineng/14-yixue-shuju-anquan-yinsi/chapters/06-e6/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 口径：岗位数、数据域数、角色数、未使用率、日志条数与字节量、备份恢复窗口，全部由 docs/zh.md 现算。
 * 角色膨胀与恢复窗口都是量级问题，量级不给出来，「最小必要」与「RTO」就只能靠感觉。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 6;
const SLUG = '06-e6';
const TITLE = '权限不是发给岗位的，是发给任务的';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const hanzi = (s) => (String(s).match(HANZI) || []).length;
const num = (s) => Number(String(s).replace(/[,{}\s]/g, ''));
const fmt = (n) => Number(n).toLocaleString('en-US');

function readDoc() {
  return fs.readFileSync(DOC, 'utf8');
}

function headings(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => /^##\s+/.test(line))
    .map((line) => line.replace(/^##\s+/, '').trim());
}

function parseCells(text) {
  const out = [];
  let cur = null;
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!/^\|/.test(t)) { cur = null; continue; }
    if (!cur) { cur = { rows: [] }; out.push(cur); }
    if (/^\|[\s:|-]*---[\s:|-]*\|$/.test(t)) continue;
    cur.rows.push(t.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
  }
  return out;
}

/** 章首的授权膨胀参数与日志量 */
function params(text) {
  const t = String(text);
  const org = t.match(/(\d+)\s*个岗位、\s*(\d+)\s*个数据域/);
  const roles = t.match(/实际配出来的角色是\s*([\d,]+)\s*个/);
  const unused = t.match(/([\d.]+)%\s*在近\s*(\d+)\s*天内一次都没被用过/);
  const sample = t.match(/抽样\s*(\d+)\s*个授权/);
  const logs = t.match(/每天\s*([\d.]+)\s*万条/);
  const keep = t.match(/按\s*(\d+)\s*天留存、每条\s*(\d+)\s*字节/);
  const stated = t.match(/共\s*([\d.]+)\s*万条、约\s*([\d.]+)\s*GB/);
  if (!org || !roles || !unused || !sample || !logs || !keep) throw new Error('正文的授权膨胀参数不全，无法现算');
  return {
    posts: num(org[1]),
    domains: num(org[2]),
    roles: num(roles[1]),
    unusedPct: Number(unused[1]),
    idleDays: num(unused[2]),
    sample: num(sample[1]),
    logPerDay: Math.round(Number(logs[1]) * 10000),
    keepDays: num(keep[1]),
    bytesPer: num(keep[2]),
    statedRecords: stated ? Number(stated[1]) : null,
    statedGB: stated ? Number(stated[2]) : null,
  };
}

/** 备份恢复窗口：1 TB 的库按 200 MB/s 拷贝，多久能恢复 */
function recovery(text) {
  const t = String(text);
  const db = t.match(/HIS 数据库\s*(\d+)\s*TB/);
  const speed = t.match(/恢复吞吐\s*(\d+)\s*MB\/s/);
  const stated = t.match(/约\s*([\d,]+)\s*秒/);
  const minutes = t.match(/约\s*(\d+)\s*分钟/);
  if (!db || !speed) throw new Error('正文缺少备份恢复的吞吐设定，无法现算');
  const mb = num(db[1]) * 1024 * 1024;
  const seconds = mb / num(speed[1]);
  return {
    tb: num(db[1]),
    speed: num(speed[1]),
    mb,
    seconds,
    minutes: seconds / 60,
    statedSeconds: stated ? num(stated[1]) : null,
    statedMinutes: minutes ? num(minutes[1]) : null,
  };
}

function model(text) {
  const p = params(text);
  const combos = p.posts * p.domains;
  const perPost = p.roles / p.posts;
  const idle = Math.round((p.sample * p.unusedPct) / 100);
  const records = p.logPerDay * p.keepDays;
  const bytes = records * p.bytesPer;
  const gb = bytes / 1e9;
  return {
    ...p,
    combos,
    perPost,
    idle,
    records,
    bytes,
    gb,
    recordsMatch: p.statedRecords === null ? null : Math.abs(p.statedRecords - records / 10000) < 0.05,
    gbMatch: p.statedGB === null ? null : Math.abs(p.statedGB - gb) < 0.02,
  };
}

function stats(text) {
  const t = String(text);
  const heads = headings(t);
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title: TITLE,
    hanzi: hanzi(t),
    sections: heads.length,
    numbered: heads.filter((h) => /^[一二三四五六七八九十]+、/.test(h)).length,
    tables: parseCells(t).length,
    drills: (t.match(/演算设定/g) || []).length,
    disclaimer: /免责声明/.test(t),
  };
}

function main() {
  const text = readDoc();
  const s = stats(text);
  const m = model(text);
  const r = recovery(text);

  console.log(`医学数据安全与隐私 · 第 ${s.chapter} 章 ${s.title}`);
  console.log(`正文：chapters/${s.slug}/docs/zh.md（现算，不手打）`);
  console.log('');
  console.log(`  汉字        ${fmt(s.hanzi)}`);
  console.log(`  节          ${s.sections}（编号节 ${s.numbered} + 代价与边界）`);
  console.log(`  表          ${s.tables}`);
  console.log('');
  console.log('授权膨胀：');
  console.log(`  ${m.posts} 个岗位 × ${m.domains} 个数据域 = ${m.combos} 个理论授权组合`);
  console.log(`  实际角色 ${m.roles} 个，平均每岗位 ${m.perPost.toFixed(1)} 个角色`);
  console.log(`  抽样 ${m.sample} 个授权，${m.unusedPct}% 在近 ${m.idleDays} 天内一次未用 → 约 ${m.idle} 个闲置`);
  console.log('');
  console.log('日志量：');
  console.log(`  每日 ${fmt(m.logPerDay)} 条 × ${m.keepDays} 天 = ${fmt(m.records)} 条`);
  console.log(`  × ${m.bytesPer} 字节 = ${fmt(m.bytes)} 字节 ≈ ${m.gb.toFixed(2)} GB`);
  if (m.recordsMatch !== null) {
    console.log(`  正文写法 ${m.statedRecords} 万条 / ${m.statedGB} GB（${m.recordsMatch && m.gbMatch ? '与复算一致' : '与复算不一致'}）`);
  }
  console.log('');
  console.log('备份恢复窗口：');
  console.log(`  ${r.tb} TB = ${fmt(r.mb)} MB，吞吐 ${r.speed} MB/s → ${fmt(Math.round(r.seconds))} 秒 ≈ ${r.minutes.toFixed(1)} 分钟`);
  if (r.statedMinutes !== null) {
    console.log(`  正文写法约 ${fmt(r.statedSeconds)} 秒 / ${r.statedMinutes} 分钟（${Math.abs(r.statedMinutes - r.minutes) < 1 ? '与复算一致' : '与复算不一致'}）`);
  }
  console.log(`  纯拷贝就 ${r.minutes.toFixed(0)} 分钟，加上索引重建与业务验证，实际窗口通常在 4 小时量级——2 小时的 RTO 靠还原备份达不到`);
  console.log('');
  console.log('※ 数字由本目录 docs/zh.md 现算：岗位、域、角色、日志条数与吞吐任一变动，重跑本脚本即可看到新值。');
  console.log('※ 本章数值为演算设定，用于演示权限膨胀与恢复窗口的量级关系，不对应任何机构的实测数据。');
  console.log('※ 权限模型选型、密钥管理与备份策略须由安全责任人与运维负责人按系统实际确定，不构成技术承诺。');
}

if (require.main === module) main();

module.exports = { CHAPTER, SLUG, TITLE, DOC, readDoc, headings, parseCells, params, recovery, model, stats, main };
