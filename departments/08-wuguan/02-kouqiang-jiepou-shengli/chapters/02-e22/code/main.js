#!/usr/bin/env node
/**
 * 口腔解剖生理 · 第 2 章 牙不是长在骨头里的，是挂在骨头上的
 * 课程: departments/08-wuguan/02-kouqiang-jiepou-shengli/chapters/02-e22/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的部件表全部从正文现算：牙的三部、三种硬组织、牙周四件与四类牙，
 * 每一件都要先在正文里找到原词，再看四类牙在正文中的出场次序。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 2;
const SLUG = '02-e22';

const PARTS = ['牙冠', '牙根', '牙颈'];
const HARD = ['釉质', '牙骨质', '牙本质'];
const PERIO = ['牙龈', '牙周膜', '牙槽骨', '牙骨质'];
const CLASSES = ['切牙管切断', '尖牙管撕裂', '前磨牙管撕裂兼研磨', '磨牙管研磨'];
const CLAIMS = ['牙与骨之间不是骨性融合', '斜行组最多', '不在替换序列里'];

const readDoc = (file = DOC) => fs.readFileSync(file, 'utf8');
const present = (doc, term) => doc.includes(term);
const sections = (doc) => [...doc.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());
const unique = (xs) => [...new Set(xs)];

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
  const parts = PARTS.filter((t) => present(doc, t));
  const hard = unique(HARD.filter((t) => present(doc, t)));
  const perio = PERIO.filter((t) => present(doc, t));
  const classes = CLASSES.filter((t) => present(doc, t));
  const claims = CLAIMS.filter((t) => present(doc, t));
  const missing = [...PARTS, ...HARD, ...PERIO, ...CLASSES, ...CLAIMS].filter((t) => !present(doc, t));
  const title = (doc.split(/\r?\n/)[0] || '').replace(/^#\s*第\s*\d+\s*章\s*·\s*/, '').trim();
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title,
    sections: sections(doc),
    parts,
    hard,
    perio,
    classes,
    claims,
    missing,
    orderOk: ordering(doc, CLASSES),
  };
}

function main() {
  const a = audit();
  console.log(`口腔解剖生理 · 第 ${a.chapter} 章 ${a.title}`);
  console.log('');
  console.log(`牙的三部：${a.parts.join('、')}`);
  console.log(`三种硬组织：${a.hard.join('、')}`);
  console.log(`牙周四件：${a.perio.join('、')}`);
  console.log(`四类牙（正文次序）：${CLASSES.join(' → ')}`);
  console.log('');
  console.log(`次序与正文一致：${a.orderOk ? '是' : '否'}`);
  console.log(`关键判断在正文中的原句：${a.claims.length}／${CLAIMS.length}`);
  if (a.missing.length) console.log(`缺词：${a.missing.join('、')}`);
  console.log('');
  console.log('※ 教学样例：部件与次序均由 docs/zh.md 现算，不手打。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, SLUG, PARTS, HARD, PERIO, CLASSES, CLAIMS, readDoc, sections, audit };
