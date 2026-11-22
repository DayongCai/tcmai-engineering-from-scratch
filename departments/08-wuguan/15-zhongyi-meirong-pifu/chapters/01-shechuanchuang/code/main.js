#!/usr/bin/env node
/**
 * 中医美容皮肤 · 第 1 章 蛇串疮：皮疹是过程，疼痛才是结局
 * 正文: chapters/01-shechuanchuang/docs/zh.md
 * 做法: 从正文解析时段、证型表与外治三态，现算后打印。数字不手打。
 * 依赖: 仅 Node.js 标准库。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const TITLE = '蛇串疮：皮疹是过程，疼痛才是结局';

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

/** 行首加粗小标题，去掉「其N，」前缀与尾部标点 */
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
  const timeline = find('时间轴') ? leads(find('时间轴').body) : [];
  const outside = find('外治的分寸') ? leads(find('外治的分寸').body) : [];
  const redlines = find('红线') ? leads(find('红线').body) : [];
  return {
    title: TITLE,
    hanzi: (text.match(/[\u4e00-\u9fff]/g) || []).length,
    sections: secs.map((s) => s.title),
    rows,
    timeline,
    outside,
    redlines,
    latePain: count(text, '后遗神经痛'),
    puncture: count(text, '挑破'),
    referral: count(text, '转介'),
    // 判据：三态的顺序不能颠倒——先未破、再破溃、后结痂
    orderOk: outside[0] === '水疱未破' && outside[1] === '水疱破溃糜烂' && outside[2] === '结痂与疹后期'
  };
}

function report(a) {
  console.log(`中医美容皮肤 · 第 1 章 ${a.title}`);
  console.log('');
  console.log(`正文 ${a.hanzi.toLocaleString('en-US')} 汉字，${a.sections.length} 节。`);
  console.log('');
  console.log(`时段（${a.timeline.length} 段）：${a.timeline.join(' → ')}`);
  console.log(`证型表 ${a.rows.length} 行：${a.rows.join('、')}`);
  console.log(`外治三态（按皮损状态排序）：${a.outside.join(' → ')}`);
  console.log(`红线 ${a.redlines.length} 条：${a.redlines.join('、')}`);
  console.log('');
  console.log(`关键词频次：后遗神经痛 ${a.latePain} · 挑破 ${a.puncture} · 转诊 ${a.referral}`);
  console.log('');
  console.log('※ 以上结构由本章正文现算；不构成医学意见，处置以现行规范与所在机构制度为准。');
}

if (require.main === module) report(analyze());

module.exports = { DOC, TITLE, docText, sections, tables, leads, count, analyze };
