#!/usr/bin/env node
/**
 * 医学数据安全与隐私 · 第 7 章 病案的每一次调阅都应当留下能追问的痕迹
 * 正文: departments/07-zhineng/14-yixue-shuju-anquan-yinsi/chapters/07-e7/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 口径：出院人次、调阅次数、无代码比例、抽查缺陷率、置信区间与主索引碰撞对数，全部由 docs/zh.md 现算。
 * 抽查的精度不由人力决定：先定区间，再定样本量，这一步必须能算。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 7;
const SLUG = '07-e7';
const TITLE = '病案的每一次调阅都应当留下能追问的痕迹';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const hanzi = (s) => (String(s).match(HANZI) || []).length;
const num = (s) => Number(String(s).replace(/[,{}\s≈]/g, ''));
const fmt = (n) => Number(n).toLocaleString('en-US');
const Z95 = 1.96;

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

function params(text) {
  const t = String(text);
  const disch = t.match(/年出院\s*([\d.]+)\s*万人次/);
  const reqs = t.match(/一年病案调阅请求约\s*([\d.]+)\s*万次/);
  const noCode = t.match(/约\s*([\d.]+)%\s*没有可核的事由代码/);
  const noCodeStated = t.match(/推算约\s*([\d,]+)\s*次调阅/);
  const sample = t.match(/抽\s*(\d+)\s*份病案/);
  const defects = t.match(/不一致的有\s*(\d+)\s*份/);
  const point = t.match(/占\s*([\d.]+)%/);
  const ci = t.match(/95% 置信区间是\s*([\d.]+)%[–-]([\d.]+)%/);
  const annual = t.match(/全年就是\s*([\d,]+)\s*到\s*([\d,]+)\s*份/);
  if (!disch || !reqs || !noCode || !sample || !defects) throw new Error('正文的抽检参数不全，无法现算');
  return {
    discharges: Math.round(Number(disch[1]) * 10000),
    requests: Math.round(Number(reqs[1]) * 10000),
    noCodePct: Number(noCode[1]),
    noCodeStated: noCodeStated ? num(noCodeStated[1]) : null,
    sample: num(sample[1]),
    defects: num(defects[1]),
    pointStated: point ? Number(point[1]) : null,
    ciStated: ci ? [Number(ci[1]), Number(ci[2])] : null,
    annualStated: annual ? [num(annual[1]), num(annual[2])] : null,
  };
}

/** 患者主索引的匹配键空间与两两组合 */
function empi(text) {
  const t = String(text);
  const n = t.match(/设定\s*([\d.]+)\s*万条待归并记录/);
  const names = t.match(/姓名取值约\s*([\d,]+)\s*个/);
  const years = t.match(/出生年取\s*(\d+)\s*个取值/);
  const sex = t.match(/性别\s*(\d+)\s*个/);
  const pairs = t.match(/约\s*([\d,]+)\s*对/);
  if (!n || !names || !years || !sex) throw new Error('正文缺少主索引的匹配键设定，无法现算');
  return {
    n: Math.round(Number(n[1]) * 10000),
    keys: [num(names[1]), num(years[1]), num(sex[1])],
    statedPairs: pairs ? num(pairs[1]) : null,
  };
}

function model(text) {
  const p = params(text);
  const point = p.defects / p.sample;
  const se = Math.sqrt((point * (1 - point)) / p.sample);
  const lo = point - Z95 * se;
  const hi = point + Z95 * se;
  const e = empi(text);
  const keySpace = e.keys.reduce((a, b) => a * b, 1);
  const combos = (e.n * (e.n - 1)) / 2;
  return {
    ...p,
    point,
    pointPct: point * 100,
    se,
    ci: [lo * 100, hi * 100],
    annual: [(p.discharges * lo), (p.discharges * hi)],
    noCode: Math.round((p.requests * p.noCodePct) / 100),
    empi: { ...e, keySpace, combos, perCell: combos / keySpace },
    pointMatches: p.pointStated === null ? null : Math.abs(point * 100 - p.pointStated) < 0.05,
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

  console.log(`医学数据安全与隐私 · 第 ${s.chapter} 章 ${s.title}`);
  console.log(`正文：chapters/${s.slug}/docs/zh.md（现算，不手打）`);
  console.log('');
  console.log(`  汉字        ${fmt(s.hanzi)}`);
  console.log(`  节          ${s.sections}（编号节 ${s.numbered} + 代价与边界）`);
  console.log(`  表          ${s.tables}`);
  console.log('');
  console.log('调阅的缺口：');
  console.log(`  年出院 ${fmt(m.discharges)} 人次，调阅请求 ${fmt(m.requests)} 次`);
  console.log(`  无代码比例 ${m.noCodePct}% → ${fmt(m.noCode)} 次只剩「某人某时看了某份病案」`);
  console.log('');
  console.log('抽查精度：');
  console.log(`  ${m.sample} 份中 ${m.defects} 份缺陷 → 点估计 ${m.pointPct.toFixed(2)}%`);
  console.log(`  标准差 ${m.se.toFixed(5)}，95% 区间 ${m.ci[0].toFixed(2)}%–${m.ci[1].toFixed(2)}%`);
  if (m.ciStated) console.log(`  正文写法 ${m.ciStated[0]}%–${m.ciStated[1]}%（${Math.abs(m.ci[0] - m.ciStated[0]) < 0.06 && Math.abs(m.ci[1] - m.ciStated[1]) < 0.06 ? '与复算一致' : '与复算不一致'}）`);
  console.log(`  折算全年 ${fmt(Math.round(m.annual[0]))} 到 ${fmt(Math.round(m.annual[1]))} 份`);
  if (m.annualStated) console.log(`  正文写法 ${fmt(m.annualStated[0])} 到 ${fmt(m.annualStated[1])} 份`);
  console.log(`  区间收窄一半需约四倍样本：${m.sample * 4} 份`);
  console.log('');
  console.log('主索引碰撞：');
  console.log(`  待归并 ${fmt(m.empi.n)} 条，键空间 ${m.empi.keys.join('×')} = ${fmt(m.empi.keySpace)}`);
  console.log(`  两两组合 ${fmt(Math.round(m.empi.combos))} 对 ÷ ${fmt(m.empi.keySpace)} ≈ 每格 ${m.empi.perCell.toFixed(0)} 对`);
  if (m.empi.statedPairs !== null) console.log(`  正文写法约 ${fmt(m.empi.statedPairs)} 对疑似同人（${Math.abs(m.empi.perCell - m.empi.statedPairs) < 2 ? '与复算一致' : '与复算不一致'}）`);
  console.log('');
  console.log('※ 数字由本目录 docs/zh.md 现算：出院人次、调阅次数、抽查份数与缺陷份数任一变动，重跑本脚本即可看到新值。');
  console.log('※ 本章数值为演算设定，用于演示抽样精度与匹配碰撞的量级，不对应任何机构的实测统计。');
  console.log('※ 二项区间假设样本独立随机，分层抽查应按分层方法重算；本章不构成质量管理结论。');
}

if (require.main === module) main();

module.exports = { CHAPTER, SLUG, TITLE, DOC, readDoc, headings, parseCells, params, empi, model, stats, main };
