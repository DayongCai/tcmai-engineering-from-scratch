#!/usr/bin/env node
/**
 * 护理毕业设计 · 第 3 章 伦理审查不是盖章，是把受试者的代价提前算清：正文判断卡
 * 课程: departments/05-huli/27-huli-biye-sheji/chapters/03-ganyu-shixian/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：汉字数、节数、表格与数据行、干预四要素、送审四份、同意五要素、
 * 变更两类与五条失效；以及开篇两个算式——「需单独同意的数据类 ÷ 全部数据类」
 * 的授权覆盖，与「有据可查的执行次数 ÷ 应完成次数」的保真度——都由本脚本
 * 从正文读出数字重算，并与正文写出的百分比逐项对账。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = '3';
const SLUG = '03-ganyu-shixian';
const TITLE = '伦理审查不是盖章，是把受试者的代价提前算清';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

// 变更样例取自本章的两类变更表：前两件报备，其余四件须先报审。
const CHANGE_SAMPLES = [
  { text: '访谈地点改在会议室', note: '不影响权益' },
  { text: '记录表格式调整', note: '不影响权益' },
  { text: '扩大样本', note: '影响权益与数据用途' },
  { text: '增加数据字段', note: '影响权益与数据用途' },
  { text: '延长随访', note: '影响权益与数据用途' },
  { text: '改变干预内容', note: '影响权益与数据用途' }
];

function readDoc() {
  return fs.readFileSync(DOC, 'utf8');
}

function hanzi(text) {
  return (text.match(/[\u4e00-\u9fff]/g) || []).length;
}

function sectionTitles(text) {
  return text.split(/\r?\n/).filter((l) => /^##\s/.test(l)).map((l) => l.replace(/^##\s*/, '').trim());
}

function sectionText(text, key) {
  const out = [];
  let on = false;
  for (const line of text.split(/\r?\n/)) {
    const m = /^##\s+(.*)$/.exec(line);
    if (m) { on = m[1].includes(key); continue; }
    if (on) out.push(line);
  }
  return out.join('\n');
}

function tableBlocks(lines) {
  const blocks = [];
  let cur = null;
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('|')) {
      if (!cur) { cur = []; blocks.push(cur); }
      cur.push(t);
    } else {
      cur = null;
    }
  }
  return blocks;
}

function dataRows(block) {
  return block.filter((l) => !/^\s*\|[\s:\-|]+\|\s*$/.test(l)).slice(1);
}

/** 授权覆盖：需单独同意的数据类 ÷ 全部数据类；只签一份总同意时，其余类在合规上是空白的 */
function consentCoverage(text) {
  const num = (re, name) => {
    const m = text.match(re);
    if (!m) throw new Error('正文里找不到这个数：' + name);
    return Number(m[1].replace(/,/g, ''));
  };
  const dataTypes = num(/要采四类数据：[\s\S]{0,60}（(\d+)\s*类）/, '数据类数');
  const sensitiveRaw = (text.match(/有\s*([一二两三四五六七八九十\d]+)\s*类落在敏感范围/) || [])[1];
  const CN = { 一: 1, 两: 2, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
  const sensitive = CN[sensitiveRaw] || Number(sensitiveRaw);
  const signed = /只签了一份笼统的总同意书/.test(text) ? 1 : 0;
  const statedCoverage = num(/被单独授权的比例是\s*\d+\s*÷\s*\d+\s*=\s*(\d+)%/, '授权覆盖');
  const coverage = Number(((sensitive / dataTypes) * 100).toFixed(1));
  return {
    dataTypes, sensitive, signed, coverage,
    blankShare: Number((((dataTypes - sensitive) / dataTypes) * 100).toFixed(1)),
    stated: { coverage: statedCoverage },
    consistent: coverage === statedCoverage
  };
}

/** 保真度：有据可查的执行次数 ÷ 应完成次数 */
function fidelity(text) {
  const num = (re, name) => {
    const m = text.match(re);
    if (!m) throw new Error('正文里找不到这个数：' + name);
    return Number(m[1].replace(/,/g, ''));
  };
  const subjects = num(/计划对\s*(\d+)\s*位对象/, '对象数');
  const times = num(/各做\s*(\d+)\s*次/, '每人次数');
  const statedPlanned = num(/应完成\s*(\d+)\s*次/, '应完成次数');
  const documented = num(/有据可查的是\s*(\d+)\s*次/, '有据可查次数');
  const statedRate = num(/保真度为\s*\d+\s*÷\s*\d+\s*=\s*(\d+)%/, '保真度');
  const planned = subjects * times;
  const rate = Number(((documented / planned) * 100).toFixed(1));
  return {
    subjects, times, planned, documented, rate, missing: planned - documented,
    stated: { planned: statedPlanned, rate: statedRate },
    consistent: planned === statedPlanned && rate === statedRate
  };
}

/** 本章可数的结构：干预四要素、变更两类、送审四份、同意五要素、五条失效 */
function structure(text) {
  const lines = text.split(/\r?\n/);
  const rows = tableBlocks(lines).map((b) => dataRows(b).length);
  return {
    interventionElements: rows[0],
    changeClasses: rows[1],
    reviewDocs: (sectionText(text, '伦理送审').match(/\*\*第[一二三四]份，/g) || []).length,
    consentElements: (sectionText(text, '知情同意').match(/^\d+\.\s/gm) || []).length,
    failures: (sectionText(text, '五种失效模式').match(/\*\*其[一二三四五六七八九]，/g) || []).length
  };
}

/** 变更分类：要不要先报伦理委员会，只看它是否让受试者承担新的东西或数据另作他用 */
function changeKind(change) {
  const t = String(change || '');
  if (/(扩大样本|增加.{0,6}字段|延长随访|改变干预内容|新增数据|数据用途|加做访谈)/.test(t)) return '先报审';
  if (/(地点|会议室|格式|排版|措辞|顺序|表格样式|改在)/.test(t)) return '报备';
  return '待判';
}

function report() {
  const text = readDoc();
  const lines = text.split(/\r?\n/);
  const blocks = tableBlocks(lines);
  let rows = 0;
  for (const b of blocks) rows += dataRows(b).length;
  return {
    chapter: CHAPTER,
    title: TITLE,
    size: { hanzi: hanzi(text), sections: sectionTitles(text).length, tables: blocks.length, rows },
    consent: consentCoverage(text),
    fidelity: fidelity(text),
    structure: structure(text),
    changes: CHANGE_SAMPLES.map((s) => ({ ...s, kind: changeKind(s.text) }))
  };
}

function main() {
  const r = report();
  const c = r.consent;
  const f = r.fidelity;
  const s = r.structure;
  console.log(`护理毕业设计 · 第 ${r.chapter} 章 ${r.title}`);
  console.log(`正文: chapters/${SLUG}/docs/zh.md`);
  console.log('');
  console.log(`规模: 汉字 ${r.size.hanzi.toLocaleString('en-US')} · 节 ${r.size.sections} · 表格 ${r.size.tables} 张（数据行 ${r.size.rows}）`);
  console.log('');
  console.log('授权覆盖算术:');
  console.log(`  共采 ${c.dataTypes} 类数据，${c.sensitive} 类需单独同意；实际只签 ${c.signed} 份总同意`);
  console.log(`  被单独授权的比例 ${c.sensitive} ÷ ${c.dataTypes} = ${c.coverage}%；其余 ${c.blankShare}% 的数据在合规上是空白的`);
  console.log(`  对账: 正文写出的 ${c.stated.coverage}% 与重算${c.consistent ? '一致' : '不一致'}`);
  console.log(`  读法: 差的不是一张纸，是不合规的那部分数据不能用；不能用就得重采，而重采往往已经错过时点。`);
  console.log('');
  console.log('保真度算术:');
  console.log(`  计划 ${f.subjects} 位对象 × 各 ${f.times} 次 = 应完成 ${f.planned} 次`);
  console.log(`  过程记录有据可查 ${f.documented} 次 → 保真度 ${f.documented} ÷ ${f.planned} = ${f.rate}%（缺口 ${f.missing} 次）`);
  console.log(`  对账: 正文写出的 ${f.stated.planned}/${f.stated.rate}% 与重算${f.consistent ? '一致' : '不一致'}`);
  console.log(`  读法: 效果不明显，先查干预执行了几成；这个比值要出现在结果第一段，不是等读者自己发现。`);
  console.log('');
  console.log(`结构: 干预要素 ${s.interventionElements} 项 · 变更 ${s.changeClasses} 类 · 送审材料 ${s.reviewDocs} 份 · 同意要素 ${s.consentElements} 条 · 失效模式 ${s.failures} 条`);
  console.log('');
  console.log('变更样例（要不要先报审）:');
  for (const x of r.changes) {
    console.log(`  ${x.kind === '报备' ? '✅' : '⚠️ '} ${x.kind} ← ${x.text}　〔${x.note}〕`);
  }
  console.log('');
  console.log(`结论: ${r.changes.length} 件变更里 ${r.changes.filter((x) => x.kind === '先报审').length} 件要先报伦理委员会；判断只有一句——会不会让受试者承担新的东西，或让他的数据被用在原来没说过的地方。`);
  console.log('边界声明: 本输出为教学样例，数字由本章正文现算，不构成法律、伦理审查或医学意见。');
}

if (require.main === module) main();

module.exports = {
  readDoc, hanzi, sectionTitles, sectionText, tableBlocks, dataRows,
  consentCoverage, fidelity, structure, changeKind, CHANGE_SAMPLES,
  report, CHAPTER, SLUG, TITLE
};
