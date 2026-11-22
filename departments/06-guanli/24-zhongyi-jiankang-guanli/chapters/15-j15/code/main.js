#!/usr/bin/env node
/**
 * 中医健康管理 · 第 15 章 产业的问题不是需求不足，是没人愿为「没发生的事」付钱
 * 课程: departments/06-guanli/24-zhongyi-jiankang-guanli/chapters/15-j15/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 产品三条件、范围四层、支付四方、复购三驱动、推广三线、自律四条，全部从正文读出；
 * 开头那组经营的数字现算：客单价乘人次得首年营收，与投入对照；复购率换算成复购人次，
 * 再说清多少人能讲出自己改了什么。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 15;
const TITLE = '产业的问题不是需求不足，是没人愿为「没发生的事」付钱';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const CN = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

/** 中文数词：五千八百 → 5800，四千余万 → 4000（万）。 */
function cnToNum(w) {
  const D = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  const U = { 十: 10, 百: 100, 千: 1000 };
  let total = 0;
  let cur = 0;
  const str = String(w).replace(/余/g, '');
  const wan = str.indexOf('万');
  const head = wan >= 0 ? str.slice(0, wan) : str;
  for (const ch of head) {
    if (D[ch] !== undefined) cur = D[ch];
    else if (U[ch]) { total += (cur || 1) * U[ch]; cur = 0; }
  }
  total += cur;
  return wan >= 0 ? total * 10000 : total;
}

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function hanzi(text) {
  return (String(text || '').match(HANZI) || []).length;
}

function sections(body) {
  const out = [];
  let cur = { title: '', lines: [], hanzi: 0 };
  for (const line of body.split('\n')) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) {
      cur = { title: h[1], lines: [], hanzi: 0 };
      out.push(cur);
      continue;
    }
    cur.lines.push(line);
    cur.hanzi += hanzi(line);
  }
  return out;
}

function sectionText(body, prefix) {
  const s = sections(body).find((x) => x.title.startsWith(prefix));
  if (!s) throw new Error('正文里没有以「' + prefix + '」开头的一节');
  return s.lines.join('\n');
}

function cells(line) {
  return line.split('|').map((c) => c.trim()).filter(Boolean);
}
const isSep = (line) => /^\|[\s|:-]+\|?$/.test(line.trim());

function table(secText) {
  const lines = secText.split('\n').filter((l) => l.trim().startsWith('|') && !isSep(l));
  return { head: cells(lines[0]), rows: lines.slice(1).map(cells) };
}

function splitTop(str, sep = '、') {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of String(str)) {
    if (ch === '（' || ch === '(') depth += 1;
    if (ch === '）' || ch === ')') depth = Math.max(0, depth - 1);
    if (ch === sep && depth === 0) {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.filter(Boolean);
}

/** 第一节：可交付、可定价、可复评。 */
function productConds(body) {
  return [...sectionText(body, '一、').matchAll(/^\*\*(可交付|可定价|可复评)。\*\*/gm)].map((m) => m[1]);
}

/** 第二节：产业范围四层。 */
function scopeLayers(body) {
  return [...sectionText(body, '二、').matchAll(/^\*\*第([一二三四])层，([^*\n]+?)。\*\*/gm)].map((m) => ({
    n: m[1],
    what: m[2].trim(),
  }));
}

/** 第三节：四种支付方与「买/不买」。 */
function payers(body) {
  return table(sectionText(body, '三、')).rows.map((c) => ({ payer: c[0], buys: c[1], notBuy: c[2], effect: c[3] }));
}

/** 第四节：复购三驱动。 */
function repurchase(body) {
  return [...sectionText(body, '四、').matchAll(/^\*\*(有可对照的变化|有明确的下一段|有可感知的照顾)。\*\*/gm)].map((m) => m[1]);
}

/** 第五节：推广三条线。 */
function promoLines(body) {
  return [...sectionText(body, '五、').matchAll(/^\*\*(不承诺疗效|不借资质|不诱导消费)。\*\*/gm)].map((m) => m[1]);
}

/** 第五节：诱导消费的三种形态。 */
function inducement(body) {
  const m = sectionText(body, '五、').match(/三种常见形态：([^。]+)。/);
  if (!m) throw new Error('正文里没有「三种常见形态：」这句');
  return splitTop(m[1]);
}

/** 第五节：从业者四条自律。 */
function disciplines(body) {
  return [...sectionText(body, '五、').matchAll(/^\*\*(能做的说能做，不能做的说不能做|不制造不必要的需求|价格与交付对得上|不利用信任)。\*\*/gm)].map((m) => m[1]);
}

/** 开头经营数字现算。 */
function businessMath(body) {
  const invest = cnToNum((body.match(/([一二三四五六七八九十]+千余万)元/) || [])[1]) / 10000;
  const price = cnToNum((body.match(/客单价([一二三四五六七八九十百千]+)元/) || [])[1]);
  const visits = cnToNum((body.match(/首年接待约([一二三四五六七八九十百千]+)人次/) || [])[1]);
  const repeat = Number((body.match(/复购率\s*(\d+)%/) || [])[1]);
  const good = Number((body.match(/「感觉不错」占\s*(\d+)%/) || [])[1]);
  if (!invest || !price || !visits || !repeat || !good) throw new Error('正文里没有完整的经营数字');
  return {
    invest, price, visits, repeat, good,
    revenueWan: Number(((price * visits) / 10000).toFixed(0)),
    repeatVisits: Math.round((visits * repeat) / 100),
    explainPct: 10, // 正文写「不足一成」
  };
}

function audit(body) {
  const conds = productConds(body);
  const layers = scopeLayers(body);
  const pay = payers(body);
  const rep = repurchase(body);
  const promo = promoLines(body);
  const induce = inducement(body);
  const disc = disciplines(body);
  const math = businessMath(body);

  const claims = [
    { label: '产品三条件', want: 3, got: conds.length },
    { label: '范围四层', want: 4, got: layers.length },
    { label: '支付四方', want: 4, got: pay.length },
    { label: '复购三驱动', want: 3, got: rep.length },
    { label: '推广三线', want: 3, got: promo.length },
    { label: '诱导三形态', want: 3, got: induce.length },
    { label: '自律四条', want: 4, got: disc.length },
  ];
  const mismatched = claims.filter((c) => c.want !== c.got).map((c) => c.label);
  return { conds, layers, pay, rep, promo, induce, disc, math, claims, mismatched };
}

function main() {
  const body = read();
  const a = audit(body);
  const secs = sections(body).filter((s) => s.title);
  const cites = [...new Set([...body.matchAll(/《([^》\n]+)》/g)].map((m) => m[1]))];

  console.log(`中医健康管理 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下条数、营收与汉字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${hanzi(body)} 字 · 节 ${secs.length} 节 · 引书 ${cites.length} 部`);
  console.log('');
  console.log(`产品三条件：${a.conds.join('／')}（前两条决定开门，第三条决定活下去）`);
  console.log(`范围四层：${a.layers.map((l) => `第${l.n}层 ${l.what}`).join('；')}`);
  console.log(`支付四方与它不买的东西：`);
  for (const p of a.pay) console.log(`  ${p.payer}：买「${p.buys}」；不买「${p.notBuy}」`);
  console.log(`复购三驱动：${a.rep.join('／')}`);
  console.log(`推广三线：${a.promo.join('／')}`);
  console.log(`诱导三形态：${a.induce.join('；')}`);
  console.log(`自律四条：${a.disc.join('／')}`);
  console.log('');
  const m = a.math;
  console.log(`经营复算：${m.visits} 人次 × ${m.price} 元 = 首年营收约 ${m.revenueWan} 万，对投入 ${m.invest} 余万；` +
    `复购 ${m.repeat}% 折合 ${m.repeatVisits} 人次；「感觉不错」${m.good}%，说得出自己改了什么不足 ${m.explainPct}%。`);
  console.log(`  感受可以卖，但感受不产生下一次；只有可复评的那一段能。`);
  console.log('');
  console.log(`条数对账：${a.mismatched.length ? '不一致，须改稿 —— ' + a.mismatched.join('、') : '一致'}`);
  console.log('');
  console.log('→ 判据：产品化的分水岭在可复评——说得出「三个月前什么样、现在什么样」，才有第二次。');
  console.log('※ 条数、营收与汉字均从本章 docs/zh.md 现算，正文一改即随之变化；本输出仅用于教学演示，不构成投资建议、经营建议或合规意见。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE, read, hanzi, sections, sectionText, table, splitTop,
  cnToNum, productConds, scopeLayers, payers, repurchase, promoLines, inducement, disciplines, businessMath, audit,
};
