#!/usr/bin/env node
/**
 * 中医口腔科学 · 第 10 章 「好好刷牙」说了几十年，牙龈还在出血
 * 课程: departments/08-wuguan/08-zhongyi-kouqiang-kexue/chapters/10-e810/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章从正文现算：五条规则、三级预防表的行数、
 * 三条最常被说反的话，以及刷牙动作里的角度、时长与次数——
 * 「45 度／两分钟」不是口号，是文中可检索的数字，被删即报错。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 10;
const SLUG = '10-e810';

const RULES = [
  ['刷牙', '**一、刷牙。**'],
  ['牙线', '**二、牙线。**'],
  ['舌苔', '**三、舌苔。**'],
  ['饮食', '**四、饮食。**'],
  ['随访', '**五、随访。**'],
];
const ACTIONS = ['45 度', '两分钟', '每日两次'];
const SAY3 = [
  ['刷伤了', '没刷到'],
  ['洁治不伤牙', '牙石占据的位置被清出来后的显露'],
  ['叩齿可以作养生，不能作治疗', '牙槽骨'],
];
const TARGETS = ['过烫', '辛辣', '糖的频次', '烟酒与槟榔'];
const WATER = ['多喝水', '不在三步里'];
const BOUNDARY = ['本章不给产品品牌', '不构成护理处方', '不给疗效承诺'];

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

function sliceSection(doc, from, to) {
  const a = doc.indexOf(from);
  const b = doc.indexOf(to, a + 1);
  return a < 0 ? '' : doc.slice(a, b < 0 ? undefined : b);
}

function tableRowCount(text) {
  const lines = text.split(String.fromCharCode(10));
  const block = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line.startsWith('|')) {
      if (block.length) break;
      continue;
    }
    const cells = line.replace(/^\||\|$/g, '').split('|').map((s) => s.trim());
    block.push({ cells, separator: cells.every((c) => /^:?-{2,}:?$/.test(c)) });
  }
  const sep = block.findIndex((r) => r.separator);
  return Math.max(0, block.length - (sep >= 0 ? sep + 1 : 1));
}

function audit(doc = readDoc()) {
  const levelSec = sliceSection(doc, '## 一、三重含义与三级预防', '## 二、');
  const title = (doc.split(String.fromCharCode(10))[0] || '')
    .replace(/^#\s*第\s*\d+\s*章\s*·\s*/, '')
    .trim();
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title,
    sections: sections(doc),
    rules: RULES.filter(([, mark]) => present(doc, mark)).map(([n]) => n),
    rulesOrdered: ordering(doc, RULES.map(([, mark]) => mark)),
    actions: ACTIONS.filter((t) => present(doc, t)),
    levels: tableRowCount(levelSec),
    say3: SAY3.filter(([a, b]) => present(doc, a) && present(doc, b)).length,
    targets: TARGETS.filter((t) => present(doc, t)),
    waterOk: WATER.every((t) => present(doc, t)),
    boundaryOk: BOUNDARY.every((t) => present(doc, t)),
  };
}

function main() {
  const a = audit();
  console.log(`中医口腔科学 · 第 ${a.chapter} 章 ${a.title}`);
  console.log('');
  console.log(`五条规则：${a.rules.join(' → ')}（${a.rules.length}／5）`);
  console.log(`次序与正文一致：${a.rulesOrdered ? '是' : '否'}`);
  console.log(`刷牙动作要点：${a.actions.join('、')}（${a.actions.length}／3）`);
  console.log('');
  console.log(`三级预防表：${a.levels} 行`);
  console.log(`三句必须反复说的话：${a.say3}／3`);
  console.log(`有靶点的忌口：${a.targets.join('、')}（${a.targets.length}／4）`);
  console.log(`「多喝水」不解决口腔干燥：${a.waterOk ? '在正文' : '缺'}`);
  console.log('');
  console.log('※ 教学样例：规则、条数与动作要点均由 docs/zh.md 现算，不手打。');
  console.log('※ 本输出仅用于教学演示，不构成护理处方；本章不给产品品牌、不给疗效承诺。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, SLUG, RULES, ACTIONS, SAY3, TARGETS, WATER, BOUNDARY,
  readDoc, sections, ordering, sliceSection, tableRowCount, audit,
};
