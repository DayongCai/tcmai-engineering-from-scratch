#!/usr/bin/env node
/**
 * 口腔解剖生理 · 第 7 章 牙痛说不准位置，不是患者不会说
 * 课程: departments/08-wuguan/02-kouqiang-jiepou-shengli/chapters/07-e27/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 四类感觉、四类舌乳头与四条味觉通路全部从正文现算：乳头先在正文里找到，
 * 再核「丝状乳头没有味蕾」这条易错判断是否被正文写死。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 7;
const SLUG = '07-e27';

const SENSES = ['痛觉', '温度觉', '触压觉', '味觉'];
const PAPILLAE = ['丝状乳头', '菌状乳头', '叶状乳头', '轮廓乳头'];
const PATHS = ['面神经的鼓索', '舌咽神经', '迷走神经', '岩大神经'];
const CLAIMS = ['牙髓没有本体感受器', '会聚范围大', '痛觉不过中线', '丝状乳头没有味蕾', '全舌可辨五味'];

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
  const senses = SENSES.filter((t) => present(doc, t));
  const papillae = PAPILLAE.filter((t) => present(doc, t));
  const paths = PATHS.filter((t) => present(doc, t));
  const claims = CLAIMS.filter((t) => present(doc, t));
  const missing = [...SENSES, ...PAPILLAE, ...PATHS, ...CLAIMS].filter((t) => !present(doc, t));
  const title = (doc.split(/\r?\n/)[0] || '').replace(/^#\s*第\s*\d+\s*章\s*·\s*/, '').trim();
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title,
    sections: sections(doc),
    senses,
    papillae,
    paths,
    claims,
    missing,
    orderOk: ordering(doc, PAPILLAE),
    filamentNoBuds: doc.includes('丝状乳头没有味蕾'),
  };
}

function main() {
  const a = audit();
  console.log(`口腔解剖生理 · 第 ${a.chapter} 章 ${a.title}`);
  console.log('');
  console.log(`四类感觉：${a.senses.join('、')}`);
  console.log(`四类舌乳头（正文次序）：${a.papillae.join(' → ')}`);
  console.log(`四条味觉通路：${a.paths.join('、')}`);
  console.log(`丝状乳头没有味蕾：${a.filamentNoBuds ? '是' : '否'}`);
  console.log('');
  console.log(`次序与正文一致：${a.orderOk ? '是' : '否'}`);
  console.log(`关键判断在正文中的原句：${a.claims.length}／${CLAIMS.length}`);
  if (a.missing.length) console.log(`缺词：${a.missing.join('、')}`);
  console.log('');
  console.log('※ 教学样例：感觉、乳头与通路均由 docs/zh.md 现算，不手打。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, SLUG, SENSES, PAPILLAE, PATHS, CLAIMS, readDoc, sections, audit };
