#!/usr/bin/env node
/**
 * 中医健康管理 · 第 4 章 档案的价值不在记得多，在换个人也能接着用
 * 课程: departments/06-guanli/24-zhongyi-jiankang-guanli/chapters/04-j4/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的清单——三个测试、最小数据集五类、结构化三层、生命周期四段、更新触发三类、
 * 合规三个条件、四条最低要求、系统四组功能——全部从正文读出，条数再与文中的中文数字对账。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 4;
const TITLE = '档案的价值不在记得多，在换个人也能接着用';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function hanzi(text) {
  return (String(text || '').match(HANZI) || []).length;
}

function sections(body) {
  const out = [];
  let cur = { title: '', lines: [], hanzi: 0 };
  for (const line of body.split('\n')) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) {
      cur = { title: h[1], lines: [], hanzi: 0 };
      out.push(cur);
      continue;
    }
    cur.lines.push(line);
    cur.hanzi += hanzi(line);
  }
  return out;
}

function sectionText(body, prefix) {
  const s = sections(body).find((x) => x.title.startsWith(prefix));
  if (!s) throw new Error('正文里没有以「' + prefix + '」开头的一节');
  return s.lines.join('\n');
}

function cells(line) {
  return line.split('|').map((c) => c.trim()).filter(Boolean);
}
const isSep = (line) => /^\|[\s|:-]+\|?$/.test(line.trim());

/** 只切顶层分隔符：括号内的顿号不算一项（「事件触发（住院、手术）」是一条）。 */
function splitTop(str, sep = '、') {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of String(str)) {
    if (ch === '（' || ch === '(') depth += 1;
    if (ch === '）' || ch === ')') depth = Math.max(0, depth - 1);
    if (ch === sep && depth === 0) {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.filter(Boolean);
}

/** 第一节：交接、统计、迁移三个测试。 */
function qualityTests(body) {
  return [...sectionText(body, '一、').matchAll(/^\*\*([^*\n]{2,8}测试)。\*\*/gm)].map((m) => m[1].trim());
}

/** 第二节：最小数据集五类（表格首列）。 */
function minDataset(body) {
  return sectionText(body, '二、')
    .split('\n')
    .filter((l) => l.trim().startsWith('|') && !isSep(l))
    .map(cells)
    .slice(1)
    .map((c) => ({ name: c[0], content: c[1], why: c[2] }));
}

/** 第三节：结构化三层。 */
function structLayers(body) {
  return [...sectionText(body, '三、').matchAll(/^\*\*第([一二三])层，([^*\n]+?)。\*\*/gm)].map((m) => ({
    n: m[1],
    what: m[2].trim(),
  }));
}

/** 第四节：生命周期四段。 */
function lifecycle(body) {
  return [...sectionText(body, '四、').matchAll(/^\*\*([^*\n]{2,6})。\*\*/gm)].map((m) => m[1].trim());
}

/** 第四节：更新的三类触发条件。 */
function triggers(body) {
  const m = sectionText(body, '四、').match(/可用的触发条件有三类：([^。]+)。/);
  if (!m) throw new Error('正文里没有「可用的触发条件有三类」这句');
  return splitTop(m[1]);
}

/** 第五节：敏感信息处理的三个条件。 */
function legalBases(body) {
  return [...body.matchAll(/\*\*(最小必要|目的限定|告知同意)\*\*/g)].map((m) => m[1]);
}

/** 第五节：四条最低要求（编号列表）。 */
function minRequirements(body) {
  return [...sectionText(body, '五、').matchAll(/^\d+\.\s*\*\*([^*\n]+?)。\*\*/gm)].map((m) => m[1].trim());
}

/** 第五节：系统四组功能。 */
function systemFunctions(body) {
  const m = sectionText(body, '五、').match(/归为四组：([^。]+)。/);
  if (!m) throw new Error('正文里没有「归为四组：」这句');
  return splitTop(m[1]);
}

function audit(body) {
  const tests = qualityTests(body);
  const dataset = minDataset(body);
  const layers = structLayers(body);
  const cycle = lifecycle(body);
  const trig = triggers(body);
  const legal = legalBases(body);
  const reqs = minRequirements(body);
  const funcs = systemFunctions(body);

  const claims = [
    { label: '三个测试', want: 3, got: tests.length },
    { label: '最小数据集五类', want: 5, got: dataset.length },
    { label: '结构化三层', want: 3, got: layers.length },
    { label: '生命周期四段', want: 4, got: cycle.length },
    { label: '更新触发三类', want: 3, got: trig.length },
    { label: '合规三条件', want: 3, got: legal.length },
    { label: '四条最低要求', want: 4, got: reqs.length },
    { label: '四组功能', want: 4, got: funcs.length },
  ];
  const mismatched = claims.filter((c) => c.want !== c.got).map((c) => c.label);
  return { tests, dataset, layers, cycle, trig, legal, reqs, funcs, claims, mismatched };
}

function main() {
  const body = read();
  const a = audit(body);
  const secs = sections(body).filter((s) => s.title);
  const cites = [...new Set([...body.matchAll(/《([^》\n]+)》/g)].map((m) => m[1]))];
  const drug = a.dataset.find((d) => /药物/.test(d.content));

  console.log(`中医健康管理 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下条数与汉字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${hanzi(body)} 字 · 节 ${secs.length} 节 · 引书 ${cites.length} 部`);
  console.log('');
  console.log(`档案合格与否看 ${a.tests.length} 个测试：${a.tests.join('／')}`);
  console.log(`最小数据集 ${a.dataset.length} 类：${a.dataset.map((d) => d.name).join('／')}`);
  console.log(`  → 最常被漏掉的一栏在「${drug ? drug.name : '—'}」：${drug ? drug.why : ''}`);
  console.log(`结构化 ${a.layers.length} 层：${a.layers.map((l) => `第${l.n}层 ${l.what}`).join('；')}`);
  console.log(`生命周期 ${a.cycle.length} 段：${a.cycle.join(' → ')}`);
  console.log(`更新触发 ${a.trig.length} 类：${a.trig.join('／')}`);
  console.log(`合规条件 ${a.legal.length} 个：${a.legal.join('／')}`);
  console.log(`最低要求 ${a.reqs.length} 条：${a.reqs.join('／')}`);
  console.log(`系统功能 ${a.funcs.length} 组：${a.funcs.join('／')}`);
  console.log('');
  console.log(`条数对账：${a.mismatched.length ? '不一致，须改稿 —— ' + a.mismatched.join('、') : '一致'}`);
  console.log('');
  console.log('→ 判据：档案合格的标准是可被第三方接手——读得懂、聚合得出、搬得走，三者缺一即不合格。');
  console.log('※ 条数与汉字均从本章 docs/zh.md 现算，正文一改即随之变化；本输出仅用于教学演示，不构成诊疗、法律或合规意见。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE, read, hanzi, sections, sectionText,
  qualityTests, minDataset, structLayers, lifecycle, triggers, legalBases, minRequirements, systemFunctions, splitTop, audit,
};
