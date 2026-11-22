#!/usr/bin/env node
/**
 * 中医教育学 · 第 6 章 师承给的是手感，院校给的是边界，谁也替代不了谁
 * 课程: departments/06-guanli/07-zhongyi-jiaoyu-xue/chapters/06-e76/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部从本章正文解析后现算：两条轨的对照维度、跟诊三级台阶与各自的动作、
 * 抄方记录的字段数、师承失败模式、院校能补的几件事。
 * 正文一改，解析先抛错，不沿用旧数静默算完。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 6;
const TITLE = '师承给的是手感，院校给的是边界，谁也替代不了谁';

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

/** 取正文里的第一段围栏代码块。 */
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
    tracks: tableBy(text, '维度'),
    sections: sec,
    sec1: pick('两条轨'),
    sec2: pick('跟诊的三级'),
    sec3: pick('抄方'),
    sec4: pick('失败模式'),
    sec5: pick('院校能补'),
  };
}

/** 跟诊三级：一级侍诊（看）、二级抄方（写）、三级接诊（做）。只认行首的粗体台阶名。 */
function ladder(text) {
  const re = /^\*\*([一二三])级：([^（]+)（([^）]+)）/gm;
  const out = [...text.matchAll(re)].map((m) => ({ no: cnToNum(m[1]), stage: m[2].trim(), act: m[3].trim() }));
  if (out.length !== 3) throw new Error('跟诊三级没有取全: ' + out.length);
  return out;
}

/** 两种失败形态的互补性：院校「见过没碰过」、师承「碰过没读透」。 */
function failureShape(tracks) {
  const row = tracks.rows.find((r) => r[0] === '失败形态');
  if (!row) throw new Error('对照表里没有「失败形态」一行');
  return { college: row[1], master: row[2] };
}

function summary(text) {
  const f = facts(text);
  const shape = failureShape(f.tracks);
  const fields = codeBlock(f.sec3.body).lines;
  return {
    dims: f.tracks.rows.map((r) => r[0]),
    shape,
    complementary: /见过没碰过/.test(shape.college) && /碰过没读透/.test(shape.master),
    ladder: ladder(text),
    fields,
    keyFields: fields.filter((l) => /预判|差异/.test(l)),
    failures: boldLeads(f.sec4.body).map((x) => x.replace(/[。：]$/, '')),
    fourth: /还有第四种失败/.test(f.sec4.body),
    schoolJobs: boldLeads(f.sec5.body).map((x) => x.replace(/[。：]$/, '')),
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
  console.log(`一、两条轨 ${s.dims.length} 个维度对照：${s.dims.join('、')}`);
  f.tracks.rows.forEach((r) => console.log(`  ${r[0]}｜院校：${r[1]}｜师承：${r[2]}`));
  console.log(`  → 失败形态互补：${s.shape.college} / ${s.shape.master}`);
  console.log('  → 所以最佳关系是接续，不是竞争；制度上缺的是接口。');
  console.log('');
  console.log(`二、跟诊 ${s.ladder.length} 级：${s.ladder.map((x) => x.stage + '（' + x.act + '）').join(' → ')}`);
  console.log('  → 每级都有退出判据：复述 → 一致率 → 病历修改处数逐轮下降；准入写死，是在保护病人。');
  console.log('');
  console.log(`三、抄方记录 ${s.fields.length} 个字段，其中 ${s.keyFields.length} 行把「看」变成「比」`);
  for (const x of s.keyFields) console.log(`  ${x}`);
  console.log('  → 没有预判，学生只是在记录；有了预判，每次跟诊都是一次被批改的作业。');
  console.log('');
  console.log(`四、师承失败 ${s.failures.length} 种${s.fourth ? ' + 1 种制度性失败' : ''}`);
  console.log(`  ${s.failures.join('、')}`);
  console.log('  → 三者共同点：不是学得不够，是结构缺一角——缺理、缺手、缺边界；第四种缺的是「能独立」的证据。');
  console.log('');
  console.log(`五、院校能补 ${s.schoolJobs.length} 件事`);
  for (const x of s.schoolJobs) console.log(`  ${x}`);
  console.log('  → 共同前提：任务要小、要能交、要被看；人数超过十人，教学就退化成观摩。');
  console.log('');
  console.log(`六、本章共 ${s.sectionCount} 节；边界单列：师承不可规模化，院校不可个体化，出师不等于能独立开业。`);
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即报错或随之变化；年限与组规模为一般口径，以现行规定为准。');
  console.log('※ 本输出仅用于教学演示，不构成诊疗或任何院校评估意见。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE,
  read, cnToNum, sections, tables, tableBy, boldLeads, col, codeBlock,
  facts, ladder, failureShape, summary,
};
