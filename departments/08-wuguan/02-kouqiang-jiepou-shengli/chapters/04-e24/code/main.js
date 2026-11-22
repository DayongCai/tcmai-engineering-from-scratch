#!/usr/bin/env node
/**
 * 口腔解剖生理 · 第 4 章 下颌不是挂在关节窝里，是挂在盘上
 * 课程: departments/08-wuguan/02-kouqiang-jiepou-shengli/chapters/04-e24/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 关节四件、上下两腔、三档盘髁关系与两个「咬到底」，全部从正文现算：
 * 先在正文里找到原词，再核出场次序与「转动在下、滑动在上」这条总纲。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 4;
const SLUG = '04-e24';

const PIECES = ['髁突', '关节盘', '关节囊', '韧带'];
const CAVITIES = ['上腔', '下腔'];
const RELATIONS = ['第一档，正常', '可复性盘前移位', '不可复性盘前移位'];
const POSITIONS = ['正中𬌗（牙尖交错位）', '正中关系'];
const CLAIMS = ['转动在下', '盘不是垫圈', '无牙颌患者也有正中关系', '不是好转'];

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
  const pieces = PIECES.filter((t) => present(doc, t));
  const cavities = CAVITIES.filter((t) => present(doc, t));
  const relations = RELATIONS.filter((t) => present(doc, t));
  const positions = POSITIONS.filter((t) => present(doc, t));
  const claims = CLAIMS.filter((t) => present(doc, t));
  const missing = [...PIECES, ...CAVITIES, ...RELATIONS, ...POSITIONS, ...CLAIMS].filter((t) => !present(doc, t));
  const title = (doc.split(/\r?\n/)[0] || '').replace(/^#\s*第\s*\d+\s*章\s*·\s*/, '').trim();
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title,
    sections: sections(doc),
    pieces,
    cavities,
    relations,
    positions,
    claims,
    missing,
    orderOk: ordering(doc, RELATIONS),
    turnBelow: doc.includes('转动在下') && doc.indexOf('转动在下') < doc.indexOf('滑动在上'),
  };
}

function main() {
  const a = audit();
  console.log(`口腔解剖生理 · 第 ${a.chapter} 章 ${a.title}`);
  console.log('');
  console.log(`关节四件：${a.pieces.join('、')}`);
  console.log(`两腔：${a.cavities.join('／')}（转动在下，滑动在上：${a.turnBelow ? '是' : '否'}）`);
  console.log(`盘髁三档：${a.relations.join(' → ')}`);
  console.log(`两个「咬到底」：${a.positions.join('／')}`);
  console.log('');
  console.log(`次序与正文一致：${a.orderOk ? '是' : '否'}`);
  console.log(`关键判断在正文中的原句：${a.claims.length}／${CLAIMS.length}`);
  if (a.missing.length) console.log(`缺词：${a.missing.join('、')}`);
  console.log('');
  console.log('※ 教学样例：零件与次序均由 docs/zh.md 现算，不手打。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, SLUG, PIECES, CAVITIES, RELATIONS, POSITIONS, CLAIMS, readDoc, sections, audit };
