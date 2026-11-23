#!/usr/bin/env node
/**
 * 中医毕业设计与知识移交 · 章节复算公共层
 *
 * 约定：每章 code/main.js 只做两件事——
 *   1. 从本章 docs/zh.md 读出正文自己写下的锚点数，按正文给的算式重算一遍；
 *   2. 从 standards/biye/案例库.json 取同 slug 案例的预算参数，重算回本月数与三年毛利。
 * 任何一处与正文或案例库对不上，脚本直接抛错，不打印「大概正确」。
 *
 * 依赖：仅 Node.js 标准库。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, 'standards', 'biye', '案例库.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/biye/案例库.json —— 章节目录是否已脱离仓库？');
}

const ROOT = findRoot(__dirname);
const CASEBOOK = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards', 'biye', '案例库.json'), 'utf8'));

/** 去掉千分位后转数字 */
const num = (s) => Number(String(s).replace(/,/g, '').trim());

/** 读本章正文 */
function readDoc(slug) {
  const file = path.join(__dirname, slug, 'docs', 'zh.md');
  if (!fs.existsSync(file)) throw new Error('找不到本章正文：' + file);
  return { file, text: fs.readFileSync(file, 'utf8') };
}

/** 正文里形如「| 标签 | 数 |」的锚点表，取每行前两列 */
function tableMap(text) {
  const out = new Map();
  for (const line of String(text).split(/\r?\n/)) {
    const m = line.match(/^\|\s*([^|]{1,28}?)\s*\|\s*([\d,]+(?:\.\d+)?)\s*[^|]*\|/);
    if (!m) continue;
    const key = m[1].trim().replace(/[*`]/g, '');
    if (!out.has(key)) out.set(key, num(m[2]));
  }
  return out;
}

/** 从正文里抓一个带标签的数；抓不到即报错，避免静默用旧值 */
function grab(text, re, label) {
  const m = String(text).match(re);
  if (!m) throw new Error('正文缺少锚点：' + label);
  return num(m[1]);
}

/** 本章对应案例（chapter 1 没有案例，返回 null） */
function caseOf(slug) {
  return CASEBOOK.cases.find((c) => c.slug === slug) || null;
}

/**
 * 预算复算：只用案例库给出的原始参数，不读别人算好的结果列。
 * 建设成本 = 人月 × 20,000 + 27,400；首年收入 = 首年客户 × 客单；
 * 三年收入 = (首年客户 × 4 + 三年客户) × 客单；回本 = (建设 + 获客) ÷ 月收入。
 */
const BUILD_MONTH = 20000;
const BUILD_FIXED = 27400;

function budget(slug) {
  const c = caseOf(slug);
  if (!c) return null;
  const b = c.market.budget;
  const build = b.人月 * BUILD_MONTH + BUILD_FIXED;
  const firstRevenue = b.首年客户 * b.客单;
  const threeRevenue = (b.首年客户 * 4 + b.三年客户) * b.客单;
  const totalCost = build + b.获客成本 + b.三年运维;
  const payback = Number(((build + b.获客成本) / (firstRevenue / 12)).toFixed(1));
  const gross = threeRevenue - totalCost;
  const mismatch = [];
  const eq = (name, got, want) => {
    if (Math.abs(got - want) > 0.051) mismatch.push(`${name} 复算 ${got} ≠ 案例库 ${want}`);
  };
  eq('首年投入', build, b.首年投入);
  eq('首年收入', firstRevenue, b.首年收入);
  eq('三年收入', threeRevenue, b.三年收入);
  eq('三年总成本', totalCost, b.三年总成本);
  eq('三年毛利', gross, b.三年毛利);
  eq('回本月数', payback, b.回本月数);
  return { c, b, build, firstRevenue, threeRevenue, totalCost, payback, gross, mismatch };
}

/** 汉字数（与习题门同一口径） */
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

/** 4 字连续片段，用于判断选项是否真的出现在正文 */
function shingles(text, n = 4) {
  const clean = String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ');
  const out = new Set();
  for (const seg of clean.split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

/** 与 scripts/check_chapter_exercises.js 同源的脚手架指纹 */
const FINGERPRINTS = [/三辨/, /四位面/, /单元规模/, /本章实测/, /本课第\s*\d+\s*章[（(]/, /见\s*code\/main\.js\s*输出/];
const hasTpl = (s) => FINGERPRINTS.some((re) => re.test(String(s)));

/** 按习题门规则审计 quiz.json，返回问题清单（空数组即合格） */
function auditQuiz(slug, docText) {
  const file = path.join(__dirname, slug, 'quiz.json');
  const raw = fs.readFileSync(file, 'utf8');
  const q = JSON.parse(raw);
  const qs = Array.isArray(q.questions) ? q.questions : [];
  const problems = [];
  if (hasTpl(raw)) problems.push('quiz 仍含脚手架指纹');
  if (qs.length < 5) problems.push(`只有 ${qs.length} 题（需 ≥5）`);
  const stages = new Set(qs.map((x) => x.stage));
  for (const s of ['pre', 'check', 'post']) if (!stages.has(s)) problems.push(`缺 ${s} 段`);
  const body = shingles(docText);
  let grounded = 0;
  for (const item of qs) {
    const opts = Array.isArray(item.options) ? item.options : [];
    if (opts.length !== 4) problems.push(`「${item.question}」不是 4 选项`);
    if (!(Number.isInteger(item.correct) && item.correct >= 0 && item.correct < opts.length)) {
      problems.push(`「${item.question}」correct 下标非法`);
    }
    const why = item.explain || item.explanation || '';
    if (hanzi(why) < 30) problems.push(`「${item.question}」explain 只有 ${hanzi(why)} 汉字`);
    if (item.stage === 'check') {
      const right = String(opts[item.correct] || '');
      if ([...shingles(right)].some((g) => body.has(g))) grounded += 1;
    }
  }
  if (grounded < 2) problems.push(`只有 ${grounded} 道 check 题的正确选项能在正文找到原词（需 ≥2）`);
  return { q, qs, stages: [...stages], grounded, problems, spread: qs.map((x) => x.correct) };
}

/** 打印章节头与复算结论；调用方逐条加自己的锚点 */
function banner(no, title) {
  console.log(`═══ 中医毕业设计与知识移交 · 第 ${no} 章 ${title} ═══`);
}

/** 统一收尾：预算核对 + 习题结构 + 边界声明 */
function finish(slug, budgetInfo, audit) {
  if (budgetInfo) {
    const b = budgetInfo.b;
    console.log('\n案例预算复算（案例库参数 → 现算）：');
    console.log(`  人月 ${b.人月} · 建设 ${budgetInfo.build.toLocaleString('en-US')} · 获客 ${b.获客成本.toLocaleString('en-US')}`);
    console.log(`  首年客户 ${b.首年客户} → 首年收入 ${budgetInfo.firstRevenue.toLocaleString('en-US')}；三年客户 ${b.三年客户} → 三年收入 ${budgetInfo.threeRevenue.toLocaleString('en-US')}`);
    console.log(`  回本 = (建设 ${budgetInfo.build.toLocaleString('en-US')} + 获客 ${b.获客成本.toLocaleString('en-US')}) ÷ 月收入 ${(budgetInfo.firstRevenue / 12).toLocaleString('en-US', { maximumFractionDigits: 2 })} = ${budgetInfo.payback} 个月`);
    console.log(`  三年毛利 = 三年收入 − 总成本 = ${budgetInfo.gross.toLocaleString('en-US')}`);
    if (budgetInfo.mismatch.length) throw new Error('预算复算与案例库不一致：' + budgetInfo.mismatch.join('；'));
  }
  console.log(`\n习题结构：${audit.qs.length} 题 · stage ${audit.stages.join('/')} · check 接地 ${audit.grounded} 道 · 答案位 ${audit.spread.join(',')}`);
  if (audit.problems.length) throw new Error('习题门问题：' + audit.problems.join('；'));
  console.log('※ 教学样例：锚点由本章正文读出并复算，不构成诊疗建议，不能替代医师面诊。');
}

module.exports = {
  ROOT,
  CASEBOOK,
  num,
  readDoc,
  tableMap,
  grab,
  caseOf,
  budget,
  hanzi,
  shingles,
  hasTpl,
  auditQuiz,
  banner,
  finish,
};
