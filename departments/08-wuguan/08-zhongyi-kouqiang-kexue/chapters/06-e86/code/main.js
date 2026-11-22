#!/usr/bin/env node
/**
 * 中医口腔科学 · 第 6 章 出血多不等于病重，不出血也不等于好了
 * 课程: departments/08-wuguan/08-zhongyi-kouqiang-kexue/chapters/06-e86/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章从正文现算：三个病名与三项指标的表、探诊深度的三档界值（按正文数字解析，
 * 不手打）、五项观察与六条红旗的条数。界值一旦被改窄或改宽，测试即抛错。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 6;
const SLUG = '06-e86';

const NAMES = ['齿衄', '牙宣', '齿动'];
const METRICS = ['探诊出血', '探诊深度', '动度分级'];
const DEPTH_RE = /健康龈沟\s*(\d+)\s*至\s*(\d+)\s*毫米；\s*(\d+)\s*至\s*(\d+)\s*毫米为浅袋；\s*(\d+)\s*毫米及以上为深袋/;
const OBS_TITLES = ['出血的诱因与量', '探诊深度', '探诊出血', '龈缘位置', '溢脓'];
const RED_TITLES = ['探诊深度 6 毫米以上', '牙龈自发出血', '超过两周不愈', '药物性龈增生', '妊娠期龈炎', '抗凝'];
const BOUNDARY = ['本章不给剂量', '不给疗程', '不构成医学意见'];

const readDoc = (file = DOC) => fs.readFileSync(file, 'utf8');
const present = (doc, term) => doc.includes(term);
const sections = (doc) => [...doc.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());

function sliceSection(doc, from, to) {
  const a = doc.indexOf(from);
  const b = doc.indexOf(to, a + 1);
  return a < 0 ? '' : doc.slice(a, b < 0 ? undefined : b);
}

function numberedCount(text) {
  const numerals = ['一', '二', '三', '四', '五', '六', '七', '八'];
  return numerals.filter((n) => text.includes(`**其${n}，`)).length;
}

function bands(doc) {
  const m = doc.match(DEPTH_RE);
  if (!m) return null;
  return m.slice(1).map(Number);
}

function audit(doc = readDoc()) {
  const sec = sliceSection(doc, '## 五、五项观察与六条红旗', '## 六、');
  const cut = sec.indexOf('以下情形，辨证退到第二位');
  const obsPart = cut < 0 ? sec : sec.slice(0, cut);
  const redPart = cut < 0 ? '' : sec.slice(cut);
  const b = bands(doc);
  const title = (doc.split(String.fromCharCode(10))[0] || '')
    .replace(/^#\s*第\s*\d+\s*章\s*·\s*/, '')
    .trim();
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title,
    sections: sections(doc),
    names: NAMES.filter((t) => present(doc, t)),
    metrics: METRICS.filter((t) => present(doc, t)),
    depthBands: b,
    bandsContiguous: Boolean(b) && b[1] + 1 === b[2] && b[3] + 1 === b[4],
    obsCount: numberedCount(obsPart),
    obsTitles: OBS_TITLES.filter((t) => obsPart.includes(t)),
    redCount: numberedCount(redPart),
    redTitles: RED_TITLES.filter((t) => redPart.includes(t)),
    quirkOk: present(doc, '不出血了') && present(doc, '附着丧失'),
    boundaryOk: BOUNDARY.every((t) => present(doc, t)),
  };
}

function main() {
  const a = audit();
  console.log(`中医口腔科学 · 第 ${a.chapter} 章 ${a.title}`);
  console.log('');
  console.log(`三名：${a.names.join('、')} → 三指标：${a.metrics.join('／')}`);
  console.log(`探诊深度三档（正文数字）：${a.depthBands ? a.depthBands.join('／') : '缺'}`);
  console.log(`三档相接不重叠：${a.bandsContiguous ? '是' : '否'}`);
  console.log('');
  console.log(`五项观察：${a.obsCount} 条｜命中：${a.obsTitles.join('、')}`);
  console.log(`六条红旗：${a.redCount} 条｜命中：${a.redTitles.join('、')}`);
  console.log(`「不出血了」误读与附着丧失不可逆：${a.quirkOk ? '都在正文' : '缺'}`);
  console.log('');
  console.log('※ 教学样例：档位与条目数均由 docs/zh.md 现算，不手打。');
  console.log('※ 本输出仅用于教学演示，不构成医学意见；本章不给剂量、不给疗程。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, SLUG, NAMES, METRICS, DEPTH_RE, OBS_TITLES, RED_TITLES, BOUNDARY,
  readDoc, sections, sliceSection, numberedCount, bands, audit,
};
