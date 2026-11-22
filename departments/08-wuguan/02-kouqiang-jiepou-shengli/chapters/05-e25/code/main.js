#!/usr/bin/env node
/**
 * 口腔解剖生理 · 第 5 章 腮腺是面神经的床，不是它的邻居
 * 课程: departments/08-wuguan/02-kouqiang-jiepou-shengli/chapters/05-e25/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 三对大腺、面神经五支、三叉神经三支与涎石三条成因，全部从正文现算；
 * 每一支先找到原词，再核它在正文里的出场次序。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 5;
const SLUG = '05-e25';

const GLANDS = ['腮腺', '下颌下腺', '舌下腺'];
const FACIAL = ['颞支', '颧支', '颊支', '下颌缘支', '颈支'];
const TRIGEMINAL = ['眼支', '上颌支', '下颌支'];
const TRIGEM_ORDER = ['眶上裂出颅', '圆孔出颅', '卵圆孔出颅'];
const STONE = ['导管长', '走行向上', '分泌物黏稠'];
const CLAIMS = ['从腺体中间穿', '绕过下颌舌骨肌的后缘', '面神经是「动」的', '最容易受伤的是下颌缘支'];

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
  const glands = GLANDS.filter((t) => present(doc, t));
  const facial = FACIAL.filter((t) => present(doc, t));
  const trigeminal = TRIGEMINAL.filter((t) => present(doc, t));
  const stone = STONE.filter((t) => present(doc, t));
  const claims = CLAIMS.filter((t) => present(doc, t));
  const missing = [...GLANDS, ...FACIAL, ...TRIGEMINAL, ...STONE, ...CLAIMS].filter((t) => !present(doc, t));
  const title = (doc.split(/\r?\n/)[0] || '').replace(/^#\s*第\s*\d+\s*章\s*·\s*/, '').trim();
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title,
    sections: sections(doc),
    glands,
    facial,
    trigeminal,
    stone,
    claims,
    missing,
    orderOk: ordering(doc, FACIAL) && ordering(doc, TRIGEM_ORDER),
  };
}

function main() {
  const a = audit();
  console.log(`口腔解剖生理 · 第 ${a.chapter} 章 ${a.title}`);
  console.log('');
  console.log(`三对大腺：${a.glands.join('、')}`);
  console.log(`面神经五支（正文次序）：${a.facial.join(' → ')}`);
  console.log(`三叉神经三支：${a.trigeminal.join('、')}`);
  console.log(`涎石三条成因：${a.stone.join('、')}`);
  console.log('');
  console.log(`次序与正文一致：${a.orderOk ? '是' : '否'}`);
  console.log(`关键判断在正文中的原句：${a.claims.length}／${CLAIMS.length}`);
  if (a.missing.length) console.log(`缺词：${a.missing.join('、')}`);
  console.log('');
  console.log('※ 教学样例：腺体、分支与次序均由 docs/zh.md 现算，不手打。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, SLUG, GLANDS, FACIAL, TRIGEMINAL, STONE, CLAIMS, readDoc, sections, audit };
