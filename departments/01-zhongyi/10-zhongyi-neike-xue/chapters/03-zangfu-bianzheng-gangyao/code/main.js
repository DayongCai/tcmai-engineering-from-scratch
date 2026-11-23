#!/usr/bin/env node
/**
 * 中医内科学 · 第 3 章 脏腑辨证纲要与内科治则：二十五个小节只是六份同构模板的重复加两个补丁
 * 课程: departments/01-zhongyi/10-zhongyi-neike-xue/chapters/03-zangfu-bianzheng-gangyao/docs/zh.md
 * 数据: 只读本章正文 docs/zh.md —— 标题层级、表行、引文、术语全部从正文现算
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么只读正文：本章的每个数都是「正文自己长什么样」的描述，不引任何外部表。
 * 正文改一句，下面的数就跟着变；手打的数会在改稿之后静默过期。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 3;
const TITLE = '脏腑辨证纲要与内科治则：二十五个小节只是六份同构模板的重复加两个补丁';

/** 术语表：本章正文里反复出现、且分属不同层的六个词 */
const TERMS = ['肺系', '心系', '脾胃', '脏腑', '肾系', '治则'];

const readDoc = (file = DOC) => fs.readFileSync(file, 'utf8');
const hanzi = (s) => (String(s).match(/[\u4e00-\u9fff]/g) || []).length;
const countOf = (s, re) => (String(s).match(re) || []).length;

function cells(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
}

/** 连续以 | 开头的行是一张表；首行作表头，分隔行丢掉 */
function tables(text) {
  const blocks = [];
  let cur = null;
  for (const line of String(text).split(/\r?\n/)) {
    if (/^\s*\|/.test(line)) {
      if (!cur) { cur = []; blocks.push(cur); }
      cur.push(line);
    } else cur = null;
  }
  return blocks
    .map((lines) => lines.map(cells))
    .filter((rows) => rows.length >= 2)
    .map((rows) => ({
      header: rows[0],
      rows: rows.slice(1).filter((r) => !r.every((c) => /^:?-{2,}:?$/.test(c))),
    }));
}

const FENCE = new RegExp('^' + String.fromCharCode(96, 96, 96));

/** 去掉围栏代码块：它只转写程序输出，不属于正文 */
function stripFences(text) {
  const out = [];
  let inside = false;
  for (const line of String(text).split(/\r?\n/)) {
    if (FENCE.test(line)) { inside = !inside; continue; }
    if (!inside) out.push(line);
  }
  return out.join('\n');
}

/** 从正文现算的结构指标 */
function measure(text = readDoc()) {
  const body = stripFences(text);
  const t = tables(body);
  return {
    hanzi: hanzi(body),
    h2: countOf(body, /^##\s+/gm),
    h3: countOf(body, /^###\s+/gm),
    h4: countOf(body, /^####\s+/gm),
    tables: t.length,
    tableRows: t.reduce((n, x) => n + x.rows.length, 0),
    quotes: countOf(body, /「[^」]{6,}」/g),
    locators: [...body.matchAll(/教材·中医内科学·第\d+章·\d+\.\d+(?:\.\d+)?/g)].length,
    subNos: new Set([...body.matchAll(/\d+\.\d+\.\d+/g)].map((m) => m[0])).size,
    terms: Object.fromEntries(TERMS.map((k) => [k, countOf(body, new RegExp(k, 'g'))])),
  };
}

function report(m) {
  console.log(`═══ 中医内科学 · 第 ${CHAPTER} 章 ${TITLE} ═══`);
  console.log(`  正文汉字：${m.hanzi}`);
  console.log(`  二级小节：${m.h2} · 三级小节：${m.h3} · 四级小节：${m.h4}`);
  console.log(`  表：${m.tables} 张 · 表行：${m.tableRows} 行`);
  console.log(`  教材引文：${m.quotes} 条 · 三级出处：${m.locators} 条 · 小节号：${m.subNos} 个`);
  console.log(`  术语：${Object.entries(m.terms).map(([k, n]) => `${k} ${n}`).join(' · ')}`);
  console.log('');
  console.log('教学边界：本章只统计正文自身的结构，不写剂量与用法量值（剂量与用法照底本），不作诊断与证候判定，不作疗效断言，不构成诊断与用药依据');
}

module.exports = { CHAPTER, TITLE, DOC, TERMS, readDoc, cells, tables, stripFences, hanzi, countOf, measure, report };

if (require.main === module) report(measure());
