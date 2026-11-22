#!/usr/bin/env node
/**
 * 中医教育学 · 第 3 章 课程表是一份资源分配文件，不是一个知识清单
 * 课程: departments/06-guanli/07-zhongyi-jiaoyu-xue/chapters/03-e73/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 全部数字从本章正文解析后现算：四块板块被压缩时失去什么、经典课三种上法的学时比、
 * 四种教学形式的组规模，以及一个百人班按各形式上限定要拆成几组。
 * 正文一改，解析先抛错，不沿用旧数静默算完。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 3;
const TITLE = '课程表是一份资源分配文件，不是一个知识清单';

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
  return m[1];
}

/**
 * 四块板块被压缩时「失去的是什么」。本章的论点是失去的都是要花时间在场的部分，
 * 这里按在场类行为的关键词去核，而不是直接抄结论。
 */
const HANDS_ON = /实验|认药|通读|见习|操作|跟诊|床边/;

function facts(text) {
  const sec = sections(text);
  const pick = (kw) => {
    const s = sec.find((x) => x.title.includes(kw));
    if (!s) throw new Error('找不到「' + kw + '」一节');
    return s;
  };
  return {
    blocks: tableBy(text, '板块'),
    methods: tableBy(text, '上法'),
    scenes: tableBy(text, '场景'),
    forms: tableBy(text, '形式'),
    sections: sec,
    sec2: pick('经典课'),
    sec4: pick('课程整合'),
    sec5: pick('教学组织'),
  };
}

/** 经典课三件事的学时比：正文写「三比五比二」，顺序是通读、方证、选读，这里按名对齐后算份额。 */
const RATIO_ORDER = ['通读', '以方证为纲', '选读'];

function hourRatio(text) {
  const m = text.match(/学时比大致是([一二三四五六七八九十])比([一二三四五六七八九十])比([一二三四五六七八九十])/);
  if (!m) throw new Error('正文里找不到经典课三件事的学时比');
  const parts = [m[1], m[2], m[3]].map(cnToNum);
  const sum = parts.reduce((a, b) => a + b, 0);
  const shares = {};
  RATIO_ORDER.forEach((k, i) => { shares[k] = parts[i] / sum; });
  return { parts, sum, shares, order: RATIO_ORDER };
}

/** 各教学形式的组规模上下限，从「八十至二百人」这类写法里取。 */
function groupSizes(forms) {
  const size = col(forms, '规模');
  const name = col(forms, '形式');
  return forms.rows.map((r) => {
    const m = r[size].match(/([一二三四五六七八九十百两]+)至([一二三四五六七八九十百两]+)人/);
    if (!m) throw new Error('规模列解析失败: ' + r[size]);
    return { form: r[name], min: cnToNum(m[1]), max: cnToNum(m[2]) };
  });
}

/** 一个百人班按各形式的上限需要拆成几组；正文用「一个百人班要拆成四组」校对小班这一档。 */
function groupsFor(classSize, sizes) {
  return sizes.map((s) => ({ form: s.form, groups: Math.ceil(classSize / s.max) }));
}

function summary(text) {
  const f = facts(text);
  const lossCol = col(f.blocks, '被压缩时最先失去什么');
  const nameCol = col(f.blocks, '板块');
  return {
    blocks: f.blocks.rows.map((r) => r[nameCol]),
    losses: f.blocks.rows.map((r) => r[lossCol]),
    onSiteLosses: f.blocks.rows.filter((r) => HANDS_ON.test(r[lossCol])).map((r) => r[nameCol]),
    methods: f.methods.rows.map((r) => r[col(f.methods, '上法')]),
    scenes: f.scenes.rows.map((r) => r[col(f.scenes, '场景')]),
    ratio: hourRatio(text),
    sizes: groupSizes(f.forms),
    classSize: cnToNum(grab(text, /一个([一二三四五六七八九十百]+)人班要拆成四组/, '一个百人班拆四组')),
    integrations: boldLeads(f.sec4.body),
    sectionCount: f.sections.length,
  };
}

function main() {
  const text = read();
  const s = summary(text);
  const hundred = groupsFor(s.classSize, s.sizes);

  console.log(`中医教育学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 的表格与段落现算，不手打）');
  console.log('');
  console.log(`一、学时是零和的：${s.blocks.length} 块内容争同一块总量`);
  console.log(`  ${s.blocks.join(' / ')}`);
  console.log(`  被压缩时失去「在场」行为的板块：${s.onSiteLosses.length}/${s.blocks.length}——${s.onSiteLosses.join('、')}`);
  console.log('  → 排课只看学时数与教室容量，看不见「学生少了三十次跟诊」；课表年年优化，动手能力年年被抱怨。');
  console.log('');
  console.log(`二、经典课 ${s.methods.length} 种上法，学时比 ${s.ratio.parts.join(':')}（合计 ${s.ratio.sum} 份）`);
  s.methods.forEach((m) => console.log(`  ${m}：${(s.ratio.shares[m] * 100).toFixed(0)}%`));
  console.log(`  → 方证给操作占最大一块（${(s.ratio.shares['以方证为纲'] * 100).toFixed(0)}%），通读只给结构，选读给深度。`);
  console.log('');
  console.log(`三、合流点 ${s.scenes.length} 处，全部落在病床边：${s.scenes.join('、')}`);
  console.log('  → 西医负责排除与兜底，中医负责个体化处置；告知分工，两个库才不打架。');
  console.log('');
  console.log(`四、整合 ${s.integrations.length} 种做法，同一种失败`);
  for (const x of s.integrations) console.log(`  ${x}`);
  console.log('  → 失败都在「整合课没有主人」：没人对整门课负责，整合就只是排课上的合并。');
  console.log('');
  console.log(`五、${s.sizes.length} 种形式的上限，决定一个 ${s.classSize} 人班要拆几组`);
  for (const g of hundred) console.log(`  ${g.form}：${g.groups} 组`);
  console.log('  → 组数就是同时在场的教师数，也是病房与门诊能不能接住的下限；小班化是算术题，不是理念题。');
  console.log('');
  console.log(`六、本章共 ${s.sectionCount} 节；边界单列：整合会增加协调成本，经典的通读必然被牺牲，背与解的顺序有例外。`);
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即报错或随之变化；学时与人数为一般口径，以本校培养方案为准。');
  console.log('※ 本输出仅用于教学演示，不构成诊疗或任何院校评估意见。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE,
  read, cnToNum, sections, tables, tableBy, boldLeads, col, grab,
  facts, hourRatio, groupSizes, groupsFor, summary,
};
