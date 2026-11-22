#!/usr/bin/env node
/**
 * 医院信息化与病案 · 第 3 章 电子病历与临床信息系统：写得快不等于写得对，签了名才算写完
 * 课程: departments/06-guanli/11-yiyuan-xinxihua-bingan/chapters/03-z113/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 参数从本章正文的时限表与病例段读：入院记录与首次病程各几小时、抢救补记几小时、同意书几栏。
 * 复算：两条记录的时间差（首次病程 08:50 早于入院记录 09:20 = 时间戳不自洽）。
 * 正文任何一格改动，本脚本都会报出偏差——手打的结论会在改版后静默过期。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 3;
const TITLE = '电子病历与临床信息系统：写得快不等于写得对，签了名才算写完';

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function parseTables(body) {
  const out = [];
  let cur = null;
  for (const line of body.split('\n')) {
    const m = line.match(/^\s*\|(.+)\|\s*$/);
    if (!m) { cur = null; continue; }
    const cells = m[1].split('|').map((c) => c.trim());
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;
    if (!cur) { cur = { header: cells, rows: [] }; out.push(cur); } else { cur.rows.push(cells); }
  }
  return out;
}

const one = (re, body, name) => {
  const m = body.match(re);
  if (!m) throw new Error('正文里没找到' + name);
  return m[1];
};

/** 取某一节的正文（到下一个二级标题为止）。 */
function section(body, head) {
  const i = body.indexOf(head);
  if (i < 0) throw new Error('正文里没找到小节: ' + head);
  const rest = body.slice(i + head.length);
  const j = rest.indexOf('\n## ');
  return j < 0 ? rest : rest.slice(0, j);
}

/** 时限表：记录 / 时限 / 起算点 / 书写人。 */
function timeLimits(tables) {
  const t = tables.find((x) => x.header.includes('时限') && x.header.includes('书写人'));
  if (!t) throw new Error('正文里没找到时限表');
  const pick = (name) => {
    const row = t.rows.find((r) => r[0] === name);
    if (!row) throw new Error('时限表里没有: ' + name);
    return Number(String(row[1]).match(/(\d+)/)[1]);
  };
  return {
    rows: t.rows.length,
    names: t.rows.map((r) => r[0]),
    admission: pick('入院记录'),
    firstCourse: pick('首次病程记录'),
    surgery: pick('手术记录'),
  };
}

function params(body, tables) {
  const tl = timeLimits(tables);
  const stamp = body.match(/入院记录落款时间 (\d{2}):(\d{2})，而首次病程记录写于同日 (\d{2}):(\d{2})/);
  if (!stamp) throw new Error('正文里没找到时间戳病例');
  const consent = section(body, '## 四、知情同意书');
  const consentItems = consent.split('\n').filter((l) => /^\d+\.\s/.test(l.trim())).length;
  return {
    tl,
    admitClock: `${stamp[1]}:${stamp[2]}`,
    firstClock: `${stamp[3]}:${stamp[4]}`,
    admitMin: Number(stamp[1]) * 60 + Number(stamp[2]),
    firstMin: Number(stamp[3]) * 60 + Number(stamp[4]),
    rescueHours: Number(one(/允许在抢救结束后 (\d+) 小时内据实补记/, body, '补记时限')),
    pages: Number(one(/(\d+) 页的住院病历/, body, '病历页数')),
    requiredFields: Number(one(/给他的是 (\d+) 个必填项/, body, '必填项数')),
    templateLines: Number(one(/(\d+) 个自动带入的模板句/, body, '模板句数')),
    beds: Number(one(/医师，当天管 (\d+) 张床/, body, '管床数')),
    consentItems,
  };
}

/** 结构清点：签名三层、病程四问、病程三件套。 */
function structure(body) {
  const signLayers = ['资格', '修改', '代签']
    .filter((k) => new RegExp('\\*\\*' + k + '\\*\\*').test(body)).length;
  const courseQs = ['症状变了吗', '体征变了吗', '检查结果怎么解读', '方案为什么改']
    .filter((k) => body.includes(k)).length;
  const triad = ['变化', '依据', '决策'].filter((k) => body.includes(`「${k}、`) || body.includes(`、${k}」`)).length;
  return { signLayers, courseQs, triad };
}

/** 复算：两条记录的时间差，判定是否自洽。 */
function compute(p) {
  const diff = p.admitMin - p.firstMin; // 首次病程比入院记录早多少分钟
  return {
    diff,
    contradiction: diff > 0,
    firstWithinLimit: p.tl.firstCourse <= p.tl.admission,
  };
}

/** 正文与复算必须对得上：任一处对不上就抛错，不许两份数并存。 */
function verify(c, s, p, body) {
  const must = [
    [p.admitClock, '入院记录落款'],
    [p.firstClock, '首次病程落款'],
    ['6 小时', '补记时限'],
    ['五栏加一栏', '同意书栏数'],
  ];
  const miss = must.filter(([str]) => !body.includes(str)).map(([, k]) => k);
  if (miss.length) throw new Error('正文与复算不一致，缺: ' + miss.join('、'));
  if (!c.contradiction) throw new Error('时间戳矛盾未被算出: ' + c.diff);
  if (!c.firstWithinLimit) throw new Error('时限表关系异常');
  if (p.tl.rows !== 14) throw new Error('时限表行数异常: ' + p.tl.rows);
  if (p.rescueHours !== 6) throw new Error('补记时限异常: ' + p.rescueHours);
  if (p.consentItems !== 6) throw new Error('同意书栏数异常: ' + p.consentItems);
  if (s.signLayers !== 3) throw new Error('签名层次数异常: ' + s.signLayers);
  if (s.courseQs !== 4) throw new Error('病程四问数异常: ' + s.courseQs);
}

function main() {
  const body = read();
  const s = structure(body);
  const p = params(body, parseTables(body));
  const c = compute(p);
  verify(c, s, p, body);

  console.log(`医院信息化与病案 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下判据均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`时限表 ${p.tl.rows} 条：入院记录 ${p.tl.admission} 小时 · 首次病程 ${p.tl.firstCourse} 小时 · 手术记录 ${p.tl.surgery} 小时 · 抢救补记 ${p.rescueHours} 小时`);
  console.log(`病例时间戳：首次病程 ${p.firstClock} vs 入院记录 ${p.admitClock} → 前者早 ${c.diff} 分钟，不自洽（${c.contradiction ? '矛盾' : '正常'}）`);
  console.log(`同意书 ${p.consentItems} 栏（五栏加一栏）；签名 ${s.signLayers} 层；病程四问 ${s.courseQs} 条`);
  console.log(`病历 ${p.pages} 页 / 必填项 ${p.requiredFields} 个 / 模板句 ${p.templateLines} 个 / 管 ${p.beds} 张床`);
  console.log('');
  console.log('※ 时限只保证单条合规，证明力还要求时间戳自洽、签名可归、修改留痕。');
  console.log('※ 本输出仅用于教学演示，不构成病历书写规范解释或法律意见。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, parseTables, params, structure, compute, verify, section };
