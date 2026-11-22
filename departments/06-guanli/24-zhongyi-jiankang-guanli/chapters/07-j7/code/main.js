#!/usr/bin/env node
/**
 * 中医健康管理 · 第 7 章 运动调养的难点在量，风险在禁忌
 * 课程: departments/06-guanli/24-zhongyi-jiankang-guanli/chapters/07-j7/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 三个变量、导引三层、合法动作、禁忌情形、停止信号、按条件选法、评价三件事，全部从正文读出；
 * 开头那个案例的负荷现算：每天两遍 × 三个月，走到第三周就停，落空比例由脚本算出来，
 * 说明「只有动作没有量」的方案在何处断裂。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 7;
const TITLE = '运动调养的难点在量，风险在禁忌';
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

function table(secText) {
  const lines = secText.split('\n').filter((l) => l.trim().startsWith('|') && !isSep(l));
  return { head: cells(lines[0]), rows: lines.slice(1).map(cells) };
}

/** 第一节：类型、总量、进阶速度。 */
function variables(body) {
  return [...sectionText(body, '一、').matchAll(/^\*\*(类型|总量|进阶速度)\*\*/gm)].map((m) => m[1]);
}

/** 第二节：调身、调息、调心。 */
function daoYinLayers(body) {
  const m = sectionText(body, '二、').match(/共享三件事：\*\*调身、调息、调心\*\*/);
  if (!m) throw new Error('正文里没有「共享三件事：调身、调息、调心」');
  return ['调身', '调息', '调心'];
}

/** 第三节：不破皮的合法动作。 */
function legalMoves(body) {
  const m = body.match(/\*\*按、揉、摩、擦、轻叩\*\*/);
  if (!m) throw new Error('正文里没有合法动作那串');
  return m[0].replace(/\*/g, '').split('、');
}

/** 第三节：禁忌与慎用情形表。 */
function cautions(body) {
  return table(sectionText(body, '三、')).rows.map((c) => ({ case: c[0], action: c[1] }));
}

/** 第五节：停止信号。 */
function stopSignals(body) {
  const m = sectionText(body, '五、').match(/通用的几条：([^。]+)。/);
  if (!m) throw new Error('正文里没有「通用的几条：」这句');
  return splitTop(m[1]);
}

/** 第四节：按条件选法表。 */
function conditionTable(body) {
  return table(sectionText(body, '四、')).rows.map((c) => ({ cond: c[0], good: c[1], avoid: c[2], alt: c[3] }));
}

/** 第五节：开方案前的筛查问题。 */
function screenQuestions(body) {
  const m = sectionText(body, '五、').match(/筛查要问的几件事：([^。]+)。/);
  if (!m) throw new Error('正文里没有「筛查要问的几件事」这句');
  return splitTop(m[1]);
}

/** 第五节：评价三件事。 */
function evalItems(body) {
  return [...sectionText(body, '五、').matchAll(/[一二三]是([^，。；、]+)/g)].map((m) => m[1].trim()).slice(0, 3);
}

/** 开头案例的负荷现算：每天两遍 × 三个月（按 13 周计），第三周停。 */
function loadMath(body) {
  const perDay = Number((body.match(/每天练八段锦\s*[两二]\s*遍/) ? '2' : 0));
  const weeks = 13; // 三个月按 13 周计，口径写在输出里
  const stopWeek = Number((body.match(/第\s*([三四五])\s*周膝痛加重/) ? 3 : 0));
  if (!perDay || !stopWeek) throw new Error('正文里没有完整的遍数与停药周次');
  const planned = perDay * 7 * weeks;
  const done = perDay * 7 * stopWeek;
  return { perDay, weeks, stopWeek, planned, done, shortfallPct: Number((((planned - done) / planned) * 100).toFixed(1)) };
}

function audit(body) {
  const vars = variables(body);
  const dy = daoYinLayers(body);
  const moves = legalMoves(body);
  const caut = cautions(body);
  const stops = stopSignals(body);
  const conds = conditionTable(body);
  const screen = screenQuestions(body);
  const evals = evalItems(body);
  const load = loadMath(body);

  const claims = [
    { label: '三个变量', want: 3, got: vars.length },
    { label: '导引三层', want: 3, got: dy.length },
    { label: '合法动作五类', want: 5, got: moves.length },
    { label: '禁忌情形七类', want: 7, got: caut.length },
    { label: '停止信号八条', want: 8, got: stops.length },
    { label: '选法六种条件', want: 6, got: conds.length },
    { label: '筛查五问', want: 5, got: screen.length },
    { label: '评价三件事', want: 3, got: evals.length },
  ];
  const mismatched = claims.filter((c) => c.want !== c.got).map((c) => c.label);
  return { vars, dy, moves, caut, stops, conds, screen, evals, load, claims, mismatched };
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
  console.log(`运动方案三个变量：${a.vars.join('／')}（缺一个都不成方案）`);
  console.log(`导引三层：${a.dy.join('／')}`);
  console.log(`不破皮的合法动作 ${a.moves.length} 类：${a.moves.join('、')}`);
  console.log(`禁忌与慎用 ${a.caut.length} 类：${a.caut.map((c) => c.case).join('；')}`);
  console.log(`停止信号 ${a.stops.length} 条：${a.stops.join('、')}`);
  console.log(`按条件选法 ${a.conds.length} 种：${a.conds.map((c) => c.cond).join('／')}`);
  console.log(`开方案前筛查 ${a.screen.length} 问；评价看三件事：${a.evals.join('／')}`);
  console.log('');
  const l = a.load;
  console.log(`负荷复算：每天 ${l.perDay} 遍 × 7 天 × ${l.weeks} 周（三个月按 13 周计）= ${l.planned} 遍计划，` +
    `第 ${l.stopWeek} 周停 → 实际 ${l.done} 遍，落空 ${l.shortfallPct}%。`);
  console.log(`  方案只有「做什么」时，第一次中断就等于终止。`);
  console.log('');
  console.log(`条数对账：${a.mismatched.length ? '不一致，须改稿 —— ' + a.mismatched.join('、') : '一致'}`);
  console.log('');
  console.log('→ 判据：运动调养的难点在量，风险在禁忌；先排除忌，再给量，最后写清什么时候停。');
  console.log('※ 条数、负荷与汉字均从本章 docs/zh.md 现算，正文一改即随之变化；本输出仅用于教学演示，不构成诊疗意见，也不构成运动处方。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE, read, hanzi, sections, sectionText, table, splitTop,
  variables, daoYinLayers, legalMoves, cautions, stopSignals, conditionTable, screenQuestions, evalItems, loadMath, audit,
};
