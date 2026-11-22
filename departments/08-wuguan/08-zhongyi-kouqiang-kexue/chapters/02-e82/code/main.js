#!/usr/bin/env node
/**
 * 中医口腔科学 · 第 2 章 「火」是口齿科最省力的答案，也是最容易错的那一个
 * 课程: departments/08-wuguan/08-zhongyi-kouqiang-kexue/chapters/02-e82/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章从正文现算三件事：徐用诚四路是不是按「阳明—少阴—湿热胃火—错杂」排下来、
 * 「火」在文中被拆成几种、病机三轴与走向的次序有没有被改动。
 * 结论一律由原词位置算出，不由注释里的断言替代。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 2;
const SLUG = '02-e82';

const ROUTES = ['本手足阳明经', '本足少阴经', '湿热胃火', '诸经错杂之邪'];
const FIRE = ['实火', '虚火', '无根之火'];
const PAIRS = [
  ['先肿后痛', '先痛后肿'],
  ['得冷痛减', '得热减'],
  ['浮数', '浮紧'],
];
const AXES = [
  ['壅', '痛而胀'],
  ['腐', '按之出脓'],
  ['损', '龈淡、根露'],
];
const TREND = ['由龈及牙', '由牙及骨', '由口及咽'];
const BOUNDARY = ['本章不给剂量', '不给疗程', '不构成诊断或治疗建议'];

const readDoc = (file = DOC) => fs.readFileSync(file, 'utf8');
const present = (doc, term) => doc.includes(term);
const sections = (doc) => [...doc.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());
const count = (doc, term) => doc.split(term).length - 1;

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
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title,
    sections: sections(doc),
    routes: ROUTES.filter((t) => present(doc, t)),
    routesOrdered: ordering(doc, ROUTES),
    fire: FIRE.map((t) => ({ name: t, hits: count(doc, t) })).filter((x) => x.hits > 0),
    axes: AXES.filter(([n, mark]) => present(doc, n) && present(doc, mark)).map(([n]) => n),
    pairsOk: PAIRS.every(([a, b]) => present(doc, a) && present(doc, b)),
    trendOk: ordering(doc, TREND),
    boundaryOk: BOUNDARY.every((t) => present(doc, t)),
  };
}

function main() {
  const a = audit();
  console.log(`中医口腔科学 · 第 ${a.chapter} 章 ${a.title}`);
  console.log('');
  console.log(`病因四路（按正文次序）：${a.routes.join(' → ')}`);
  console.log(`四路次序与正文一致：${a.routesOrdered ? '是' : '否'}`);
  console.log('');
  console.log('「火」被拆成几种（同名词频）：');
  for (const f of a.fire) console.log(`  ${f.name}：${f.hits}`);
  console.log(`  → 共 ${a.fire.length} 种，同名而治法方向相反`);
  console.log('');
  console.log(`病机三轴：${a.axes.join('、')}`);
  console.log(`走向次序：由龈及牙 → 由牙及骨 → 由口及咽（一致：${a.trendOk ? '是' : '否'}）`);
  console.log(`风热与风寒三处鉴别齐备：${a.pairsOk ? '是' : '否'}`);
  console.log('');
  console.log('※ 教学样例：分路、词频与次序均由 docs/zh.md 现算，不手打。');
  console.log('※ 本输出仅用于教学演示，不构成诊断或治疗建议；本章不给剂量、不给疗程。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, SLUG, ROUTES, FIRE, PAIRS, AXES, TREND, BOUNDARY,
  readDoc, sections, ordering, count, audit,
};
