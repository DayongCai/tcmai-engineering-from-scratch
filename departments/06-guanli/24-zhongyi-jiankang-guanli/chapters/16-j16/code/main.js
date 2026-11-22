#!/usr/bin/env node
/**
 * 中医健康管理 · 第 16 章 设备测的是信号，管理要的是判断，中间那一步没有自动化
 * 课程: departments/06-guanli/24-zhongyi-jiankang-guanli/chapters/16-j16/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数据链四段、能说与不能说、智能三角色、四种算法风险、数字鸿沟三形态、引入技术四问，
 * 全部从正文读出；开头的佩戴率、预警条数与跟进比现算：跟进 300/12000 是不是文中的 2.5%，
 * 由脚本对账，不手打。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 16;
const TITLE = '设备测的是信号，管理要的是判断，中间那一步没有自动化';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

/** 中文数词：一万二千 → 12000，三百 → 300。 */
function cnToNum(w) {
  const D = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  const U = { 十: 10, 百: 100, 千: 1000 };
  let total = 0;
  let cur = 0;
  const str = String(w).replace(/余/g, '');
  const wan = str.indexOf('万');
  const head = wan >= 0 ? str.slice(0, wan) : str;
  for (const ch of head) {
    if (D[ch] !== undefined) cur = D[ch];
    else if (U[ch]) { total += (cur || 1) * U[ch]; cur = 0; }
  }
  total += cur;
  return wan >= 0 ? total * 10000 + cnToNum(str.slice(wan + 1) || '0') : total;
}

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

/** 第一节：采集、传输、解释、动作。 */
function chain(body) {
  return [...sectionText(body, '一、').matchAll(/^\*\*(采集|传输|解释|动作)。\*\*/gm)].map((m) => m[1]);
}

/** 第二节：能说的两件事。 */
function canSay(body) {
  return [...sectionText(body, '二、').matchAll(/^\*\*能说：([^*\n]+?)。\*\*/gm)].map((m) => m[1].trim());
}

/** 第二节：不能说的三件事。 */
function cannotSay(body) {
  return [...sectionText(body, '二、').matchAll(/^\*\*不能说：([^*\n]+?)。\*\*/gm)].map((m) => m[1].trim());
}

/** 第三节：智能应用的三种角色。 */
function roles(body) {
  return [...sectionText(body, '三、').matchAll(/^\*\*(提示|筛查|替代)。\*\*/gm)].map((m) => m[1]);
}

/** 第四节：四种算法与数据风险。 */
function risks(body) {
  return [...sectionText(body, '四、').matchAll(/^\*\*(标注偏差|分布漂移|过度诊断|黑箱与不可申诉)。\*\*/gm)].map((m) => m[1]);
}

/** 第五节：数字鸿沟三种形态。 */
function gaps(body) {
  return [...sectionText(body, '五、').matchAll(/^\*\*(接入鸿沟|使用鸿沟|收益鸿沟)。\*\*/gm)].map((m) => m[1]);
}

/** 第五节：引入技术前的四个问题。 */
function techQuestions(body) {
  return [...sectionText(body, '五、').matchAll(/\*\*(它替代了谁的什么动作？|谁来处理它的输出？|它错了会怎样？|它对最弱的那批人友好吗？)\*\*/g)].map((m) => m[1]);
}

/** 开头三个数字现算：佩戴人数、跟进比例是否等于文中值。 */
function deviceMath(body) {
  const enrolled = Number((body.match(/为\s*(\d+)\s*名签约对象/) || [])[1]);
  const wearing = Number((body.match(/仍在佩戴的约\s*(\d+)%/) || [])[1]);
  const alerts = cnToNum((body.match(/预警([一二三四五六七八九十百千万]+)余条/) || [])[1]);
  const followed = cnToNum((body.match(/实际跟进的约([一二三四五六七八九十百]+)条/) || [])[1]);
  const claimed = Number((body.match(/占\s*([\d.]+)%/) || [])[1]);
  if (!enrolled || !wearing || !alerts || !followed || !claimed) throw new Error('正文里没有完整的设备数字');
  return {
    enrolled, wearing, alerts, followed, claimed,
    wearers: Math.round((enrolled * wearing) / 100),
    followedPct: Number(((followed / alerts) * 100).toFixed(1)),
    match: Number(((followed / alerts) * 100).toFixed(1)) === claimed,
  };
}

function audit(body) {
  const ch = chain(body);
  const yes = canSay(body);
  const no = cannotSay(body);
  const rl = roles(body);
  const rk = risks(body);
  const gp = gaps(body);
  const tq = techQuestions(body);
  const math = deviceMath(body);

  const claims = [
    { label: '数据链四段', want: 4, got: ch.length },
    { label: '能说两条', want: 2, got: yes.length },
    { label: '不能说三条', want: 3, got: no.length },
    { label: '智能三角色', want: 3, got: rl.length },
    { label: '风险四种', want: 4, got: rk.length },
    { label: '鸿沟三形态', want: 3, got: gp.length },
    { label: '引入四问', want: 4, got: tq.length },
  ];
  const mismatched = claims.filter((c) => c.want !== c.got).map((c) => c.label);
  return { ch, yes, no, rl, rk, gp, tq, math, claims, mismatched };
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
  console.log(`数据链四段：${a.ch.join(' → ')}（误差在第三段放大）`);
  console.log(`监测能说：${a.yes.join('／')}`);
  console.log(`不能说：${a.no.join('／')}`);
  console.log(`智能三角色：${a.rl.join('／')}（系统可提醒人，不可代替人）`);
  console.log(`四种风险：${a.rk.join('／')}`);
  console.log(`数字鸿沟：${a.gp.join('／')}`);
  console.log(`引入技术四问：`);
  a.tq.forEach((q, i) => console.log(`  ${i + 1}. ${q}`));
  console.log('');
  const m = a.math;
  console.log(`设备复算：${m.enrolled} 名签约对象，佩戴率 ${m.wearing}% 即约 ${m.wearers} 人；` +
    `预警 ${m.alerts} 条、跟进约 ${m.followed} 条，算得 ${m.followedPct}%（文中 ${m.claimed}%，${m.match ? '对得上' : '不一致'}）。`);
  console.log(`  注意力是稀缺资源：预警条数与单条价值成反比。`);
  console.log('');
  console.log(`条数对账：${a.mismatched.length ? '不一致，须改稿 —— ' + a.mismatched.join('、') : '一致'}`);
  console.log('');
  console.log('→ 判据：设备给的是数值，顾问给的是含义与动作；中间那一步没有自动化，只能靠流程与人。');
  console.log('※ 条数、比例与汉字均从本章 docs/zh.md 现算，正文一改即随之变化；本输出仅用于教学演示，不构成技术选型建议或诊疗意见。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE, read, hanzi, sections, sectionText,
  cnToNum, chain, canSay, cannotSay, roles, risks, gaps, techQuestions, deviceMath, audit,
};
