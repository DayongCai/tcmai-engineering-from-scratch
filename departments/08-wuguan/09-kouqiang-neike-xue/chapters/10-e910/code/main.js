#!/usr/bin/env node
/**
 * 口腔内科学 · 第 10 章 「认真刷牙」不是一个方案
 * 课程: departments/08-wuguan/09-kouqiang-neike-xue/chapters/10-e910/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的方案量全部从正文现算：四个要素、方案四栏的行数、三个数字、
 * 风险三层的间隔、八条自查，以及「过度」与「不足」两侧的边界。正文改一句，这里跟着变。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 10;
const SLUG = '10-e910';

const ELEMENTS = ['菌斑', '氟', '糖', '唾液'];
const RISK_TIERS = ['低', '中', '高'];

const readDoc = (file = DOC) => fs.readFileSync(file, 'utf8');
const splitLines = (doc) => doc.split(/\r?\n/);
const sections = (doc) => [...doc.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());

function sectionBody(doc, marker) {
  const re = new RegExp(`^##\\s+[^\\n]*${marker}[^\\n]*$`, 'm');
  const m = doc.match(re);
  if (!m) return '';
  const start = m.index + m[0].length;
  const rest = doc.slice(start);
  const next = rest.search(/^##\s+/m);
  return next < 0 ? rest : rest.slice(0, next);
}

function tableRows(doc, anchor) {
  const rows = splitLines(doc);
  const start = rows.findIndex((l) => l.trim().startsWith('|') && l.includes(anchor));
  if (start < 0) return [];
  const out = [];
  for (let i = start; i < rows.length; i += 1) {
    const line = rows[i].trim();
    if (!line.startsWith('|')) {
      if (out.length) break;
      continue;
    }
    if (/^\|[\s:|-]+\|$/.test(line)) continue;
    if (i === start) continue;
    out.push(line.split('|').slice(1, -1).map((s) => s.trim()));
  }
  return out;
}

function audit(doc = readDoc()) {
  const elementRows = tableRows(doc, '| 要素 |');
  const planRows = tableRows(doc, '| 项目 |');
  const riskRows = tableRows(doc, '| 风险层 |');
  const numbers = doc.match(/(\d+)\s*分钟、\s*(\d+)\s*次、\s*(\d+)\s*次甜食/);
  const selfBody = sectionBody(doc, '五、风险分层');
  const title = (splitLines(doc)[0] || '').replace(/^#\s*第\s*\d+\s*章\s*·\s*/, '').trim();
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title,
    sections: sections(doc),
    elements: elementRows.map((r) => r[0]),
    elementRows: elementRows.length,
    planRows: planRows.length,
    planNames: planRows.map((r) => r[0]),
    planColumns: (splitLines(doc).find((l) => l.includes('| 项目 |')) || '')
      .split('|').slice(1, -1).map((s) => s.trim()),
    numbers: numbers ? [Number(numbers[1]), Number(numbers[2]), Number(numbers[3])] : [],
    riskRows: riskRows.length,
    riskNames: riskRows.map((r) => r[0]),
    riskIntervals: riskRows.map((r) => r[2] || ''),
    selfChecks: (selfBody.match(/^\d+\.\s+\*\*/gm) || []).length,
    fluorineStays: doc.includes('氟留在牙面才起效'),
    frequencyOverTotal: doc.includes('酸的攻击次数'),
    overuseHarmed: doc.includes('楔状缺损'),
    notTherapy: doc.includes('口腔卫生是「日常」，不是「治疗」'),
  };
}

function main() {
  const a = audit();
  console.log(`口腔内科学 · 第 ${a.chapter} 章 ${a.title}`);
  console.log('');
  console.log(`小节 ${a.sections.length} 节`);
  console.log(`四要素：${a.elements.join('、')}（${a.elementRows}／4）`);
  console.log(`方案 ${a.planRows} 项：${a.planNames.join('、')}`);
  console.log(`方案四栏：${a.planColumns.join('｜')}（${a.planColumns.length} 栏）`);
  console.log('');
  console.log(`三个数字：${a.numbers.join(' / ')}`);
  console.log(`风险 ${a.riskRows} 层：${a.riskNames.join('、')}`);
  console.log(`分层间隔：${a.riskIntervals.join('；')}`);
  console.log(`自查 ${a.selfChecks} 条`);
  console.log('');
  console.log(`控糖看次数：${a.frequencyOverTotal ? '已写明' : '缺'}；氟留在牙面才起效：${a.fluorineStays ? '已写明' : '缺'}`);
  console.log(`过度的害处（楔状缺损）：${a.overuseHarmed ? '已写明' : '缺'}`);
  console.log(`口腔卫生是日常不是治疗：${a.notTherapy ? '已写明' : '缺'}`);
  console.log('');
  console.log('※ 教学样例：方案行数与分层间隔均由 docs/zh.md 现算，不手打。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, SLUG, ELEMENTS, RISK_TIERS, readDoc, sections, sectionBody, tableRows, audit };
