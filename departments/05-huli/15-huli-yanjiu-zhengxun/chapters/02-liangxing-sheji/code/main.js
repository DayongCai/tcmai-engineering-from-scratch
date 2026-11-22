#!/usr/bin/env node
/**
 * 护理研究与循证护理 · 第 2 章 量性研究与设计类型
 * 正文: chapters/02-liangxing-sheji/docs/zh.md
 * 做法: 从正文解析节、表、四类设计、四档口径与题面里的算术，现算后打印。数字不手打。
 * 依赖: 仅 Node.js 标准库。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const TITLE = '量性研究与设计类型';

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
 * 题面的算术：7 项 = 单组前后测 + 同期对照；时间跨度 = 最长 − 最短。
 * 相加不等于总数，就说明正文被改过而这里没跟上。
 */
function problemArithmetic(text) {
  const m = /\*\*PROBLEM:\*\*([\s\S]*?)\n\n/.exec(text);
  const block = m ? m[1] : '';
  const num = (re) => {
    const hit = re.exec(block);
    return hit ? Number(hit[1]) : null;
  };
  const total = num(/(\d+)\s*项已结题研究/);
  const single = num(/单组前后测\s*(\d+)\s*项/);
  const controlled = num(/同期对照\s*(\d+)\s*项/);
  const saidEffective = num(/有\s*(\d+)\s*项在结论段用了/);
  const longest = num(/最长\s*(\d+)\s*周/);
  const shortest = num(/最短\s*(\d+)\s*周/);
  return {
    total,
    single,
    controlled,
    saidEffective,
    longest,
    shortest,
    sumOk: total !== null && total === single + controlled,
    spanWeeks: longest === null || shortest === null ? null : longest - shortest,
    singleWithoutCaveat: single === null || saidEffective === null ? null : single - saidEffective,
  };
}

function analyze() {
  const text = docText();
  const secs = sections(text);
  const tbs = tables(text);
  const designTable = tbs.find((t) => t[0] && t[0][0] === '设计');
  const gradeTable = tbs.find((t) => t[0] && t[0][0] === '档');
  const failSec = secs.find((s) => s.title.includes('失效模式'));
  const citations = [...new Set([...text.matchAll(/《([^》]+)》/g)].map((x) => x[1]))];
  const biasTypes = ['选择偏倚', '实施偏倚', '测量偏倚', '失访偏倚'];
  return {
    title: TITLE,
    hanzi: (text.match(/[\u4e00-\u9fff]/g) || []).length,
    sections: secs.map((s) => s.title),
    tables: tbs.length,
    designs: designTable ? designTable.slice(1).map((r) => r[0]) : [],
    grades: gradeTable ? gradeTable.slice(1).map((r) => r[0]) : [],
    bias: biasTypes.map((b) => ({ name: b, hits: count(text, b) })),
    failModes: failSec ? leads(failSec.body) : [],
    citations,
    problem: problemArithmetic(text),
  };
}

function report(a) {
  console.log(`护理研究与循证护理 · 第 2 章 ${a.title}`);
  console.log('');
  console.log(`正文 ${a.hanzi.toLocaleString('en-US')} 汉字，${a.sections.length} 节，${a.tables} 张表。`);
  console.log(`节序：${a.sections.join(' → ')}`);
  console.log('');
  const p = a.problem;
  console.log(`题面算术：${p.total} 项已结题研究 = 单组前后测 ${p.single} + 同期对照 ${p.controlled} → ${p.sumOk ? '对得上' : '对不上'}`);
  console.log(`  单组前后测里没写「有效」的 = ${p.single} − ${p.saidEffective} = ${p.singleWithoutCaveat} 项`);
  console.log(`  时间跨度 = 最长 ${p.longest} 周 − 最短 ${p.shortest} 周 = ${p.spanWeeks} 周`);
  console.log('');
  console.log(`可选的四种设计（${a.designs.length} 类）：${a.designs.join(' / ')}`);
  console.log(`结论口径四档（${a.grades.length} 档）：${a.grades.join(' / ')}`);
  console.log(`四类偏倚在正文出现次数：${a.bias.map((b) => `${b.name} ${b.hits}`).join(' · ')}`);
  console.log(`失效模式 ${a.failModes.length} 条：${a.failModes.join('、')}`);
  console.log(`引书 ${a.citations.length} 部：${a.citations.map((c) => `《${c}》`).join('')}`);
  console.log('');
  console.log('※ 以上结构由本章正文现算；不构成医学意见，设计与审查以现行规范与所在机构要求为准。');
}

if (require.main === module) report(analyze());

module.exports = { DOC, TITLE, docText, sections, tables, leads, count, problemArithmetic, analyze };
