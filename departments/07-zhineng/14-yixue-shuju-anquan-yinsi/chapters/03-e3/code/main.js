#!/usr/bin/env node
/**
 * 医学数据安全与隐私 · 第 3 章 合规的底线是分级，不是覆盖率
 * 正文: departments/07-zhineng/14-yixue-shuju-anquan-yinsi/chapters/03-e3/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 口径：字段数、脱敏字段数、覆盖率、两条轴的档数与交叉出的格子数，全部由 docs/zh.md 现算。
 * 覆盖率是本章要推翻的指标，所以代码把它算出来，再算一遍它管不到的那一格。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 3;
const SLUG = '03-e3';
const TITLE = '合规的底线是分级，不是覆盖率';
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

/** 章首的两张对照表参数 */
function params(text) {
  const t = String(text);
  const fields = t.match(/一张\s*(\d+)\s*字段的住院数据集/);
  const covered = t.match(/覆盖了\s*(\d+)\s*个字段/);
  const covPct = t.match(/覆盖率\s*([\d.]+)%/);
  const keptPct = t.match(/只留性别、出生日期与邮编三列，覆盖率\s*([\d.]+)%/);
  const dataLevels = t.match(/通常分\s*([一二两三四五六七八九十\d]+)\s*级/);
  const sensTiers = t.match(/分\s*([一二两三四五六七八九十\d]+)\s*档——一般个人信息/);
  const gridStated = t.match(/交叉得到\s*([一二两三四五六七八九十\d]+)\s*个格子/);
  if (!fields || !covered || !covPct || !keptPct || !dataLevels || !sensTiers || !gridStated) {
    throw new Error('正文的分级与覆盖率参数不全，无法现算');
  }
  return {
    fields: num(fields[1]),
    covered: num(covered[1]),
    covPct: Number(covPct[1]),
    keptPct: Number(keptPct[1]),
    kept: 3,
    dataLevels: cn(dataLevels[1]),
    sensTiers: cn(sensTiers[1]),
    gridStated: cn(gridStated[1]),
  };
}

function model(text) {
  const p = params(text);
  const cov = (p.covered / p.fields) * 100;
  const keptCovered = p.fields - p.kept;
  const keptCov = (keptCovered / p.fields) * 100;
  const missRate = ((p.fields - p.covered) / p.fields) * 100;
  return {
    ...p,
    cov,
    covMatches: Math.abs(cov - p.covPct) < 0.05,
    keptCovered,
    keptCov,
    keptCovMatches: Math.abs(keptCov - p.keptPct) < 0.05,
    missRate,
    grid: p.dataLevels * p.sensTiers,
    gridMatches: p.dataLevels * p.sensTiers === p.gridStated,
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
  console.log('两个覆盖率，同一张表：');
  console.log(`  脱敏 ${m.covered}/${m.fields} 个字段  → ${m.cov.toFixed(1)}%（正文写 ${m.covPct}%，${m.covMatches ? '一致' : '不一致'}）`);
  console.log(`  漏掉 ${m.missRate.toFixed(1)}% 的字段：如果漏的是姓名，匿名度仍是零，每个人都是 k=1`);
  console.log(`  只留三列，脱敏 ${m.keptCovered}/${m.fields} → ${m.keptCov.toFixed(1)}%（正文写 ${m.keptPct}%，${m.keptCovMatches ? '一致' : '不一致'}）`);
  console.log(`  只留三列，仍能在五万条记录里圈出近九成的人`);
  console.log('');
  console.log('分级的格子：');
  console.log(`  数据重要性 ${m.dataLevels} 级 × 个人信息敏感 ${m.sensTiers} 档 = ${m.grid} 个格子（正文写 ${m.gridStated} 个，${m.gridMatches ? '一致' : '不一致'}）`);
  console.log(`  每个格子一套控制强度：访问控制、加密、日志期限、审批与审计的组合各不相同`);
  console.log('');
  console.log('※ 数字由本目录 docs/zh.md 现算：字段数、脱敏数、档数与格子数任一变动，重跑本脚本即可看到新值。');
  console.log('※ 本章数值为演算设定与示意配置，用于说明指标失效的机制，不构成合规结论或分级结果。');
  console.log('※ 具体分级须依现行规定、行业目录与本机构数据治理委员会判定。');
}

if (require.main === module) main();

module.exports = { CHAPTER, SLUG, TITLE, DOC, readDoc, headings, parseTables, params, model, stats, main };
