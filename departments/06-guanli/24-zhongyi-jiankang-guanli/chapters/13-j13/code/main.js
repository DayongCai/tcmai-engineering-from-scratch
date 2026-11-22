#!/usr/bin/env node
/**
 * 中医健康管理 · 第 13 章 服务质量不是管出来的态度，是被制度固定的下限
 * 课程: departments/06-guanli/24-zhongyi-jiankang-guanli/chapters/13-j13/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 三个对象、授权表四列、制度三检验、真正成立的制度、上报三做法、不良事件六类、
 * 收费三模式、留人三处，全部从正文读出；开头的抽考结果现算：22 人里 9 人答对，
 * 换算成比例，并与「十一天独立接待」的结构放在一起看。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 13;
const TITLE = '服务质量不是管出来的态度，是被制度固定的下限';
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

/** 第一节：人、制度、证据三个对象。 */
function objects(body) {
  return [...sectionText(body, '一、').matchAll(/^\*\*(人|制度|证据)。\*\*/gm)].map((m) => m[1]);
}

/** 第二节：授权表四列（加粗列名）。 */
function authColumns(body) {
  return [...sectionText(body, '二、').matchAll(/\*\*(岗位|可独立完成的事项|须在他人指导下完成的事项|不得从事的事项)\*\*/g)].map((m) => m[1]);
}

/** 第三节：制度三检验。 */
function systemTests(body) {
  return [...sectionText(body, '三、').matchAll(/^\*\*(有触发条件|有明确动作|有例外出口)。\*\*/gm)].map((m) => m[1]);
}

/** 第三节：真正成立的制度清单。 */
function realSystems(body) {
  const m = sectionText(body, '三、').match(/真正成立的制度只有五到八条：([^。]+)。/);
  if (!m) throw new Error('正文里没有「真正成立的制度只有五到八条」这句');
  return splitTop(m[1]);
}

/** 第四节：上报的三条做法。 */
function reportRules(body) {
  return [...sectionText(body, '四、').matchAll(/^\*\*(区分「报告」与「追责」|只追究可预防的系统原因|把改进结果反馈回去)。\*\*/gm)].map((m) => m[1]);
}

/** 第四节：不良事件范围。 */
function incidentScope(body) {
  const m = sectionText(body, '四、').match(/应当纳入的至少包括：([^。]+)。/);
  if (!m) throw new Error('正文里没有「应当纳入的至少包括：」这句');
  return splitTop(m[1]);
}

/** 第五节：三种收费模式的成本形态。 */
function payModels(body) {
  return [...sectionText(body, '五、').matchAll(/\*\*(按次收费|按年收费|项目购买)\*\*/g)].map((m) => m[1]);
}

/** 第五节：留人的三处杠杆。 */
function retention(body) {
  const m = sectionText(body, '五、').match(/在三个具体的地方：([^。]+)。/);
  if (!m) throw new Error('正文里没有「在三个具体的地方：」这句');
  return splitTop(m[1]).map((x) => x.replace(/^以及/, '').split('（')[0].trim());
}

/** 开头抽考结果现算。 */
function auditMath(body) {
  const staff = Number((body.match(/共\s*(\d+)\s*人/) || [])[1]);
  const pass = Number((body.match(/必须停止并转介」的员工是\s*(\d+)\s*人/) || [])[1]);
  const records = Number((body.match(/三项关键记录的，是\s*(\d+)\s*人/) || [])[1]);
  const pages = Number((body.match(/六十页/) ? 60 : 0));
  const turnover = Number((body.match(/流动率约六成/) ? 60 : 0));
  const days = Number((body.match(/平均到岗十一天后/) ? 11 : 0));
  if (!staff || !pass || !records || !pages || !turnover || !days) throw new Error('正文里没有完整的抽考数字');
  return {
    staff, pass, records, pages, turnover, days,
    passPct: Number(((pass / staff) * 100).toFixed(1)),
    recordPct: Number(((records / staff) * 100).toFixed(1)),
  };
}

function audit(body) {
  const objs = objects(body);
  const cols = authColumns(body);
  const tests = systemTests(body);
  const real = realSystems(body);
  const reports = reportRules(body);
  const incidents = incidentScope(body);
  const models = payModels(body);
  const keep = retention(body);
  const math = auditMath(body);

  const claims = [
    { label: '三个对象', want: 3, got: objs.length },
    { label: '授权表四列', want: 4, got: cols.length },
    { label: '制度三检验', want: 3, got: tests.length },
    { label: '制度六条', want: 6, got: real.length },
    { label: '上报三做法', want: 3, got: reports.length },
    { label: '不良事件六类', want: 6, got: incidents.length },
    { label: '收费三模式', want: 3, got: models.length },
    { label: '留人三处', want: 3, got: keep.length },
  ];
  const mismatched = claims.filter((c) => c.want !== c.got).map((c) => c.label);
  return { objs, cols, tests, real, reports, incidents, models, keep, math, claims, mismatched };
}

function main() {
  const body = read();
  const a = audit(body);
  const secs = sections(body).filter((s) => s.title);
  const cites = [...new Set([...body.matchAll(/《([^》\n]+)》/g)].map((m) => m[1]))];

  console.log(`中医健康管理 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下条数、比例与汉字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${hanzi(body)} 字 · 节 ${secs.length} 节 · 引书 ${cites.length} 部`);
  console.log('');
  console.log(`服务管理三个对象：${a.objs.join('／')}（人不清则制度难执行，制度不清则记录无从谈起）`);
  console.log(`授权表四列：${a.cols.join('／')}`);
  console.log(`  核心是第四列：${a.cols[3]}——没有它，边界只剩「没做过」。`);
  console.log(`制度三检验：${a.tests.join('／')}`);
  console.log(`真正成立的制度 ${a.real.length} 条：${a.real.join('；')}`);
  console.log(`上报三做法：${a.reports.join('／')}`);
  console.log(`不良事件 ${a.incidents.length} 类：${a.incidents.join('；')}`);
  console.log(`收费三模式：${a.models.join('／')}`);
  console.log(`留人三处：${a.keep.join('／')}`);
  console.log('');
  const m = a.math;
  console.log(`抽考复算：${m.staff} 人中 ${m.pass} 人答得出转介条件（${m.passPct}%），` +
    `${m.records} 人说得清三项关键记录（${m.recordPct}%）；` +
    `背景是 ${m.pages} 页手册、流动率约 ${m.turnover}%、新人 ${m.days} 天独立接待。`);
  console.log(`  手册靠记忆，制度靠触发条件：下限只能由后者固定。`);
  console.log('');
  console.log(`条数对账：${a.mismatched.length ? '不一致，须改稿 —— ' + a.mismatched.join('、') : '一致'}`);
  console.log('');
  console.log('→ 判据：质量不是管出来的态度，是被制度固定的下限；先写清「什么情况下必须停」。');
  console.log('※ 条数、比例与汉字均从本章 docs/zh.md 现算，正文一改即随之变化；本输出仅用于教学演示，不构成管理咨询意见或合规认证依据。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE, read, hanzi, sections, sectionText, splitTop,
  objects, authColumns, systemTests, realSystems, reportRules, incidentScope, payModels, retention, auditMath, audit,
};
