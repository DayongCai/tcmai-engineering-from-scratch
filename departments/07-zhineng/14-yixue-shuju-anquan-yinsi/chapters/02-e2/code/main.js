#!/usr/bin/env node
/**
 * 医学数据安全与隐私 · 第 2 章 标准落地不是文件对照，是把要求变成字段
 * 正文: departments/07-zhineng/14-yixue-shuju-anquan-yinsi/chapters/02-e2/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 口径：系统数、患者标识套数、可自动对齐的配对数、记录数与无法对齐比例，全部由 docs/zh.md 现算。
 * 数据元的属性个数同样从正文的那一句枚举里数出来，不写死「九个」。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 2;
const SLUG = '02-e2';
const TITLE = '标准落地不是文件对照，是把要求变成字段';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const hanzi = (s) => (String(s).match(HANZI) || []).length;
const num = (s) => Number(String(s).replace(/[,{}\s]/g, ''));
const fmt = (n) => Number(n).toLocaleString('en-US');
const CN = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
const cn = (s) => (CN[s] !== undefined ? CN[s] : num(s));

function readDoc() {
  return fs.readFileSync(DOC, 'utf8');
}

function headings(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => /^##\s+/.test(line))
    .map((line) => line.replace(/^##\s+/, '').trim());
}

function parseTables(text) {
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

/** 数据元的属性枚举：从「一个数据元通常要描述这些属性：……」里数出来 */
function attributes(text) {
  const m = String(text).match(/一个数据元通常要描述这些属性：([^。]+)/);
  if (!m) throw new Error('正文缺少数据元属性的枚举句');
  const parts = m[1].split('、');
  const tail = parts[parts.length - 1];
  const names = parts.slice(0, -1).map((s) => s.replace(/\*\*/g, '').trim());
  if (/以及/.test(tail)) {
    names.push(tail.split('以及')[0].replace(/，$/, '').trim());
    names.push(tail.replace(/\*\*/g, '').replace(/^.*以及/, '').replace(/^在本课里要额外加上的/, '').trim());
  } else {
    names.push(tail.replace(/\*\*/g, '').trim());
  }
  return { count: names.length, names };
}

/** 落地断点的四个参数：系统数、标识套数、可自动对齐的配对数、记录数与无法对齐比例 */
function params(text) {
  const t = String(text);
  const sys = t.match(/([一二两三四五六七八九十\d]+)\s*个业务系统/);
  const ids = t.match(/[一二两三四五六七八九十\d]+\s*套患者标识（([^）]+)）/);
  const pair = t.match(/能自动对齐的只有\s*([一二两三四五六七八九十\d]+)\s*对/);
  const rec = t.match(/按\s*([\d.]+)\s*万条记录/);
  const pct = t.match(/约\s*([\d.]+)%\s*无法唯一对齐/);
  const stated = t.match(/也就是\s*([\d,]+)\s*条记录/);
  if (!sys || !ids || !pair || !rec || !pct) throw new Error('正文的落地断点参数不全，无法现算');
  return {
    systems: cn(sys[1]),
    ids: ids[1].split('、').map((s) => s.trim()).filter(Boolean),
    aligned: cn(pair[1]),
    N: Math.round(Number(rec[1]) * 10000),
    pct: Number(pct[1]),
    stated: stated ? num(stated[1]) : null,
  };
}

function model(text) {
  const p = params(text);
  const n = p.ids.length;
  const pairs = (n * (n - 1)) / 2;
  return {
    ...p,
    pairs,
    alignedShare: p.aligned / pairs,
    unaligned: Math.round((p.N * p.pct) / 100),
    attrs: attributes(text),
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
    tables: parseTables(t).length,
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
  console.log(`数据元属性  ${m.attrs.count} 项：${m.attrs.names.join('、')}`);
  console.log('');
  console.log(`落地断点：`);
  console.log(`  业务系统            ${m.systems} 个`);
  console.log(`  患者标识            ${m.ids.length} 套（${m.ids.join('、')}）`);
  console.log(`  两两配对            ${m.pairs} 对`);
  console.log(`  可自动对齐          ${m.aligned} 对（${(m.alignedShare * 100).toFixed(1)}%）`);
  console.log(`  记录数              ${fmt(m.N)} 条`);
  console.log(`  无法唯一对齐        ${m.pct}% → ${fmt(m.unaligned)} 条`);
  if (m.stated !== null) {
    console.log(`  正文写法            ${fmt(m.stated)} 条 ${m.stated === m.unaligned ? '（与复算一致）' : '（与复算不一致，需核对）'}`);
  }
  console.log('');
  console.log('※ 数字由本目录 docs/zh.md 现算：系统数、标识套数、配对数、记录数与比例任一变动，重跑本脚本即可看到新值。');
  console.log('※ 本章数值为演算设定或示意配置，用于说明落地环节的典型断点，不对应任何机构的实测统计。');
  console.log('※ 字段标识类型的判定与交换方案设计，须由数据治理责任人与隐私保护责任人共同确认，不构成合规意见。');
}

if (require.main === module) main();

module.exports = { CHAPTER, SLUG, TITLE, DOC, readDoc, headings, parseTables, attributes, params, model, stats, main };
