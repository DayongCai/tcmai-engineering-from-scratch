#!/usr/bin/env node
/**
 * 护理研究与循证护理 · 第 4 章 量表的选择与信效度
 * 正文: chapters/04-liangbiao-xinxiao/docs/zh.md
 * 做法: 从正文解析节、表、信度三种与效度五种，并复算题面里的换算与信度变化。数字不手打。
 * 依赖: 仅 Node.js 标准库。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const TITLE = '量表不是尺子，是一份带刻度的说法';

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
 * 题面算术：两表刻度不同，相差「乙表十分之一的刻度跨度」到底是多少分；
 * 一致人数 = 总人数 − 给出不同结论的人数；反向条目占全部条目的比例。
 * 任何一项对不上，说明正文被改过而这里没跟上。
 */
function problemArithmetic(text) {
  const m = /\*\*PROBLEM:\*\*([\s\S]*?)\n\n/.exec(text);
  const block = m ? m[1] : '';
  const num = (re) => {
    const hit = re.exec(block);
    return hit ? Number(hit[1]) : null;
  };
  const people = num(/同一批\s*(\d+)\s*人/);
  const aMax = num(/甲表总分\s*0\s*至\s*(\d+)/);
  const bMax = num(/乙表总分\s*0\s*至\s*(\d+)/);
  const disagreed = num(/有\s*(\d+)\s*人两表相差/);
  const gap = num(/相差\s*(\d+)\s*分及以上/);
  const maxGap = num(/最大差\s*(\d+)\s*分/);
  const items = num(/(\d+)\s*个条目里有\s*\d+\s*条是反向计分/);
  const reverse = num(/\d+\s*个条目里有\s*(\d+)\s*条是反向计分/);
  const alphaBefore = num(/内部一致性系数从不足\s*([\d.]+)/);
  const alphaAfter = num(/升到\s*([\d.]+)\s*以上/);
  return {
    people,
    scale: { aMax, bMax, factor: aMax !== null && bMax !== null ? aMax / bMax : null },
    disagreed,
    maxGap,
    agreed: people === null || disagreed === null ? null : people - disagreed,
    gapThreshold: bMax === null ? null : bMax / 10,
    gapIsTenth: gap !== null && bMax !== null && gap === bMax / 10,
    items,
    reverse,
    reverseShare: items === null || reverse === null ? null : reverse / items,
    alphaBefore,
    alphaAfter,
    alphaDelta: alphaBefore === null || alphaAfter === null ? null : alphaAfter - alphaBefore,
  };
}

function analyze() {
  const text = docText();
  const secs = sections(text);
  const tbs = tables(text);
  const reliabilityTable = tbs.find((t) => t[0] && t[0][0] === '类型' && t[0].includes('常用指标'));
  const validityTable = tbs.find((t) => t[0] && t[0][0] === '类型' && t[0].includes('怎么取证'));
  const failSec = secs.find((s) => s.title.includes('失效模式'));
  const citations = [...new Set([...text.matchAll(/《([^》]+)》/g)].map((x) => x[1]))];
  return {
    title: TITLE,
    hanzi: (text.match(/[\u4e00-\u9fff]/g) || []).length,
    sections: secs.map((s) => s.title),
    tables: tbs.length,
    reliability: reliabilityTable ? reliabilityTable.slice(1).map((r) => r[0]) : [],
    validity: validityTable ? validityTable.slice(1).map((r) => r[0]) : [],
    failModes: failSec ? leads(failSec.body) : [],
    citations,
    problem: problemArithmetic(text),
    thresholds: { 群体: count(text, '0.70'), 条目: count(text, '0.78'), 量表: count(text, '0.90') },
  };
}

function report(a) {
  const p = a.problem;
  console.log(`护理研究与循证护理 · 第 4 章 ${a.title}`);
  console.log('');
  console.log(`正文 ${a.hanzi.toLocaleString('en-US')} 汉字，${a.sections.length} 节，${a.tables} 张表。`);
  console.log(`节序：${a.sections.join(' → ')}`);
  console.log('');
  console.log(`题面算术：同一批 ${p.people} 人，${p.disagreed} 人两表相差 ${p.gapThreshold} 分及以上（乙表 ${p.scale.bMax} 分刻度的十分之一，${p.gapIsTenth ? '对得上' : '对不上'}）`);
  console.log(`  一致人数 = ${p.people} − ${p.disagreed} = ${p.agreed}；最大差 ${p.maxGap} 分`);
  console.log(`  甲表 ${p.scale.aMax} 分对齐乙表 ${p.scale.bMax} 分，折算系数 = ${p.scale.factor}`);
  console.log(`  反向计分 ${p.reverse}/${p.items} 条，占 ${(p.reverseShare * 100).toFixed(1)}%`);
  console.log(`  修正反向计分后，内部一致性从 ${p.alphaBefore} 以下升到 ${p.alphaAfter} 以上，增幅 ${p.alphaDelta.toFixed(2)}`);
  console.log('');
  console.log(`信度 ${a.reliability.length} 种：${a.reliability.join(' / ')}`);
  console.log(`效度 ${a.validity.length} 种（按证据强度递增）：${a.validity.join(' → ')}`);
  console.log(`失效模式 ${a.failModes.length} 条：${a.failModes.join('、')}`);
  console.log(`引书 ${a.citations.length} 部：${a.citations.map((c) => `《${c}》`).join('')}`);
  console.log('');
  console.log('※ 以上结构由本章正文现算；阈值以工具原版手册与目标期刊要求为准，不构成医学意见。');
}

if (require.main === module) report(analyze());

module.exports = { DOC, TITLE, docText, sections, tables, leads, count, problemArithmetic, analyze };
