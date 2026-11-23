#!/usr/bin/env node
/**
 * 方剂学 · 第 4 章 泻下剂与和解剂：下与和，方向相反的两个「通」 —— 本章正文的结构统计
 * 课程: departments/02-zhongyao/03-fangjixue/chapters/04-xiexia-hejie/docs/zh.md
 * 数据: 只读本章正文 docs/zh.md（不读缓存、不读底本、不手打数字）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么只读正文现算：本章引用的每一个规模数（字数、节数、表行数、数字列合计、引文条数）
 * 都写在正文里，正文就是本章唯一的数据源。把统计写成对正文的复算，正文一改、数字就变，
 * 单测立刻报警；手打一份统计表则会在改稿后静默过期。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 4;
const TITLE = '泻下剂与和解剂：下与和，方向相反的两个「通」';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CJK = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

const readDoc = () => fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

/** H1 与二、三级小节：节数是审计判据之一（要求 4–8 个二级节） */
function headings(text) {
  const lines = text.split('\n');
  const h1 = (lines.find((l) => /^#\s+/.test(l)) || '').replace(/^#\s+/, '').trim();
  const h2 = [];
  const h3 = [];
  for (const l of lines) {
    if (/^##\s+/.test(l)) h2.push(l.replace(/^##\s+/, '').trim());
    else if (/^###\s+/.test(l)) h3.push(l.replace(/^###\s+/, '').trim());
  }
  return { h1, h2, h3 };
}

/** 正文里的全部表格：首行是表头，分隔行丢掉，其余是数据行 */
function tables(text) {
  const blocks = [];
  let cur = [];
  for (const raw of text.split('\n')) {
    if (/^\|.*\|$/.test(raw.trim())) cur.push(raw.trim());
    else {
      if (cur.length >= 2) blocks.push(cur);
      cur = [];
    }
  }
  if (cur.length >= 2) blocks.push(cur);
  const cells = (l) => l.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
  const isSep = (row) => row.every((c) => /^:?-{2,}:?$/.test(c.replace(/\s/g, '')));
  return blocks.map((b, i) => ({
    idx: i + 1,
    header: cells(b[0]),
    rows: b.slice(1).map(cells).filter((r) => !isSep(r)),
  }));
}

const num = (c) => {
  const v = String(c).replace(/[*_`\s,]/g, '');
  return /^-?\d+(?:\.\d+)?$/.test(v) ? Number(v) : null;
};

const isTotalRow = (r) => /^(合计|总计)/.test(String(r[0] || '').replace(/[*_\s]/g, ''));

/**
 * 可合计的计数列：排除比率列（每方/每段/平均/÷/占/率），
 * 若表里有「合计」行，则把数据行之和与该行对账——表内自洽也当场核。
 */
function columnStats(t) {
  const totalIdx = t.rows.findIndex(isTotalRow);
  const dataRows = t.rows.filter((_, i) => i !== totalIdx);
  const cols = [];
  t.header.forEach((name, ci) => {
    if (/每|平均|÷|占|率/.test(name)) return;
    const vals = dataRows.map((r) => num(r[ci]));
    if (!dataRows.length || vals.some((v) => v === null)) return;
    const sum = Number(vals.reduce((a, b) => a + b, 0).toFixed(4));
    const declared = totalIdx >= 0 ? num(t.rows[totalIdx][ci]) : null;
    cols.push({ name, sum, declared, ok: declared === null ? null : declared === sum });
  });
  return { totalIdx, cols };
}

/** 「」引文：全部条数，以及挂了「教材·第N章·N.M.K」锚点的条数 */
function quotes(text) {
  const all = [...text.matchAll(/「([^」]+)」/g)].map((m) => m[1]);
  const anchored = [];
  for (const line of text.split('\n')) {
    if (!/教材·第\d+章/.test(line)) continue;
    for (const m of line.matchAll(/「([^」]{6,})」/g)) anchored.push(m[1]);
  }
  return { all, anchored };
}

/** 教材定位点：教材·第N章·N.M.K（去重后排序，用于报“引了哪几章” ） */
function locators(text) {
  const set = new Set();
  for (const m of text.matchAll(/教材·第(\d+)章·(\d+(?:\.\d+)*)/g)) set.add(`${Number(m[1])}|${m[2]}`);
  return [...set].sort((a, b) => {
    const [ca, sa] = a.split('|');
    const [cb, sb] = b.split('|');
    return Number(ca) - Number(cb) || sa.localeCompare(sb, 'en', { numeric: true });
  });
}

/** MOTTO 里的《书名·篇名》 */
function bookCites(text) {
  const line = text.split('\n').find((l) => /\*\*MOTTO:\*\*/.test(l)) || '';
  return [...line.matchAll(/《([^》]+)》/g)].map((m) => m[1]);
}

/** 正文段落数：排除标题、表格、引用块与代码块行 */
function proseBlocks(text) {
  return text
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => !/^(#|>|\||```)/.test(s));
}

function analyze(text = readDoc()) {
  const h = headings(text);
  const ts = tables(text);
  const q = quotes(text);
  const loc = locators(text);
  return {
    hanzi: (text.match(CJK) || []).length,
    h1: h.h1,
    h2: h.h2,
    h3: h.h3,
    paragraphs: proseBlocks(text).length,
    tables: ts.map((t) => {
      const st = columnStats(t);
      return {
        idx: t.idx,
        cols: t.header.length,
        rows: t.rows.length,
        dataRows: st.totalIdx >= 0 ? t.rows.length - 1 : t.rows.length,
        hasTotal: st.totalIdx >= 0,
        header: t.header,
        numeric: st.cols,
      };
    }),
    quotes: q.all.length,
    anchored: q.anchored.length,
    locators: loc,
    chapters: [...new Set(loc.map((x) => Number(x.split('|')[0])))].sort((a, b) => a - b),
    books: bookCites(text),
  };
}

/** 本章自检：任何一条不符即抛错——宁可让脚本崩，也不让一个错的报告被打印出去 */
function selfCheck(a) {
  const errs = [];
  if (!new RegExp(`^第\\s*${CHAPTER}\\s*章`).test(a.h1)) errs.push(`H1 章号不是 ${CHAPTER}：${a.h1}`);
  if (a.hanzi < 2500) errs.push(`汉字 ${a.hanzi} < 2500`);
  if (a.h2.length < 4 || a.h2.length > 8) errs.push(`二级小节 ${a.h2.length} 个，不在 4–8`);
  if (!a.h2.some((t) => /代价与边界/.test(t))) errs.push('缺「代价与边界」小节');
  if (!a.books.length) errs.push('MOTTO 缺《书名·篇名》');
  if (a.anchored < 2) errs.push(`挂教材出处的引文只有 ${a.anchored} 条`);
  for (const t of a.tables) {
    if (t.cols < 2) errs.push(`表 ${t.idx} 只有 ${t.cols} 列`);
    if (t.dataRows < 1) errs.push(`表 ${t.idx} 没有数据行`);
    for (const c of t.numeric) {
      if (c.ok === false) errs.push(`表 ${t.idx} 的「${c.name}」：数据行合计 ${c.sum} ≠ 合计行 ${c.declared}`);
    }
  }
  if (errs.length) throw new Error('本章正文自检失败：\n  ' + errs.join('\n  '));
  return true;
}

function main() {
  const a = analyze();
  selfCheck(a);

  console.log(`═══ 第 ${CHAPTER} 章 ${TITLE} ═══`);
  console.log(`正文 ${a.hanzi} 汉字 · ${a.paragraphs} 个正文段 · ${a.tables.length} 张表 · 二级节 ${a.h2.length} · 三级节 ${a.h3.length}`);
  console.log('H1: ' + a.h1);
  console.log('MOTTO 书证: ' + a.books.map((b) => `《${b}》`).join(' · '));

  console.log('\n二级节（审计要求 4–8）:');
  a.h2.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));
  if (a.h3.length) {
    console.log('\n三级节:');
    a.h3.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));
  }

  console.log('\n表格：');
  for (const t of a.tables) {
    const sums = t.numeric.length
      ? t.numeric.map((c) => `${c.name}=${c.sum}${c.ok === null ? '' : c.ok ? '（=合计行）' : `（≠合计行 ${c.declared}）`}`).join(' · ')
      : '无可合计的计数列';
    console.log(`  T${t.idx} ${t.cols} 列 × ${t.rows} 行${t.hasTotal ? '（含合计行）' : ''} | ${t.header.join(' | ')}`);
    console.log(`       数字列：${sums}`);
  }

  console.log(`\n引文：「」${a.quotes} 条 · 挂教材定位 ${a.anchored} 条 · 定位点 ${a.locators.length} 个`);
  console.log(`教材章：${a.chapters.map((c) => `第${c}章`).join(' / ')}`);

  console.log('\n对账：节数、表行数、数字列合计、引文条数全部由上一段正文现算；正文一改，这里就变。');
  console.log('教学边界：本章统计只读本章正文，数字由 docs/zh.md 现算，用于方剂学的结构核对；不含诊疗建议，不构成诊断或用药依据，临床决策须由执业医师依据辨证与《中国药典》作出。');
}

if (require.main === module) main();

module.exports = { CHAPTER, TITLE, DOC, readDoc, headings, tables, quotes, locators, bookCites, proseBlocks, analyze, selfCheck, main };
