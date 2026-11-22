#!/usr/bin/env node
/**
 * 中医美容皮肤 · 第 4 章 白疕：越用力去治的那块皮，长得越厚
 * 正文: chapters/04-baipi/docs/zh.md
 * 做法: 从正文解析四证表、四个临床类型与外治三条，核对进行期的克制要求，现算后打印。
 * 依赖: 仅 Node.js 标准库。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const TITLE = '白疕：越用力去治的那块皮，长得越厚';

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
    .map((m) => m[1].replace(/^其[一二三四五六七八九][，、]\s*/, '').replace(/[。：:]\s*$/, '').trim())
    .filter(Boolean);
}

function count(text, term) {
  return text.split(term).length - 1;
}

function analyze() {
  const text = docText();
  const secs = sections(text);
  const find = (kw) => secs.find((s) => s.title.includes(kw));
  const table = tables(text).find((t) => t[0] && t[0][0] === '证');
  const rows = table ? table.slice(1).map((r) => r[0]) : [];
  const typeSec = find('四个类型');
  const types = typeSec ? leads(typeSec.body) : [];
  const outSec = find('外治');
  const outside = outSec ? leads(outSec.body) : [];
  return {
    title: TITLE,
    hanzi: (text.match(/[\u4e00-\u9fff]/g) || []).length,
    sections: secs.map((s) => s.title),
    rows,
    types,
    outside,
    // 判据：火毒炽盛不是病程上的一段，而是类型的跃迁
    leap: text.includes('类型的跃迁'),
    // 判据：进行期要克制，硬指标写在诊断要点里
    hardSigns: ['薄膜现象', '点状出血'].filter((k) => text.includes(k)).length,
    reaction: count(text, '同形反应'),
    tapering: count(text, '骤停')
  };
}

function report(a) {
  console.log(`中医美容皮肤 · 第 4 章 ${a.title}`);
  console.log('');
  console.log(`正文 ${a.hanzi.toLocaleString('en-US')} 汉字，${a.sections.length} 节。`);
  console.log('');
  console.log(`证型表 ${a.rows.length} 行：${a.rows.join('、')}`);
  console.log(`临床类型 ${a.types.length} 型：${a.types.join('、')}`);
  console.log(`外治原则 ${a.outside.length} 条；诊断硬指标 ${a.hardSigns}/2 同现。`);
  console.log(`火毒炽盛属类型跃迁：${a.leap ? '是' : '否'}`);
  console.log('');
  console.log(`关键词频次：同形反应 ${a.reaction} · 骤停 ${a.tapering}`);
  console.log('');
  console.log('※ 以上结构由本章正文现算；不构成医学意见，系统用药与光疗参数以专科规范为准。');
}

if (require.main === module) report(analyze());

module.exports = { DOC, TITLE, docText, sections, tables, leads, count, analyze };
