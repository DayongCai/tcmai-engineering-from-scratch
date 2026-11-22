#!/usr/bin/env node
/**
 * 医学遗传学 · 第 12 章 「禀赋」不是遗传学的同义词，它是一套描述系统，价值在提问而不在术语对接
 * 课程: departments/09-jichu/09-yixue-yichuan-xue/chapters/12-zhongyi-yichuan-xue/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章没有算式，也就没有可复算的比数——这正是本章要说的事。所以这里算的是结构：
 * 本课共几章、首表（禀赋三层）有几行、正文引了几部书、三处不可对接各列了几条。
 * 全部从正文与章节目录现读，不手打。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTERS_DIR = path.join(__dirname, '..', '..');
const CHAPTER = 12;
const TITLE = '「禀赋」不是遗传学的同义词，它是一套描述系统，价值在提问而不在术语对接';

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function analyze(text) {
  const body = String(text || '').replace(/\r\n/g, '\n');
  const lines = body.split('\n');
  const sections = [];
  let cur = null;
  for (const line of lines) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) { cur = { title: h[1], hanzi: 0 }; sections.push(cur); continue; }
    if (cur) cur.hanzi += (line.match(HANZI) || []).length;
  }
  return {
    hanzi: (body.match(HANZI) || []).length,
    sections,
    tables: (body.match(/^\s*\|[\s:|-]+\|\s*$/gm) || []).length,
    claims: (body.match(/\*\*[^*\n]+\*\*/g) || []).length,
  };
}

/** 本课章节目录（实数） */
function chapterDirs() {
  return fs.readdirSync(CHAPTERS_DIR)
    .filter((d) => fs.statSync(path.join(CHAPTERS_DIR, d)).isDirectory())
    .sort();
}

/** 第一张表的数据行数（去掉表头与分隔行） */
function firstTableRows(text) {
  const lines = String(text || '').split('\n');
  const out = [];
  let inTable = false;
  for (const line of lines) {
    if (/^\s*\|/.test(line)) {
      if (/^\s*\|[\s:|-]+\|\s*$/.test(line)) { inTable = true; continue; }
      if (inTable) out.push(line);
    } else if (inTable) break;
  }
  return out;
}

/** 某个标记段之后紧跟的编号条目（1. 2. 3.） */
function listAfter(text, marker) {
  const lines = String(text || '').split('\n');
  const at = lines.findIndex((l) => l.includes(marker));
  if (at < 0) return [];
  const out = [];
  for (let i = at + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^\d+\.\s/.test(line)) { out.push(line); continue; }
    if (!line.trim() && out.length === 0) continue;
    if (!line.trim()) continue;
    if (out.length) break;
  }
  return out;
}

/** 正文里的书名引文（《》）去重条数 */
const citeTitles = (text) => [...new Set([...String(text || '').matchAll(/《([^》\n]+)》/g)].map((m) => m[1]))];

function figures(text) {
  const dirs = chapterDirs();
  const rows = firstTableRows(text);
  const cites = citeTitles(text);
  const unbridgeable = listAfter(text, '不可对接的三处');
  const bridgeable = listAfter(text, '可对接的三处');
  return [
    { name: '本课章数（目录实数）', got: dirs.length, stated: 12, token: '十一章' },
    { name: '首表数据行（禀赋三层）', got: rows.length, stated: 3, token: '禀赋' },
    { name: '三处可对接的条目数', got: bridgeable.length, stated: 3, token: '可对接的三处' },
    { name: '三处不可对接的条目数', got: unbridgeable.length, stated: 3, token: '不可对接的三处' },
    { name: '正文引书条数', got: cites.length, stated: 2, token: '《灵枢·天年》' },
  ].map((f) => ({ ...f, ok: Math.abs(f.got - f.stated) <= (f.tol || 0.03) * Math.abs(f.stated) }));
}

function fmt(x) {
  if (x >= 10) return x.toFixed(0);
  if (x >= 1) return x.toFixed(2);
  return x.toPrecision(3);
}

function main() {
  const text = read();
  const a = analyze(text);
  const rows = figures(text);
  const dirs = chapterDirs();

  console.log(`医学遗传学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 与章节目录现算，不手打）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 表格 ${a.tables} 张 · 加粗判断 ${a.claims} 处`);
  console.log(`本课共 ${dirs.length} 章：第 1 至第 ${dirs.length} 章，本章是最后一章。`);
  console.log('');
  for (const r of rows) {
    const mark = r.ok ? '✓' : '✗ 与正文不符';
    console.log(`  ${r.name.padEnd(18, '　')} 算得 ${fmt(r.got).padStart(6)} · 正文 ${r.token}  ${mark}`);
  }
  console.log('');
  console.log(`引书清单：${citeTitles(text).map((c) => '《' + c + '》').join('、')}`);
  console.log('读法：本章不在这条链上，而在链的旁边——提供的是不同性质的问题，不能与概率互相换算。');
  console.log('※ 本章不写任何发病率、患病率、携带率、疗效数据与人群研究结论，不作体质分级与优劣比较。');
  console.log('※ 本输出仅用于教学演示，不构成医学意见、诊断、治疗建议或中医药处方建议。');
  if (rows.some((r) => !r.ok)) process.exitCode = 1;
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, analyze, figures, chapterDirs, firstTableRows, listAfter, citeTitles };
