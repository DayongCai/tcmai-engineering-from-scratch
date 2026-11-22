#!/usr/bin/env node
/**
 * 口腔内科学 · 第 7 章 牙周病是无声的：四个读数决定谁先动手
 * 课程: departments/08-wuguan/09-kouqiang-neike-xue/chapters/07-e97/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的读数与转诊量全部从正文现算：四个读数的行数与名称、全身相关情形表、
 * 转诊八条、牙宣四型，以及「先查血，不做刮治」这一条纪律。正文改一句，这里跟着变。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 7;
const SLUG = '07-e97';

const READINGS = ['探诊深度', '临床附着丧失', '探后出血', '松动度'];
const SYSTEMIC = ['血液病', '抗凝', '维生素 C 缺乏', '药物性龈增生', '妊娠期龈炎', '糖尿病'];
const PATTERNS = ['胃火', '肾虚', '气血亏虚', '脾虚湿热'];

const readDoc = (file = DOC) => fs.readFileSync(file, 'utf8');
const splitLines = (doc) => doc.split(/\r?\n/);
const sections = (doc) => [...doc.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());

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
  const readingRows = tableRows(doc, '| 读数 |');
  const systemicRows = tableRows(doc, '| 全身相关情形 |');
  const referralRows = tableRows(doc, '| 判据 |');
  const title = (splitLines(doc)[0] || '').replace(/^#\s*第\s*\d+\s*章\s*·\s*/, '').trim();
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title,
    sections: sections(doc),
    readings: readingRows.map((r) => r[0]),
    readingRows: readingRows.length,
    systemicRows: systemicRows.length,
    systemicNames: systemicRows.map((r) => r[0]),
    referralRows: referralRows.length,
    referralNames: referralRows.map((r) => r[0]),
    patterns: PATTERNS.filter((t) => doc.includes(t)),
    noScalingOnBleeding: doc.includes('先查血，不做刮治'),
    readingMisleads: doc.includes('读数失灵'),
    tappingLimit: doc.includes('松动加重者不宜叩齿'),
    notRootCure: doc.includes('抓的是「控制」不是「根治」'),
  };
}

function main() {
  const a = audit();
  console.log(`口腔内科学 · 第 ${a.chapter} 章 ${a.title}`);
  console.log('');
  console.log(`小节 ${a.sections.length} 节`);
  console.log(`四个读数 ${a.readingRows} 项：${a.readings.join('、')}`);
  console.log(`全身相关情形 ${a.systemicRows} 行：${a.systemicNames.join('、')}`);
  console.log(`转诊 ${a.referralRows} 条：${a.referralNames.join('、')}`);
  console.log('');
  console.log(`牙宣四型：${a.patterns.join('、')}（${a.patterns.length}／4）`);
  console.log(`先查血、不做刮治：${a.noScalingOnBleeding ? '已写明' : '缺'}`);
  console.log(`吸烟者读数失灵：${a.readingMisleads ? '已写明' : '缺'}`);
  console.log(`松动加重者不宜叩齿：${a.tappingLimit ? '已写明' : '缺'}`);
  console.log(`目标是控制不是根治：${a.notRootCure ? '已写明' : '缺'}`);
  console.log('');
  console.log('※ 教学样例：读数与转诊表行数均由 docs/zh.md 现算，不手打。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, SLUG, READINGS, SYSTEMIC, PATTERNS, readDoc, sections, tableRows, audit };
