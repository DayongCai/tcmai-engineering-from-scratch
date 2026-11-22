#!/usr/bin/env node
/**
 * 医学生物学 · 第 9 章 医学遗传学总纲：编码区与携带者概率，从正文里算出来
 * 课程: departments/09-jichu/04-yixue-shengwu-xue/chapters/09-yixue-yichuanxue-gailun/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：基因组碱基数 × 编码区比例、等位基因频率的平方、两携带者婚配的
 * 子代患病概率，都从本章正文读出后计算。正文改版后重跑即可复现。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = '9';
const SLUG = '09-yixue-yichuanxue-gailun';
const TITLE = '遗传学研究的不是「病」，是「差异怎么传下去」';

/** 本章论证链上的关键词：正文必须出现，否则说明正文与习题已经脱节 */
const CONCEPTS = ['等位基因', '遗传异质性', '位点异质性', '外显率', '表现度', '携带', '验前概率'];

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

const DIGIT = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };

function cnToNumber(text) {
  const s = String(text).trim();
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
  if (s === '万') return 1e4;
  if (s === '亿') return 1e8;
  let value = 0;
  let num = 0;
  for (const ch of s) {
    if (DIGIT[ch] !== undefined) num = DIGIT[ch];
    else if (ch === '十' || ch === '百' || ch === '千') {
      value += (num || 1) * (ch === '十' ? 10 : ch === '百' ? 100 : 1000);
      num = 0;
    } else if (ch === '万' || ch === '亿') {
      value = (value + num) * (ch === '万' ? 1e4 : 1e8);
      num = 0;
    }
  }
  return value + num;
}

/** 基因组口径：碱基对数、编码区比例区间、编码区演算值 */
function codingBudget(text = readDoc()) {
  const genome = text.match(/基因组约([一二两三四五六七八九十百千万亿]+)碱基对/);
  const band = text.match(/编码蛋白质的部分约占百分之([一二三四五])到([一二三四五])/);
  const pct = text.match(/按\s*([\d.]+)%\s*演算约合([一二两三四五六七八九十百千万亿]+)碱基对/);
  if (!genome) return null;
  const bases = cnToNumber(genome[1]);
  const lo = band ? cnToNumber(band[1]) / 100 : null;
  const hi = band ? cnToNumber(band[2]) / 100 : null;
  const share = pct ? Number(pct[1]) / 100 : null;
  const shown = pct ? cnToNumber(pct[2]) : null;
  const computed = share ? bases * share : null;
  return {
    bases,
    lo,
    hi,
    share,
    shown,
    computed,
    /** 正文写的编码区碱基数是否落在 1%–2% 区间内 */
    shownInBand: shown && lo && hi ? shown >= bases * lo && shown <= bases * hi : null,
    /** 正文写的编码区碱基数对应的实际比例 */
    shownShare: shown ? shown / bases : null,
    /** 「按 1.5% 演算」这个括号能否直接复现正文那个数 */
    reproduce: computed && shown ? Math.abs(computed - shown) / shown < 0.01 : null,
  };
}

/** 咨询里的两个概率：两携带者婚配 1/4；随机婚配约频率的平方 */
function carrierMath(text = readDoc()) {
  const q = text.match(/等位基因频率为\s*([\d.]+)/);
  const random = text.match(/约为该频率的平方，即([一二两三四五六七八九十百千万]+)分之一/);
  if (!q) return null;
  const freq = Number(q[1]);
  return {
    freq,
    carrierCross: 0.25,
    randomAffected: freq ** 2,
    randomDenominator: Math.round(1 / freq ** 2),
    /** 正文写的「万分之一」分母 */
    statedDenominator: random ? cnToNumber(random[1]) : null,
    /** 两携带者婚配比随机婚配高多少倍 */
    fold: 0.25 / freq ** 2,
  };
}

/** 「二、」节变异三尺度表：尺度 / 典型大小 / 检测手段 / 主要盲区 */
function scaleTable(text = readDoc()) {
  const rows = [];
  for (const line of lines(text)) {
    if (!/^\|/.test(line) || /^\|[\s\-:|]+\|$/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length !== 4) continue;
    if (/^尺度$/.test(cells[0])) continue;
    rows.push({ scale: cells[0], size: cells[1], tool: cells[2], blind: cells[3] });
  }
  return rows;
}

/** 「三、」节四道关（编号条目） */
function gates(text = readDoc()) {
  const start = lines(text).findIndex((l) => /^##\s*三、从变异到表型/.test(l));
  if (start < 0) return [];
  const ls = lines(text);
  const out = [];
  for (let i = start + 1; i < ls.length; i += 1) {
    const line = ls[i].trim();
    if (/^##\s/.test(line)) break;
    if (/^\d+\.\s+\*\*/.test(line)) out.push((line.match(/\*\*([^*]+)\*\*/) || [, ''])[1]);
  }
  return out;
}

/** 「五、」节咨询四步 */
function consultSteps(text = readDoc()) {
  const start = lines(text).findIndex((l) => /^##\s*五、遗传咨询/.test(l));
  if (start < 0) return [];
  const ls = lines(text);
  const out = [];
  for (let i = start + 1; i < ls.length; i += 1) {
    const line = ls[i].trim();
    if (/^##\s/.test(line)) break;
    if (/^\d+\.\s+\*\*/.test(line)) out.push((line.match(/\*\*([^*]+)\*\*/) || [, ''])[1]);
  }
  return out;
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
    budget: codingBudget(text),
    carrier: carrierMath(text),
    scales: scaleTable(text),
    gates: gates(text),
    steps: consultSteps(text),
    concepts: conceptHits(text),
    boundaries: boundaries(text),
  };
}

function main() {
  const s = summarize();
  const b = s.budget;
  const c = s.carrier;
  console.log('医学生物学 · 第 ' + CHAPTER + ' 章 ' + TITLE);
  console.log('');
  console.log('正文 ' + s.hanzi.toLocaleString('en-US') + ' 汉字 · ' + s.sections.length + ' 节 · 边界 '
    + s.boundaries.length + ' 条');
  console.log('');
  console.log('编码区账（正文口径现算）：');
  console.log('  基因组 ' + b.bases.toExponential(0) + ' 碱基对 · 编码区占 ' + (b.lo * 100) + '%–' + (b.hi * 100) + '%');
  console.log('  按 ' + (b.share * 100) + '% 演算 = ' + b.computed.toExponential(2) + ' 碱基对；正文写 '
    + b.shown.toExponential(2));
  console.log('  → 正文那个数对应 ' + (b.shownShare * 100).toFixed(1) + '%，'
    + (b.shownInBand ? '落在所标区间之内' : '落在所标区间之外')
    + '；括号里的百分比与它是近似关系，不作判读依据。');
  console.log('');
  console.log('咨询里的两个概率（正文演算示例现算）：');
  console.log('  等位基因频率 ' + c.freq + ' → 随机婚配子代患病约 ' + c.randomAffected.toExponential(0)
    + '（即 ' + c.randomDenominator + ' 分之一）');
  console.log('  两携带者婚配 → ' + c.carrierCross + '（四分之一），是随机婚配的 ' + c.fold.toExponential(0) + ' 倍');
  console.log('  → 正文写的分母 ' + c.statedDenominator + '，现算 ' + c.randomDenominator + '。');
  console.log('');
  console.log('变异三尺度（正文表格现算 ' + s.scales.length + ' 层）：');
  for (const x of s.scales) console.log('  ' + x.scale + ' · 手段：' + x.tool + ' · 盲区：' + x.blind);
  console.log('  → 互补而非替代：「查过基因没问题」要追问查的是哪一层。');
  console.log('');
  console.log('四道关（' + s.gates.length + ' 道）：' + s.gates.join('、'));
  console.log('咨询四步（' + s.steps.length + ' 步）：' + s.steps.join(' → '));
  console.log('');
  console.log('判据词命中（正文现算）：');
  for (const x of s.concepts) console.log('  ' + (x.hits ? '✓' : '✗') + ' ' + x.term + '：' + x.hits);
  console.log('');
  console.log('边界（「代价与边界」一节，取前 3 条）：');
  s.boundaries.slice(0, 3).forEach((x) => console.log('  - ' + x));
  console.log('');
  console.log('※ 现算自 ' + SLUG + '/docs/zh.md；正文改版后重跑即可复现。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, SLUG, TITLE, CONCEPTS,
  readDoc, sections, hanzi, cnToNumber, codingBudget, carrierMath, scaleTable, gates,
  consultSteps, conceptHits, missing, boundaries, summarize,
};
