#!/usr/bin/env node
/**
 * 中药新药研发 · 第 4 章：本章结构与判据统计
 * 正文: departments/02-zhongyao/15-zhongyao-xinyao-yanfa/chapters/04-zhiliang-biaozhiwu/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 只读本章正文，不读任何外部表：汉字数、节数、表格行列、判据句、教学设定标注、
 * 边界条目与本章关键条目数（三层标准、指标两条理由路径、图谱参数、放行与研发标准之分）全部从 docs/zh.md 现算。
 * 手打的数字会在正文改版后静默过期。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CJK = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const SPEC = {
  chapter: 4,
  landmarks: [
    { label: "三层标准", re: /^\|\s*真伪\s*\|/gm, note: "真伪／优劣／一致性" },
    { label: "理由路径", re: /\*\*第[一二]条，/g, note: "指标选择理由" },
    { label: "三类失效", re: /\*\*其[一二三]，/g, note: "失效模式" },
  ],
  keyTable: {"keyword":"缺了会漏掉什么","label":"三层标准表","col":0},
};

function readDoc(p) {
  return fs.readFileSync(p || DOC, 'utf8').replace(/\r\n/g, '\n');
}

const hanzi = (s) => (String(s || '').match(CJK) || []).length;

/** 按 # / ## / ### 切节，返回 [{level, title, body}] */
function sections(md) {
  const out = [];
  let cur = { level: 0, title: '', body: [] };
  for (const line of md.split('\n')) {
    const m = line.match(/^(#{1,3})\s+(.+)$/);
    if (m) {
      out.push(cur);
      cur = { level: m[1].length, title: m[2].trim(), body: [] };
    } else cur.body.push(line);
  }
  out.push(cur);
  return out.filter((s) => s.title);
}

const cells = (line) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());

/** 抽取所有 Markdown 表格：header + 数据行 */
function tables(md) {
  const lines = md.split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!/^\|/.test(lines[i])) continue;
    if (!/^\|[\s:|-]+\|$/.test((lines[i + 1] || '').trim())) continue;
    const header = cells(lines[i]);
    const rows = [];
    let j = i + 2;
    while (j < lines.length && /^\|/.test(lines[j])) {
      rows.push(cells(lines[j]));
      j += 1;
    }
    out.push({ header, cols: header.length, rows });
    i = j - 1;
  }
  return out;
}

/** 正文里的加粗判据句（去重、去表格内加粗） */
function judgments(md) {
  const body = md.split('\n').filter((l) => !/^\|/.test(l)).join('\n');
  const out = new Set();
  for (const m of body.matchAll(/\*\*([^*\n]{4,60})\*\*/g)) {
    const s = m[1].trim();
    if (/[。？：]$/.test(s) || /，/.test(s)) out.add(s);
  }
  return [...out];
}

/** 「## 代价与边界」下的条目 */
function boundaries(md) {
  const sec = sections(md).find((s) => s.title.includes('代价与边界'));
  if (!sec) return [];
  return sec.body.filter((l) => /^-\s+/.test(l.trim())).map((l) => l.trim());
}

const count = (md, re) => (md.match(re) || []).length;

function analyze(md) {
  const text = String(md || readDoc()).replace(/\r\n/g, '\n');
  const secs = sections(text);
  const tabs = tables(text);
  const key = tabs.find((t) => t.header.some((h) => h.includes(SPEC.keyTable.keyword))
    || t.rows.some((r) => (r[0] || '').includes(SPEC.keyTable.keyword)));
  return {
    head: parseHead(text),
    hanzi: hanzi(text),
    sections: secs,
    sectionCount: secs.filter((s) => s.level >= 2).length,
    tables: tabs,
    judgments: judgments(text),
    boundaries: boundaries(text),
    教学设定: count(text, /【教学设定】/g),
    landmarks: SPEC.landmarks.map((l) => ({ label: l.label, note: l.note, n: count(text, l.re) })),
    keyTable: key || null,
  };
}

function parseHead(md) {
  const h1 = (md.match(/^#\s+(.+)$/m) || [, ''])[1].trim();
  const m = h1.match(/^第\s*(\d+)\s*章\s*[·・:：]\s*(.+)$/);
  return m ? { n: Number(m[1]), title: m[2].trim() } : { n: SPEC.chapter, title: h1 };
}

function main() {
  const md = readDoc();
  const a = analyze(md);
  const kt = a.keyTable;

  console.log(`中药新药研发 · 第 ${a.head.n} 章 ${a.head.title}`);
  console.log('');
  console.log(`本章 ${a.hanzi.toLocaleString('en-US')} 汉字 · ${a.sectionCount} 节 · ${a.tables.length} 张表`);
  if (kt) {
    const names = kt.rows.map((r) => r[0].replace(/\*\*/g, '')).filter(Boolean);
    console.log(`${SPEC.keyTable.label} ${kt.rows.length} 行 ${kt.cols} 列：${names.join('／')}`);
  }
  console.log(a.landmarks.map((l) => `${l.label} ${l.n}`).join(' · '));
  console.log(`判据句 ${a.judgments.length} 条 · 【教学设定】${a.教学设定} 处 · 边界 ${a.boundaries.length} 条`);
  console.log('');
  console.log('※ 教学样例：数字由本章 docs/zh.md 现算，不手打；改正文后重跑即可复现。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
  return a;
}

if (require.main === module) main();

module.exports = { analyze, sections, tables, judgments, boundaries, parseHead, readDoc, hanzi, main, SPEC, DOC };
