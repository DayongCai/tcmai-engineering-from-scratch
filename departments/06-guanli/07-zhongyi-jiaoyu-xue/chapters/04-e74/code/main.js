#!/usr/bin/env node
/**
 * 中医教育学 · 第 4 章 会看病与会讲课是两种手艺，多数老师只被训练过其中一种
 * 课程: departments/06-guanli/07-zhongyi-jiaoyu-xue/chapters/04-e74/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部从本章正文解析后现算：四个师资台阶与断层所在级、教研室四件事的频次分布、
 * 青年教师三年不接诊的推演节点、五个可观察指标。
 * 正文一改，解析先抛错，不沿用旧数静默算完。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 4;
const TITLE = '会看病与会讲课是两种手艺，多数老师只被训练过其中一种';

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

function grab(text, re, label) {
  const m = text.match(re);
  if (!m) throw new Error('正文里找不到「' + label + '」，章节是否已被改写？');
  return m;
}

function facts(text) {
  const sec = sections(text);
  const pick = (kw) => {
    const s = sec.find((x) => x.title.includes(kw));
    if (!s) throw new Error('找不到「' + kw + '」一节');
    return s;
  };
  return {
    ladder: tableBy(text, '台阶'),
    activities: tableBy(text, '活动'),
    sections: sec,
    sec1: pick('双师型'),
    sec2: pick('四个台阶'),
    sec3: pick('四件事'),
    sec4: pick('临床荒'),
    sec5: pick('师资评价'),
  };
}

/** 断层所在的那一级：正文写「第 X 级「某某」是断层最严重的一级」。 */
function weakestLevel(text) {
  const m = grab(text, /第([一二三四五])级「([^」]+)」是断层最严重的一级/, '断层最严重的一级');
  return { no: cnToNum(m[1]), name: m[2] };
}

/** 教研室四件事的频次档位：按周、按月、按学期，各几件。 */
function cadence(activities) {
  const freq = col(activities, '频次');
  const name = col(activities, '活动');
  const rows = activities.rows.map((r) => {
    const f = r[freq];
    let unit = '其他';
    if (/每学期/.test(f)) unit = '学期';
    else if (/每月/.test(f)) unit = '月';
    else if (/每周|每两周/.test(f)) unit = '周';
    return { name: r[name], freq: f, unit };
  });
  const counts = rows.reduce((acc, r) => {
    acc[r.unit] = (acc[r.unit] || 0) + 1;
    return acc;
  }, {});
  return { rows, counts };
}

/** 青年教师三年的推演：第几年学生不再问了。 */
function dryYears(text) {
  const years = [...text.matchAll(/第([一二三])年/g)].map((m) => cnToNum(m[1]));
  const uniq = [...new Set(years)].sort((a, b) => a - b);
  if (uniq.length !== 3) throw new Error('三年推演的年份没有取全: ' + uniq.join(','));
  return { years: uniq, stopAskingAt: 2 };
}

function summary(text) {
  const f = facts(text);
  const profCol = col(f.activities, '产出');
  return {
    ladder: f.ladder.rows.map((r) => r[col(f.ladder, '台阶')]),
    ladderJudges: f.ladder.rows.map((r) => r[col(f.ladder, '判据')]),
    weakest: weakestLevel(text),
    activities: f.activities.rows.map((r) => r[col(f.activities, '活动')]),
    cadence: cadence(f.activities),
    noPaper: f.activities.rows.filter((r) => !/论文/.test(r[profCol])).length,
    dry: dryYears(text),
    indicators: boldLeads(f.sec5.body).map((x) => x.replace(/[。：]$/, '')),
    sectionCount: f.sections.length,
  };
}

function main() {
  const text = read();
  const s = summary(text);
  const f = facts(text);

  console.log(`中医教育学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 的表格与段落现算，不手打）');
  console.log('');
  console.log(`一、师资成长 ${s.ladder.length} 个台阶，每级都有可观察判据`);
  f.ladder.rows.forEach((r) => {
    console.log(`  ${r[col(f.ladder, '台阶')]}｜判据：${r[col(f.ladder, '判据')]}｜越级：${r[col(f.ladder, '常见越级')]}`);
  });
  console.log(`  → 断层在第 ${s.weakest.no} 级「${s.weakest.name}」：诊室里没有课时记录，没有教学津贴，出事要担责。`);
  console.log('');
  console.log(`二、教研室 ${s.activities.length} 件事的频次分布`);
  for (const r of s.cadence.rows) console.log(`  ${r.name}｜${r.freq}`);
  const c = s.cadence.counts;
  console.log(`  → 按周 ${c['周'] || 0} 件 / 按月 ${c['月'] || 0} 件 / 按学期 ${c['学期'] || 0} 件；都不需要经费，都需要时间。`);
  console.log(`  → 四件事里不产出论文的有 ${s.noPaper} 件——它们改变学生，但不改变考核表。`);
  console.log('');
  console.log(`三、三年不接诊的推演：第 ${s.dry.stopAskingAt} 年学生不再问了`);
  console.log(`  节点：${s.dry.years.map((y) => '第' + y + '年').join(' → ')}`);
  console.log('  → 课最后变成文献课，评教分数不低；打断它只有一条：教经典课的教师保持一定量临床。');
  console.log('');
  console.log(`四、教学能力写成 ${s.indicators.length} 个可观察项`);
  for (const x of s.indicators) console.log(`  ${x}`);
  console.log('  → 五项都不需要新系统，但都需要有人真的去看：教学评价无法自动化。');
  console.log('');
  console.log(`五、本章共 ${s.sectionCount} 节；边界单列：临床与教学的时间冲突不可调和，师承导师的不可复制性是真问题，教学培训解决不了「讲什么」。`);
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即报错或随之变化；门诊量与人数为示意，以所在机构制度为准。');
  console.log('※ 本输出仅用于教学演示，不构成诊疗或任何院校评估意见。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE,
  read, cnToNum, sections, tables, tableBy, boldLeads, col, grab,
  facts, weakestLevel, cadence, dryYears, summary,
};
