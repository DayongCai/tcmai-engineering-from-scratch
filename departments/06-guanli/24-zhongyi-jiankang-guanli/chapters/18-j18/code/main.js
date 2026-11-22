#!/usr/bin/env node
/**
 * 中医健康管理 · 第 18 章 平台的价值不在功能多，在换个人接手时口径不变
 * 课程: departments/06-guanli/24-zhongyi-jiankang-guanli/chapters/18-j18/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 三样统一项、两层结构、三类数据、门禁三条、教学三件事、双交付物、能力评价三陷阱，
 * 全部从正文读出；开头的一致率现算：三套体系两两比对共三组，61% 一致意味着 39% 不一致，
 * 这个数字决定了「同一系统里多套口径」的实际代价。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 18;
const TITLE = '平台的价值不在功能多，在换个人接手时口径不变';
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

/** 第一节：术语、单位与量纲、分层规则。 */
function unifyItems(body) {
  return [...sectionText(body, '一、').matchAll(/^\*\*(术语|单位与量纲|分层规则)。\*\*/gm)].map((m) => m[1]);
}

/** 第二节：单元层与注释层。 */
function layers(body) {
  return [...body.matchAll(/\*\*(单元层|注释层)\*\*/g)].map((m) => m[1]);
}

/** 第三节：三类数据。 */
function dataKinds(body) {
  return [...sectionText(body, '三、').matchAll(/^\*\*(服务数据|学习与教学数据|内容与知识数据)。\*\*/gm)].map((m) => m[1]);
}

/** 第三节：门禁三条。 */
function gateRules(body) {
  return [...sectionText(body, '三、').matchAll(/\*\*(最小必要|目的限定|留痕可溯)\*\*/g)].map((m) => m[1]);
}

/** 第四节：教学场景里智能辅助能做的三件事。 */
function teachUses(body) {
  return [...sectionText(body, '四、').matchAll(/\*\*(给反馈|做陪练|做检索)\*\*/g)].map((m) => m[1]);
}

/** 第五节：双交付物。 */
function deliverables(body) {
  return [...sectionText(body, '五、').matchAll(/\*\*(一份能跑的|一份能说清的)。?\*\*/g)].map((m) => m[1]);
}

/** 第五节：能力评价的三个陷阱。 */
function evalTraps(body) {
  return [...sectionText(body, '五、').matchAll(/^\*\*(用完成度代替能力|用单次成绩代替稳定表现|用排名代替标准)。\*\*/gm)].map((m) => m[1]);
}

/** 开头一致率现算：三套体系两两比对。 */
function consistencyMath(body) {
  const teamChar = (body.match(/([一二三四五])个团队/) || [])[1];
  const teams = teamChar ? { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5 }[teamChar] : 0;
  const agree = Number((body.match(/归类一致率约\s*(\d+)%/) || [])[1]);
  if (!teams || !agree) throw new Error('正文里没有完整的团队数与一致率');
  return {
    teams,
    agree,
    disagree: 100 - agree,
    pairs: (teams * (teams - 1)) / 2,
  };
}

function audit(body) {
  const unify = unifyItems(body);
  const ls = layers(body);
  const kinds = dataKinds(body);
  const gates = gateRules(body);
  const teach = teachUses(body);
  const deliv = deliverables(body);
  const traps = evalTraps(body);
  const math = consistencyMath(body);

  const claims = [
    { label: '三样统一项', want: 3, got: unify.length },
    { label: '两层结构', want: 2, got: ls.length },
    { label: '三类数据', want: 3, got: kinds.length },
    { label: '门禁三条', want: 3, got: gates.length },
    { label: '教学三件事', want: 3, got: teach.length },
    { label: '双交付物', want: 2, got: deliv.length },
    { label: '评价三陷阱', want: 3, got: traps.length },
  ];
  const mismatched = claims.filter((c) => c.want !== c.got).map((c) => c.label);
  return { unify, ls, kinds, gates, teach, deliv, traps, math, claims, mismatched };
}

function main() {
  const body = read();
  const a = audit(body);
  const secs = sections(body).filter((s) => s.title);
  const cites = [...new Set([...body.matchAll(/《([^》\n]+)》/g)].map((m) => m[1]))];

  console.log(`中医健康管理 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下条数、一致率与汉字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${hanzi(body)} 字 · 节 ${secs.length} 节 · 引书 ${cites.length} 部`);
  console.log('');
  console.log(`先统一三样：${a.unify.join('／')}`);
  console.log(`内容两层：${a.ls.join('／')}（原话与解释分开放，每句都能回到出处）`);
  console.log(`数据三类：${a.kinds.join('／')}`);
  console.log(`门禁三条：${a.gates.join('／')}`);
  console.log(`教学场景智能辅助三用：${a.teach.join('／')}（错了可重来，后果不落在真人身上）`);
  console.log(`双交付物：${a.deliv.join('＋')}`);
  console.log(`能力评价三陷阱：${a.traps.join('／')}`);
  console.log('');
  const m = a.math;
  console.log(`口径复算：${m.teams} 套标签体系，两两比对共 ${m.pairs} 组；` +
    `一致率 ${m.agree}%，即 ${m.disagree}% 的归类在不同体系里不是同一个结论。`);
  console.log(`  一致率不过关时，最危险的输出不是统计偏差，是两份相反的转介判断。`);
  console.log('');
  console.log(`条数对账：${a.mismatched.length ? '不一致，须改稿 —— ' + a.mismatched.join('、') : '一致'}`);
  console.log('');
  console.log('→ 判据：平台的价值不在功能多，在换个人接手时口径不变；先统一词，再谈模块。');
  console.log('※ 条数、一致率与汉字均从本章 docs/zh.md 现算，正文一改即随之变化；本输出仅用于教学演示，不构成技术方案或诊疗意见。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE, read, hanzi, sections, sectionText,
  unifyItems, layers, dataKinds, gateRules, teachUses, deliverables, evalTraps, consistencyMath, audit,
};
