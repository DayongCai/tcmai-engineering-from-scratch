#!/usr/bin/env node
/**
 * 中医健康管理 · 第 12 章 科普的完成，不是讲清楚了，是回去改了一处
 * 课程: departments/06-guanli/24-zhongyi-jiankang-guanli/chapters/12-j12/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 《师传》四步、三条硬约束、审核四层、形式五行、依从四杠杆、评价四层，全部从正文读出；
 * 开头两组对照数据现算：讲座的人次、说得出做法的比例、真改了事的比例，与小组干预的
 * 家人配合率放在一起，差距由脚本算出来，不手打。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 12;
const TITLE = '科普的完成，不是讲清楚了，是回去改了一处';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

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

/** 第一节：《师传》四步的次序。 */
function shizhuanOrder(body) {
  const m = sectionText(body, '一、').match(/《师传》的次序是：(.+)/);
  if (!m) throw new Error('正文里没有「《师传》的次序是」这句');
  return [...m[1].matchAll(/\*\*([^*]+)\*\*/g)].map((x) => x[1]);
}

/** 第二节：三条硬约束。 */
function constraints(body) {
  return [...sectionText(body, '二、').matchAll(/^\*\*(不承诺|不越界|可核查)。\*\*/gm)].map((m) => m[1]);
}

/** 第二节：内容审核四层。 */
function reviewLayers(body) {
  return [...sectionText(body, '二、').matchAll(/^\*\*(事实层|边界层|适配层|留痕层)。\*\*/gm)].map((m) => m[1]);
}

/** 第三节：形式五行（形式／覆盖／能改变／改变不了）。 */
function forms(body) {
  return table(sectionText(body, '三、')).rows.map((c) => ({ form: c[0], reach: c[1], can: c[2], cannot: c[3] }));
}

/** 第四节：依从四杠杆。 */
function levers(body) {
  return [...sectionText(body, '四、').matchAll(/^\*\*(能力|机会|动机|反馈)。\*\*/gm)].map((m) => m[1]);
}

/** 第五节：评价四层。 */
function evalLayers(body) {
  return [...sectionText(body, '五、').matchAll(/^\*\*(知晓层|信念层|行为层|状态层)。\*\*/gm)].map((m) => m[1]);
}

/** 开头两组对照数据现算。 */
function compareMath(body) {
  const talks = Number((body.match(/一年办\s*(\d+)\s*场/) || [])[1]);
  const perTalk = Number((body.match(/场均到场\s*(\d+)\s*人/) || [])[1]);
  const sampled = Number((body.match(/随机抽取\s*(\d+)\s*位/) || [])[1]);
  const canTell = Number((body.match(/具体做法的只有\s*(\d+)\s*人/) || [])[1]);
  const changed = Number((body.match(/因此改了哪一件事的，只有\s*(\d+)\s*人/) || [])[1]);
  const groupN = Number((body.match(/把\s*(\d+)\s*位血压偏高者/) || [])[1]);
  const groups = Number((body.match(/编成\s*(\d+)\s*个小组/) || [])[1]);
  const withFamily = Number((body.match(/有\s*(\d+)\s*人报告至少一项饮食改变得到/) || [])[1]);
  if (!talks || !perTalk || !sampled || !canTell || !changed || !groupN || !groups || !withFamily) {
    throw new Error('正文里没有完整的对照数字');
  }
  return {
    talks, perTalk, attendance: talks * perTalk,
    sampled, canTell, changed,
    canTellPct: Number(((canTell / sampled) * 100).toFixed(0)),
    changedPct: Number(((changed / sampled) * 100).toFixed(0)),
    groupN, groups, perGroup: Number((groupN / groups).toFixed(1)), withFamily,
    familyPct: Number(((withFamily / groupN) * 100).toFixed(1)),
  };
}

function audit(body) {
  const order = shizhuanOrder(body);
  const cons = constraints(body);
  const review = reviewLayers(body);
  const fs5 = forms(body);
  const lv = levers(body);
  const evals = evalLayers(body);
  const cmp = compareMath(body);

  const claims = [
    { label: '师传四步', want: 4, got: order.length },
    { label: '三条硬约束', want: 3, got: cons.length },
    { label: '审核四层', want: 4, got: review.length },
    { label: '形式五行', want: 5, got: fs5.length },
    { label: '依从四杠杆', want: 4, got: lv.length },
    { label: '评价四层', want: 4, got: evals.length },
  ];
  const mismatched = claims.filter((c) => c.want !== c.got).map((c) => c.label);
  return { order, cons, review, fs5, lv, evals, cmp, claims, mismatched };
}

function main() {
  const body = read();
  const a = audit(body);
  const secs = sections(body).filter((s) => s.title);
  const cites = [...new Set([...body.matchAll(/《([^》\n]+)》/g)].map((m) => m[1]))];

  console.log(`中医健康管理 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下条数、比例与汉字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${hanzi(body)} 字 · 节 ${secs.length} 节 · 引书 ${cites.length} 部`);
  console.log('');
  console.log(`《师传》四步次序：${a.order.join(' → ')}（多数科普从这里的第一步反着来）`);
  console.log(`三条硬约束：${a.cons.join('／')}`);
  console.log(`内容审核四层：${a.review.join('／')}`);
  console.log(`形式五行：${a.fs5.map((f) => f.form).join('／')}`);
  console.log(`  线上最弱的一环：${a.fs5[4].cannot}`);
  console.log(`依从四杠杆：${a.lv.join('／')}（能力与机会属服务端，动机与反馈属设计端）`);
  console.log(`评价四层：${a.evals.join(' ≤ ')}（越往下越难测，也越有意义）`);
  console.log('');
  const c = a.cmp;
  console.log(`对照复算：${c.talks} 场 × ${c.perTalk} 人 = ${c.attendance} 人次；抽查 ${c.sampled} 人，` +
    `说得出做法的 ${c.canTell} 人（${c.canTellPct}%），真改了事的 ${c.changed} 人（${c.changedPct}%）；`);
  console.log(`  小组干预：${c.groupN} 人分 ${c.groups} 组（每组 ${c.perGroup} 人），${c.withFamily} 人饮食改变得到家人配合（${c.familyPct}%）。`);
  console.log(`  讲座只发生在那一个小时里，小组发生在他们家的厨房里。`);
  console.log('');
  console.log(`条数对账：${a.mismatched.length ? '不一致，须改稿 —— ' + a.mismatched.join('、') : '一致'}`);
  console.log('');
  console.log('→ 判据：科普的完成不是讲清楚了，是对象回去改了一处，并且三个月还在改。');
  console.log('※ 条数、比例与汉字均从本章 docs/zh.md 现算，正文一改即随之变化；本输出仅用于教学演示，不构成诊疗意见，也不构成宣传合规意见。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE, read, hanzi, sections, sectionText, table,
  shizhuanOrder, constraints, reviewLayers, forms, levers, evalLayers, compareMath, audit,
};
