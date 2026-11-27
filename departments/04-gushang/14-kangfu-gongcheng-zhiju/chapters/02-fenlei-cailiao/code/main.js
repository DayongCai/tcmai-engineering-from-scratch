#!/usr/bin/env node
/**
 * 康复工程与支具学 · 第 2 章 分类看约束的方向，材料看它能撑多久
 * 正文: departments/04-gushang/14-kangfu-gongcheng-zhiju/chapters/02-fenlei-cailiao/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 口径：只读本目录 docs/zh.md。汉字数、节、表、表内行数、材料维度、取模路径、
 * 约束平面的数量全部现算——分类表多一行、材料表少一种，脚本输出随之改变。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 2;
const SLUG = '02-fenlei-cailiao';
const TITLE = '分类看约束的方向，材料看它能撑多久';
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

/** 表：返回表头与数据行数 */
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

/** 加粗立目：术语紧跟 ** 之后即可，容许标点落在加粗内 */
const bold = (text, term) => (text.match(new RegExp(`\\*\\*${term}`, 'g')) || []).length;

/** 本章的可数对象：三种力学类型、五个材料维度、三个约束平面、三条取模路径 */
const MATERIALS = ['金属', '碳纤维', '低温热塑', '高温热塑', '皮革/织物'];
const PLANES = ['单平面', '双平面', '三平面'];
const PATHS = ['石膏阴模', '三维扫描与数字制造', '直接塑形'];

function chapterFacts(text) {
  const ts = tables(text);
  const types = ts.find((t) => t.head.join('').includes('力的来源'));
  const mats = ts.find((t) => t.head.join('').includes('刚度') && t.head.join('').includes('重量'));
  return {
    types: types ? types.rows : 0,
    materials: mats ? mats.rows : 0,
    materialNames: MATERIALS.filter((m) => text.includes(`| ${m} |`)),
    planes: PLANES.filter((p) => bold(text, p) >= 1),
    paths: PATHS.filter((p) => bold(text, p) >= 1),
    dims: ['强度与刚度', '重量', '成形与修改', '透气与皮肤界面'].filter((d) => bold(text, d) >= 1),
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
  console.log(`  表          ${s.tables}`);
  console.log(`  引文        ${s.cites} 处 / ${s.books.length} 部`);
  console.log(`  力学类型    ${s.types} 种（静态／动态／静态渐进）`);
  console.log(`  材料        ${s.materials} 种（${s.materialNames.join('、')}）`);
  console.log(`  材料维度    ${s.dims.length} 维（${s.dims.join('、')}）`);
  console.log(`  约束平面    ${s.planes.length} 级（${s.planes.join('、')}）`);
  console.log(`  取模路径    ${s.paths.length} 条（${s.paths.join('、')}）`);
  console.log(`  代价条目    ${s.boundaries} 条`);
  console.log(`  免责声明    ${s.disclaimer ? '有' : '缺'}`);
  console.log('');
  console.log('※ 数字由本目录 docs/zh.md 现算：表内行数、加粗术语任一变动，重跑本脚本即可看到新值。');
  console.log('※ 文中不写材料牌号、厚度、成形温度与更换周期：这些属制作与处方参数，须由矫形师按机构规范执行。');
}

if (require.main === module) main();

module.exports = {
  CHAPTER, SLUG, TITLE, DOC, MATERIALS, PLANES, PATHS,
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
