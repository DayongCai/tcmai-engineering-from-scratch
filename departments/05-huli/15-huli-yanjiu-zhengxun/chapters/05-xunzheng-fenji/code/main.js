#!/usr/bin/env node
/**
 * 护理研究与循证护理 · 第 5 章 循证护理的证据分级
 * 正文: chapters/05-xunzheng-fenji/docs/zh.md
 * 做法: 从正文解析节、表、两维四格的分布与降级来路，现算后打印。数字不手打。
 * 依赖: 仅 Node.js 标准库。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const TITLE = '循证护理的证据分级';

function docText() {
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function sections(text) {
  const marks = [...text.matchAll(/^## (.+)$/gm)];
  return marks.map((m, i) => {
    const start = m.index + m[0].length;
    const end = i + 1 < marks.length ? marks[i + 1].index : text.length;
    return { title: m[1].trim(), body: text.slice(start, end) };
  });
}

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

function leads(body) {
  return [...body.matchAll(/^\*\*([^*]+)\*\*/gm)]
    .map((m) => m[1].replace(/^[一二三四五六七八九十]+是[，、]?\s*/, '').replace(/[。：:]\s*$/, '').trim())
    .filter(Boolean);
}

function count(text, term) {
  return text.split(term).length - 1;
}

/**
 * 题面算术：两维摊成四格，四格之和要等于条目总数；
 * 强推荐 = 高确定性强 + 低确定性强；两个维度的边际合计必须相等。
 * 任何一项对不上，说明正文被改过而这里没跟上。
 */
function problemArithmetic(text) {
  const m = /\*\*PROBLEM:\*\*([\s\S]*?)\n\n/.exec(text);
  const block = m ? m[1] : '';
  const num = (re) => {
    const hit = re.exec(block);
    return hit ? Number(hit[1]) : null;
  };
  const total = num(/把一份材料里的\s*(\d+)\s*条推荐/);
  const hiStrong = num(/确定性高而推荐强度强\s*(\d+)\s*条/);
  const hiWeak = num(/确定性高而强度弱\s*(\d+)\s*条/);
  const loStrong = num(/确定性低而强度强\s*(\d+)\s*条/);
  const loWeak = num(/确定性低而强度弱\s*(\d+)\s*条/);
  const sum = [hiStrong, hiWeak, loStrong, loWeak].reduce((a, b) => a + (b || 0), 0);
  const strong = hiStrong === null || loStrong === null ? null : hiStrong + loStrong;
  const weak = hiWeak === null || loWeak === null ? null : hiWeak + loWeak;
  const high = hiStrong === null || hiWeak === null ? null : hiStrong + hiWeak;
  const low = loStrong === null || loWeak === null ? null : loStrong + loWeak;
  return {
    total,
    cells: { hiStrong, hiWeak, loStrong, loWeak },
    sum,
    sumOk: total !== null && sum === total,
    strong,
    weak,
    high,
    low,
    marginsOk: strong !== null && high !== null && strong + weak === high + low,
    strongOnLowEvidence: loStrong,
    strongOnLowShare: strong ? loStrong / strong : null,
    lowWeakShare: total ? loWeak / total : null,
  };
}

function analyze() {
  const text = docText();
  const secs = sections(text);
  const tbs = tables(text);
  const quadTable = tbs.find((t) => t[0] && t[0][0] === '情形');
  const downgradeSec = secs.find((s) => s.title.includes('确定性因何降级'));
  const failSec = secs.find((s) => s.title.includes('失效模式'));
  const citations = [...new Set([...text.matchAll(/《([^》]+)》/g)].map((x) => x[1]))];
  return {
    title: TITLE,
    hanzi: (text.match(/[\u4e00-\u9fff]/g) || []).length,
    sections: secs.map((s) => s.title),
    tables: tbs.length,
    quadrants: quadTable ? quadTable.slice(1).map((r) => `${r[0]}：${r[1]}/${r[2]}`) : [],
    downgrades: downgradeSec ? leads(downgradeSec.body).filter((x) => !x.includes('升级')) : [],
    failModes: failSec ? leads(failSec.body) : [],
    citations,
    problem: problemArithmetic(text),
  };
}

function report(a) {
  const p = a.problem;
  const c = p.cells;
  console.log(`护理研究与循证护理 · 第 5 章 ${a.title}`);
  console.log('');
  console.log(`正文 ${a.hanzi.toLocaleString('en-US')} 汉字，${a.sections.length} 节，${a.tables} 张表。`);
  console.log(`节序：${a.sections.join(' → ')}`);
  console.log('');
  console.log('两维四格：');
  console.log(`  高确定性 + 强推荐 ${c.hiStrong} 条 · 高确定性 + 弱推荐 ${c.hiWeak} 条`);
  console.log(`  低确定性 + 强推荐 ${c.loStrong} 条 · 低确定性 + 弱推荐 ${c.loWeak} 条`);
  console.log(`  ${c.hiStrong} + ${c.hiWeak} + ${c.loStrong} + ${c.loWeak} = ${p.sum}，${p.sumOk ? '等于条目总数' : `不等于条目总数 ${p.total}`}`);
  console.log(`  强推荐 = ${c.hiStrong} + ${c.loStrong} = ${p.strong}；弱推荐 = ${c.hiWeak} + ${c.loWeak} = ${p.weak}`);
  console.log(`  边际校验：${p.high} 条高确定性对 ${p.low} 条低确定性，${p.marginsOk ? '行合计与列合计一致' : '行合计与列合计不一致'}`);
  console.log(`  强推荐里靠低确定性支撑的占 ${p.strongOnLowShare === null ? '—' : (p.strongOnLowShare * 100).toFixed(1)}%`);
  console.log('');
  console.log(`四格（${a.quadrants.length} 种情形）：${a.quadrants.join(' / ')}`);
  console.log(`确定性降级的来路 ${a.downgrades.length} 条：${a.downgrades.join('、')}`);
  console.log(`失效模式 ${a.failModes.length} 条：${a.failModes.join('、')}`);
  console.log(`引书 ${a.citations.length} 部：${a.citations.map((x) => `《${x}》`).join('')}`);
  console.log('');
  console.log('※ 以上结构由本章正文现算；具体条目的等级以制定机构、版本与检索时点为准，不构成医学意见。');
}

if (require.main === module) report(analyze());

module.exports = { DOC, TITLE, docText, sections, tables, leads, count, problemArithmetic, analyze };
