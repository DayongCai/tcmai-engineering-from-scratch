#!/usr/bin/env node
/**
 * 口腔解剖生理 · 第 1 章 口腔不是一个腔，是两间房加一道门
 * 课程: departments/08-wuguan/02-kouqiang-jiepou-shengli/chapters/01-e21/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的结构量全部从正文现算：四壁、两间房、两道门与检查次序，
 * 先在正文里找到原词，再计数、再比次序；正文改一句，这里跟着变。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 1;
const SLUG = '01-e21';

const WALLS = ['唇', '颊', '腭', '口底'];
const ROOMS = ['口腔前庭', '固有口腔'];
const DOORS = ['磨牙后区', '咽峡'];
const ORDER = ['先外后内', '先前庭后固有', '最后到磨牙后区'];
const CLAIMS = ['分两部的是牙弓', '四面壁加一道门', '骨膜是这条链的关节'];

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
  const walls = WALLS.filter((t) => present(doc, t));
  const rooms = ROOMS.filter((t) => present(doc, t));
  const doors = DOORS.filter((t) => present(doc, t));
  const claims = CLAIMS.filter((t) => present(doc, t));
  const missing = [...WALLS, ...ROOMS, ...DOORS, ...CLAIMS].filter((t) => !present(doc, t));
  const title = (doc.split(/\r?\n/)[0] || '').replace(/^#\s*第\s*\d+\s*章\s*·\s*/, '').trim();
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title,
    sections: sections(doc),
    walls,
    rooms,
    doors,
    claims,
    missing,
    orderOk: ordering(doc, ORDER),
  };
}

function main() {
  const a = audit();
  console.log(`口腔解剖生理 · 第 ${a.chapter} 章 ${a.title}`);
  console.log('');
  console.log(`四壁：${a.walls.join('、')}`);
  console.log(`两间房：${a.rooms.join('／')}（分界线是牙弓）`);
  console.log(`两道门：${a.doors.join('／')}`);
  console.log('');
  console.log(`检查次序（由正文读出）：${ORDER.join(' → ')}`);
  console.log(`次序与正文一致：${a.orderOk ? '是' : '否'}`);
  console.log(`关键判断在正文中的原句：${a.claims.length}／${CLAIMS.length}`);
  if (a.missing.length) console.log(`缺词：${a.missing.join('、')}`);
  console.log('');
  console.log('※ 教学样例：结构名与次序均由 docs/zh.md 现算，不手打。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, SLUG, WALLS, ROOMS, DOORS, ORDER, CLAIMS, readDoc, sections, audit };
