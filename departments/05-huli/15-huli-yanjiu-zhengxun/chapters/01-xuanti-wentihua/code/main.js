#!/usr/bin/env node
/**
 * 护理研究与循证护理 · 第 1 章 护理研究的选题与问题化
 * 正文: chapters/01-xuanti-wentihua/docs/zh.md
 * 做法: 从正文解析节、表、四槽位与题面里自己的算术，现算后打印。数字不手打。
 * 依赖: 仅 Node.js 标准库。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const TITLE = '护理研究的选题与问题化';

function docText() {
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

/** 二级标题切节，返回 { title, body } */
function sections(text) {
  const marks = [...text.matchAll(/^## (.+)$/gm)];
  return marks.map((m, i) => {
    const start = m.index + m[0].length;
    const end = i + 1 < marks.length ? marks[i + 1].index : text.length;
    return { title: m[1].trim(), body: text.slice(start, end) };
  });
}

/** 连续的 | 行算一张表；表头分隔行丢掉 */
function tables(text) {
  const out = [];
  let cur = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line.startsWith('|')) { cur = null; continue; }
    if (!cur) { cur = []; out.push(cur); }
    const cells = line.replace(/^\|/, '').replace(/\|$/, '').split('|').map((s) => s.trim());
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;
    cur.push(cells);
  }
  return out.filter((t) => t.length > 0);
}

/** 节内行首加粗小标题，去掉「一是，」这类前缀与尾部标点 */
function leads(body) {
  return [...body.matchAll(/^\*\*([^*]+)\*\*/gm)]
    .map((m) => m[1].replace(/^[一二三四五六七八九十]+是[，、]?\s*/, '').replace(/[。：:]\s*$/, '').trim())
    .filter(Boolean);
}

function count(text, term) {
  return text.split(term).length - 1;
}

/**
 * 题面里的算术要能复算：14 份表 = 四格全实 + 缺一格 + 缺两格及以上。
 * 三档人数相加不等于 14，说明正文被改过而这里没跟上，直接报出来。
 */
function problemArithmetic(text) {
  const m = /\*\*PROBLEM:\*\*([\s\S]*?)\n\n/.exec(text);
  const block = m ? m[1] : '';
  const num = (re) => {
    const hit = re.exec(block);
    return hit ? Number(hit[1]) : null;
  };
  const total = num(/交上来的\s*(\d+)\s*份选题表/);
  const full = num(/四格全部写实的有\s*(\d+)\s*份/);
  const one = num(/缺一格的\s*(\d+)\s*份/);
  const two = num(/缺两格及以上的\s*(\d+)\s*份/);
  return {
    total,
    full,
    one,
    two,
    missing: total === null || full === null ? null : total - full,
    sumOk: total !== null && total === full + one + two,
  };
}

function analyze() {
  const text = docText();
  const secs = sections(text);
  const tbs = tables(text);
  const slotTable = tbs.find((t) => t[0] && t[0][0] === '槽位');
  const slotRows = slotTable ? slotTable.slice(1).map((r) => r[0]) : [];
  const failSec = secs.find((s) => s.title.includes('失效模式'));
  const failModes = failSec ? leads(failSec.body) : [];
  const citations = [...new Set([...text.matchAll(/《([^》]+)》/g)].map((x) => x[1]))];
  return {
    title: TITLE,
    hanzi: (text.match(/[\u4e00-\u9fff]/g) || []).length,
    sections: secs.map((s) => s.title),
    tables: tbs.length,
    slotRows,
    problem: problemArithmetic(text),
    failModes,
    citations,
    criteria: {
      可检索: count(text, '可检索'),
      可测: count(text, '可测'),
      可复现: count(text, '可复现'),
    },
  };
}

function report(a) {
  console.log(`护理研究与循证护理 · 第 1 章 ${a.title}`);
  console.log('');
  console.log(`正文 ${a.hanzi.toLocaleString('en-US')} 汉字，${a.sections.length} 节，${a.tables} 张表。`);
  console.log(`节序：${a.sections.join(' → ')}`);
  console.log('');
  const p = a.problem;
  console.log(`题面算术：共 ${p.total} 份选题表 = 四格全实 ${p.full} + 缺一格 ${p.one} + 缺两格及以上 ${p.two} → ${p.sumOk ? '对得上' : '对不上'}`);
  console.log(`  写不出可执行检索式的 = ${p.total} − ${p.full} = ${p.missing} 份`);
  console.log('');
  console.log(`四槽位（${a.slotRows.length} 格）：${a.slotRows.join(' / ')}`);
  console.log(`三条判据在正文出现次数：可检索 ${a.criteria.可检索} · 可测 ${a.criteria.可测} · 可复现 ${a.criteria.可复现}`);
  console.log(`失效模式 ${a.failModes.length} 条：${a.failModes.join('、')}`);
  console.log(`引书 ${a.citations.length} 部：${a.citations.map((c) => `《${c}》`).join('')}`);
  console.log('');
  console.log('※ 以上结构由本章正文现算；不构成医学意见，选题与审查以所在机构要求为准。');
}

if (require.main === module) report(analyze());

module.exports = { DOC, TITLE, docText, sections, tables, leads, count, problemArithmetic, analyze };
