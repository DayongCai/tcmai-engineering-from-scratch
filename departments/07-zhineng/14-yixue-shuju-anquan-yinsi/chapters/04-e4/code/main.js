#!/usr/bin/env node
/**
 * 医学数据安全与隐私 · 第 4 章 同意不是一次签字，是一段可撤回的授权
 * 正文: departments/07-zhineng/14-yixue-shuju-anquan-yinsi/chapters/04-e4/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 口径：病历总量、接通率、应答率、最终覆盖率，全部由 docs/zh.md 现算；
 * 用途矩阵的行列数从正文那张表数出来，不写死「六行三列」。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 4;
const SLUG = '04-e4';
const TITLE = '同意不是一次签字，是一段可撤回的授权';
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

/** markdown 表拆分：返回 [{rows: string[][]}]，供数行列用 */
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

/** 章首的可行性演算参数 */
function params(text) {
  const t = String(text);
  const total = t.match(/十年的\s*([\d.]+)\s*万份病历/);
  const reach = t.match(/接通率按\s*([\d.]+)%\s*算/);
  const consent = t.match(/愿意签的按\s*([\d.]+)%\s*算/);
  const final = t.match(/最终覆盖\s*([\d.]+)\s*万人/);
  const share = t.match(/占\s*([\d.]+)%/);
  if (!total || !reach || !consent || !final || !share) throw new Error('正文的同意可行性参数不全，无法现算');
  return {
    total: Math.round(Number(total[1]) * 10000),
    reach: Number(reach[1]),
    consent: Number(consent[1]),
    finalStated: Math.round(Number(final[1]) * 10000),
    shareStated: Number(share[1]),
  };
}

/** 二次利用矩阵：几行用途、几种数据形态、共几格 */
function matrix(text) {
  const t = parseCells(text).find((tb) => tb.rows.length && tb.rows[0].some((c) => c.includes('原文')));
  if (!t) throw new Error('正文缺少二次利用的用途矩阵');
  const header = t.rows[0];
  return {
    uses: t.rows.length - 1,
    forms: header.length - 1,
    cells: (t.rows.length - 1) * (header.length - 1),
    usesList: t.rows.slice(1).map((r) => r[0]),
    formsList: header.slice(1),
  };
}

function model(text) {
  const p = params(text);
  const reached = Math.round((p.total * p.reach) / 100);
  const consented = Math.round((reached * p.consent) / 100);
  const share = (consented / p.total) * 100;
  return {
    ...p,
    reached,
    consented,
    share,
    shareMatches: Math.abs(share - p.shareStated) < 0.5,
    finalMatches: consented === p.finalStated,
    lost: p.total - consented,
    m: matrix(text),
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
  console.log('逐人同意的可行性演算：');
  console.log(`  病历总量            ${fmt(m.total)} 份`);
  console.log(`  接通                ${m.reach}% → ${fmt(m.reached)} 人`);
  console.log(`  愿意签              ${m.consent}% → ${fmt(m.consented)} 人`);
  console.log(`  最终覆盖率          ${m.share.toFixed(1)}%（正文写 ${m.shareStated}%，${m.shareMatches ? '一致' : '不一致'}）`);
  console.log(`  正文写的覆盖人数    ${fmt(m.finalStated)} 人（${m.finalMatches ? '与复算一致' : '与复算不一致'}）`);
  console.log(`  落在样本之外        ${fmt(m.lost)} 人，且不是随机缺失：转诊、死亡、重症与流动人口恰好被排除`);
  console.log('');
  console.log('二次利用矩阵：');
  console.log(`  用途 ${m.m.uses} 行 × 数据形态 ${m.m.forms} 列 = ${m.m.cells} 格`);
  console.log(`  用途：${m.m.usesList.join('、')}`);
  console.log(`  形态：${m.m.formsList.join('、')}`);
  console.log('');
  console.log('※ 数字由本目录 docs/zh.md 现算：病历总量、接通率、应答率任一变动，重跑本脚本即可看到新值。');
  console.log('※ 本章数值为演算设定，用于说明逐人同意的可行性与偏倚方向，不构成伦理审查结论。');
  console.log('※ 免除同意的适用须依现行规定与伦理委员会的审查结论，本章不给「可以直接免除」的结论。');
}

if (require.main === module) main();

module.exports = { CHAPTER, SLUG, TITLE, DOC, readDoc, headings, parseCells, params, matrix, model, stats, main };
