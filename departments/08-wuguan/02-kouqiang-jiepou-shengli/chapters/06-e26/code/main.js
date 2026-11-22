#!/usr/bin/env node
/**
 * 口腔解剖生理 · 第 6 章 咀嚼是同一套五相，吞咽是四道闸门
 * 课程: departments/08-wuguan/02-kouqiang-jiepou-shengli/chapters/06-e26/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 五相、三期与四道保护全部从正文现算：每一相、每一期、每一道都先在正文里
 * 找到原词，再核它们在正文里的先后；顺序错一位，判断就错一层。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 6;
const SLUG = '06-e26';

const CHEW = ['静止相', '摄食相', '粉碎相', '食团形成与排出相', '清扫相'];
const SWALLOW = ['口腔期（随意期）', '咽期（不随意期）', '食管期'];
const GUARDS = ['软腭上提', '舌根后缩', '喉上提', '咳嗽反射'];
const GUARDS_ORDER = ['第一道，软腭上提封闭鼻咽', '第二道，舌根后缩', '第三道，喉上提', '第四道，声门下的咳嗽反射'];
const CLAIMS = ['唯一产生咬合力', '食团越过咽峡', '没有咳嗽反射的人', '改变了力的分布'];

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
  const chew = CHEW.filter((t) => present(doc, t));
  const swallow = SWALLOW.filter((t) => present(doc, t));
  const guards = GUARDS.filter((t) => present(doc, t));
  const claims = CLAIMS.filter((t) => present(doc, t));
  const missing = [...CHEW, ...SWALLOW, ...GUARDS, ...CLAIMS].filter((t) => !present(doc, t));
  const title = (doc.split(/\r?\n/)[0] || '').replace(/^#\s*第\s*\d+\s*章\s*·\s*/, '').trim();
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title,
    sections: sections(doc),
    chew,
    swallow,
    guards,
    claims,
    missing,
    orderOk: ordering(doc, CHEW) && ordering(doc, SWALLOW) && ordering(doc, GUARDS_ORDER),
  };
}

function main() {
  const a = audit();
  console.log(`口腔解剖生理 · 第 ${a.chapter} 章 ${a.title}`);
  console.log('');
  console.log(`咀嚼五相（正文次序）：${a.chew.join(' → ')}`);
  console.log(`吞咽三期：${a.swallow.join(' → ')}`);
  console.log(`四道保护：${a.guards.join(' → ')}`);
  console.log('');
  console.log(`次序与正文一致：${a.orderOk ? '是' : '否'}`);
  console.log(`关键判断在正文中的原句：${a.claims.length}／${CLAIMS.length}`);
  if (a.missing.length) console.log(`缺词：${a.missing.join('、')}`);
  console.log('');
  console.log('※ 教学样例：分相、分期与次序均由 docs/zh.md 现算，不手打。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, SLUG, CHEW, SWALLOW, GUARDS, CLAIMS, readDoc, sections, audit };
