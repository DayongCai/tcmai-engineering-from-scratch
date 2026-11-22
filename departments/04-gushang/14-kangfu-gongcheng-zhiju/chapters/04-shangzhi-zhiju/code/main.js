#!/usr/bin/env node
/**
 * 康复工程与支具学 · 第 4 章 手部支具的目标是滑动，不是固定
 * 正文: departments/04-gushang/14-kangfu-gongcheng-zhiju/chapters/04-shangzhi-zhiju/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 口径：只读本目录 docs/zh.md。滑动界面数、静态支具常见错误数、神经损伤对照表行数、
 * 交付检查项数全部现算。正文一改，这些数字跟着变。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 4;
const SLUG = '04-shangzhi-zhiju';
const TITLE = '手部支具的目标是滑动，不是固定';
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

/** 三套滑动界面、三类静态任务、交付三项检查 */
const INTERFACES = ['肌腱与腱鞘之间', '神经与周围组织之间', '关节囊与韧带之间'];
const STATIC_TASKS = ['保护修复结构', '预防与矫治挛缩', '替代缺失的支撑'];
const DELIVERY = ['指尖颜色与温度', '各指能否独立屈伸', '支具边缘是否压在腕横纹'];

function chapterFacts(text) {
  const ts = tables(text);
  const nerves = ts.find((t) => t.head.join('').includes('表现'));
  const staticBlock = section(text, '静态支具');
  return {
    interfaces: INTERFACES.filter((i) => bold(text, i) >= 1),
    staticTasks: STATIC_TASKS.filter((t) => bold(staticBlock, t) >= 1),
    staticErrors: items(staticBlock),
    nerveRows: nerves ? nerves.rows : 0,
    delivery: DELIVERY.filter((d) => text.includes(d)),
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
  console.log(`  表          ${s.tables} 张（神经损伤表 ${s.nerveRows} 行）`);
  console.log(`  引文        ${s.cites} 处 / ${s.books.length} 部`);
  console.log(`  滑动界面    ${s.interfaces.length} 套（${s.interfaces.join('／')}）`);
  console.log(`  静态任务    ${s.staticTasks.length} 类`);
  console.log(`  常见错误    ${s.staticErrors} 条`);
  console.log(`  交付检查    ${s.delivery.length} 项`);
  console.log(`  代价条目    ${s.boundaries} 条`);
  console.log(`  免责声明    ${s.disclaimer ? '有' : '缺'}`);
  console.log('');
  console.log('※ 数字由本目录 docs/zh.md 现算：界面、任务、错误条目、表行数任一变动，重跑即见新值。');
  console.log('※ 文中不写支具角度、佩戴时长、牵引力与产品类型：上肢支具高度个体化，须由手术医师与矫形师确定。');
}

if (require.main === module) main();

module.exports = {
  CHAPTER, SLUG, TITLE, DOC, INTERFACES, STATIC_TASKS, DELIVERY,
  readDoc, headings, numbered, tables, section, bullets, items, citations, bold, chapterFacts, hanzi, stats, main,
};
