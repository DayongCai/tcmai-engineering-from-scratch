#!/usr/bin/env node
/**
 * 中医证候学 · 第 11 章 辞典操作：编码、检索与统计口径（三基·基本技能）：本章统计口径
 * 课程: departments/01-zhongyi/14-zhongyi-zhenghou-xue/chapters/11-s11-cidian-caozuo/docs/zh.md
 * 数据: standards/zhenghou-cidian/正文-概论.json（概论 10 节 / 27,241 汉字）
 *       standards/zhenghou-cidian/结构.json（12 门 / 45 类 / 291 证 / 1866 候）
 *       standards/zhenghou/units.json（概论切出的 51 单元）
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：本章覆盖的概论节与单元、字数、以及辞典的规模口径。
 * 不写死任何一个计数 —— 母本一变，本章的表就跟着变。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, 'standards', 'zhenghou-cidian', '正文-概论.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/zhenghou-cidian/正文-概论.json —— 章节目录是否已脱离仓库？');
}

const ROOT = findRoot(__dirname);
const GL = path.join(ROOT, 'standards', 'zhenghou-cidian', '正文-概论.json');
const STRUCT = path.join(ROOT, 'standards', 'zhenghou-cidian', '结构.json');
const UNITS = path.join(ROOT, 'standards', 'zhenghou', 'units.json');
const CHAPTER = 11;
const SECS = [6];      // 本章覆盖的概论节号
const ITEMS = [];    // 本章额外引证的小节尾号（空数组＝引整节）

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const hanzi = (s) => (s.match(/[\u4e00-\u9fff]/g) || []).length;

function gl() { return readJson(GL); }
function struct() { return readJson(STRUCT); }
function units() { return readJson(UNITS); }

function sectionStats(data) {
  const secs = data.sections.filter((s) => SECS.includes(s.no));
  return {
    sections: secs,
    chars: secs.reduce((a, s) => a + s.chars, 0),
    titles: secs.map((s) => '第' + '一二三四五六七八九十'[s.no - 1] + '节 ' + s.title),
  };
}

function chapterUnits(data) {
  const us = data.units.filter((u) => SECS.includes(u.sec));
  const base = us.filter((u) => u.level === 1 || (ITEMS.length === 0 && u.level === 2));
  const extra = ITEMS.length === 0 ? [] : us.filter((u) => u.level > 1 && ITEMS.some((t) => u.locator.endsWith('·' + t)));
  const all = [...base, ...extra].filter((u, i, a) => a.findIndex((x) => x.locator === u.locator) === i);
  return { units: all, chars: all.reduce((a, u) => a + u.hanzi, 0) };
}

function stats() {
  const g = gl(); const st = struct(); const un = units();
  const s = sectionStats(g); const cu = chapterUnits(un);
  return {
    chapter: CHAPTER,
    secs: SECS,
    sectionTitles: s.titles,
    sectionChars: s.chars,
    units: cu.units.length,
    unitChars: cu.chars,
    locators: cu.units.map((u) => u.locator),
    book: {
      men: st.counts.men, lei: st.counts.lei,
      zheng: st.counts.zhengInstances, hou: st.counts.houInstances,
      tensorCells: st.counts.tensorCells,
    },
    gl: { sections: g.sections.length, chars: g.counts.chars },
  };
}

function report() {
  const s = stats();
  const rows = [
    ['章', String(s.chapter)],
    ['覆盖概论', s.sectionTitles.join('；')],
    ['概论字数（汉字）', String(s.sectionChars)],
    ['本章单元', String(s.units) + '（' + s.unitChars + ' 字）'],
    ['辞典规模', s.book.men + ' 门 / ' + s.book.lei + ' 类 / ' + s.book.zheng + ' 证 / ' + s.book.hou + ' 候'],
    ['张量非零格', String(s.book.tensorCells)],
  ];
  for (const [k, v] of rows) console.log(k.padEnd(16, ' ') + ' ' + v);
  console.log('— 数字全部由 standards/zhenghou-cidian/ 与 standards/zhenghou/units.json 现算；本课只讲规则与判据，不构成诊疗建议。');
  return s;
}

if (require.main === module) report();

module.exports = { CHAPTER, SECS, ITEMS, load: { gl, struct, units }, stats, sectionStats, chapterUnits, hanzi };
