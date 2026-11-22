#!/usr/bin/env node
/**
 * 中医健康管理 · 第 6 章 食养不看你懂多少，看这套吃法能不能吃满一年
 * 课程: departments/06-guanli/24-zhongyi-jiankang-guanli/chapters/06-j6/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 结构四件事、替换动作五行、替换三要求、药食三档、效果观察项，全部从正文读出；
 * 开头那组负荷现算：14 天 × 三餐 = 42 餐对上 40 余种食材，摊到每餐接近一种新东西，
 * 「丰富」的代价由此可算，不必手打。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 6;
const TITLE = '食养不看你懂多少，看这套吃法能不能吃满一年';
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

/** 表格：首行为表头，返回 {head, rows}。 */
function table(secText) {
  const lines = secText.split('\n').filter((l) => l.trim().startsWith('|') && !isSep(l));
  const head = cells(lines[0]);
  return { head, rows: lines.slice(1).map(cells) };
}

/** 第二节：结构四件事（维度／方向／常见错法）。 */
function structureDims(body) {
  const t = table(sectionText(body, '二、')).rows;
  return t.map((c) => ({ dim: c[0], how: c[1], wrong: c[2] }));
}

/** 第二节：《素问》的比例框架四句。 */
function grainFrame(body) {
  const m = body.match(/五谷为养、五果为助、五畜为益、五菜为充/);
  if (!m) throw new Error('正文里没有「五谷为养…」这四句');
  return m[0].split('、');
}

/** 第三节：替换动作表（状态偏向 → 替换动作）。 */
function replacements(body) {
  const t = table(sectionText(body, '三、')).rows;
  return t.map((c) => ({ state: c[0], action: c[2] }));
}

/** 第三节：替换动作的三条要求。 */
function replaceRules(body) {
  return [...body.matchAll(/\*\*(一次只换一处|替换物必须买得到|替换后口味要过得去)\*\*/g)].map((m) => m[1]);
}

/** 第四节：药食同源的三档。 */
function herbTiers(body) {
  return [...sectionText(body, '四、').matchAll(/^\*\*第([一二三])档，([^*\n]+?)。\*\*/gm)].map((m) => ({
    n: m[1],
    what: m[2].trim(),
  }));
}

/** 第五节：效果观察项（可记录的项）。 */
function observeItems(body) {
  const m = sectionText(body, '五、').match(/可用的是：([^。]+)。/);
  if (!m) throw new Error('正文里没有「可用的是：」这句');
  return splitTop(m[1]);
}

/** 开头负荷现算：天数 × 三餐 对 食材种数。 */
function loadMath(body) {
  const days = Number((body.match(/(\d+)\s*天食谱/) || [])[1]);
  const kinds = Number((body.match(/(\d+)\s*余种食材/) || [])[1]);
  if (!days || !kinds) throw new Error('正文里没有完整的天数与食材种数');
  const meals = days * 3;
  return { days, kinds, meals, perMeal: Number((kinds / meals).toFixed(2)) };
}

function audit(body) {
  const dims = structureDims(body);
  const frame = grainFrame(body);
  const repl = replacements(body);
  const rules = replaceRules(body);
  const tiers = herbTiers(body);
  const observe = observeItems(body);
  const load = loadMath(body);

  const claims = [
    { label: '结构四件事', want: 4, got: dims.length },
    { label: '比例框架四句', want: 4, got: frame.length },
    { label: '替换五行', want: 5, got: repl.length },
    { label: '替换三要求', want: 3, got: rules.length },
    { label: '药食三档', want: 3, got: tiers.length },
    { label: '观察项七项', want: 7, got: observe.length },
  ];
  const mismatched = claims.filter((c) => c.want !== c.got).map((c) => c.label);
  return { dims, frame, repl, rules, tiers, observe, load, claims, mismatched };
}

function main() {
  const body = read();
  const a = audit(body);
  const secs = sections(body).filter((s) => s.title);
  const cites = [...new Set([...body.matchAll(/《([^》\n]+)》/g)].map((m) => m[1]))];

  console.log(`中医健康管理 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下条数、负荷与汉字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${hanzi(body)} 字 · 节 ${secs.length} 节 · 引书 ${cites.length} 部`);
  console.log('');
  console.log(`比例框架：${a.frame.join('／')}（四句讲主次与配比，不是食物清单）`);
  console.log(`结构四件事：${a.dims.map((d) => d.dim).join('／')}`);
  console.log(`  最典型的错法：${a.dims[0].wrong}；只改主食不动烹调方式。`);
  console.log(`替换动作 ${a.repl.length} 行：${a.repl.map((r) => r.state).join('／')}`);
  console.log(`替换三要求：${a.rules.join('／')}`);
  console.log(`药食同源 ${a.tiers.length} 档：${a.tiers.map((t) => `第${t.n}档 ${t.what}`).join('；')}`);
  console.log(`效果观察项 ${a.observe.length} 项：${a.observe.join('／')}`);
  console.log('');
  console.log(`负荷复算：${a.load.days} 天 × 三餐 = ${a.load.meals} 餐，对 ${a.load.kinds} 余种食材，` +
    `平均每餐 ${a.load.perMeal} 种新东西——决策与采购成本几乎每餐一笔。`);
  console.log('');
  console.log(`条数对账：${a.mismatched.length ? '不一致，须改稿 —— ' + a.mismatched.join('、') : '一致'}`);
  console.log('');
  console.log('→ 判据：食养的成败不在食谱写得多丰富，在这套吃法能不能被吃满一年。');
  console.log('※ 条数、负荷与汉字均从本章 docs/zh.md 现算，正文一改即随之变化；本输出仅用于教学演示，不构成诊疗意见，也不构成营养治疗处方。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE, read, hanzi, sections, sectionText, table, splitTop,
  structureDims, grainFrame, replacements, replaceRules, herbTiers, observeItems, loadMath, audit,
};
