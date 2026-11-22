#!/usr/bin/env node
/**
 * 医学生物学 · 第 7 章 增殖·分化·衰老·死亡：闸口与账，从正文里算出来
 * 课程: departments/09-jichu/04-yixue-shengwu-xue/chapters/07-zengzhi-fenhua-shuailao-siwang/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：三道闸、两笔账、三种计时器、三条死亡路径的条数，
 * 以及「每复制一次引入多少改变」这笔保真账，都从本章正文读出后计算。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = '7';
const SLUG = '07-zengzhi-fenhua-shuailao-siwang';
const TITLE = '增殖、分化、衰老、死亡不是四件事，是同一个开关的四个位置';

/** 本章论证链上的关键词：正文必须出现，否则说明正文与习题已经脱节 */
const CONCEPTS = ['三道闸', '保真', '亚稳态', '端粒', '海弗利克界限', '凋亡小体', '自噬'];

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

/** 把「三十亿」「两万」这类中文数量读成整数 */
const DIGIT = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
const UNIT = { 十: 10, 百: 100, 千: 1000, 万: 1e4, 亿: 1e8 };

function cnToNumber(text) {
  const s = String(text).trim();
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
  let value = 0;
  let num = 0;
  for (const ch of s) {
    if (DIGIT[ch] !== undefined) num = DIGIT[ch];
    else if (ch === '十' || ch === '百' || ch === '千') {
      value += (num || 1) * UNIT[ch];
      num = 0;
    } else if (ch === '万' || ch === '亿') {
      value = (value + num) * UNIT[ch];
      num = 0;
    }
  }
  return value + num;
}

/** 闸口表：闸口 / 位置 / 检查什么 / 不过会怎样 */
function checkpointTable(text = readDoc()) {
  const rows = [];
  for (const line of lines(text)) {
    if (!/^\|/.test(line) || /^\|[\s\-:|]+\|$/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length !== 4) continue;
    if (/^闸口$/.test(cells[0])) continue;
    rows.push({ gate: cells[0], where: cells[1], checks: cells[2], otherwise: cells[3] });
  }
  return rows;
}

/** 「二、」节的两笔账：「**数量账**」「**保真账**」 */
function accounts(text = readDoc()) {
  return lines(text)
    .filter((l) => /^\*\*(数量账|保真账)\*\*/.test(l))
    .map((l) => (l.match(/\*\*([^*]+)\*\*/) || [, ''])[1]);
}

/** 「四、」节三种计时器 */
function timers(text = readDoc()) {
  return lines(text)
    .filter((l) => /^-\s+\*\*[^*]*计时器\*\*/.test(l))
    .map((l) => (l.match(/\*\*([^*]+)\*\*/) || [, ''])[1]);
}

/** 「五、」节死亡三条路表：方式 / 形态 / 膜完整性 / 是否引发炎症 / 能量依赖 */
function deathTable(text = readDoc()) {
  const rows = [];
  for (const line of lines(text)) {
    if (!/^\|/.test(line) || /^\|[\s\-:|]+\|$/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length !== 5) continue;
    if (/^方式$/.test(cells[0])) continue;
    rows.push({ mode: cells[0], form: cells[1], membrane: cells[2], inflammation: cells[3], energy: cells[4] });
  }
  return rows;
}

/** 保真账：碱基数 × 每碱基每代错误率 = 每次复制的改变数 */
function fidelity(text = readDoc()) {
  const genome = text.match(/一个约([一二两三四五六七八九十百千万亿]+)碱基对的基因组/);
  const rate = text.match(/每代每碱基的错误率约十的负([一二两三四五六七八九])次方/);
  if (!genome || !rate) return null;
  const bases = cnToNumber(genome[1]);
  const exponent = -cnToNumber(rate[1]);
  const perReplication = bases * Math.pow(10, exponent);
  return {
    bases,
    exponent,
    perReplication,
    /** 正文写的是「几十个改变」，即落在 10–99 之间 */
    matchesClaim: perReplication >= 10 && perReplication < 100,
  };
}

function conceptHits(text = readDoc()) {
  return CONCEPTS.map((term) => ({ term, hits: text.split(term).length - 1 }));
}

function missing(text = readDoc()) {
  return conceptHits(text).filter((c) => c.hits === 0).map((c) => c.term);
}

function boundaries(text = readDoc()) {
  const ls = lines(text);
  const start = ls.findIndex((l) => /^##\s*代价与边界/.test(l));
  if (start < 0) return [];
  const out = [];
  for (let i = start + 1; i < ls.length; i += 1) {
    const line = ls[i].trim();
    if (/^##\s/.test(line)) break;
    if (/^-\s+/.test(line)) out.push(line.replace(/^-\s+/, ''));
  }
  return out;
}

function summarize(text = readDoc()) {
  return {
    hanzi: hanzi(text),
    sections: sections(text),
    gates: checkpointTable(text),
    accounts: accounts(text),
    timers: timers(text),
    deaths: deathTable(text),
    fidelity: fidelity(text),
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
  console.log('三道闸（正文表格现算 ' + s.gates.length + ' 道）：');
  for (const g of s.gates) console.log('  ' + g.gate + '（' + g.where + '）查：' + g.checks);
  console.log('  → 共同逻辑：宁可停，不可错。');
  console.log('');
  console.log('两笔账：' + s.accounts.join(' 与 '));
  const f = s.fidelity;
  console.log('保真账现算：' + f.bases.toExponential(0) + ' 碱基 × 10^' + f.exponent
    + ' = 每次复制约 ' + f.perReplication + ' 个改变 → '
    + (f.matchesClaim ? '与正文「几十个改变」一致' : '与正文口径不符'));
  console.log('  → 错误不是例外，是常态，只是大部分落在不关键的位置。');
  console.log('');
  console.log('三种计时器：' + s.timers.join('、'));
  console.log('死亡三条路（' + s.deaths.length + ' 条）：');
  for (const d of s.deaths) console.log('  ' + d.mode + ' · 膜：' + d.membrane + ' · 炎症：' + d.inflammation);
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
  readDoc, sections, hanzi, cnToNumber, checkpointTable, accounts, timers, deathTable,
  fidelity, conceptHits, missing, boundaries, summarize,
};
