#!/usr/bin/env node
/**
 * 康复工程与支具学 · 第 7 章 辅具的第一判据是使用者能不能自己用
 * 正文: departments/04-gushang/14-kangfu-gongcheng-zhiju/chapters/07-zhuxing-fuzhu/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 口径：只读本目录 docs/zh.md。助行谱系的行数、轮椅参数的行数、环境检查的处数
 * 全部现算。正文加减一行，脚本输出和随访清单一起变。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 7;
const SLUG = '07-zhuxing-fuzhu';
const TITLE = '辅具的第一判据是使用者能不能自己用';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const hanzi = (s) => (String(s).match(HANZI) || []).length;
const readDoc = () => fs.readFileSync(DOC, 'utf8');

function headings(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => /^##\s+/.test(line))
    .map((line) => line.replace(/^##\s+/, '').trim());
}

const numbered = (heads) =>
  heads.filter((h) => /^[一二三四五六七八九十]+、/.test(h) && !h.includes('代价与边界'));

function tables(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const out = [];
  for (let i = 1; i < lines.length - 1; i += 1) {
    if (!/^\|[\s:|-]*-{3}[\s:|-]*\|$/.test(lines[i])) continue;
    const head = lines[i - 1].split('|').slice(1, -1).map((c) => c.trim());
    let rows = 0;
    let j = i + 1;
    while (j < lines.length && /^\|.*\|$/.test(lines[j]) && !/^\|[\s:|-]*-{3}/.test(lines[j])) {
      rows += 1;
      j += 1;
    }
    out.push({ head, rows });
    i = j - 1;
  }
  return out;
}

function section(text, keyword) {
  const blocks = text.split(/^##\s+/m).slice(1);
  return blocks.find((b) => b.split(/\r?\n/)[0].includes(keyword)) || '';
}

const bullets = (block) => block.split(/\r?\n/).filter((l) => /^-\s+\S/.test(l.trim())).length;
const items = (block) => block.split(/\r?\n/).filter((l) => /^\d+\.\s+\S/.test(l.trim())).length;

function citations(text) {
  const all = [...text.matchAll(/《([^》]+)》/g)].map((m) => m[1]);
  return { total: all.length, books: [...new Set(all)].sort() };
}

const bold = (text, term) => (text.match(new RegExp(`\\*\\*${term}`, 'g')) || []).length;

/** 居家要查的六个位置、辅具三问、转移三条件 */
const HOME_SPOTS = ['门', '通道', '卫生间', '卧室', '厨房', '入口'];
const TRANSFER = ['高度匹配', '支撑点', '路径清空'];

function chapterFacts(text) {
  const ts = tables(text);
  const walkers = ts.find((t) => t.head.join('').includes('支撑面'));
  const chairs = ts.find((t) => t.head.join('').includes('依据'));
  const homeBlock = section(text, '居家环境');
  return {
    walkerRows: walkers ? walkers.rows : 0,
    chairRows: chairs ? chairs.rows : 0,
    homeSpots: HOME_SPOTS.filter((s) => bold(homeBlock, s) >= 1),
    aidQuestions: items(section(text, '辅具是桥')),
    transfer: TRANSFER.filter((t) => bold(text, t) >= 1),
    boundaries: bullets(section(text, '代价与边界')),
  };
}

function stats() {
  const text = readDoc();
  const heads = headings(text);
  const c = citations(text);
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title: TITLE,
    hanzi: hanzi(text),
    sections: heads.length,
    numbered: numbered(heads).length,
    tables: tables(text).length,
    cites: c.total,
    books: c.books,
    ...chapterFacts(text),
    disclaimer: /免责声明/.test(text),
  };
}

function main() {
  const s = stats();
  const fmt = (n) => n.toLocaleString('en-US');
  console.log(`康复工程与支具学 · 第 ${s.chapter} 章 ${s.title}`);
  console.log(`正文：chapters/${s.slug}/docs/zh.md（现算，不手打）`);
  console.log('');
  console.log(`  汉字        ${fmt(s.hanzi)}`);
  console.log(`  节          ${s.sections}（编号节 ${s.numbered} + 代价与边界）`);
  console.log(`  表          ${s.tables} 张`);
  console.log(`  引文        ${s.cites} 处 / ${s.books.length} 部`);
  console.log(`  助行谱系    ${s.walkerRows} 档`);
  console.log(`  轮椅参数    ${s.chairRows} 项`);
  console.log(`  居家检查    ${s.homeSpots.length} 处（${s.homeSpots.join('、')}）`);
  console.log(`  辅具三问    ${s.aidQuestions} 问`);
  console.log(`  转移条件    ${s.transfer.length} 条（${s.transfer.join('、')}）`);
  console.log(`  代价条目    ${s.boundaries} 条`);
  console.log(`  免责声明    ${s.disclaimer ? '有' : '缺'}`);
  console.log('');
  console.log('※ 数字由本目录 docs/zh.md 现算：谱系档数、参数项数、检查处数任一变动，重跑即见新值。');
  console.log('※ 文中不写产品型号、座宽座深数值与门宽坡度强制标准：须由治疗师与矫形师按个体测量与当地规范确定。');
}

if (require.main === module) main();

module.exports = {
  CHAPTER, SLUG, TITLE, DOC, HOME_SPOTS, TRANSFER,
  readDoc, headings, numbered, tables, section, bullets, items, citations, bold, chapterFacts, hanzi, stats, main,
};

// 教学边界：口径只在正文维护一份，这里直接摘正文里含「不构成」的那一行。
try {
  const _zh = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'docs', 'zh.md'), 'utf8');
  const _bound = (_zh.match(/[^\n]*不构成[^\n]*/) || [])[0];
  if (_bound) {
    console.log(`\n教学边界：${_bound.replace(/^[>\s*#-]+/, '').trim().slice(0, 120)}`);
  }
} catch { /* 读不到正文就不打，不编一句 */ }
