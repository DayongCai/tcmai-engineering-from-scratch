#!/usr/bin/env node
/**
 * 中医口腔科学 · 第 4 章 治法不是一张方剂清单，是五道闸门
 * 课程: departments/08-wuguan/08-zhongyi-kouqiang-kexue/chapters/04-e84/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的结构量全部从正文现算：五道闸门的序号与名目、四法的先后、
 * 三处告诫各自封的是哪一条治法、调护五条是否齐备。
 * 「次序不能倒」不是注释里的话，是序号在文中的真实位置。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 4;
const SLUG = '04-e84';

const GATES = [
  ['急症', '第一道，急症'],
  ['器质', '第二道，器质'],
  ['内治', '第三道，内治'],
  ['外治', '第四道，外治'],
  ['调护', '第五道，调护'],
];
const METHODS = ['含漱', '吹药', '涂搽', '填塞'];
const WARNINGS = [
  ['酸药', '郁其表于内'],
  ['药线', '翻花败症'],
  ['概用寒凉', '损伤生气'],
];
const CARE5 = ['清洁', '饮食', '叩齿', '情志与作息', '观察与复诊'];
const FORBID = ['舌下廉泉', '禁针'];
const BOUNDARY = ['本章不给剂量', '不给疗程', '不给操作参数'];

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
  const gates = GATES.filter(([, mark]) => present(doc, mark));
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title,
    sections: sections(doc),
    gates: gates.map(([name]) => name),
    gateCount: gates.length,
    gatesOrdered: ordering(doc, GATES.map(([, mark]) => mark)),
    methods: METHODS.filter((t) => present(doc, `**${t}。**`)),
    warnings: WARNINGS.filter(([a, b]) => present(doc, a) && present(doc, b)).map(([a]) => a),
    care5: CARE5.filter((t) => present(doc, `**${t}**`)),
    forbidOk: FORBID.every((t) => present(doc, t)),
    boundaryOk: BOUNDARY.every((t) => present(doc, t)),
  };
}

function main() {
  const a = audit();
  console.log(`中医口腔科学 · 第 ${a.chapter} 章 ${a.title}`);
  console.log('');
  console.log(`五道闸门（按文中序号）：${a.gates.join(' → ')}（${a.gateCount} 道）`);
  console.log(`序号与次序一致：${a.gatesOrdered ? '是' : '否'}`);
  console.log('');
  console.log(`外治四法：${a.methods.join('、')}（${a.methods.length}／4）`);
  console.log(`三处告诫：${a.warnings.join('、')}（${a.warnings.length}／3）`);
  console.log(`调护五条：${a.care5.join('、')}（${a.care5.length}／5）`);
  console.log('');
  console.log(`针刺禁区（舌下廉泉、虽宜出血亦当禁针）：${a.forbidOk ? '在正文' : '缺'}`);
  console.log('');
  console.log('※ 教学样例：闸门序号、四法与五条均由 docs/zh.md 现算，不手打。');
  console.log('※ 本输出仅用于教学演示，不构成治疗建议；本章不给剂量、不给疗程、不给操作参数。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, SLUG, GATES, METHODS, WARNINGS, CARE5, FORBID, BOUNDARY,
  readDoc, sections, ordering, audit,
};
