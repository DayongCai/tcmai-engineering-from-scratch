#!/usr/bin/env node
/**
 * 中医教育学 · 第 8 章 教育改革的证据链很短：多数「有效」只测了满意度
 * 课程: departments/06-guanli/07-zhongyi-jiaoyu-xue/chapters/08-e78/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部从本章正文解析后现算：四类问题与最低证据、单组前后测漏掉的三个替代解释、
 * 五种伪证、真研究要加的三样、改革的三道门与方案骨架。
 * 正文一改，解析先抛错，不沿用旧数静默算完。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 8;
const TITLE = '教育改革的证据链很短：多数「有效」只测了满意度';

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

function codeBlock(body) {
  const m = body.match(/```[a-z]*\n([\s\S]*?)```/);
  if (!m) throw new Error('本节没有代码块');
  return { text: m[1], lines: m[1].split('\n').filter((l) => l.trim().length > 0).map((l) => l.trim()) };
}

function facts(text) {
  const sec = sections(text);
  const pick = (kw) => {
    const s = sec.find((x) => x.title.includes(kw));
    if (!s) throw new Error('找不到「' + kw + '」一节');
    return s;
  };
  return {
    questions: tableBy(text, '问题类型'),
    gates: tableBy(text, '门'),
    sections: sec,
    sec1: pick('四类问题'),
    sec2: pick('伪证'),
    sec3: pick('真的研究'),
    sec4: pick('改革线'),
    sec5: pick('三道门'),
  };
}

/** 单组前后测漏掉的替代解释：成熟效应、工具效应、霍桑效应。 */
function alternatives(text) {
  return [...text.matchAll(/（(成熟效应|工具效应|霍桑效应)）/g)].map((m) => m[1]);
}

/** 三道门里最关键的那道，以及它在表里叫什么。 */
function keyGate(text, gates) {
  const m = grab(text, /第([一二三])道门最关键/, '最关键的一道门');
  const no = cnToNum(m[1]);
  return { no, name: gates.rows[no - 1][col(gates, '门')] };
}

/** 方案骨架的五个字段：问题、干预、对照、指标、退出条件。 */
function planKeys(body) {
  return codeBlock(body).lines
    .map((l) => (l.match(/^([^：]{1,6})：/) || [])[1])
    .filter(Boolean);
}

/** 伦理三条：脱敏分析、不与成绩挂钩、只报群体。 */
function ethics(text) {
  const m = grab(text, /三条——([^。]+)。/, '伦理三条');
  return m[1].split('、').map((s) => s.trim());
}

function summary(text) {
  const f = facts(text);
  return {
    questions: f.questions.rows.map((r) => r[col(f.questions, '问题类型')]),
    overreach: f.questions.rows.filter((r) => /单组前后测/.test(r[col(f.questions, '常见越级')])).map((r) => r[col(f.questions, '问题类型')]),
    alternatives: alternatives(text),
    fakes: boldLeads(f.sec2.body).map((x) => x.replace(/[。：]$/, '')),
    needs: boldLeads(f.sec3.body).map((x) => x.replace(/[。：]$/, '')),
    lines: boldLeads(f.sec4.body).map((x) => x.replace(/[。：]$/, '')),
    gates: f.gates.rows.map((r) => r[col(f.gates, '门')]),
    keyGate: keyGate(text, f.gates),
    plan: planKeys(f.sec5.body),
    ethics: ethics(text),
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
  console.log(`一、${s.questions.length} 类研究问题，各有最低证据`);
  f.questions.rows.forEach((r) => {
    console.log(`  ${r[col(f.questions, '问题类型')]}｜最低证据：${r[col(f.questions, '最低证据')]}｜越级：${r[col(f.questions, '常见越级')]}`);
  });
  console.log(`  → 最常被越级的是「${s.overreach.join('、')}」；单组前后测漏掉 ${s.alternatives.length} 个替代解释：${s.alternatives.join('、')}。`);
  console.log('');
  console.log(`二、${s.fakes.length} 种「有效」的伪证：${s.fakes.join('、')}`);
  console.log('  → 共同点：都不需要对照，都不需要延迟测，成本都低；不是错的数据，是被当成效果证据的过程数据。');
  console.log('');
  console.log(`三、真研究只要加 ${s.needs.length} 样：${s.needs.join('、')}`);
  console.log('  → 只能做一件时做延迟测：成本最低，对结论影响最大；但要报告复测率。');
  console.log('');
  console.log(`四、${s.lines.length} 条改革线：${s.lines.join('、')}`);
  console.log('  → 成败都不在理念，在岗位设置：整合课要「缝合人」，早临床要有人准备接收任务。');
  console.log('');
  console.log(`五、落地要过 ${s.gates.length} 道门：${s.gates.join('、')}`);
  console.log(`  → 最关键的是第 ${s.keyGate.no} 道「${s.keyGate.name}」：失败由谁承担，决定改革做不做真的。`);
  console.log('');
  console.log(`六、方案骨架 ${s.plan.length} 项：${s.plan.join('、')}`);
  console.log('  → 「一次只改一件事」最常被违反；伦理三条另计：' + s.ethics.join('、'));
  console.log('');
  console.log(`七、本章共 ${s.sectionCount} 节；边界单列：样本天然小，延迟测有流失，改革效果的时间尺度长于项目周期。`);
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即报错或随之变化；样本与周期为示意，不含可定位的院校与项目。');
  console.log('※ 本输出仅用于教学演示，不构成诊疗或任何院校评估意见。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE,
  read, cnToNum, sections, tables, tableBy, boldLeads, col, grab, codeBlock,
  facts, alternatives, keyGate, planKeys, ethics, summary,
};
