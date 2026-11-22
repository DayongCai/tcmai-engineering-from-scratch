#!/usr/bin/env node
/**
 * 中医自然语言处理 · 第 3 章 n-gram 算得出下一个字，算不出这句话是谁写的
 * 正文: departments/07-zhineng/04-zhongyi-ziran-yuyan-chuli/chapters/03-nlp3/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 口径：样本句取自正文引用的条文，bigram 计数、稀疏度、加一平滑的未登录质量
 * 全部在本脚本里现算；不从任何外部语料取数，也不抄任何模型的跑分。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 3;
const SLUG = '03-nlp3';
const TITLE = 'n-gram 算得出下一个字，算不出这句话是谁写的';
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

function codeBlocks(text) {
  return [...text.matchAll(/```[a-z]*\r?\n([\s\S]*?)```/g)].map((m) => m[1]);
}

/** 正文里被引作例子的条文：取第一段含「太阳病」的「」引文 */
function sampleSentence(text) {
  for (const m of text.matchAll(/「([^」]{6,})」/g)) {
    if (m[1].includes('太阳病')) return m[1];
  }
  throw new Error('正文里找不到含「太阳病」的引文');
}

/** 字符 bigram 计数；标点保留，因为正文要说明标点也会成为边界信号 */
function bigrams(s) {
  const out = new Map();
  for (let i = 0; i + 1 < s.length; i += 1) {
    const bg = s.slice(i, i + 2);
    out.set(bg, (out.get(bg) || 0) + 1);
  }
  return out;
}

function topBigrams(map, n = 5) {
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n);
}

/**
 * 加一平滑。V = 已见字符数 + 1（留一个「未见字符」槽），
 * 这样已见质量 + 未登录质量恰为 1，未见组合的概率不再为零。
 */
function addOne(text, addOneAmount = 1) {
  const chars = [...text];
  const uni = new Map();
  for (const ch of chars) uni.set(ch, (uni.get(ch) || 0) + 1);
  const N = chars.length;
  const V = uni.size + 1;
  const total = N + addOneAmount * V;
  const probs = new Map();
  for (const [ch, c] of uni) probs.set(ch, (c + addOneAmount) / total);
  const seenMass = [...probs.values()].reduce((a, b) => a + b, 0);
  const unseenMass = (addOneAmount * (V - uni.size)) / total;
  return { N, V, total, probs, seenMass, unseenMass, addOne: addOneAmount };
}

/** 正文的样本句统计：位置数、不同 bigram、最高频项、含标点的高频项 */
function sampleStats(sentence) {
  const map = bigrams(sentence);
  const top = topBigrams(map, 5);
  const positions = Math.max(0, sentence.length - 1);
  return {
    sentence,
    chars: sentence.length,
    hanzi: hanzi(sentence),
    positions,
    unique: map.size,
    singletons: [...map.values()].filter((v) => v === 1).length,
    top,
    punctInTop: top.filter(([bg]) => /[，。；：、]/.test(bg)).length,
  };
}

function stats() {
  const text = readDoc();
  const sentence = sampleSentence(text);
  const sm = sampleStats(sentence);
  const smooth = addOne(sentence);
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title: TITLE,
    hanzi: hanzi(text),
    sections: headings(text).length,
    codeBlocks: codeBlocks(text).length,
    sample: sm,
    smooth,
    disclaimer: /免责声明/.test(text),
  };
}

function main() {
  const s = stats();
  console.log(`中医自然语言处理 · 第 ${s.chapter} 章 ${s.title}`);
  console.log(`正文：chapters/${s.slug}/docs/zh.md（现算，不手打）`);
  console.log('');
  console.log(`  汉字            ${s.hanzi.toLocaleString('en-US')}`);
  console.log(`  节 / 代码块     ${s.sections} / ${s.codeBlocks}`);
  console.log('');
  console.log(`样本句（正文引文，${s.sample.chars} 字符）：${s.sample.sentence}`);
  console.log(`  相邻位置        ${s.sample.positions}`);
  console.log(`  不同 bigram     ${s.sample.unique}（只出现一次的 ${s.sample.singletons} 个）`);
  console.log(`  最高频          ${s.sample.top.map(([bg, c]) => `${bg}×${c}`).join('  ')}`);
  console.log(`  前五里含标点    ${s.sample.punctInTop} 个——标点是今人加的，却在统计上是强边界信号`);
  console.log('');
  console.log(`加一平滑（V=${s.smooth.V}，N=${s.smooth.N}）：`);
  console.log(`  已见字符质量    ${s.smooth.seenMass.toFixed(4)}`);
  console.log(`  未登录字符质量  ${s.smooth.unseenMass.toFixed(4)}`);
  console.log(`  合计            ${(s.smooth.seenMass + s.smooth.unseenMass).toFixed(4)}——未见组合不再为零`);
  console.log('');
  console.log('※ 数字由本目录 docs/zh.md 的引文现算；本章不给任何模型的困惑度或跑分。');
  console.log('※ 本章只做语言模型与概率推断的教学讨论，不构成诊断、辨证或治疗建议。');
}

if (require.main === module) main();

module.exports = {
  CHAPTER, SLUG, TITLE, DOC, readDoc, headings, codeBlocks, sampleSentence,
  bigrams, topBigrams, addOne, sampleStats, hanzi, stats, main,
};
