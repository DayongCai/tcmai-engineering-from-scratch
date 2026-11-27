#!/usr/bin/env node
/**
 * 康复工程与支具学 · 第 6 章 鞋垫改变力矩，压力衣改变梯度
 * 正文: departments/04-gushang/14-kangfu-gongcheng-zhiju/chapters/06-zuxie-yali/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 口径：只读本目录 docs/zh.md。足部支点数、鞋垫机制、鞋的变量、压力治疗变量、
 * 禁忌条目全部现算；正文改一处，输出跟着改。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 6;
const SLUG = '06-zuxie-yali';
const TITLE = '鞋垫改变力矩，压力衣改变梯度';
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
/** 编号立目：形如 **第一条：分散峰值压力。** */
const ordinal = (text, term) =>
  (text.match(new RegExp(`\\*\\*第[一二三四五六七八九十]+条：${term}`, 'g')) || []).length;

/** 足的三支点、鞋垫三机制、鞋的三变量 */
const FOOT_POINTS = ['跟骨', '第一跖骨头', '第五跖骨头'];
const INSOLE_MODES = ['分散峰值压力', '改变力的方向', '提供本体感觉'];
const SHOE_VARS = ['鞋楦', '鞋跟高度与前后落差', '鞋底的硬度与滚动性'];

function chapterFacts(text) {
  const ts = tables(text);
  const insole = ts.find((t) => t.head.join('').includes('手段'));
  const insoleBlock = section(text, '鞋垫：改变的是力矩');
  const shoeBlock = section(text, '鞋：三个比鞋垫更重要的变量');
  const pressureBlock = section(text, '压力治疗');
  return {
    footPoints: FOOT_POINTS.filter((p) => text.includes(p)),
    insoleModes: INSOLE_MODES.filter((m) => ordinal(insoleBlock, m) >= 1),
    insoleRows: insole ? insole.rows : 0,
    shoeVars: SHOE_VARS.filter((v) => bold(shoeBlock, v) >= 1),
    pressureVars: items(pressureBlock),
    redLine: /动脉供血不足的肢体不能用高压/.test(text),
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
  console.log(`  表          ${s.tables} 张（鞋垫对照表 ${s.insoleRows} 行）`);
  console.log(`  引文        ${s.cites} 处 / ${s.books.length} 部`);
  console.log(`  足部支点    ${s.footPoints.length} 个（${s.footPoints.join('、')}）`);
  console.log(`  鞋垫机制    ${s.insoleModes.length} 条（${s.insoleModes.join('／')}）`);
  console.log(`  鞋的变量    ${s.shoeVars.length} 个`);
  console.log(`  压力变量    ${s.pressureVars} 项`);
  console.log(`  绝对禁忌    ${s.redLine ? '在正文标出' : '缺'}`);
  console.log(`  代价条目    ${s.boundaries} 条`);
  console.log(`  免责声明    ${s.disclaimer ? '有' : '缺'}`);
  console.log('');
  console.log('※ 数字由本目录 docs/zh.md 现算：支点、机制、变量、条目任一变动，重跑即见新值。');
  console.log('※ 文中不写压力数值、鞋跟高度、鞋垫厚度与佩戴时间：须由医师、治疗师与矫形师按机构规范确定。');
}

if (require.main === module) main();

module.exports = {
  CHAPTER, SLUG, TITLE, DOC, FOOT_POINTS, INSOLE_MODES, SHOE_VARS,
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
