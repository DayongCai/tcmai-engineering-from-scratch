#!/usr/bin/env node
/**
 * 中医教育学 · 第 2 章 学科强不等于学生会看病：这是两本账
 * 课程: departments/06-guanli/07-zhongyi-jiaoyu-xue/chapters/02-e72/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部从本章正文解析后现算：学科与专业各支撑几个对方、四个层次各有几个判据与责任人、
 * 反哺的真路径与假路径各有几条。正文一改，解析先抛错，不沿用旧数静默算完。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 2;
const TITLE = '学科强不等于学生会看病：这是两本账';

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function cnToNum(s) {
  const d = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  let total = 0;
  let num = 0;
  for (const ch of String(s)) {
    if (ch in d) num = d[ch];
    else if (ch === '十') { total += (num || 1) * 10; num = 0; }
    else if (ch === '百') { total += (num || 1) * 100; num = 0; }
    else throw new Error('无法解析的中文数字: ' + s);
  }
  return total + num;
}

function sections(text) {
  const out = [];
  let cur = null;
  for (const line of text.split('\n')) {
    const m = line.match(/^##\s+(.+)$/);
    if (m) {
      cur = { title: m[1].trim(), lines: [] };
      out.push(cur);
      continue;
    }
    if (cur) cur.lines.push(line);
  }
  return out.map((s) => ({ title: s.title, body: s.lines.join('\n') }));
}

function tables(text) {
  const lines = text.split('\n');
  const cell = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((s) => s.trim());
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!/^\s*\|/.test(lines[i])) continue;
    if (!/^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] || '')) continue;
    const header = cell(lines[i]);
    const rows = [];
    let j = i + 2;
    while (j < lines.length && /^\s*\|/.test(lines[j])) {
      rows.push(cell(lines[j]));
      j += 1;
    }
    out.push({ header, rows });
    i = j - 1;
  }
  if (!out.length) throw new Error('正文里没有解析到任何表格，章节结构可能已改');
  return out;
}

function tableBy(text, name) {
  const t = tables(text).find((x) => x.header[0] === name);
  if (!t) throw new Error('正文里找不到首列为「' + name + '」的表格');
  return t;
}

function boldLeads(body) {
  const re = /(?:^|\n)\s*(?:[-*]\s+|\d+[.)]\s+)?\*\*([^*\n]{1,30})\*\*/g;
  return [...body.matchAll(re)].map((m) => m[1].trim());
}

function col(table, name) {
  const i = table.header.indexOf(name);
  if (i < 0) throw new Error('表「' + table.header.join('／') + '」没有列「' + name + '」');
  return i;
}

/** 从正文抓一段；抓不到就报错，不猜默认值。 */
function grab(text, re, label) {
  const m = text.match(re);
  if (!m) throw new Error('正文里找不到「' + label + '」，章节是否已被改写？');
  return m[1];
}

function facts(text) {
  const sec = sections(text);
  const pick = (kw) => {
    const s = sec.find((x) => x.title.includes(kw));
    if (!s) throw new Error('找不到「' + kw + '」一节');
    return s;
  };
  return {
    tiers: tableBy(text, '层次'),
    sections: sec,
    sec1: pick('学科与专业'),
    sec2: pick('四个层次'),
    sec3: pick('反哺'),
    sec5: pick('可统计的量'),
  };
}

/**
 * 责任分配：正文用「X 阶段由 Y 负责」把四个层次各钉了一个人。
 * 这里把责任人抓出来，用来核对「四个层次 = 四个责任人」不是一句空话。
 */
function owners(text) {
  return [...text.matchAll(/由([^，。；]{2,14}?)负责/g)].map((m) => m[1]);
}

/** 学科支撑几个专业、专业调用几个学科：两个方向都要能数清。 */
function linkage(text) {
  const majors = grab(text, /支撑([^。；]{0,40}?)三个专业/, '一个学科支撑三个专业').split('、').map((s) => s.trim());
  const subjects = grab(text, /调用([^。；]{0,40}?)三个学科的师资/, '一个专业调用三个学科').split('、').map((s) => s.trim());
  return { majors, subjects, majorCount: majors.length, subjectCount: subjects.length };
}

/** 假路径的三种形态：只挂牌子、只办讲座、只换教材。 */
function fakePaths(text) {
  return [...new Set([...text.matchAll(/只挂牌子|只办讲座|只换教材/g)].map((m) => m[0]))];
}

function summary(text) {
  const f = facts(text);
  const tierCol = col(f.tiers, '层次');
  const judgeCol = col(f.tiers, '判据');
  const missCol = col(f.tiers, '常见错位');
  return {
    tiers: f.tiers.rows.map((r) => r[tierCol]),
    judges: f.tiers.rows.map((r) => r[judgeCol]),
    misses: f.tiers.rows.map((r) => r[missCol]),
    owners: owners(f.sec2.body),
    truth: boldLeads(f.sec3.body).map((x) => x.replace(/[。：]$/, '')),
    fake: fakePaths(f.sec3.body),
    metrics: boldLeads(f.sec5.body).map((x) => x.replace(/[。：]$/, '')),
    link: linkage(text),
    sectionCount: f.sections.length,
  };
}

function main() {
  const text = read();
  const s = summary(text);

  console.log(`中医教育学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 的表格与段落现算，不手打）');
  console.log('');
  console.log('一、两本账，两个方向都能数清');
  console.log(`  一个学科支撑 ${s.link.majorCount} 个专业：${s.link.majors.join('、')}`);
  console.log(`  一个专业调用 ${s.link.subjectCount} 个学科：${s.link.subjects.join('、')}`);
  console.log('  → 学科的评价语言是方向、平台、成果；专业的评价语言是目标、毕业要求、课程矩阵。');
  console.log('');
  console.log(`二、${s.tiers.length} 个培养层次，${s.judges.length} 条判据，${s.owners.length} 个责任人`);
  for (const r of facts(text).tiers.rows) {
    console.log(`  ${r[col(facts(text).tiers, '层次')]}｜判据：${r[col(facts(text).tiers, '判据')]}｜错位：${r[col(facts(text).tiers, '常见错位')]}`);
  }
  console.log(`  → 责任人：${s.owners.join(' / ')}；层次数与责任人数相等，才谈得上「谁负责」。`);
  console.log('');
  console.log(`三、反哺：真路径 ${s.truth.length} 条，假路径 ${s.fake.length} 条`);
  for (const t of s.truth) console.log(`  真｜${t}`);
  console.log(`  假｜${s.fake.join('、')}`);
  console.log('  → 真路径改变学生看到的东西；假路径都能写进总结，都不改变能力曲线。');
  console.log('');
  console.log(`四、可统计的量 ${s.metrics.length} 个，都不需要新系统`);
  for (const m of s.metrics) console.log(`  ${m}`);
  console.log('  → 它们进不了学科排名，可以进科室年度考核；与资源挂钩一次，行为才变一次。');
  console.log('');
  console.log(`五、本章共 ${s.sectionCount} 节；边界单列：资源竞争是结构性的，病例库有隐私成本，四层判据不能互换。`);
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即报错或随之变化；文中场景为合成说明，不指向真实院校。');
  console.log('※ 本输出仅用于教学演示，不构成诊疗或任何院校评估意见。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE,
  read, cnToNum, sections, tables, tableBy, boldLeads, col, grab,
  facts, owners, linkage, fakePaths, summary,
};
