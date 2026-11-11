#!/usr/bin/env node
/**
 * 病理生理学 · 第 49 章 骨骼肌肉系统结构与功能
 * 课程页: chapters/49-structure-and-function-of-the-musculoskeletal-system/docs/zh.md
 * 第一文本: standards/binglishengli/supplements/jiangyi.json（讲义 U14 单元第 49 章，12 节）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章的命题是「骨不是支架，是持续自检、按需改建的活组织」。
 * 这句话只能由讲义自己的篇幅与用词来证——重建那一节为何最长、软骨与肌肉各占多少笔墨、
 * 系统功能六项与四类骨细胞落在哪几节。手打的数字会在讲义改稿后静默过期；
 * 现算的数字一旦对不上，程序自己会报错，章级门也跟着红。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// ─── 本章配置 ────────────────────────────────────────────────────────
const CONFIG = {
  no: 49,
  slug: '49-structure-and-function-of-the-musculoskeletal-system',
  title: '骨骼肌肉系统结构与功能',
  subtitle: '六项功能、一条重建耦联与三处结构弱点',
  keywords: ['软骨', '肌肉', '骨小梁', '力学', '重建', '耦联'],
  boundary:
    '教学边界：本章只说明讲义给出的骨骼肌肉结构层次与功能类别，不写数值与单位与正常值，不构成诊断、治疗或用药依据',
};

const BOUNDARY = CONFIG.boundary;

/** 讲义引文的唯一合法格式（章号 = 课程章号 = 讲义章号，节号必须真实存在） */
const CITE_RE = /补充·hermes-病理生理学讲义·第\s*(\d+)\s*章·(\d+\.\d+)/g;
const isCite = (line) => /补充·hermes-病理生理学讲义·第\s*\d+\s*章·\d+\.\d+/.test(line);
const isQuoteLine = (line) => /^\s*>/.test(line);

/** 非引用行零容忍的「数字＋计量单位」 */
const BARE = /[0-9]+(\.[0-9]+)?\s*(mmHg|kPa|℃|mmol|μmol|mg|μg|ng|g\/L|mol|%|次\/分|mL|ml|L\/min|kg|cm|mm|U\/L|IU)/;

// 不硬数 ../ 的层数（数错一次就 ENOENT），向上找带 supplements/jiangyi.json 的那一级
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
const IDX = path.join(ROOT, 'standards', 'binglishengli', 'supplements', 'jiangyi.json');

const nonWs = (s) => String(s).replace(/\s/g, '').length;

/** 讲义里本章的实体：节号 / 标题 / 每节正文 / 所属单元 */
function chapter(no = CONFIG.no) {
  const idx = JSON.parse(fs.readFileSync(IDX, 'utf8'));
  for (const u of idx.units) {
    for (const c of u.chapters) {
      if (Number(c.no) !== Number(no)) continue;
      const secs = (c.secs || []).map((s) => {
        const text = (s.paras || []).join('\n');
        return { no: s.no, title: s.title, text, chars: nonWs(text) };
      });
      return { no: Number(c.no), title: c.title, unit: u.unit, secs };
    }
  }
  throw new Error(`讲义里没有第 ${no} 章`);
}

/** 规模：节数 / 节号区间 / 非空白字符数 / 平均每节字数 */
function shape(ch) {
  const chars = ch.secs.reduce((n, s) => n + s.chars, 0);
  return {
    secs: ch.secs.length,
    chars,
    avg: Math.round(chars / ch.secs.length),
    span: `${ch.secs[0].no}–${ch.secs[ch.secs.length - 1].no}`,
    shortest: ch.secs.slice().sort((a, b) => a.chars - b.chars)[0],
    longest: ch.secs.slice().sort((a, b) => b.chars - a.chars)[0],
  };
}

/** 关键词频：同一批词在讲义本章正文里的出现次数，用来核对「笔墨压在哪里」 */
function keywordFreq(ch, keys = CONFIG.keywords) {
  const flat = ch.secs.map((s) => s.text).join('\n');
  const out = {};
  for (const k of keys) out[k] = flat.split(k).length - 1;
  return out;
}

const rank = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]);

function docPath() {
  return path.join(__dirname, '..', 'docs', 'zh.md');
}

function readDoc() {
  return fs.readFileSync(docPath(), 'utf8');
}

/** 引文核验：条数 / 章号是否等于本章 / 节号是否真实存在 */
function citeAudit(doc, ch = chapter()) {
  const hits = [...doc.matchAll(CITE_RE)].map((m) => ({ ch: Number(m[1]), sec: m[2] }));
  const known = new Set(ch.secs.map((s) => s.no));
  return {
    total: hits.length,
    wrongCh: hits.filter((x) => x.ch !== ch.no),
    unknownSec: hits.filter((x) => x.ch === ch.no && !known.has(x.sec)),
    secs: [...new Set(hits.filter((x) => x.ch === ch.no && known.has(x.sec)).map((x) => x.sec))].sort(),
  };
}

/**
 * 引语逐字（严格版）：全页所有「」内 ≥6 字的句子，都必须能在讲义本章正文里逐字找到。
 * 章级门对引用行是豁免的（`>` 开头与带节号的行跳过），本函数不豁免——
 * 引用行的引语同样要逐字，只是在门里没被核，在本文件里被核。
 */
function quoteAudit(doc, ch = chapter()) {
  const flat = ch.secs.map((s) => s.text).join('\n');
  const quotes = [];
  for (const line of doc.split(/\r?\n/)) {
    for (const m of line.matchAll(/「([^「」]{6,})」/g)) quotes.push(m[1]);
  }
  return { total: quotes.length, lost: quotes.filter((q) => !flat.includes(q)) };
}

/** 正文零裸值：引用行与引文行豁免（那是在引讲义原话） */
function bareAudit(doc) {
  return doc
    .split(/\r?\n/)
    .filter((l) => !isCite(l) && !isQuoteLine(l) && BARE.test(l));
}

/** 讲义节覆盖：本章每一节的节号都必须在本页出现 */
function coverAudit(doc, ch = chapter()) {
  const missing = ch.secs.filter((s) => !doc.includes(s.no)).map((s) => s.no);
  return { total: ch.secs.length, covered: ch.secs.length - missing.length, missing };
}

/** quiz 契约：6 题 · pre 1 / check 3 / post 2 · 题干键 question · 每题带引证 */
function quizAudit() {
  const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));
  const qs = quiz.questions || [];
  const stages = qs.map((q) => q.stage);
  const count = (s) => stages.filter((x) => x === s).length;
  return {
    total: qs.length,
    pre: count('pre'),
    check: count('check'),
    post: count('post'),
    wrongKey: qs.filter((q) => !q.question).length,
    uncited: qs.filter((q) => !/(依据|口径见|前提|算见)/.test(q.explanation || '')).length,
  };
}

/** 总账：一次调用拿到全部可核验项 */
function analyze() {
  const ch = chapter();
  const doc = readDoc();
  return {
    ch,
    shape: shape(ch),
    freq: keywordFreq(ch),
    chars: nonWs(doc),
    cites: citeAudit(doc, ch),
    quotes: quoteAudit(doc, ch),
    bare: bareAudit(doc),
    cover: coverAudit(doc, ch),
    quiz: quizAudit(),
    boundaryInDoc: doc.includes(BOUNDARY),
  };
}

function main() {
  const r = analyze();
  const s = r.shape;

  console.log(`═══ ${CONFIG.title}（病理生理学 第${CONFIG.no}章 · 讲义 ${r.ch.unit} 单元）═══`);
  console.log(`讲义章题: ${r.ch.title}`);
  console.log(`讲义规模: ${s.span} · ${s.secs} 节 · ${s.chars} 非空白字符 · 平均每节 ${s.avg} 字`);
  console.log(`篇幅两极: 最短 ${s.shortest.no}（${s.shortest.chars} 字）／最长 ${s.longest.no}（${s.longest.chars} 字）`);
  console.log('');
  console.log('节级分布:');
  for (const sec of r.ch.secs) console.log(`  ${sec.no} ${sec.title} · ${sec.chars} 字`);
  console.log('');
  console.log('关键词频（讲义本章正文，同一批词横向比）:');
  for (const [k, v] of rank(r.freq)) console.log(`  ${k.padEnd(4, '　')} ${String(v).padStart(3)} 次`);
  console.log(`  → 重心落在「${rank(r.freq)[0][0]}」：本章给的是结构层次与功能类别，不是病名清单。`);
  console.log('');
  console.log(`本页正文: ${r.chars} 非空白字`);
  console.log(`讲义引文: ${r.cites.total} 条 · 指向第${CONFIG.no}章 ${r.cites.secs.length} 个不同节`);
  console.log(`引文错章: ${r.cites.wrongCh.length} 条 · 节号不存在: ${r.cites.unknownSec.length} 条`);
  console.log(`引语逐字: ${r.quotes.total} 条，讲义里找不到的 ${r.quotes.lost.length} 条`);
  console.log(`节覆盖: ${r.cover.covered} / ${r.cover.total}${r.cover.missing.length ? ' → 缺 ' + r.cover.missing.join('、') : ' → 每节都有落位'}`);
  console.log(`正文裸值行: ${r.bare.length} 行`);
  console.log(`quiz: ${r.quiz.total} 题（pre ${r.quiz.pre} · check ${r.quiz.check} · post ${r.quiz.post}）· 无题干键 ${r.quiz.wrongKey} 题 · 无引证 ${r.quiz.uncited} 题`);
  console.log('');
  console.log(BOUNDARY);

  return r;
}

if (require.main === module) main();

module.exports = {
  CONFIG,
  BOUNDARY,
  CITE_RE,
  isCite,
  isQuoteLine,
  BARE,
  findRoot,
  ROOT,
  IDX,
  nonWs,
  chapter,
  shape,
  keywordFreq,
  rank,
  docPath,
  readDoc,
  citeAudit,
  quoteAudit,
  bareAudit,
  coverAudit,
  quizAudit,
  analyze,
  main,
};

// 教学边界：main() 末行原样打印 CONFIG.boundary —— 不写数值与单位与正常值，不构成诊断、治疗或用药依据
