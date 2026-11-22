#!/usr/bin/env node
/**
 * 医学生物学 · 第 16 章 中医遗传学表述：可对读与不可对读，从正文里算出来
 * 课程: departments/09-jichu/04-yixue-shengwu-xue/chapters/16-zhongyi-yichuan-xue/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章没有可算的数值，全部结论都是结构性的。脚本做的是把结构数出来：
 * 三个概念的判据与限度、可对读三处与不可对读三处、三条研究接口、三条古籍引文，
 * 全部从正文读出，正文改版后重跑即可复现。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = '16';
const SLUG = '16-zhongyi-yichuan-xue';
const TITLE = '中医讲「禀赋」，讲的不是基因，是「一个人从父母那里带来的起点与限度」';

/** 本章论证链上的关键词：正文必须出现，否则说明正文与习题已经脱节 */
const CONCEPTS = ['禀赋', '胎养', '体质', '藏象', '功能归类', '生成论', '传递论', '外显年龄'];

function readDoc(file) {
  return fs.readFileSync(file || DOC, 'utf8');
}

function lines(text) {
  return text.split(/\r?\n/);
}

function sections(text = readDoc()) {
  return lines(text)
    .filter((l) => /^##\s+/.test(l))
    .map((l) => l.replace(/^##\s+/, '').trim());
}

function hanzi(text = readDoc()) {
  return (text.match(/[\u4e00-\u9fff]/g) || []).length;
}

/** 取某节全文（到下一个二级标题为止） */
function section(text, startRe) {
  const ls = lines(text);
  const start = ls.findIndex((l) => startRe.test(l));
  if (start < 0) return '';
  let end = ls.length;
  for (let i = start + 1; i < ls.length; i += 1) {
    if (/^##\s/.test(ls[i])) {
      end = i;
      break;
    }
  }
  return ls.slice(start, end).join('\n');
}

/** 三个概念表：概念 / 说的是什么 / 判据 / 限度 */
function conceptTable(text = readDoc()) {
  const rows = [];
  for (const line of lines(text)) {
    if (!/^\|/.test(line)) continue;
    if (/^\|[\s\-:|]+\|$/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length !== 4) continue;
    if (/^概念$/.test(cells[0])) continue;
    rows.push({ name: cells[0], what: cells[1], how: cells[2], limit: cells[3] });
  }
  return rows;
}

/** 「四、」节两组编号列表：可对读三处 / 不可对读三处 */
function parallelLists(text = readDoc()) {
  const sec = section(text, /^##\s*四、可对读的三处/);
  const cut = sec.indexOf('不可对读的地方');
  const first = cut >= 0 ? sec.slice(0, cut) : sec;
  const second = cut >= 0 ? sec.slice(cut) : '';
  const pick = (s) => lines(s)
    .map((l) => l.trim())
    .filter((l) => /^\d+\.\s+\*\*/.test(l))
    .map((l) => (l.match(/\*\*([^*]+)\*\*/) || [, ''])[1]);
  return { readable: pick(first), notReadable: pick(second) };
}

/** 「五、」节三条研究接口：加粗的「第N条，…」段落 */
function interfaces(text = readDoc()) {
  return lines(section(text, /^##\s*五、研究的接口/))
    .map((l) => l.trim())
    .filter((l) => /^\*\*第[一二三]条，/.test(l))
    .map((l) => {
      const m = l.match(/\*\*第[一二三]条，([^*。]+)。\*\*/);
      return m ? m[1] : '';
    })
    .filter(Boolean);
}

/** 「三、」节三条古籍引文：加粗的「…」段落 */
function quotations(text = readDoc()) {
  return lines(section(text, /^##\s*三、古籍里的/))
    .map((l) => l.trim())
    .filter((l) => /^\*\*[「"].*」\*\*/.test(l) || /^\*\*[「"].*\*\*/.test(l))
    .map((l) => (l.match(/\*\*([^*]+)\*\*/) || [, ''])[1]);
}

/** 三段结构的对读：中医一端与遗传学一端，各自三格 */
function triadMapping(text = readDoc()) {
  const zh = ['禀赋', '胎养', '体质'];
  const modern = ['基因型', '环境暴露', '表型'];
  return zh.map((a, i) => ({
    zh: a,
    modern: modern[i],
    present: text.includes(a) && text.includes(modern[i]),
    /** 正文明写这个对应是结构相似而非内容等同 */
    structuralOnly: /结构/.test(section(text, /^##\s*四、可对读的三处/)),
  }));
}

function conceptHits(text = readDoc()) {
  return CONCEPTS.map((term) => ({ term, hits: text.split(term).length - 1 }));
}

function missing(text = readDoc()) {
  return conceptHits(text).filter((c) => c.hits === 0).map((c) => c.term);
}

function boundaries(text = readDoc()) {
  return lines(section(text, /^##\s*代价与边界/))
    .map((l) => l.trim())
    .filter((l) => /^-\s+/.test(l))
    .map((l) => l.replace(/^-\s+/, ''));
}

function summarize(text = readDoc()) {
  const p = parallelLists(text);
  return {
    hanzi: hanzi(text),
    sections: sections(text),
    conceptsTable: conceptTable(text),
    readable: p.readable,
    notReadable: p.notReadable,
    interfaces: interfaces(text),
    quotes: quotations(text),
    triad: triadMapping(text),
    concepts: conceptHits(text),
    boundaries: boundaries(text),
  };
}

function main() {
  const s = summarize();
  console.log('医学生物学 · 第 ' + CHAPTER + ' 章 ' + TITLE);
  console.log('');
  console.log('正文 ' + s.hanzi.toLocaleString('en-US') + ' 汉字 · ' + s.sections.length + ' 节 · 边界 '
    + s.boundaries.length + ' 条');
  console.log('');
  console.log('三个概念（正文表格现算 ' + s.conceptsTable.length + ' 个）：');
  for (const c of s.conceptsTable) console.log('  ' + c.name + '：' + c.what + '（限度：' + c.limit + '）');
  console.log('  → 起点—过程—状态，与基因型—环境暴露—表型形式相似，但不能逐格画等号。');
  console.log('');
  const t = s.triad;
  console.log('三段结构对读（正文现算，仅结构层面）：');
  for (const row of t) console.log('  ' + row.zh + ' ↔ ' + row.modern + (row.present ? '' : '（正文未并置）'));
  console.log('  正文明写「结构层面」而非内容等同：' + (t[0].structuralOnly ? '是' : '否'));
  console.log('');
  console.log('可对读三处（' + s.readable.length + ' 处）：' + s.readable.join('、'));
  console.log('不可对读三处（' + s.notReadable.length + ' 处）：' + s.notReadable.join('、'));
  console.log('研究接口三条（' + s.interfaces.length + ' 条）：' + s.interfaces.join('、'));
  console.log('古籍引文（' + s.quotes.length + ' 条）：' + s.quotes.join(' ／ '));
  console.log('');
  console.log('判据词命中（正文现算）：');
  for (const x of s.concepts) console.log('  ' + (x.hits ? '✓' : '✗') + ' ' + x.term + '：' + x.hits);
  console.log('');
  console.log('边界（「代价与边界」一节，取前 3 条）：');
  s.boundaries.slice(0, 3).forEach((b) => console.log('  - ' + b));
  console.log('');
  console.log('※ 现算自 ' + SLUG + '/docs/zh.md；正文改版后重跑即可复现。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, SLUG, TITLE, CONCEPTS,
  readDoc, sections, hanzi, section, conceptTable, parallelLists, interfaces, quotations,
  triadMapping, conceptHits, missing, boundaries, summarize,
};
