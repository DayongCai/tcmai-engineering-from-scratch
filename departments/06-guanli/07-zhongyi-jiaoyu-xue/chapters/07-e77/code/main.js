#!/usr/bin/env node
/**
 * 中医教育学 · 第 7 章 认证保证的是底线，不是水平
 * 课程: departments/06-guanli/07-zhongyi-jiaoyu-xue/chapters/07-e77/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部从本章正文解析后现算：三套标准各自的判定对象、标准化七层的可行度分布、
 * 从大纲滑到题库的步数、认证用坏的方式。
 * 正文一改，解析先抛错，不沿用旧数静默算完。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 7;
const TITLE = '认证保证的是底线，不是水平';

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
    standards: tableBy(text, '标准'),
    layers: tableBy(text, '层次'),
    sections: sec,
    sec1: pick('三套标准'),
    sec2: pick('标准化真正买到'),
    sec3: pick('滑坡'),
    sec4: pick('标准难题'),
    sec5: pick('认证怎么用'),
  };
}

/** 三套标准的判定对象：哪几套管专业、哪一套管人。 */
function targets(standards) {
  const std = col(standards, '标准');
  const obj = col(standards, '判定对象');
  return standards.rows.map((r) => ({ standard: r[std], target: r[obj] }));
}

/** 七层的可行度分布：能／必须／部分／不能。 */
function layerSplit(layers) {
  const name = col(layers, '层次');
  const can = col(layers, '能否标准化');
  const rows = layers.rows.map((r) => ({ layer: r[name], level: r[can] }));
  const counts = rows.reduce((acc, r) => {
    acc[r.level] = (acc[r.level] || 0) + 1;
    return acc;
  }, {});
  return { rows, counts, must: rows.filter((r) => r.level === '必须').map((r) => r.layer) };
}

/** 从大纲滑到题库是第几步，那一步把什么留在了教学视野之外。 */
function slide(text) {
  const steps = numberedItems(sections(text).find((s) => s.title.includes('滑坡')).body);
  if (steps.length !== 5) throw new Error('滑坡步数不是五步: ' + steps.length);
  return { steps, last: steps[steps.length - 1] };
}

function summary(text) {
  const f = facts(text);
  const t = targets(f.standards);
  return {
    standards: t.map((x) => x.standard),
    targets: t,
    targetDistinct: new Set(t.map((x) => x.target)).size,
    professional: t.filter((x) => x.target === '专业').map((x) => x.standard),
    personal: t.filter((x) => x.target === '人').map((x) => x.standard),
    gains: boldLeads(f.sec2.body).map((x) => x.replace(/[。：]$/, '')),
    layers: layerSplit(f.layers),
    slide: slide(text),
    misuse: boldLeads(f.sec5.body).map((x) => x.replace(/[。：]$/, '')),
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
  console.log(`一、${s.standards.length} 套标准，判定对象有 ${s.targetDistinct} 类`);
  for (const x of s.targets) console.log(`  ${x.standard} → 判 ${x.target}`);
  console.log(`  → 管专业的有 ${s.professional.length} 套，管人的 ${s.personal.length} 套；叠加，不互相替代。`);
  console.log('');
  console.log(`二、标准化真正买到 ${s.gains.length} 样：${s.gains.join('、')}`);
  console.log('  → 三样收益共用一个前提：标准必须被真的执行，而不是被引用；只看材料不看现场，都会输给材料工程。');
  console.log('');
  console.log(`三、标准化分层 ${s.layers.rows.length} 层，可行度分布：可 ${s.layers.counts['能'] || 0} / 必须 ${s.layers.counts['必须'] || 0} / 部分 ${s.layers.counts['部分'] || 0} / 不能 ${s.layers.counts['不能'] || 0}`);
  for (const r of s.layers.rows) console.log(`  ${r.layer}：${r.level}`);
  console.log(`  → 必须硬性标准化的只有 ${s.layers.must.length} 层：${s.layers.must.join('、')}——这一层越严越好，个体化不能突破。`);
  console.log('');
  console.log(`四、从大纲滑到题库 ${s.slide.steps.length} 步，最后一步：${s.slide.last}`);
  for (const [i, st] of s.slide.steps.entries()) console.log(`  ${i + 1}. ${st}`);
  console.log('  → 到第五步，医案的曲折、方药的取舍、与病人的对话全部消失，因为它们在题库里没有位置。');
  console.log('');
  console.log(`五、认证的 ${s.misuse.length} 种用坏方式`);
  for (const x of s.misuse) console.log(`  ${x}`);
  console.log('  → 正确用法是体检：定期做，按项查，查出问题就治，治完复查；价值在整改，不在结论。');
  console.log('');
  console.log(`六、本章共 ${s.sectionCount} 节；边界单列：标准是下限不是水平线，标准化会挤压特色，互认不以教育质量为唯一变量。`);
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即报错或随之变化；标准名称与结论档次为一般表述，以主管部门文件为准。');
  console.log('※ 本输出仅用于教学演示，不构成对任何标准条文的解释。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE,
  read, cnToNum, sections, tables, tableBy, boldLeads, col, numberedItems,
  facts, targets, layerSplit, slide, summary,
};
