#!/usr/bin/env node
/**
 * 康复工程与支具学 · 第 5 章 下肢支具先回答负重，再回答步态
 * 正文: departments/04-gushang/14-kangfu-gongcheng-zhiju/chapters/05-xiazhi-zhiju/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 口径：只读本目录 docs/zh.md。承重状态、迈步条件、踝足矫形器的设计变量、
 * 膝状态对照表的行数全部现算；正文删掉一种状态或加一个变量，输出随之改变。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 5;
const SLUG = '05-xiazhi-zhiju';
const TITLE = '下肢支具先回答负重，再回答步态';
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

/** 第一问的三种承重状态、第二问的三个迈步条件 */
const WEIGHT_STATES = ['完全不能承重', '部分承重', '可以完全承重'];
const GAIT_NEEDS = ['足能廓清地面', '膝能稳定', '髋能带动'];
/** 假肢三件事：接受腔、对线、悬吊 */
const PROSTHESIS = ['接受腔', '对线', '悬吊'];

function chapterFacts(text) {
  const ts = tables(text);
  const knee = ts.find((t) => t.head.join('').includes('膝的状态'));
  return {
    weightStates: WEIGHT_STATES.filter((w) => text.includes(w)),
    gaitNeeds: GAIT_NEEDS.filter((g) => text.includes(g)),
    afoVars: items(section(text, '足下垂是摆动期的病')),
    kneeRows: knee ? knee.rows : 0,
    prosthesis: PROSTHESIS.filter((p) => text.includes(`**${p}`)),
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
  console.log(`  表          ${s.tables} 张（膝状态表 ${s.kneeRows} 行）`);
  console.log(`  引文        ${s.cites} 处 / ${s.books.length} 部`);
  console.log(`  承重状态    ${s.weightStates.length} 种（${s.weightStates.join('、')}）`);
  console.log(`  迈步条件    ${s.gaitNeeds.length} 个（${s.gaitNeeds.join('、')}）`);
  console.log(`  踝足变量    ${s.afoVars} 项`);
  console.log(`  假肢三事    ${s.prosthesis.join('、')}`);
  console.log(`  代价条目    ${s.boundaries} 条`);
  console.log(`  免责声明    ${s.disclaimer ? '有' : '缺'}`);
  console.log('');
  console.log('※ 数字由本目录 docs/zh.md 现算：状态、条件、设计变量、表行数任一变动，重跑即见新值。');
  console.log('※ 文中不写支具角度、免重比例、佩戴时长与假肢型号：须由骨科/康复科医师与假肢矫形师共同确定。');
}

if (require.main === module) main();

module.exports = {
  CHAPTER, SLUG, TITLE, DOC, WEIGHT_STATES, GAIT_NEEDS, PROSTHESIS,
  readDoc, headings, numbered, tables, section, bullets, items, citations, chapterFacts, hanzi, stats, main,
};
