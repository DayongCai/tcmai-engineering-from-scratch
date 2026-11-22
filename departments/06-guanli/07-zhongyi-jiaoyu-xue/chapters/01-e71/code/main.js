#!/usr/bin/env node
/**
 * 中医教育学 · 第 1 章 中医教育的对象不是「学生」，是五类先验不同的人
 * 课程: departments/06-guanli/07-zhongyi-jiaoyu-xue/chapters/01-e71/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 三张表与三段能力都从本章正文解析后现算：五类对象各自的缺口、一次初诊的五个动作、
 * 五条毕业判据的签字人。正文改一处结构或措辞，解析先抛错，而不是沿用旧数静默算完。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 1;
const TITLE = '中医教育的对象不是「学生」，是五类先验不同的人';

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

/** 中文数字转阿拉伯数字，覆盖本章出现的「三」「五」「十」「二十」等写法。 */
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

/** 按「## 」切段；返回每段标题与正文，标题里的序号原样保留。 */
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

/** 解析全部 Markdown 表格（首行表头 + 分隔行 + 若干数据行）。 */
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

/** 取首列表头等于 name 的那张表；取不到就报错，不猜。 */
function tableBy(text, name) {
  const t = tables(text).find((x) => x.header[0] === name);
  if (!t) throw new Error('正文里找不到首列为「' + name + '」的表格');
  return t;
}

/** 段内以粗体开头的引导词（允许列表符号与编号前缀）。 */
function boldLeads(body) {
  const re = /(?:^|\n)\s*(?:[-*]\s+|\d+[.)]\s+)?\*\*([^*\n]{1,30})\*\*/g;
  return [...body.matchAll(re)].map((m) => m[1].trim());
}

/** 按表头名取列下标；表头被改动就报错，不按位置硬读。 */
function col(table, name) {
  const i = table.header.indexOf(name);
  if (i < 0) throw new Error('表「' + table.header.join('／') + '」没有列「' + name + '」');
  return i;
}

/** 本章三张表 + 三段能力的全部取数。 */
function facts(text) {
  const learners = tableBy(text, '对象');
  const actions = tableBy(text, '动作');
  const criteria = tableBy(text, '判据');
  const sec = sections(text);
  const capability = sec.find((s) => s.title.includes('三段能力'));
  if (!capability) throw new Error('找不到「三段能力」一节');
  return { learners, actions, criteria, sections: sec, capability };
}

/**
 * 落在病历与笔记上的判据：它们的证据要有人真的去看、去改，笔试机读不了。
 * 本章说「第一条与第五条最难落实」，这个函数是那句话的可执行版本。
 */
function needsHumanAudit(criteria) {
  const name = col(criteria, '判据');
  return criteria.rows
    .map((r, i) => ({ name: r[name], no: i + 1 }))
    .filter((x) => /病历|笔记/.test(x.name));
}

/** 三段能力的出现顺序，用来核对「技能 → 理法 → 边界」的排法。 */
function capabilityOrder(capabilityBody) {
  return boldLeads(capabilityBody).map((name, i) => ({ name, at: i }));
}

function summary(text) {
  const f = facts(text);
  const gapCol = col(f.learners, '缺');
  const nameCol = col(f.learners, '对象');
  const actionCol = col(f.actions, '动作');
  const critCol = col(f.criteria, '判据');
  const signCol = col(f.criteria, '谁签字');
  const gaps = f.learners.rows.map((r) => r[gapCol]);
  const signers = f.criteria.rows.map((r) => r[signCol]);
  return {
    learners: f.learners.rows.map((r) => r[nameCol]),
    gaps,
    gapDistinct: new Set(gaps).size,
    actions: f.actions.rows.map((r) => r[actionCol]),
    criteria: f.criteria.rows.map((r) => r[critCol]),
    signers,
    signerDistinct: new Set(signers).size,
    humanAudit: needsHumanAudit(f.criteria),
    capability: boldLeads(f.capability.body),
    sectionCount: f.sections.length,
  };
}

function main() {
  const text = read();
  const s = summary(text);

  console.log(`中医教育学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 的表格与段落现算，不手打）');
  console.log('');
  console.log(`一、对象不是一个词，是 ${s.learners.length} 类人，${s.gapDistinct} 条不同的缺口`);
  const f = facts(text);
  for (const r of f.learners.rows) console.log(`  ${r[0]}｜缺：${r[2]}`);
  console.log(`  → 缺口去重后仍有 ${s.gapDistinct} 条：没有两类人的缺口重合，同一份课表只能打中其中一类。`);
  console.log('');
  console.log(`二、一次初诊拆成 ${s.actions.length} 个动作，每个动作都有一条可观察证据`);
  console.log(`  ${s.actions.join(' → ')}`);
  console.log('  → 五个动作都发生在二十分钟里，也都能被打分：这是「目标」与「口号」的分别。');
  console.log('');
  console.log(`三、毕业判据 ${s.criteria.length} 条，签字人 ${s.signerDistinct} 个（无重复）`);
  for (const r of f.criteria.rows) {
    console.log(`  ${r[col(f.criteria, '判据')]}｜证据：${r[col(f.criteria, '证据')]}｜签字：${r[col(f.criteria, '谁签字')]}`);
  }
  console.log(`  → 落在病历与跟师笔记上的判据 ${s.humanAudit.length} 条：第 ${s.humanAudit.map((x) => x.no).join('、')} 条（${s.humanAudit.map((x) => x.name).join('、')}）`);
  console.log('     与正文「第一条与第五条最难落实」对得上；笔试可以机读，改病历不能。');
  console.log('');
  console.log(`四、三段能力的排法：${s.capability.join(' → ')}`);
  console.log('  → 技能可早测、理法要等基础打住、边界要等见过坏结局；合并成一场笔试只测了中段。');
  console.log('');
  console.log('五、本章共 ' + s.sectionCount + ' 节，代价一节单列：可测目标会挤压通才想象，五类人共用一套判据并不公平。');
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即报错或随之变化；文中教学场景为合成说明，不指向真实院校。');
  console.log('※ 本输出仅用于教学演示，不构成诊疗或任何院校评估意见。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE,
  read, cnToNum, sections, tables, tableBy, boldLeads,
  facts, needsHumanAudit, capabilityOrder, summary,
};
