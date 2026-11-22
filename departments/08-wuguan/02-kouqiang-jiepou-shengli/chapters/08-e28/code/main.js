#!/usr/bin/env node
/**
 * 口腔解剖生理 · 第 8 章 检查不是看一遍，是五个动作各答一问
 * 课程: departments/08-wuguan/02-kouqiang-jiepou-shengli/chapters/08-e28/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 五个动作与各自要答的问题，全部从正文现算：动作名先在正文里找到，
 * 再看它们的出场次序是否就是本章要求的固定次序。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 8;
const SLUG = '08-e28';

const ACTIONS = ['视诊', '触诊', '叩诊', '探诊', '动度'];
const ORDER = ['视诊答「形与色」', '触诊答「质与温」', '叩诊答「根尖周」', '探诊答「沟与洞」', '动度答「支持」'];
const RECORD = ['部位', '方位', '性质', '时间'];
const VIEWS = ['直视', '照片', '影像'];
const CLAIMS = ['先整体后局部', '以邻牙为对照', '六个位点分别记数', '先有假设再拍片', '附着水平是净损失'];

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
  const actions = ACTIONS.filter((t) => present(doc, t));
  const record = RECORD.filter((t) => present(doc, t));
  const views = VIEWS.filter((t) => present(doc, t));
  const claims = CLAIMS.filter((t) => present(doc, t));
  const missing = [...ACTIONS, ...ORDER, ...RECORD, ...VIEWS, ...CLAIMS].filter((t) => !present(doc, t));
  const title = (doc.split(/\r?\n/)[0] || '').replace(/^#\s*第\s*\d+\s*章\s*·\s*/, '').trim();
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title,
    sections: sections(doc),
    actions,
    record,
    views,
    claims,
    missing,
    orderOk: ordering(doc, ORDER),
  };
}

function main() {
  const a = audit();
  console.log(`口腔解剖生理 · 第 ${a.chapter} 章 ${a.title}`);
  console.log('');
  console.log(`五个动作：${a.actions.join('、')}`);
  console.log(`各自要答的一问（正文次序）：${ORDER.join(' → ')}`);
  console.log(`记录四项：${a.record.join('、')}`);
  console.log(`三种口径：${a.views.join('／')}`);
  console.log('');
  console.log(`次序与正文一致：${a.orderOk ? '是' : '否'}`);
  console.log(`关键判断在正文中的原句：${a.claims.length}／${CLAIMS.length}`);
  if (a.missing.length) console.log(`缺词：${a.missing.join('、')}`);
  console.log('');
  console.log('※ 教学样例：动作、口径与次序均由 docs/zh.md 现算，不手打。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, SLUG, ACTIONS, ORDER, RECORD, VIEWS, CLAIMS, readDoc, sections, audit };
