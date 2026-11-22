#!/usr/bin/env node
/**
 * 中医美容皮肤 · 第 3 章 瘾疹：几小时就消失的皮疹，说明战场不在皮肤上
 * 正文: chapters/03-yinzhen/docs/zh.md
 * 做法: 从正文解析四证表、问诊排查的四类诱因与病程分界，现算后打印。
 * 依赖: 仅 Node.js 标准库。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const TITLE = '瘾疹：几小时就消失的皮疹，说明战场不在皮肤上';

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
  const askSec = find('问诊');
  const checklist = askSec ? leads(askSec.body) : [];
  const dx = (text.match(/骤起骤退[^\n]*/) || [''])[0];
  return {
    title: TITLE,
    hanzi: (text.match(/[\u4e00-\u9fff]/g) || []).length,
    sections: secs.map((s) => s.title),
    rows,
    checklist,
    // 三条诊断特征是否同现
    triad: ['骤起骤退', '不留痕迹', '发无定处'].filter((k) => text.includes(k)).length,
    // 判据：诱因问诊与证型一一对应，加重条件是最靠得住的一条
    triggerRule: text.includes('最靠得住的是第二条') && text.includes('加重条件'),
    weeks: count(text, '6 周'),
    emergency: count(text, '急诊'),
    line: dx
  };
}

function report(a) {
  console.log(`中医美容皮肤 · 第 3 章 ${a.title}`);
  console.log('');
  console.log(`正文 ${a.hanzi.toLocaleString('en-US')} 汉字，${a.sections.length} 节。`);
  console.log('');
  console.log(`证型表 ${a.rows.length} 行：${a.rows.join('、')}`);
  console.log(`问诊排查 ${a.checklist.length} 类：${a.checklist.join('、')}`);
  console.log(`诊断三特征：${a.triad}/3 同现（骤起骤退、不留痕迹、发无定处）`);
  console.log(`加重条件作为首要判据：${a.triggerRule ? '成立' : '不成立'}`);
  console.log('');
  console.log(`关键词频次：6 周 ${a.weeks} · 急诊 ${a.emergency}`);
  console.log('');
  console.log('※ 以上结构由本章正文现算；不构成医学意见，出现呼吸道或循环症状应立即就医。');
}

if (require.main === module) report(analyze());

module.exports = { DOC, TITLE, docText, sections, tables, leads, count, analyze };
