#!/usr/bin/env node
/**
 * 中医健康管理 · 第 1 章 健康管理卖的不是道理，是一个能被复评的闭环
 * 课程: departments/06-guanli/24-zhongyi-jiankang-guanli/chapters/01-j1/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的四张清单——四条边界、五环与各环判据、四种支付结构、三种定价口径、评价三问——
 * 全部从正文读出，条数再与句子里写的中文数字对账。正文改了条数而没改数字，脚本会报不一致。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 1;
const TITLE = '健康管理卖的不是道理，是一个能被复评的闭环';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const NUM = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function hanzi(text) {
  return (String(text || '').match(HANZI) || []).length;
}

/** 一级节（## 开头）及其正文行、汉字数。 */
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

/** 取某一节（按标题前缀）的正文。 */
function sectionText(body, prefix) {
  const s = sections(body).find((x) => x.title.startsWith(prefix));
  if (!s) throw new Error('正文里没有以「' + prefix + '」开头的一节');
  return s.lines.join('\n');
}

/** 边界表：四个名称各取一行，返回性质、交付物、责任主体。 */
const BOUNDARY_NAMES = ['治未病', '健康体检', '慢病管理', '中医健康管理'];

function boundaryTable(body) {
  return BOUNDARY_NAMES.map((name) => {
    const row = body
      .split('\n')
      .find((l) => new RegExp('^\\|\\s*' + name + '\\s*\\|').test(l));
    if (!row) throw new Error('边界表缺「' + name + '」这一行');
    const cells = row.split('|').map((c) => c.trim()).filter(Boolean);
    return { name, nature: cells[1], deliverable: cells[2], owner: cells[3] };
  });
}

/** 「一条完整的服务链是：A → B → …」里的五环。 */
function chainRings(body) {
  const m = body.match(/一条完整的服务链是：\*\*(.+?)\*\*/);
  if (!m) throw new Error('正文里没有「一条完整的服务链是：」这句');
  return m[1].split('→').map((s) => s.trim()).filter(Boolean);
}

/** 各环判据：「X 的判据是「Y」」。 */
function ringCriteria(body) {
  return [...body.matchAll(/的判据是「([^」]+)」/g)].map((m) => m[1]);
}

/** 第四节的四种支付结构（加粗小标题）。 */
function payStructures(body) {
  const t = sectionText(body, '四、');
  return [...t.matchAll(/\*\*([^*\n]{2,14})。\*\*/g)].map((m) => m[1].trim());
}

/** 「定价本身只有三种口径：按次／按年／按结果」。 */
function priceBases(body) {
  return [...body.matchAll(/\*\*按([^*\n]{1,3})\*\*/g)].map((m) => '按' + m[1].trim());
}

/** 第五节的三问（以「？」收尾的加粗句）。 */
function evalQuestions(body) {
  const t = sectionText(body, '五、');
  return [...t.matchAll(/\*\*([^*\n]+？)\*\*/g)].map((m) => m[1].trim());
}

function audit(body) {
  const boundary = boundaryTable(body);
  const rings = chainRings(body);
  const criteria = ringCriteria(body);
  const pay = payStructures(body);
  const pricing = priceBases(body);
  const questions = evalQuestions(body);

  const claims = [
    { label: '四条边界', want: 4, got: boundary.length },
    { label: '五环', want: 5, got: rings.length },
    { label: '五条判据', want: 5, got: criteria.length },
    { label: '四种支付结构', want: 4, got: pay.length },
    { label: '三种定价口径', want: 3, got: pricing.length },
    { label: '评价三问', want: 3, got: questions.length },
  ];

  const mismatched = claims.filter((c) => c.want !== c.got).map((c) => c.label);
  const selfPay = boundary.find((b) => b.name === '中医健康管理');
  return { boundary, rings, criteria, pay, pricing, questions, claims, mismatched, selfPay };
}

function main() {
  const body = read();
  const a = audit(body);
  const secs = sections(body).filter((s) => s.title);
  const cites = [...new Set([...body.matchAll(/《([^》\n]+)》/g)].map((m) => m[1]))];
  const bold = (body.match(/\*\*[^*\n]+\*\*/g) || []).length;

  console.log(`中医健康管理 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下条数与汉字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${hanzi(body)} 字 · 节 ${secs.length} 节 · 加粗判断 ${bold} 处 · 引书 ${cites.length} 部`);
  console.log('');
  console.log('四条边界（名称／性质／一次交付物／责任主体）：');
  for (const b of a.boundary) {
    console.log(`  ${b.name}：${b.nature.slice(0, 18)}… → 交付「${b.deliverable}」`);
  }
  console.log(`  → 最后两行的差别是分水岭：中医健康管理${a.selfPay.owner}。`);
  console.log('');
  console.log(`闭环 ${a.rings.length} 环，与各环判据一一对应：`);
  a.rings.forEach((r, i) => console.log(`  ${i + 1}. ${r} —— ${a.criteria[i] || '（缺判据）'}`));
  console.log('');
  console.log(`支付结构 ${a.pay.length} 种：${a.pay.join('／')}`);
  console.log(`定价口径 ${a.pricing.length} 种：${a.pricing.join('／')}`);
  console.log(`评价 ${a.questions.length} 问：${a.questions.join(' ')}`);
  console.log('');
  console.log(`条数对账：${a.mismatched.length ? '不一致，须改稿 —— ' + a.mismatched.join('、') : '一致'}`);
  console.log('');
  console.log('→ 判据：服务能不能卖上价，不在道理讲得多好，在每一环都留下可复评的痕迹。');
  console.log('※ 条数与汉字均从本章 docs/zh.md 现算，正文一改即随之变化；本输出仅用于教学演示，不构成诊疗意见、定价建议或经营建议。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE, read, hanzi, sections, sectionText,
  boundaryTable, chainRings, ringCriteria, payStructures, priceBases, evalQuestions, audit,
};
