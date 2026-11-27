#!/usr/bin/env node
/**
 * 康复工程与支具学 · 第 3 章 脊柱支具靠三点力，不靠把躯干裹紧
 * 正文: departments/04-gushang/14-kangfu-gongcheng-zhiju/chapters/03-jizhu-zhiju/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 口径：只读本目录 docs/zh.md。节、表、力系可调量、约束度维度、常见受压点的数量
 * 全部现算。正文补一节或删一个受压点，输出立即改变——不靠手打维持。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 3;
const SLUG = '03-jizhu-zhiju';
const TITLE = '脊柱支具靠三点力，不靠把躯干裹紧';
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

/** 受压点：皮下组织薄、力集中的部位，正文按部位逐一列出 */
const PRESSURE_SPOTS = ['髂前上棘', '髂嵴', '肋骨下缘', '肩胛骨下角', '胸骨柄', '锁骨内侧', '腋窝前缘'];
/** 约束度在脊柱上的三个维度 */
const DOSE_DIMS = ['活动幅度', '佩戴时间', '覆盖节段'];

function chapterFacts(text) {
  const ts = tables(text);
  const seg = ts.find((t) => t.head.join('').includes('覆盖范围'));
  const doseBlock = section(text, '约束度');
  return {
    segments: seg ? seg.rows : 0,
    levers: items(section(text, '三点力是基础')),
    doseDims: DOSE_DIMS.filter((d) => doseBlock.includes(d)),
    pressureSpots: PRESSURE_SPOTS.filter((p) => text.includes(p)),
    threePoint: (text.match(/三点力/g) || []).length,
    fourPoint: (text.match(/四点力/g) || []).length,
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
  console.log(`  表          ${s.tables} 张（分段表 ${s.segments} 行）`);
  console.log(`  引文        ${s.cites} 处 / ${s.books.length} 部`);
  console.log(`  力系可调量  ${s.levers} 项`);
  console.log(`  约束度维度  ${s.doseDims.length} 个（${s.doseDims.join('、')}）`);
  console.log(`  常见受压点  ${s.pressureSpots.length} 处`);
  console.log(`  力点提法    三点力 ${s.threePoint} 次 / 四点力 ${s.fourPoint} 次`);
  console.log(`  代价条目    ${s.boundaries} 条`);
  console.log(`  免责声明    ${s.disclaimer ? '有' : '缺'}`);
  console.log('');
  console.log('※ 数字由本目录 docs/zh.md 现算：节、表行、条目、术语频次任一变动，重跑即见新值。');
  console.log('※ 文中不写 Cobb 角阈值、佩戴时长、压力垫位置数值与产品类型：须由脊柱专科医师与矫形师共同确定。');
}

if (require.main === module) main();

module.exports = {
  CHAPTER, SLUG, TITLE, DOC, PRESSURE_SPOTS, DOSE_DIMS,
  readDoc, headings, numbered, tables, section, bullets, items, citations, chapterFacts, hanzi, stats, main,
};

// 教学边界：口径只在正文维护一份，这里直接摘正文里含「不构成」的那一行。
try {
  const _zh = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'docs', 'zh.md'), 'utf8');
  const _bound = (_zh.match(/[^\n]*不构成[^\n]*/) || [])[0];
  if (_bound) {
    console.log(`\n教学边界：${_bound.replace(/^[>\s*#-]+/, '').trim().slice(0, 120)}`);
  }
} catch { /* 读不到正文就不打，不编一句 */ }
