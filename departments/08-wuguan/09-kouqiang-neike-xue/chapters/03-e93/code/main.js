#!/usr/bin/env node
/**
 * 口腔内科学 · 第 3 章 「火」是一个字，装着三种治法相反的东西
 * 课程: departments/08-wuguan/09-kouqiang-neike-xue/chapters/03-e93/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的结构量全部从正文现算：三种火、虚的四层、阴火的四证门槛、
 * 齿与龈的分叉、三系共用的骨架，以及清热的三条约束。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 3;
const SLUG = '03-e93';

const FIRES = ['风热', '胃火', '虚火'];
const DEFICIENCIES = ['气虚', '血虚', '阴虚', '阳虚'];
const YINHUO_GATES = ['脉数无力', '倦怠', '不渴饮冷', '得温则舒'];
const ORDER = ['起病急缓', '痛之性质', '局部色形'];
const CONSTRAINTS = ['中病即止', '清热必佐护中', '先补后清'];

const readDoc = (file = DOC) => fs.readFileSync(file, 'utf8');
const splitLines = (doc) => doc.split(/\r?\n/);
const sections = (doc) => [...doc.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());
const countOf = (doc, term) => (doc.split(term).length - 1);

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
  const title = (splitLines(doc)[0] || '').replace(/^#\s*第\s*\d+\s*章\s*·\s*/, '').trim();
  const gates = YINHUO_GATES.filter((t) => doc.includes(t));
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title,
    sections: sections(doc),
    fires: FIRES.map((t) => ({ name: t, n: countOf(doc, t) })),
    deficiencies: DEFICIENCIES.filter((t) => doc.includes(t)),
    gates,
    gatesOk: gates.length >= 3,
    orderOk: ordering(doc, ORDER),
    toothVsGum: doc.includes('齿病在质') && doc.includes('龈病在肉'),
    constraints: CONSTRAINTS.filter((t) => doc.includes(t)),
    notSameAsAcute: doc.includes('虚实与急慢性不同构'),
  };
}

function main() {
  const a = audit();
  console.log(`口腔内科学 · 第 ${a.chapter} 章 ${a.title}`);
  console.log('');
  console.log(`小节 ${a.sections.length} 节`);
  console.log(`三种火：${a.fires.map((f) => `${f.name}(${f.n})`).join('、')}`);
  console.log(`虚的四层：${a.deficiencies.join('、')}`);
  console.log(`阴火门槛命中：${a.gates.length}／${YINHUO_GATES.length}（${a.gates.join('、')}）`);
  console.log('');
  console.log(`判据次序与正文一致（起病急缓→痛之性质→局部色形）：${a.orderOk ? '是' : '否'}`);
  console.log(`齿在质、龈在肉的分叉：${a.toothVsGum ? '在' : '缺'}`);
  console.log(`清热的约束：${a.constraints.join('、')}（${a.constraints.length}／${CONSTRAINTS.length}）`);
  console.log(`虚实与急慢性不同构：${a.notSameAsAcute ? '已写明' : '缺'}`);
  console.log('');
  console.log('※ 教学样例：计数与次序均由 docs/zh.md 现算，不手打。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, SLUG, FIRES, DEFICIENCIES, YINHUO_GATES, ORDER, CONSTRAINTS, readDoc, sections, audit };
