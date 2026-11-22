#!/usr/bin/env node
/**
 * 中医口腔科学 · 第 8 章 口臭的第一嫌疑不在胃，口干的第一嫌疑不在阴虚
 * 课程: departments/08-wuguan/08-zhongyi-kouqiang-kexue/chapters/08-e88/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章从正文现算：三条通道、三本账、口臭三因子、
 * 以及口臭排查的五步顺序（一看舌背…五问用药）与口干排查里列出的药类数目。
 * 「先定源、后辨证」一旦被改成「先辨证」，次序测试就会失败。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 8;
const SLUG = '08-e88';

const CHANNELS = ['经络', '津液', '腑气'];
const ACCOUNTS = ['供给', '输布', '消耗'];
const FACTORS = ['底物', '菌群', '滞留'];
const SCAN = ['一看舌背', '二看牙周', '三看龋洞', '四看鼻咽', '五问用药'];
const DRUGS = ['抗胆碱能药', '利尿剂', '部分降压药', '抗抑郁药', '抗组胺药'];
const CLAIMS = ['先定源、后辨证', '通腑能改善一部分口臭'];
const BOUNDARY = ['本章不给剂量', '不给疗程', '不构成医学意见'];

const readDoc = (file = DOC) => fs.readFileSync(file, 'utf8');
const present = (doc, term) => doc.includes(term);
const sections = (doc) => [...doc.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());

function ordering(doc, terms) {
  let last = -1;
  for (const t of terms) {
    const i = doc.indexOf(t);
    if (i <= last) return false;
    last = i;
  }
  return true;
}

function audit(doc = readDoc()) {
  const title = (doc.split(String.fromCharCode(10))[0] || '')
    .replace(/^#\s*第\s*\d+\s*章\s*·\s*/, '')
    .trim();
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title,
    sections: sections(doc),
    channels: CHANNELS.filter((t) => present(doc, t)),
    accounts: ACCOUNTS.filter((t) => present(doc, t)),
    factors: FACTORS.filter((t) => present(doc, t)),
    scan: SCAN.filter((t) => present(doc, t)),
    scanOrdered: ordering(doc, SCAN),
    drugs: DRUGS.filter((t) => present(doc, t)),
    claimsOk: CLAIMS.every((t) => present(doc, t)),
    boundaryOk: BOUNDARY.every((t) => present(doc, t)),
  };
}

function main() {
  const a = audit();
  console.log(`中医口腔科学 · 第 ${a.chapter} 章 ${a.title}`);
  console.log('');
  console.log(`三条通道：${a.channels.join('、')}`);
  console.log(`三本账：${a.accounts.join('、')}`);
  console.log(`口臭三因子：${a.factors.join(' × ')}`);
  console.log('');
  console.log(`口臭排查（按正文次序）：${a.scan.join(' → ')}`);
  console.log(`五步次序一致：${a.scanOrdered ? '是' : '否'}`);
  console.log(`口干排查列出的药类：${a.drugs.length} 类（${a.drugs.join('、')}）`);
  console.log('');
  console.log(`「先定源、后辨证」与「通腑只部分有效」：${a.claimsOk ? '都在正文' : '缺'}`);
  console.log('');
  console.log('※ 教学样例：通道、账目与排查次序均由 docs/zh.md 现算，不手打。');
  console.log('※ 本输出仅用于教学演示，不构成医学意见；本章不给剂量、不给疗程。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, SLUG, CHANNELS, ACCOUNTS, FACTORS, SCAN, DRUGS, CLAIMS, BOUNDARY,
  readDoc, sections, ordering, audit,
};
