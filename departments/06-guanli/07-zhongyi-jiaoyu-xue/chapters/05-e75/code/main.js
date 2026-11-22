#!/usr/bin/env node
/**
 * 中医教育学 · 第 5 章 考什么就学什么：选择题考不出会看病的人
 * 课程: departments/06-guanli/07-zhongyi-jiaoyu-xue/chapters/05-e75/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部从本章正文解析后现算：四种考核形式的成本分档、病例题的四条判据、
 * OSCE 可标准化与不可标准化各几项、质量闭环五环最常断在哪一环。
 * 正文一改，解析先抛错，不沿用旧数静默算完。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 5;
const TITLE = '考什么就学什么：选择题考不出会看病的人';

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

/** 表头名允许带括号注释，按前缀匹配。 */
function col(table, name) {
  const i = table.header.findIndex((h) => h === name || h.startsWith(name));
  if (i < 0) throw new Error('表「' + table.header.join('／') + '」没有列「' + name + '」');
  return i;
}

function grab(text, re, label) {
  const m = text.match(re);
  if (!m) throw new Error('正文里找不到「' + label + '」，章节是否已被改写？');
  return m;
}

function bulletLines(body) {
  return body.split('\n').filter((l) => /^\s*-\s+/.test(l)).map((l) => l.replace(/^\s*-\s+/, '').trim());
}

/** 只取顶格的编号条目；代码块里的「1)」有缩进，不算正文条目。 */
function numberedItems(body) {
  return body.split('\n').filter((l) => /^\d+[.)]\s+/.test(l)).map((l) => l.replace(/^\d+[.)]\s+/, '').trim());
}

function facts(text) {
  const sec = sections(text);
  const pick = (kw) => {
    const s = sec.find((x) => x.title.includes(kw));
    if (!s) throw new Error('找不到「' + kw + '」一节');
    return s;
  };
  return {
    forms: tableBy(text, '形式'),
    rings: tableBy(text, '环节'),
    sections: sec,
    sec1: pick('三种考核'),
    sec2: pick('病例题'),
    sec3: pick('标准化病人'),
    sec4: pick('形成性评价'),
    sec5: pick('质量保障'),
  };
}

/** 四种考核形式的单人次成本分档：低／中／高，各几种。 */
function costTiers(forms) {
  const c = col(forms, '单人次成本');
  const name = col(forms, '形式');
  const rows = forms.rows.map((r) => {
    const m = r[c].match(/^(低|中|高)/);
    if (!m) throw new Error('成本分档解析失败: ' + r[c]);
    return { form: r[name], tier: m[1], machine: /机读/.test(r[c]) };
  });
  const counts = rows.reduce((acc, r) => {
    acc[r.tier] = (acc[r.tier] || 0) + 1;
    return acc;
  }, {});
  return { rows, counts, machineReadable: rows.filter((r) => r.machine).map((r) => r.form) };
}

/** 五环闭环最常断在哪一环，以及那一环在表里叫什么。 */
function brokenRing(text, rings) {
  const m = grab(text, /最常断的是第([一二三四五])环/, '最常断的一环');
  const no = cnToNum(m[1]);
  return { no, name: rings.rows[no - 1][col(rings, '环节')] };
}

/** 不能标准化的部分：脉象、舌象的细微差别、手法的「得气」感。 */
function nonStandardizable(text) {
  const m = grab(text, /不能标准化的部分\*\*：([^。]+)。/, '不能标准化的部分');
  return m[1].split('、').map((s) => s.trim());
}

function summary(text) {
  const f = facts(text);
  const rings = f.rings;
  return {
    forms: f.forms.rows.map((r) => r[col(f.forms, '形式')]),
    costs: costTiers(f.forms),
    caseRules: boldLeads(f.sec2.body).map((x) => x.replace(/[。：]$/, '')),
    standardizable: bulletLines(f.sec3.body).length,
    nonStandard: nonStandardizable(text),
    feedbackRules: numberedItems(f.sec4.body).length,
    rings: rings.rows.map((r) => r[col(rings, '环节')]),
    ringEvidenceMissing: rings.rows.filter((r) => !r[col(rings, '证据')] || !r[col(rings, '责任')]).length,
    broken: brokenRing(text, rings),
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
  console.log(`一、${s.forms.length} 种考核形式，成本分档：高 ${s.costs.counts['高'] || 0} / 中 ${s.costs.counts['中'] || 0} / 低 ${s.costs.counts['低'] || 0}`);
  f.forms.rows.forEach((r) => {
    console.log(`  ${r[col(f.forms, '形式')]}｜能测：${r[col(f.forms, '能测')]}｜成本：${r[col(f.forms, '单人次成本')]}`);
  });
  console.log(`  → 唯一可机读的是：${s.costs.machineReadable.join('、')}；最便宜的那一档有 ${s.costs.counts['低'] || 0} 种，学校自然选它。`);
  console.log('');
  console.log(`二、病例题 ${s.caseRules.length} 条判据`);
  for (const x of s.caseRules) console.log(`  ${x}`);
  console.log('  → 给阴性、给干扰、要处置、评分点分级：缺一条，题目就退化成关键词匹配。');
  console.log('');
  console.log(`三、OSCE 的边界：可标准化 ${s.standardizable} 项 / 不可标准化 ${s.nonStandard.length} 项`);
  console.log(`  不可标准化：${s.nonStandard.join('、')}`);
  console.log('  → 站考结构与安全，床边考手感与判断；把 OSCE 当全部，会培养出流程完美但辨不出证的人。');
  console.log('');
  console.log(`四、形成性评价的硬要求 ${s.feedbackRules} 条：具体到行为、一次两三条、给出下次目标`);
  console.log('  → 观察—评分—反馈的短循环，一次十五到二十分钟，用真实门诊病人即可。');
  console.log('');
  console.log(`五、质量闭环 ${s.rings.length} 环，每环都有证据与责任人（缺项 ${s.ringEvidenceMissing} 处）`);
  console.log(`  ${s.rings.join(' → ')}`);
  console.log(`  → 最常断的是第 ${s.broken.no} 环「${s.broken.name}」：考核结果出来，成绩录进系统，试卷归档，没有人把它变成下一轮的修改。`);
  console.log('');
  console.log(`六、本章共 ${s.sectionCount} 节；边界单列：考核真实性提高必然提高成本，评分表会诱导表演，分数与能力只弱相关。`);
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即报错或随之变化；成本与时长均为示意，以本校制度为准。');
  console.log('※ 本输出仅用于教学演示，不构成诊疗或任何院校评估意见。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE,
  read, cnToNum, sections, tables, tableBy, boldLeads, col, grab,
  bulletLines, numberedItems, facts, costTiers, brokenRing, nonStandardizable, summary,
};
