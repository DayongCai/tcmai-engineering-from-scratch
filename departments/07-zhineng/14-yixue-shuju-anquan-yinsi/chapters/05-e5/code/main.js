#!/usr/bin/env node
/**
 * 医学数据安全与隐私 · 第 5 章 风险不是漏洞清单，是可能性乘影响
 * 正文: departments/07-zhineng/14-yixue-shuju-anquan-yinsi/chapters/05-e5/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 口径：三张风险单的暴露条数、单条影响与年发生概率，全部由 docs/zh.md 现算，
 * 再与正文写出的期望损失逐个对账。排序不靠感觉，靠乘法。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 5;
const SLUG = '05-e5';
const TITLE = '风险不是漏洞清单，是可能性乘影响';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const hanzi = (s) => (String(s).match(HANZI) || []).length;
const num = (s) => Number(String(s).replace(/[,{}\s]/g, ''));
const fmt = (n) => Number(n).toLocaleString('en-US');
const wan = (n) => n / 10000;

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

/** 三张风险单：暴露条数、单条影响、年发生概率，以及正文算出的期望损失 */
function params(text) {
  const t = String(text);
  const c1 = t.match(/(\d+)\s*条随访记录/);
  const c2 = t.match(/([\d.]+)\s*万条住院记录/);
  const c3 = t.match(/约\s*([\d.]+)\s*万份病历/);
  const units = t.match(/按单条影响\s*([^。]+?)演算/);
  const probs = t.match(/年度发生概率按\s*([^。]+?)估计/);
  const stated = t.match(/期望损失是\s*([^。]+)/);
  if (!c1 || !c2 || !c3 || !units || !probs || !stated) throw new Error('正文的风险单参数不全，无法现算');
  const pick = (s) => (String(s).match(/\d+(?:,\d{3})*(?:\.\d+)?/g) || []).map(num);
  const count = [num(c1[1]), Math.round(Number(c2[1]) * 10000), Math.round(Number(c3[1]) * 10000)];
  const unit = pick(units[1]);
  const prob = pick(probs[1]);
  const statedWan = pick(stated[1]);
  if (count.length !== 3 || unit.length !== 3 || prob.length !== 3 || statedWan.length !== 3) {
    throw new Error(`三张风险单的维度不足：count=${count.length} unit=${unit.length} prob=${prob.length} stated=${statedWan.length}`);
  }
  return { count, unit, prob, statedWan };
}

function model(text) {
  const p = params(text);
  const rows = p.count.map((n, i) => {
    const impact = n * p.unit[i];
    const expected = impact * p.prob[i];
    return {
      n,
      unit: p.unit[i],
      impact,
      prob: p.prob[i],
      expected,
      stated: p.statedWan[i],
      match: Math.abs(wan(expected) - p.statedWan[i]) < 0.01,
    };
  });
  const byExpected = rows.map((r, i) => ({ i, expected: r.expected })).sort((a, b) => b.expected - a.expected);
  const byImpact = rows.map((r, i) => ({ i, impact: r.impact })).sort((a, b) => b.impact - a.impact);
  return {
    rows,
    byExpected,
    byImpact,
    sameOrder: byExpected.every((r, k) => r.i === byImpact[k].i),
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
  console.log('三张风险单（暴露条数 × 单条影响 = 影响，影响 × 年概率 = 期望损失）：');
  const names = ['笔记本丢失', '接口越权', '模型复述'];
  m.rows.forEach((r, i) => {
    console.log(
      `  ${names[i].padEnd(6, '　')} ${String(fmt(r.n)).padStart(7)} 条 × ${String(r.unit).padStart(3)} 元 = ${fmt(r.impact).padStart(11)} 元`
      + ` · P=${r.prob} · 期望 ${fmt(Math.round(r.expected)).padStart(10)} 元（${wan(r.expected).toFixed(2)} 万）`
      + ` ${r.match ? '✓' : '✗ 与正文不符'}`
    );
  });
  console.log('');
  console.log(`  按影响排序：${m.byImpact.map((r) => names[r.i]).join(' > ')}`);
  console.log(`  按期望排序：${m.byExpected.map((r) => names[r.i]).join(' > ')}`);
  console.log(`  两种排序${m.sameOrder ? '一致' : '不一致'}——量级差三到四个数量级，排序与「哪张最容易整改」无关`);
  console.log('');
  console.log('※ 数字由本目录 docs/zh.md 现算：暴露条数、单条影响、发生概率任一变动，重跑本脚本即可看到新值。');
  console.log('※ 本章数值为演算设定，用于演示数量级优先的排序方法，不对应任何机构的实测损失或行业统计。');
  console.log('※ 期望损失只是排序工具，不能替代对高损低频事件的单独评估，不构成安全评估结论。');
}

if (require.main === module) main();

module.exports = { CHAPTER, SLUG, TITLE, DOC, readDoc, headings, parseCells, params, model, stats, main };
