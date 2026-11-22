#!/usr/bin/env node
/**
 * 护理研究与循证护理 · 第 6 章 文献检索与系统评价
 * 正文: chapters/06-jiansuo-xitong/docs/zh.md
 * 做法: 从正文解析节、表、五个来源与筛选链，逐步复算到纳入数。数字不手打。
 * 依赖: 仅 Node.js 标准库。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const TITLE = '文献检索与系统评价';

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
 * 筛选链必须首尾相接：检出 − 去重 = 题摘筛前；再 − 题摘排除 = 全文筛前；
 * 再 − 全文排除 = 纳入。去重数本身也要能拆成两个来源的重叠。
 * 任何一步对不上，说明正文被改过而这里没跟上。
 */
function problemArithmetic(text) {
  const m = /\*\*PROBLEM:\*\*([\s\S]*?)\n\n/.exec(text);
  const block = m ? m[1] : '';
  const num = (re) => {
    const hit = re.exec(block);
    return hit ? Number(String(hit[1]).replace(/,/g, '')) : null;
  };
  const found = num(/跑出\s*([\d,]+)\s*条记录/);
  const deduped = num(/去重去掉\s*(\d+)\s*条，剩\s*(\d+)/);
  const afterDedup = num(/剩\s*(\d+)\s*条；题名与摘要筛排除/);
  const taExcluded = num(/题名与摘要筛排除\s*(\d+)\s*条，剩\s*(\d+)/);
  const afterTa = num(/题名与摘要筛排除\s*\d+\s*条，剩\s*(\d+)/);
  const ftExcluded = num(/全文筛排除\s*(\d+)\s*条，纳入\s*(\d+)/);
  const included = num(/全文筛排除\s*\d+\s*条，纳入\s*(\d+)/);
  const dupLib = num(/其中\s*(\d+)\s*条来自两个综合库的重叠/);
  const dupPre = num(/(\d+)\s*条来自同一篇文献的预印本/);
  const step1 = found !== null && deduped !== null ? found - deduped : null;
  const step2 = afterDedup !== null && taExcluded !== null ? afterDedup - taExcluded : null;
  const step3 = afterTa !== null && ftExcluded !== null ? afterTa - ftExcluded : null;
  const dupSum = dupLib === null || dupPre === null ? null : dupLib + dupPre;
  return {
    found,
    deduped,
    afterDedup,
    taExcluded,
    afterTa,
    ftExcluded,
    included,
    dupLib,
    dupPre,
    dupSum,
    steps: [step1, step2, step3],
    chainOk: step1 === afterDedup && step2 === afterTa && step3 === included,
    dupOk: dupSum === deduped,
    dedupRate: found ? deduped / found : null,
    includedRate: found ? included / found : null,
  };
}

function analyze() {
  const text = docText();
  const secs = sections(text);
  const tbs = tables(text);
  const sourceTable = tbs.find((t) => t[0] && t[0][0] === '来源类型');
  const failSec = secs.find((s) => s.title.includes('失效模式'));
  const citations = [...new Set([...text.matchAll(/《([^》]+)》/g)].map((x) => x[1]))];
  return {
    title: TITLE,
    hanzi: (text.match(/[\u4e00-\u9fff]/g) || []).length,
    sections: secs.map((s) => s.title),
    tables: tbs.length,
    sources: sourceTable ? sourceTable.slice(1).map((r) => r[0]) : [],
    anchors: ['人群块', '干预或暴露块', '设计块', '限制块'].map((b) => ({ name: b, hits: count(text, b) })),
    failModes: failSec ? leads(failSec.body) : [],
    citations,
    problem: problemArithmetic(text),
  };
}

function report(a) {
  const p = a.problem;
  console.log(`护理研究与循证护理 · 第 6 章 ${a.title}`);
  console.log('');
  console.log(`正文 ${a.hanzi.toLocaleString('en-US')} 汉字，${a.sections.length} 节，${a.tables} 张表。`);
  console.log(`节序：${a.sections.join(' → ')}`);
  console.log('');
  console.log('筛选链逐步复算：');
  console.log(`  ${p.found.toLocaleString('en-US')} − ${p.deduped} = ${p.steps[0]}（题摘筛前）`);
  console.log(`  ${p.afterDedup} − ${p.taExcluded} = ${p.steps[1]}（全文筛前）`);
  console.log(`  ${p.afterTa} − ${p.ftExcluded} = ${p.steps[2]}（纳入）`);
  console.log(`  → ${p.chainOk ? '三步首尾相接，链条闭合' : '链条断开，某一步的记录缺失'}`);
  console.log(`  去重 ${p.deduped} 条 = 库间重叠 ${p.dupLib} + 预印本与正式版 ${p.dupPre} = ${p.dupSum}，${p.dupOk ? '对得上' : '对不上'}`);
  console.log(`  重复率 = ${p.deduped} / ${p.found} = ${(p.dedupRate * 100).toFixed(1)}%；纳入率 = ${p.included} / ${p.found} = ${(p.includedRate * 100).toFixed(1)}%`);
  console.log('');
  console.log(`来源必须覆盖 ${a.sources.length} 类：${a.sources.join('、')}`);
  console.log(`检索式四块积木在正文出现次数：${a.anchors.map((x) => `${x.name} ${x.hits}`).join(' · ')}`);
  console.log(`失效模式 ${a.failModes.length} 条：${a.failModes.join('、')}`);
  console.log(`引书 ${a.citations.length} 部：${a.citations.map((c) => `《${c}》`).join('')}`);
  console.log('');
  console.log('※ 以上结构由本章正文现算；检索语法以平台说明为准，不构成医学意见。');
}

if (require.main === module) report(analyze());

module.exports = { DOC, TITLE, docText, sections, tables, leads, count, problemArithmetic, analyze };
