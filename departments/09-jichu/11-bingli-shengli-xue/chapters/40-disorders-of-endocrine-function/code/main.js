#!/usr/bin/env node
/**
 * 病理生理学 · 第 40 章 内分泌功能紊乱
 * 课程: departments/09-jichu/11-bingli-shengli-xue/chapters/40-disorders-of-endocrine-function/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的一切数字都由本脚本从 docs/zh.md 现算：规模、段数、引证、节号覆盖、
 * 数值型命中与锚点落位。不读外部数据层，也不比对讲义副本；正文改一处，重跑即复现。
 * 手打数字会在正文改版后静默过期，所以只做读取与计数，不抄任何结论。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 40;
const TITLE = "内分泌功能紊乱";
const SLUG = "40-disorders-of-endocrine-function";
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

/** 本章的两个锚点：从正文里选出的落点，用来核“同一件事是否只在一处说” */
const ANCHORS = ["甲状腺","肾上腺"];

const BOUNDARY = '教学边界：本章只说明病理生理学的类别与关系，不写数值与单位与正常值，不构成诊断/用药依据';

const VALUE_RE = /[0-9]+(\.[0-9]+)?\s*(mmHg|kPa|℃|mmol|μmol|mg|μg|ng|g\/L|mol|%|次\/分|mL|ml|L\/min|kg|cm|mm|U\/L|IU|s|秒|分钟|小时|天)/g;

const nonWs = (s) => String(s).replace(/\s/g, '').length;
const hanzi = (s) => (String(s).match(/[\u4e00-\u9fff]/g) || []).length;

function readDoc() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8');
}

/** 按 H2 切节；H1 行不计入规模，标题改写不影响统计 */
function sectionsOf(doc) {
  const lines = doc.split(/\r?\n/).slice(1);
  const out = [{ title: '前言', lines: [] }];
  let inFence = false;
  for (const l of lines) {
    if (/^```/.test(l)) { inFence = !inFence; continue; }
    if (inFence) continue;
    if (/^##\s+/.test(l)) { out.push({ title: l.replace(/^##\s+/, '').trim(), lines: [] }); continue; }
    out[out.length - 1].lines.push(l);
  }
  return out;
}

function shape(doc) {
  const lines = doc.split(/\r?\n/);
  const body = lines.slice(1);
  let inFence = false;
  let paras = 0;
  let h2 = 0;
  let h3 = 0;
  for (const l of lines) {
    if (/^```/.test(l)) { inFence = !inFence; continue; }
    if (inFence) continue;
    if (/^###\s+/.test(l)) { h3 += 1; continue; }
    if (/^##\s+/.test(l)) { h2 += 1; continue; }
    if (/^#\s+/.test(l)) continue;
    if (!l.trim() || /^\|/.test(l)) continue;
    if (!/^[-*]\s+/.test(l) && !/^\d+\.\s+/.test(l) && !/^>/.test(l)) paras += 1;
  }
  return { lines: lines.length, h2, h3, paras, hanzi: hanzi(body.join('\n')), chars: nonWs(body.join('\n')) };
}

const CITE_RE = /补充·hermes-病理生理学讲义·第\s*(\d+)\s*章·(\d+\.\d+)/g;

/** 引证核验：章号必须等于本章，节号前缀也必须等于本章（防跨章复制） */
function citationAudit(doc, no = CHAPTER) {
  const cites = [...doc.matchAll(CITE_RE)].map((m) => ({ ch: Number(m[1]), sec: m[2] }));
  const distinct = [...new Set(cites.map((c) => c.sec))];
  return {
    total: cites.length,
    wrongChapter: cites.filter((c) => c.ch !== no),
    distinct,
    prefixMismatch: distinct.filter((s) => Number(s.split('.')[0]) !== no),
  };
}

/** 数值核验：正文是否混进了“数字＋计量单位” */
function valueAudit(doc) {
  const lines = doc.split(/\r?\n/).filter((l) => !/^`/.test(l));
  const offenders = [];
  for (const l of lines) {
    const m = l.match(VALUE_RE);
    if (m) offenders.push(m.join('、'));
  }
  return { hits: offenders.length, offenders };
}

/** 锚点落位：每个锚点出现在哪几节 */
function anchorCoverage(doc, anchors = ANCHORS) {
  const secs = sectionsOf(doc);
  const out = {};
  for (const a of anchors) out[a] = secs.filter((s) => (s.title + '\n' + s.lines.join('\n')).includes(a)).map((s) => s.title);
  return out;
}

function bySection(doc) {
  return sectionsOf(doc).map((s) => ({
    title: s.title,
    paras: s.lines.filter((l) => l.trim() && !/^\|/.test(l) && !/^>/.test(l) && !/^[-*]\s+/.test(l) && !/^\d+\.\s+/.test(l)).length,
    hanzi: hanzi(s.lines.join('')),
  }));
}

function main() {
  const doc = readDoc();
  const s = shape(doc);
  const cites = citationAudit(doc);
  const values = valueAudit(doc);
  const anchors = anchorCoverage(doc);
  const secs = bySection(doc);
  const heavy = secs.slice(1).sort((a, b) => b.hanzi - a.hanzi)[0] || secs[0];

  console.log(`═══ ${TITLE}（病理生理学 第${CHAPTER}章 · ${SLUG}）═══`);
  console.log(`正文规模: ${s.lines} 行 · ${s.h2} 节 · ${s.h3} 小节 · ${s.paras} 段 · ${s.hanzi} 汉字 · ${s.chars} 非空白字符`);
  console.log(`引证: ${cites.total} 条 · 引到别章 ${cites.wrongChapter.length} 条 · 节号前缀不符 ${cites.prefixMismatch.length} 个 · 涉及节号 ${cites.distinct.length} 个`);
  console.log(`数值型命中: ${values.hits} 处（正文只给类别与关系）`);
  console.log(`锚点落位: ${ANCHORS.join(' / ')}`);
  for (const a of ANCHORS) console.log(`  ${a}: ${anchors[a].length} 节 → ${anchors[a].join('、') || '（无）'}`);
  console.log(`篇幅重心: ${heavy.title}（${heavy.hanzi} 字）`);
  console.log(BOUNDARY);
  return { s, cites, values, anchors, secs };
}

module.exports = {
  CHAPTER, TITLE, SLUG, DOC, ANCHORS, BOUNDARY, VALUE_RE,
  nonWs, hanzi, readDoc, sectionsOf, shape, citationAudit, valueAudit, anchorCoverage, bySection, main,
};

if (require.main === module) {
  main();
  console.log('教学边界：本输出仅为教学演示，不构成临床判断依据');
}
