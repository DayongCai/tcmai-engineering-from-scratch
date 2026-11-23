#!/usr/bin/env node
/**
 * 中医各家学说 · 第 7 章 温病不是一派：三套坐标互不翻译，硬译必错
 * 课程: departments/01-zhongyi/15-zhongyi-gejia-xueshuo/chapters/07-yetianshi-wenbing/docs/zh.md
 * 数据: standards/wenbing/底本.json
 * 依赖: 仅 Node.js 标准库
 *
 * 只读：三本书各自的条数、坐标词的逐书分布、舌象密度，
 * 全部当次现算，再与正文坐标表逐格核对；对不上就抛错。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 7;
const TITLE = '温病不是一派：三套坐标互不翻译，硬译必错';

function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, 'standards', 'wenbing', '底本.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/wenbing/底本.json —— 章节目录是否已脱离仓库？');
}

const ROOT = findRoot(__dirname);
const readJSON = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const readDoc = () => fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');

/** 三本书各是一组「条」 */
function books() {
  const wb = readJSON('standards/wenbing/底本.json');
  return wb.books.map((b) => ({
    title: b.titleSimp,
    articles: b.sections.flatMap((s) => s.articles.map((a) => ({
      book: b.titleSimp, pian: s.pian || s.juan || '', no: a.no, text: a.zhHans,
    }))),
  }));
}
const hits = (list, word) => list.reduce((n, t) => n + (t.text.includes(word) ? 1 : 0), 0);

function tables(md) {
  const lines = md.split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!/^\s*\|/.test(lines[i])) continue;
    if (!/^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] || '')) continue;
    const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((s) => s.trim());
    const rows = [];
    let j = i + 2;
    while (j < lines.length && /^\s*\|/.test(lines[j])) { rows.push(cells(lines[j])); j += 1; }
    out.push({ header: cells(lines[i]), rows });
    i = j - 1;
  }
  return out;
}
const num = (s) => {
  const m = String(s == null ? '' : s).replace(/[,\s]/g, '').match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
};

const WORDS = ['膜原', '三焦', '卫', '营', '血', '逆传', '舌'];
const ORDER = ['温疫论', '温病条辨', '温热论'];

function analyze() {
  const md = readDoc();
  const bs = books();
  const byTitle = new Map(bs.map((b) => [b.title, b]));
  const all = bs.flatMap((b) => b.articles);
  const counts = ORDER.map((t) => ({ book: t, n: byTitle.get(t).articles.length }));
  const matrix = WORDS.map((w) => ({
    word: w,
    per: ORDER.map((t) => hits(byTitle.get(t).articles, w)),
    total: hits(all, w),
  }));
  const tongue = matrix.find((m) => m.word === '舌');

  const docTables = tables(md);
  const table = docTables.find((t) => t.header.join('|').includes('温疫论') && t.header.join('|').includes('温热论'));
  if (!table) throw new Error('正文里找不到三书坐标词表');

  const mismatches = [];
  for (const row of matrix) {
    const line = table.rows.find((x) => x[0] === row.word);
    if (!line) { mismatches.push(`坐标表缺「${row.word}」一行`); continue; }
    for (let i = 0; i < ORDER.length; i += 1) {
      if (num(line[i + 1]) !== row.per[i]) mismatches.push(`「${row.word}」在《${ORDER[i]}》：正文 ${num(line[i + 1])}，现算 ${row.per[i]}`);
    }
  }

  return {
    md, bs, all, counts, matrix, tongue,
    total: all.length,
    tongueShare: tongue.total / all.length,
    tongueByBook: ORDER.map((t) => ({ book: t, share: hits(byTitle.get(t).articles, '舌') / byTitle.get(t).articles.length })),
    mismatches, docTables: docTables.length,
  };
}

function main() {
  const a = analyze();
  const pct = (x) => (x * 100).toFixed(1) + '%';
  const w = (s) => [...String(s)].reduce((n, ch) => n + (/[\u4e00-\u9fff]/.test(ch) ? 2 : 1), 0);
  const pad = (s, n) => String(s) + ' '.repeat(Math.max(1, n - w(s)));

  console.log(`中医各家学说 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字当次现算：温病三书 630 条，逐书统计坐标词）');
  console.log('');
  console.log(a.counts.map((c) => `${c.book} ${c.n} 条`).join(' · ') + ` = ${a.total} 条`);
  console.log('');
  console.log(`${pad('词', 5)}${a.counts.map((c) => pad(c.book, 12)).join('')}全库`);
  for (const row of a.matrix) {
    console.log(`${pad(row.word, 5)}${row.per.map((v) => pad(v, 12)).join('')}${row.total}`);
  }
  console.log('');
  console.log(`舌：全库 ${a.tongue.total} 条（${pct(a.tongueShare)}）`);
  for (const t of a.tongueByBook) console.log(`  《${t.book}》${pct(t.share)}`);
  console.log('  坐标词是骨架，舌象是干活的地方 —— 三书的重心都在观察，不在定位');
  console.log('');
  console.log(`正文对照：${a.docTables} 张表逐格复算，不符 ${a.mismatches.length} 处`);
  for (const m of a.mismatches) console.log('  - ' + m);
  console.log('');
  console.log('※ 教学样例：数字由本库语料现算，不构成诊疗建议，不能替代医师面诊。');

  if (a.mismatches.length) throw new Error(`正文与复算不一致 ${a.mismatches.length} 处：\n${a.mismatches.join('\n')}`);
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, ROOT, readJSON, readDoc, books, hits, tables, num, WORDS, ORDER, analyze };
