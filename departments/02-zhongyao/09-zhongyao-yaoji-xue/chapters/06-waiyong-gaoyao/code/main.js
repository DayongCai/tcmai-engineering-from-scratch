#!/usr/bin/env node
/**
 * 中药药剂学 · 第 6 章 外用药没有换方子，换的是它绕过角质层的办法：教材单元数与字数、词频与本章习题自检
 * 课程: departments/02-zhongyao/09-zhongyao-yaoji-xue/chapters/06-waiyong-gaoyao/docs/zh.md
 * 数据: standards/zhongyao-yaoji/units.json（教材单元层，按章节的 KEYS 取单元）
 *       ../docs/zh.md（正文） + ../quiz.json（习题）
 * 依赖: 仅 Node.js 标准库
 *
 * 输出三段，全部现算、不手打：
 *   一、单元层：本章单元数、汉字规模、按教材章的分布、教材单元侧重与分散体系标注的词频、引书
 *   二、正文层：docs/zh.md 的汉字数、二级节数、表格数
 *   三、习题层：quiz.json 的题量、阶段分布、接地题数与最短解释长度
 * 任一段不达契约即 exit 1：改字或改题后重跑即可复现，不必回来改脚本里的常数。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DIR = __dirname;
const DOC = path.join(DIR, '..', 'docs', 'zh.md');
const QUIZ = path.join(DIR, '..', 'quiz.json');

const CHAPTER = '6';
const TITLE = "外用药没有换方子，换的是它绕过角质层的办法";
const KEYS = ["3.1.1","3.1.2","10.1.1","10.1.2","10.2.1","10.2.2"];
const STD = 'zhongyao-yaoji';
const VIEW_LABEL = '教材单元侧重';
const LEVEL_LABEL = '分散体系标注';
const TERMS = ["处方","工艺","质量","溶液型","胶体型","乳浊型","混悬与固体"];
const OPS = ["灭菌","干燥","制粒","压片","包衣","灌装","溶出","崩解","释放","验证","洁净","除菌"];

function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, 'standards', STD, 'units.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/' + STD + '/units.json —— 章节目录是否已脱离仓库？');
}

const ROOT = findRoot(DIR);
const UNITS = path.join(ROOT, 'standards', STD, 'units.json');

const sum = (d) => Object.values(d).reduce((a, b) => a + b, 0);
const hanzi = (s) => (String(s || '').match(/[\u4e00-\u9fff]/g) || []).length;

/** 教材单元层 */
function load() {
  return JSON.parse(fs.readFileSync(UNITS, 'utf8'));
}

function chapterUnits(units) {
  return units.units
    .filter((u) => KEYS.includes(u.sub))
    .sort((a, b) => a.sub.localeCompare(b.sub, 'en', { numeric: true }));
}

function merge(list, field) {
  const out = {};
  for (const u of list) {
    const src = (u.measure && u.measure[field]) || {};
    for (const [k, v] of Object.entries(src)) out[k] = (out[k] || 0) + v;
  }
  return out;
}

function rank(dict) {
  const tot = sum(dict);
  return Object.entries(dict)
    .map(([key, count]) => ({ key, count, share: tot ? count / tot : 0 }))
    .sort((a, b) => b.count - a.count);
}

function byBookSection(list) {
  const out = new Map();
  for (const u of list) {
    const key = '教材第' + u.chapter + '章';
    const it = out.get(key) || { sec: key, units: 0, hanzi: 0 };
    it.units += 1;
    it.hanzi += u.hanzi;
    out.set(key, it);
  }
  return [...out.values()];
}

function citations(list) {
  const counter = new Map();
  for (const u of list) {
    for (const m of String(u.prose || '').matchAll(/《([^》]+)》/g)) counter.set(m[1], (counter.get(m[1]) || 0) + 1);
  }
  const ranked = [...counter.entries()].sort((a, b) => b[1] - a[1]);
  return { books: counter.size, total: sum(Object.fromEntries(counter)), top: ranked.slice(0, 3) };
}

function shape(list) {
  const h = list.reduce((a, u) => a + u.hanzi, 0);
  return {
    units: list.length,
    hanzi: h,
    mean: list.length ? Math.round(h / list.length) : 0,
    valueLike: list.reduce((a, u) => a + ((u.measure && u.measure.valueLike) || 0), 0),
    digits: list.reduce((a, u) => a + ((u.measure && u.measure.digits) || 0), 0),
  };
}

/** 本章的操作词：中药课看煎服与禁忌，药剂课看制备与检验 */
function hands(list) {
  const pairs = OPS.map((w) => [w, list.reduce((a, u) => a + String(u.prose || '').split(w).length - 1, 0)]);
  return pairs.filter(([, c]) => c).sort((a, b) => b[1] - a[1]);
}

/** 某个词在本章教材单元原文里的出现次数 */
function termCount(list, term) {
  return list.reduce((a, u) => a + String(u.prose || '').split(term).length - 1, 0);
}

/** 正文层 */
function docShape() {
  const text = fs.readFileSync(DOC, 'utf8');
  return {
    hanzi: hanzi(text),
    sections: (text.match(/^## /gm) || []).length,
    tables: (text.match(/^\|[-\s|:]+\|$/gm) || []).length,
  };
}

/** 习题层：接地按官方门的口径（正文按非汉字切段后取 4 字滑窗） */
function quizShape() {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const qs = q.questions || [];
  const body = new Set();
  const clean = fs.readFileSync(DOC, 'utf8').replace(/[^\u4e00-\u9fff]/g, ' ');
  for (const seg of clean.split(/\s+/)) for (let i = 0; i + 4 <= seg.length; i += 1) body.add(seg.slice(i, i + 4));
  const grounded = qs.filter((it) => {
    if (it.stage !== 'check') return false;
    const opt = String((it.options || [])[it.correct] || '').replace(/[^\u4e00-\u9fff]/g, '');
    for (let i = 0; i + 4 <= opt.length; i += 1) if (body.has(opt.slice(i, i + 4))) return true;
    return false;
  });
  const stages = { pre: 0, check: 0, post: 0 };
  for (const it of qs) stages[it.stage] = (stages[it.stage] || 0) + 1;
  const explains = qs.map((it) => hanzi(it.explain || it.explanation || ''));
  return {
    total: qs.length,
    stages,
    optionsOk: qs.every((it) => (it.options || []).length === 4 && new Set((it.options || []).map(String)).size === 4),
    correctOk: qs.every((it) => Number.isInteger(it.correct) && it.correct >= 0 && it.correct < 4),
    grounded: grounded.length,
    minExplain: explains.length ? Math.min(...explains) : 0,
  };
}

function report() {
  const list = chapterUnits(load());
  const s = shape(list);
  return {
    chapter: CHAPTER,
    title: TITLE,
    units: s.units,
    keys: KEYS,
    hanzi: s.hanzi,
    mean: s.mean,
    digits: s.digits,
    valueLike: s.valueLike,
    book: byBookSection(list),
    views: rank(merge(list, 'views')),
    levels: rank(merge(list, 'levels')),
    cites: citations(list),
    ops: hands(list),
    terms: Object.fromEntries(TERMS.map((t) => [t, termCount(list, t)])),
    doc: docShape(),
    quiz: quizShape(),
  };
}

function checksPass(r) {
  const p = [];
  if (r.units !== KEYS.length) p.push('本章单元数 ' + r.units + ' 与 KEYS ' + KEYS.length + ' 不一致');
  if (!(r.hanzi > 0)) p.push('单元汉字数为 0');
  if (r.doc.hanzi < 2500) p.push('正文只有 ' + r.doc.hanzi + ' 汉字（要 ≥2500）');
  if (r.doc.sections < 4) p.push('正文二级节只有 ' + r.doc.sections + '（要 ≥4）');
  if (r.quiz.total < 5) p.push('习题只有 ' + r.quiz.total + ' 题（要 ≥5）');
  for (const s of ['pre', 'check', 'post']) if (!r.quiz.stages[s]) p.push('习题缺 ' + s + ' 阶段');
  if (!r.quiz.optionsOk) p.push('有题不是 4 个互异选项');
  if (!r.quiz.correctOk) p.push('有题 correct 下标非法');
  if (r.quiz.minExplain < 30) p.push('最短解释只有 ' + r.quiz.minExplain + ' 汉字（要 ≥30）');
  if (r.quiz.grounded < 2) p.push('接地 check 题只有 ' + r.quiz.grounded + ' 道（要 ≥2）');
  const hitTerms = TERMS.filter((t) => r.terms[t] > 0).length;
  if (hitTerms < 2) p.push('本章单元原文里可识别的范畴只有 ' + hitTerms + ' 个（要 ≥2）');
  return p;
}

function main() {
  const r = report();
  console.log('═══ ' + '中药药剂学' + ' · 第 ' + r.chapter + ' 章 ' + r.title + ' ═══');
  console.log('教材单元 ' + r.units + ' 个 · 汉字 ' + r.hanzi + ' · 平均 ' + r.mean + ' 字/单元 · 数值类命中 ' + r.valueLike + ' · 数字字符 ' + r.digits);
  console.log('单元号：' + r.keys.join('、'));
  console.log('\n按教材章：');
  for (const s of r.book) console.log('  ' + s.sec + '  ' + s.units + ' 单元 · ' + s.hanzi + ' 字');
  console.log('\n' + VIEW_LABEL + '（词频）：');
  for (const v of r.views) console.log('  ' + v.key + '\t' + v.count + '\t' + (v.share * 100).toFixed(1) + '%');
  console.log('\n' + LEVEL_LABEL + '（覆盖）：');
  for (const v of r.levels) console.log('  ' + v.key + '\t' + v.count + '\t' + (v.share * 100).toFixed(1) + '%');
  const c = r.cites;
  console.log('\n引书 ' + c.books + ' 部 · 引用 ' + c.total + ' 次' + (c.top.length ? ' · 前三：' + c.top.map((x) => x[0] + '(' + x[1] + ')').join('、') : ''));
  console.log('操作词命中：' + (r.ops.map((x) => x[0] + '×' + x[1]).join('  ') || '（无）'));
  console.log('\n正文：' + r.doc.hanzi + ' 汉字 · 二级节 ' + r.doc.sections + ' · 表格 ' + r.doc.tables);
  console.log('习题：' + r.quiz.total + ' 题（pre ' + r.quiz.stages.pre + '／check ' + r.quiz.stages.check + '／post ' + r.quiz.stages.post + '）· 接地 ' + r.quiz.grounded + ' 道 · 最短解释 ' + r.quiz.minExplain + ' 汉字');
  const problems = checksPass(r);
  if (problems.length) {
    console.error('自检未通过：');
    for (const s of problems) console.error('  - ' + s);
    process.exitCode = 1;
    return;
  }
  console.log('※ 以上数字由本脚本从 units.json、docs/zh.md 与 quiz.json 现算；教学样例，不构成诊疗建议，不能替代医师面诊。');
}

if (require.main === module) main();

module.exports = {
  CHAPTER,
  KEYS,
  load,
  chapterUnits,
  merge,
  rank,
  byBookSection,
  citations,
  shape,
  hands,
  sum,
  termCount,
  docShape,
  quizShape,
  report,
  checksPass,
  main,
  DOC,
  QUIZ,
  STD,
  TERMS,
  OPS,
  VIEW_LABEL,
  LEVEL_LABEL,
};
