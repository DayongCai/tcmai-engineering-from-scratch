#!/usr/bin/env node
/**
 * 病理生理学 · 第 16 章 血压异常：一个讲数字的章节，为何一个数字都不给
 * 课程: departments/09-jichu/11-bingli-shengli-xue/chapters/16-alterations-in-blood-pressure/docs/zh.md
 * 出处: 补充·hermes-病理生理学讲义·第16章（9 节 · 3139 汉字）
 * 数据: standards/binglishengli/supplements/jiangyi.json（15 单元 53 章 595 节的机器可读层）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章要讲的命题是「血压是手段，灌注是目的」，
 * 而这件事只能由讲义自己的用词重心来证：血压与灌注各出现多少次、
 * 三个成分与三层时间尺度是不是每一节都在正文里落了位。手打的数字会在讲义改版后静默过期；
 * 现算的数字一旦对不上，程序自己会报错。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

/** 不硬数 ../ 的层数（数错一次就 ENOENT），向上找带 supplements/jiangyi.json 的那一级 */
function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 14; i += 1) {
    if (fs.existsSync(path.join(dir, 'standards', 'binglishengli', 'supplements', 'jiangyi.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/binglishengli/supplements/jiangyi.json —— 章节目录是否已脱离仓库？');
}

const ROOT = findRoot(__dirname);
const BOOK_PATH = path.join(ROOT, 'standards', 'binglishengli', 'supplements', 'jiangyi.json');
const DOC_PATH = path.join(__dirname, '..', 'docs', 'zh.md');

const CHAPTER = 16;
const TITLE = '血压异常：一个讲数字的章节，为何一个数字都不给';

/** 关键词重心：本章的笔墨压在哪条链上（讲义原词，不另造词表） */
const KEYWORDS = ['血压', '灌注', '容量', '靶器官', '阻力', '调节'];

/** 教学边界句：main.js 最后一行，也是单测与章级门共同依赖的字符串 */
const BOUNDARY = '教学边界：本章只说明讲义给出的机制与类别，不写数值与单位与正常值，不构成诊断、治疗或用药依据';

/** 引文定位：章号 = 课程章号，节号必须真实存在 */
const citeOf = (sec) => `补充·hermes-病理生理学讲义·第${CHAPTER}章·${sec}`;
const CITE_RE = /补充·hermes-病理生理学讲义·第\s*(\d+)\s*章·(\d+\.\d+)/g;
const isCite = (line) => /补充·hermes-病理生理学讲义·第\s*\d+\s*章·\d+\.\d+/.test(line);
const isQuote = (line) => /^\s*>/.test(line);

/** 正文裸数值：非引用行出现「数字＋计量单位」即违规（引用行是在引讲义原话） */
const BARE = /[0-9]+(\.[0-9]+)?\s*(mmHg|kPa|℃|mmol|μmol|mg|μg|ng|g\/L|mol|%|次\/分|mL|ml|L\/min|kg|cm|mm|U\/L|IU)/;

const nonWs = (s) => String(s).replace(/\s/g, '').length;
const hanziOf = (s) => (String(s).match(/[\u4e00-\u9fa5]/g) || []).length;

/** 讲义本章：节号 → 正文。一次读盘，后续全部复用 */
function chapter(no = CHAPTER) {
  const book = JSON.parse(fs.readFileSync(BOOK_PATH, 'utf8'));
  for (const u of book.units) {
    for (const c of u.chapters) {
      if (Number(c.no) === no) {
        const secs = (c.secs || []).map((s) => ({
          no: s.no,
          title: s.title,
          text: (s.paras || []).join('\n'),
        }));
        return { no: Number(c.no), title: c.title, unit: u.unit, secs };
      }
    }
  }
  throw new Error(`讲义里没有第 ${no} 章`);
}

/** 规模：节数 / 汉字 / 非空白字 / 平均每节汉字（后者是本章讲义字数的口径） */
function shape(ch) {
  const hanzi = ch.secs.reduce((n, s) => n + hanziOf(s.text), 0);
  const chars = ch.secs.reduce((n, s) => n + nonWs(s.text), 0);
  return {
    secs: ch.secs.length,
    hanzi,
    chars,
    avg: Math.round(hanzi / ch.secs.length),
    first: ch.secs[0].no,
    last: ch.secs[ch.secs.length - 1].no,
  };
}

/** 关键词频：把整章正文摊平后逐词计数（重叠不重复计，短词已在词表里定好） */
function keywords(ch, words = KEYWORDS) {
  const flat = ch.secs.map((s) => s.text).join('\n');
  const out = {};
  for (const w of words) out[w] = (flat.match(new RegExp(w, 'g')) || []).length;
  return out;
}

const rank = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]);

/** 讲义节覆盖：该章每一节的节号都必须在 docs 里出现（缺一节就是漏讲） */
function sectionCoverage(doc, ch) {
  const off = ch.secs.filter((s) => !doc.includes(s.no)).map((s) => s.no);
  return { total: ch.secs.length, covered: ch.secs.length - off.length, off };
}

/** 引文审计：条数、章号是否引串、节号是否存在（三层都查，不只数条数） */
function citeAudit(doc, ch) {
  const list = [...doc.matchAll(CITE_RE)].map((m) => ({ ch: Number(m[1]), sec: m[2] }));
  const secs = new Set(ch.secs.map((s) => s.no));
  return {
    total: list.length,
    wrongCh: list.filter((x) => x.ch !== ch.no).length,
    noSec: list.filter((x) => x.ch === ch.no && !secs.has(x.sec)).map((x) => x.sec),
    secs: [...new Set(list.filter((x) => x.ch === ch.no).map((x) => x.sec))].sort(),
  };
}

/**
 * 引语逐字：非引用行里 ≥6 字的「」，必须能在讲义本章原文里找到。
 * 这条规则的用意不是查错字，而是防止把「大意」写成带引号的「原话」。
 */
function quoteAudit(doc, ch) {
  const flat = ch.secs.map((s) => s.text).join('\n');
  const quotes = [];
  for (const line of doc.split(/\r?\n/)) {
    if (isCite(line) || isQuote(line)) continue;
    for (const m of line.matchAll(/「([^「」]{6,})」/g)) quotes.push(m[1]);
  }
  const lost = quotes.filter((q) => !flat.includes(q));
  return { total: quotes.length, lost };
}

/** 裸数值审计：非引用行出现「数字＋计量单位」的行数与样本 */
function valueAudit(doc) {
  const lines = doc.split(/\r?\n/).filter((l) => !isCite(l) && !isQuote(l) && BARE.test(l));
  return { hits: lines.length, sample: lines.slice(0, 2).map((l) => l.trim().slice(0, 40)) };
}

function main() {
  const ch = chapter();
  const doc = fs.readFileSync(DOC_PATH, 'utf8');
  const s = shape(ch);
  const kw = keywords(ch);
  const cover = sectionCoverage(doc, ch);
  const cite = citeAudit(doc, ch);
  const quote = quoteAudit(doc, ch);
  const value = valueAudit(doc);

  console.log(`═══ ${TITLE}（病理生理学 第${CHAPTER}章）═══`);
  console.log(`讲义规模: 第 ${CHAPTER} 章 · ${s.secs} 节 · ${s.hanzi} 汉字 · ${s.chars} 非空白字 · 平均每节 ${s.avg} 汉字`);
  console.log(`节号区间: ${s.first}–${s.last}（课程章号与讲义章号一致，不另起一号）`);
  console.log(`关键词重心: ${rank(kw).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
  console.log(`  → 血压出现 ${kw['血压']} 次、灌注 ${kw['灌注']} 次：先把这个词的构成讲透，才有资格说它是手段。`);
  console.log('');
  console.log(`节覆盖: ${cover.covered} / ${cover.total} 节在 docs 里出现${cover.off.length ? '，缺 ' + cover.off.join('、') : ''}`);
  console.log(`引文: ${cite.total} 条 · 引串章号 ${cite.wrongCh} 条 · 节号不存在 ${cite.noSec.length} 条 · 引到 ${cite.secs.length} 个节`);
  console.log(`引语逐字: ${quote.total} 条 ≥6 字的「」在正文里${quote.lost.length ? `，${quote.lost.length} 条找不到：${quote.lost[0]}` : '，全部可在讲义原文中找到'}`);
  console.log(`裸数值: 正文非引用行 ${value.hits} 处「数字+单位」${value.hits ? '：' + value.sample.join(' / ') : ''}`);
  console.log('');
  console.log(`本章文档: ${nonWs(doc)} 非空白字（下限 3000，目标 5000–7000）`);

  console.log(BOUNDARY);

  return { ch, doc, s, kw, cover, cite, quote, value };
}

module.exports = {
  ROOT,
  BOOK_PATH,
  DOC_PATH,
  CHAPTER,
  TITLE,
  KEYWORDS,
  BOUNDARY,
  CITE_RE,
  BARE,
  citeOf,
  chapter,
  shape,
  keywords,
  rank,
  sectionCoverage,
  citeAudit,
  quoteAudit,
  valueAudit,
  nonWs,
  hanziOf,
  main,
};

// 直接运行时，main() 的最后一行输出即教学边界句（单测与章级门共同依赖这一句）
if (require.main === module) main(); // 末行打印教学边界
