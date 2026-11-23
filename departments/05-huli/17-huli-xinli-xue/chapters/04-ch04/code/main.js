#!/usr/bin/env node
/**
 * 护理心理学 · 第 4 章 护理对象的心理反应与心理需求
 * 课程: departments/05-huli/17-huli-xinli-xue/chapters/04-ch04/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本脚本只读本章正文与本章 quiz 现算：节数、节标题、汉字数、表格数据行、
 * 引语条数、核心词出现次数、quiz 结构，全部当场读出，不引用 standards/，
 * 也不手打任何数字——手打的数会在正文改版后静默过期，现算的数对不上就报错。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 4;
const SLUG = '04-ch04';
const TITLE = '护理对象的心理反应与心理需求';
const TERMS = ['阶段', '控制感', '需求', '家属'];

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const STAGES = ['pre', 'check', 'post'];

const hanzi = (s) => (s.match(/[\u4e00-\u9fff]/g) || []).length;
const nonWs = (s) => s.replace(/\s/g, '').length;

function readDoc() {
  if (!fs.existsSync(DOC)) throw new Error('缺正文：' + DOC);
  return fs.readFileSync(DOC, 'utf8');
}

function parseDoc(md) {
  const lines = md.split(/\r?\n/);
  const title = ((lines.find((l) => /^#\s+/.test(l)) || '').replace(/^#\s+/, '')).trim();
  const sections = [];
  const tables = [];
  let quotes = 0;
  let cur = null;
  let table = null;
  for (const line of lines) {
    if (/^##\s+/.test(line)) {
      cur = { title: line.replace(/^##\s+/, '').trim(), hanzi: 0, tables: 0 };
      sections.push(cur);
      table = null;
      continue;
    }
    if (/^\|/.test(line)) {
      if (!table) {
        table = { rows: 0 };
        tables.push(table);
        if (cur) cur.tables += 1;
      }
      if (!/^\|[\s:|\-]+\|?\s*$/.test(line)) table.rows += 1;
      continue;
    }
    table = null;
    if (/^\s*>/.test(line)) quotes += 1;
    if (cur) cur.hanzi += hanzi(line);
  }
  const body = lines.filter((l) => !/^#/.test(l)).join('\n');
  const counts = {};
  for (const t of TERMS) counts[t] = (body.match(new RegExp(t, 'g')) || []).length;
  return {
    title,
    lines: lines.length,
    hanzi: hanzi(md),
    chars: nonWs(md),
    sections,
    tables: tables.length,
    tableRows: tables.reduce((a, t) => a + t.rows, 0),
    quotes,
    counts,
    hasMotto: md.includes('MOTTO'),
    hasProblem: md.includes('PROBLEM'),
    hasRoots: md.includes('环境逼迫') && md.includes('知识积累'),
    hasBoundary: lines.some((l) => /^##\s/.test(l) && /代价与边界/.test(l)),
    hasDisclaimer: md.includes('免责声明'),
  };
}

function auditQuiz() {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const qs = q.questions || [];
  const byStage = { pre: 0, check: 0, post: 0 };
  const issues = [];
  const slots = new Set();
  let minExplain = Infinity;
  for (const [i, item] of qs.entries()) {
    const at = `第 ${i + 1} 题`;
    if (!STAGES.includes(item.stage)) issues.push(`${at} stage 非法：${item.stage}`);
    else byStage[item.stage] += 1;
    if (!item.question) issues.push(`${at} 缺题干`);
    if (!Array.isArray(item.options) || item.options.length !== 4) issues.push(`${at} 选项不是 4 个`);
    if (!Number.isInteger(item.correct) || item.correct < 0 || item.correct > 3) {
      issues.push(`${at} correct 不是 0..3 整数`);
    } else {
      slots.add(item.correct);
    }
    const n = hanzi(item.explain || '');
    if (n < 30) issues.push(`${at} explain 只有 ${n} 汉字（<30）`);
    if (n < minExplain) minExplain = n;
  }
  for (const s of STAGES) if (byStage[s] < 1) issues.push(`缺 ${s} 段题目`);
  if (qs.length < 5) issues.push(`总题数 ${qs.length} < 5`);
  if (slots.size < 3) issues.push(`答案位只落在 ${slots.size} 个位置上，未打散`);
  const grounded = qs.filter(
    (x) => x.stage === 'check' && TERMS.some((t) => (x.question || '').includes(t)),
  );
  if (grounded.length < 2) issues.push(`接地 check 题只有 ${grounded.length} 道（<2）`);
  return { n: qs.length, byStage, slots: [...slots].sort(), minExplain, grounded: grounded.length, issues };
}

function report() {
  const s = parseDoc(readDoc());
  const q = auditQuiz();
  console.log(`护理心理学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('');
  console.log(`正文：${s.lines} 行 · ${s.sections.length} 节 · ${s.hanzi} 汉字 · ${s.chars} 非空白字符`);
  console.log(`表格：${s.tables} 张 · ${s.tableRows} 行（含表头）· 引语 ${s.quotes} 条`);
  console.log('结构：' + ['MOTTO', 'PROBLEM', '双根因', '代价与边界', '免责声明']
    .map((k, i) => `${k} ${[s.hasMotto, s.hasProblem, s.hasRoots, s.hasBoundary, s.hasDisclaimer][i] ? '✓' : '✗'}`)
    .join(' · '));
  console.log('');
  console.log('节与篇幅：');
  for (const x of s.sections) console.log(`  ${x.title} — ${x.hanzi} 汉字`);
  console.log('');
  console.log('核心词出现次数（正文全文现数）：');
  for (const t of TERMS) console.log(`  ${t}：${s.counts[t]}`);
  console.log('');
  console.log(
    `quiz：${q.n} 题（pre ${q.byStage.pre} · check ${q.byStage.check} · post ${q.byStage.post}）` +
      `· 答案位 ${q.slots.join('/')} · explain 最短 ${q.minExplain} 汉字 · 接地 check ${q.grounded} 道`,
  );
  console.log(`自检：${q.issues.length === 0 ? '结构 0 处不合规' : q.issues.join('；')}`);
  console.log('');
  console.log(`判读：先判断他在哪一阶段、缺哪一类需求，再开口——同一句「我没事」在不同阶段是不同的事。`);
  console.log('教学边界：本章为教学材料，只训练识别、支持与交接，不写量表切点、剂量与疗程，不构成诊断或治疗依据。');
}

if (require.main === module) report();

module.exports = { CHAPTER, SLUG, TITLE, TERMS, readDoc, parseDoc, auditQuiz, report };
