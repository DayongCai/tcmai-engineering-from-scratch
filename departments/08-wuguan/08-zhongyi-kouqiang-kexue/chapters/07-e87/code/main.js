#!/usr/bin/env node
/**
 * 中医口腔科学 · 第 7 章 口疮是自限的病，两周不愈就不再是口疮
 * 课程: departments/08-wuguan/08-zhongyi-kouqiang-kexue/chapters/07-e87/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章从正文现算：四型、四个观察项、两周红线的七条，
 * 以及「一至两周自愈」「四周活检」两个时程在文中出现的位置与次数。
 * 时程是本篇的骨架，改了就会被这里读出来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 7;
const SLUG = '07-e87';

const TYPES = ['实火', '阴虚', '脾虚', '寒热错杂'];
const OBS_TITLES = ['大小与数目', '基底与边缘', '部位与角化程度', '病程与复发节律'];
const RED_TITLES = ['超过两周不愈', '基底硬结', '单侧', '淋巴结', '白塞病', '贫血', '吸烟饮酒'];
const SELF_LIMIT = ['一至两周可自愈', '自限性'];
const DIFF = ['口疮', '口糜'];
const BOUNDARY = ['本章不给剂量', '不给疗程', '不构成医学意见'];

const readDoc = (file = DOC) => fs.readFileSync(file, 'utf8');
const present = (doc, term) => doc.includes(term);
const sections = (doc) => [...doc.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());
const count = (doc, term) => doc.split(term).length - 1;

function sliceSection(doc, from, to) {
  const a = doc.indexOf(from);
  const b = doc.indexOf(to, a + 1);
  return a < 0 ? '' : doc.slice(a, b < 0 ? undefined : b);
}

function numberedCount(text) {
  const numerals = ['一', '二', '三', '四', '五', '六', '七', '八'];
  return numerals.filter((n) => text.includes(`**其${n}，`)).length;
}

function audit(doc = readDoc()) {
  const obsSec = sliceSection(doc, '## 三、四个观察项', '## 四、');
  const redSec = sliceSection(doc, '## 四、两周红线', '## 五、');
  const title = (doc.split(String.fromCharCode(10))[0] || '')
    .replace(/^#\s*第\s*\d+\s*章\s*·\s*/, '')
    .trim();
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title,
    sections: sections(doc),
    types: TYPES.filter((t) => present(doc, t)),
    obsCount: numberedCount(obsSec),
    obsTitles: OBS_TITLES.filter((t) => obsSec.includes(t)),
    redCount: numberedCount(redSec),
    redTitles: RED_TITLES.filter((t) => redSec.includes(t)),
    selfLimitOk: SELF_LIMIT.every((t) => present(doc, t)),
    diffOk: DIFF.every((t) => present(doc, t)),
    twoWeeks: count(doc, '两周'),
    fourWeeks: count(doc, '四周'),
    boundaryOk: BOUNDARY.every((t) => present(doc, t)),
  };
}

function main() {
  const a = audit();
  console.log(`中医口腔科学 · 第 ${a.chapter} 章 ${a.title}`);
  console.log('');
  console.log(`四型：${a.types.join('、')}`);
  console.log(`口疮／口糜分界：${a.diffOk ? '已划' : '缺'}`);
  console.log(`自限性表述（一至两周可自愈）：${a.selfLimitOk ? '在正文' : '缺'}`);
  console.log('');
  console.log(`四个观察项：${a.obsCount} 条｜${a.obsTitles.join('、')}`);
  console.log(`两周红线：${a.redCount} 条｜命中：${a.redTitles.join('、')}`);
  console.log(`时程词频：两周 ${a.twoWeeks} 次／四周 ${a.fourWeeks} 次`);
  console.log('');
  console.log('※ 教学样例：条数与时程词频均由 docs/zh.md 现算，不手打。');
  console.log('※ 本输出仅用于教学演示，不构成医学意见；本章不给剂量、不给疗程。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, SLUG, TYPES, OBS_TITLES, RED_TITLES, SELF_LIMIT, DIFF, BOUNDARY,
  readDoc, sections, sliceSection, numberedCount, count, audit,
};
