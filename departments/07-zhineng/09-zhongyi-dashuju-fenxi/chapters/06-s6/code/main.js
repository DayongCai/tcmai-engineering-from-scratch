#!/usr/bin/env node
/**
 * 中医大数据分析 · 第 6 章 单因素显著、多因素消失，那不是数据变了
 * 正文: departments/07-zhineng/09-zhongyi-dashuju-fenxi/chapters/06-s6/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 口径：E-value、EPV、忽略个体相关后的标准误折扣、基线调整的等效样本量、匹配损失与 SMD，
 * 全部由正文的 HR、事件数、变量数、ρ 与匹配前后样本现算；结果要回落到正文写法。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 6;
const SLUG = '06-s6';
const TITLE = '单因素显著、多因素消失，那不是数据变了';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const hanzi = (s) => (String(s || '').match(HANZI) || []).length;

const readDoc = () => fs.readFileSync(DOC, 'utf8');

function headings(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => /^##\s+/.test(line))
    .map((line) => line.replace(/^##\s+/, '').trim());
}

function tables(text) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^\|[\s:|-]*---[\s:|-]*\|$/.test(l)).length;
}

const citations = (text) => [...text.matchAll(/《([^》]+)》/g)].map((m) => m[1]);

/** E-value：把 HR 先还原成 RR=1/HR，再算混杂强度 */
function eValue(hr) {
  const rr = 1 / hr;
  return { hr, rr, e: rr + Math.sqrt(rr * (rr - 1)) };
}

function eValueFromDoc(text) {
  const m = text.match(/把\s*\$?HR=([\d.]+)\$?\s*代入/);
  if (!m) throw new Error('正文缺 E-value 的 HR 代入值');
  return eValue(Number(m[1]));
}

/** 每个自变量对应的事件数 */
function epv(text) {
  const m = text.match(/(\d+) 个事件、(\d+) 个变量/);
  if (!m) throw new Error('正文缺事件数与变量数');
  const events = Number(m[1]);
  const vars = [Number(m[2])];
  for (const v of text.matchAll(/(\d+)\s*个变量\s*EPV/g)) vars.push(Number(v[1]));
  const uniq = [...new Set(vars)].sort((a, b) => a - b);
  return { events, vars: uniq, epv: uniq.map((v) => ({ vars: v, epv: events / v })) };
}

/** 过拟合的价格：表观 AUC 与 Bootstrap 校正后的落差 */
function overfit(text) {
  const m = text.match(/表观 AUC\s*([\d.]+)、Bootstrap 校正后\s*([\d.]+)/);
  if (!m) throw new Error('正文缺 AUC 的表观值与校正值');
  const apparent = Number(m[1]);
  const corrected = Number(m[2]);
  return { apparent, corrected, drop: apparent - corrected };
}

/** 调整前后的 HR：正文的混杂例子从 0.71 走到 0.94 */
function adjustedHR(text) {
  const m = text.match(/HR\$\s*变成\s*([\d.]+)（95% CI\s*([\d.]+)[–-]([\d.]+)）/);
  if (!m) throw new Error('正文缺调整后的 HR 与区间');
  const hr = Number(m[1]);
  const lo = Number(m[2]);
  const hi = Number(m[3]);
  return { hr, lo, hi, crossesOne: lo <= 1 && hi >= 1 };
}

/** 倾向评分匹配：样本损失与 SMD 均衡 */
function matching(text) {
  const s = text.match(/样本从\s*(\d+)\s*掉到\s*(\d+)/);
  const smd = text.match(/年龄 SMD\s*([\d.]+)、病情 SMD\s*([\d.]+)；匹配后分别\s*([\d.]+)、([\d.]+)/);
  if (!s || !smd) throw new Error('正文缺倾向评分匹配的样本与 SMD');
  const before = [Number(smd[1]), Number(smd[2])];
  const after = [Number(smd[3]), Number(smd[4])];
  return {
    from: Number(s[1]),
    to: Number(s[2]),
    loss: 1 - Number(s[2]) / Number(s[1]),
    before,
    after,
    balanced: after.every((x) => Math.abs(x) < 0.1),
  };
}

function compute(text) {
  return {
    over: overfit(text),
    hr: adjustedHR(text),
    ev: eValueFromDoc(text),
    epv: epv(text),
    match: matching(text),
  };
}

function verify(text) {
  const c = compute(text);
  const need = (cond, msg) => {
    if (!cond) throw new Error(msg);
  };
  need(c.over.drop.toFixed(2) === '0.11' && text.includes('0.11'), `AUC 落差重算为 ${c.over.drop.toFixed(2)}`);
  need(c.hr.crossesOne, '调整后的 HR 区间应跨过 1（效应消失）');
  need(c.ev.e.toFixed(2) === '2.12' && text.includes('2.12'), `E-value 重算为 ${c.ev.e.toFixed(4)}，正文写 2.12`);
  need(c.epv.epv.some((x) => x.vars === 12 && x.epv.toFixed(1) === '17.5'), 'EPV 17.5 未复现');
  need(c.epv.epv.some((x) => x.vars === 30 && x.epv.toFixed(1) === '7.0'), 'EPV 7 未复现');
  need(text.includes('EPV $=7$') || text.includes('EPV $=7'), '正文未写 EPV=7');
  need(c.match.loss.toFixed(2) === '0.36' && text.includes('损失 36%'), `匹配损失重算为 ${(c.match.loss * 100).toFixed(1)}%`);
  need(c.match.balanced, '匹配后 SMD 应全部小于 0.1');
  return c;
}

function stats(text) {
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title: TITLE,
    hanzi: hanzi(text),
    sections: headings(text).length,
    tables: tables(text),
    cites: citations(text).length,
    drills: (text.match(/演算设定/g) || []).length,
    disclaimer: /免责声明/.test(text),
  };
}

function main() {
  const text = readDoc();
  const s = stats(text);
  const c = verify(text);

  console.log(`中医大数据分析 · 第 ${s.chapter} 章 ${s.title}`);
  console.log(`正文：chapters/${s.slug}/docs/zh.md（现算，不手打）`);
  console.log('');
  console.log(`  汉字 ${s.hanzi.toLocaleString('en-US')} · 节 ${s.sections} · 表 ${s.tables} · 引文 ${s.cites} 处 · 演算设定 ${s.drills} 处`);
  console.log('');
  console.log(`E-value：HR=${c.ev.hr} → RR=${c.ev.rr.toFixed(4)}，E=${c.ev.e.toFixed(2)}（需同样强度的未测量混杂才能解释掉效应）。`);
  console.log(`EPV：${c.epv.events} 个事件 —— ` + c.epv.epv.map((x) => `${x.vars} 变量→${x.epv.toFixed(1)}`).join('，') + '。');
  console.log(`过拟合：表观 AUC ${c.over.apparent} → Bootstrap 校正后 ${c.over.corrected}，差 ${c.over.drop.toFixed(2)} 就是过拟合的价格。`);
  console.log(`调整后 HR ${c.hr.hr}（95% CI ${c.hr.lo}–${c.hr.hi}），${c.hr.crossesOne ? '区间跨过 1，效应消失' : '区间未跨过 1'}。`);
  console.log(`倾向评分：${c.match.from} → ${c.match.to} 例（损失 ${(c.match.loss * 100).toFixed(0)}%），SMD ${c.match.before.join('／')} → ${c.match.after.join('／')}，均衡${c.match.balanced ? '达标' : '未达标'}。`);
  console.log('');
  console.log('※ 数字由本目录 docs/zh.md 现算：HR、事件数、变量数一改，E-value 与 EPV 跟着变。');
  console.log('※ 本章数值为演算设定，不对应任何真实队列；观察性数据不替代随机试验。');
}

if (require.main === module) main();

module.exports = {
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  readDoc,
  headings,
  tables,
  citations,
  hanzi,
  eValue,
  compute,
  verify,
  stats,
  main,
};

// 教学边界：口径只在正文维护一份，这里直接摘正文里含「不构成」的那一行。
try {
  const _zh = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'docs', 'zh.md'), 'utf8');
  const _bound = (_zh.match(/[^\n]*不构成[^\n]*/) || [])[0];
  if (_bound) {
    console.log(`\n教学边界：${_bound.replace(/^[>\s*#-]+/, '').trim().slice(0, 120)}`);
  }
} catch { /* 读不到正文就不打，不编一句 */ }
