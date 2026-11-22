#!/usr/bin/env node
/**
 * 康复工程与支具学 · 第 8 章 适配好不好，皮肤先说话
 * 正文: departments/04-gushang/14-kangfu-gongcheng-zhiju/chapters/08-pinggu-suifang/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 口径：只读本目录 docs/zh.md。三层判据、皮肤四信号、记录四维度、随访六件事、
 * 弃用五类全部现算。正文补一条或删一条，脚本输出随之改变。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 8;
const SLUG = '08-pinggu-suifang';
const TITLE = '适配好不好，皮肤先说话';
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

const lead = (text, term) => (text.match(new RegExp(`\\*\\*${term}`, 'g')) || []).length;

/** 三层判据、皮肤四信号、随访六件事、弃用五类 */
const LAYERS = ['接触', '动作', '耐受'];
const SKIN_SIGNS = ['压红', '压痕', '硬结与肿胀', '破溃与水疱'];
const FOLLOW_UP = ['皮肤', '对线/贴合', '约束度是否仍达标', '功能变化', '依从行为', '部件状况'];

function chapterFacts(text) {
  const ts = tables(text);
  const record = ts.find((t) => t.head.join('').includes('记录什么'));
  return {
    layers: LAYERS.filter((l, i) => lead(text, `第${'一二三'[i]}层：${l}`) >= 1),
    skinSigns: SKIN_SIGNS.filter((s) => lead(text, s) >= 1),
    skinBullets: bullets(section(text, '皮肤：最早')),
    recordRows: record ? record.rows : 0,
    followUp: FOLLOW_UP.filter((f) => text.includes(f)),
    abandonKinds: items(section(text, '弃用的原因学')),
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
  console.log(`  表          ${s.tables} 张（记录表 ${s.recordRows} 行）`);
  console.log(`  引文        ${s.cites} 处 / ${s.books.length} 部`);
  console.log(`  适配判据    ${s.layers.length} 层（${s.layers.join('／')}）`);
  console.log(`  皮肤信号    ${s.skinSigns.length} 种；条目 ${s.skinBullets} 条`);
  console.log(`  随访六项    ${s.followUp.length} 项`);
  console.log(`  弃用五类    ${s.abandonKinds} 类`);
  console.log(`  代价条目    ${s.boundaries} 条`);
  console.log(`  免责声明    ${s.disclaimer ? '有' : '缺'}`);
  console.log('');
  console.log('※ 数字由本目录 docs/zh.md 现算：判据层数、信号种类、条目数任一变动，重跑即见新值。');
  console.log('※ 文中不写随访间隔、佩戴时长、压力阈值与产品寿命数值：须由开方医师与矫形师按风险分层与机构规范确定。');
}

if (require.main === module) main();

module.exports = {
  CHAPTER, SLUG, TITLE, DOC, LAYERS, SKIN_SIGNS, FOLLOW_UP,
  readDoc, headings, numbered, tables, section, bullets, items, citations, lead, chapterFacts, hanzi, stats, main,
};
