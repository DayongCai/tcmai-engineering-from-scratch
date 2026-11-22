#!/usr/bin/env node
/**
 * 中医口腔科学 · 第 5 章 痛可以用药压下去，洞不会自己长回来
 * 课程: departments/08-wuguan/08-zhongyi-kouqiang-kexue/chapters/05-e85/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章从正文现算：三套坐标、四种时间型、四步决策链的次序、
 * 以及「五条硬指征」的实际条数——条数用编号数出来，不照抄一句话。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 5;
const SLUG = '05-e85';

const COORDS = ['分经', '时间型', '深浅'];
const TIMES = ['一过性痛', '自发痛', '持续痛', '咬合痛'];
const STEPS = ['定时间型', '定深浅', '定虚实寒热', '定界'];
const DEPTH_Q = ['能否探到底', '是否酸痛', '食物嵌塞即痛', '冷水入洞痛'];
const PROMISE = ['一律不用', '疼痛缓解、龈肿消退'];
const RED_TITLES = ['龋深不可探', '去除后', '夜间自发痛', '咬合痛', '心源性'];
const BOUNDARY = ['本章不给剂量', '不给疗程', '不构成医学意见'];

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

/** 数「其一…其五」这类编号段落的条数 */
function numberedCount(text) {
  const numerals = ['一', '二', '三', '四', '五', '六', '七', '八'];
  return numerals.filter((n) => text.includes(`**其${n}，`)).length;
}

function audit(doc = readDoc()) {
  const stepsSec = sliceSection(doc, '## 五、次序为什么这样排', '## 六、');
  const redSec = sliceSection(doc, '## 四、龋', '## 五、');
  const title = (doc.split(String.fromCharCode(10))[0] || '')
    .replace(/^#\s*第\s*\d+\s*章\s*·\s*/, '')
    .trim();
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title,
    sections: sections(doc),
    coords: COORDS.filter((t) => present(doc, t)),
    times: TIMES.filter((t) => present(doc, t)),
    steps: STEPS.filter((t) => stepsSec.includes(t)),
    stepsOrdered: ordering(stepsSec, STEPS),
    depthQ: DEPTH_Q.filter((t) => present(doc, t)),
    redCount: numberedCount(redSec),
    redTitles: RED_TITLES.filter((t) => redSec.includes(t)),
    promiseOk: PROMISE.every((t) => present(doc, t)),
    boundaryOk: BOUNDARY.every((t) => present(doc, t)),
  };
}

function main() {
  const a = audit();
  console.log(`中医口腔科学 · 第 ${a.chapter} 章 ${a.title}`);
  console.log('');
  console.log(`三套坐标：${a.coords.join('／')}`);
  console.log(`四种时间型：${a.times.join('、')}（${a.times.length}／4）`);
  console.log(`深浅四问：${a.depthQ.join('、')}（${a.depthQ.length}／4）`);
  console.log('');
  console.log(`四步链（由正文读出）：${a.steps.join(' → ')}`);
  console.log(`次序与正文一致：${a.stepsOrdered ? '是' : '否'}`);
  console.log('');
  console.log(`硬指征 ${a.redCount} 条（按编号数出）`);
  console.log(`其中命中：${a.redTitles.join('、')}`);
  console.log(`承诺边界（一律不用「治愈龋齿」，只写可观察者）：${a.promiseOk ? '在正文' : '缺'}`);
  console.log('');
  console.log('※ 教学样例：坐标、时间型与条数均由 docs/zh.md 现算，不手打。');
  console.log('※ 本输出仅用于教学演示，不构成医学意见；本章不给剂量、不给疗程。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, SLUG, COORDS, TIMES, STEPS, DEPTH_Q, PROMISE, RED_TITLES, BOUNDARY,
  readDoc, sections, ordering, sliceSection, numberedCount, audit,
};
