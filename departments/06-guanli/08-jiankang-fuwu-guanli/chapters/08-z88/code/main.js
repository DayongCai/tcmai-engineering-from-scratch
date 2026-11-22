#!/usr/bin/env node
/**
 * 健康服务管理 · 第 8 章 协同不是开会，是把责任写进同一张流程单
 * 课程: departments/06-guanli/08-jiankang-fuwu-guanli/chapters/08-z88/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 输出全部从本章正文现算：汉字、节、加粗判断、引文；三种机制、两种失败、成功协同三样
 * 东西、应急四段、准备三件事、平战三笔账、演练三条件分别计数并与中文数字对账；卷首
 * 那几个时间点读回正文换算成分钟，看「30 分钟内互通」这个假设差了多少。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 8;
const TITLE = '协同不是开会，是把责任写进同一张流程单';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

const hanzi = (t) => (String(t || '').match(HANZI) || []).length;

function sections(body) {
  const out = [];
  let cur = null;
  for (const line of body.split('\n')) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) {
      cur = { title: h[1], hanzi: 0 };
      out.push(cur);
      continue;
    }
    if (cur) cur.hanzi += hanzi(line);
  }
  return out;
}

function clauseAfter(body, label) {
  const i = body.indexOf(label + '：');
  if (i < 0) throw new Error('正文里没找到「' + label + '：」');
  const rest = body.slice(i + label.length + 1);
  const j = rest.indexOf('。');
  return (j < 0 ? rest : rest.slice(0, j)).trim();
}

/** 只在括号外切分，括号内的顿号保留在条目里。 */
function splitTop(str, seps = /[、，]/) {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of String(str)) {
    if (ch === '（' || ch === '(') depth += 1;
    if (ch === '）' || ch === ')') depth = Math.max(0, depth - 1);
    if (depth === 0 && seps.test(ch)) {
      if (cur.trim()) out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function numbersBy(body, re) {
  const m = body.match(re);
  if (!m) throw new Error('正文里没找到：' + re);
  return m.slice(1).map((x) => Number(String(x).replace(/,/g, '')));
}

/** 正文里的 HH:MM，换算成当天的分钟数。 */
function clockTimes(body) {
  return [...body.matchAll(/(\d{1,2}):(\d{2})/g)].map((m) => Number(m[1]) * 60 + Number(m[2]));
}

function audit(body) {
  const mechanisms = (body.match(/第[一二三]类/g) || []).length;
  const failures = (body.match(/第[一二]种失败/g) || []).length;
  const successPieces = splitTop(clauseAfter(body, '成功的协同，通常同时具备三样东西'));
  const phases = splitTop(clauseAfter(body, '应急管理通常分四段'));
  const readiness = splitTop(clauseAfter(body, '真正的准备要看三件事'));
  const accounts = (body.match(/第[一二三]笔/g) || []).length;
  const drillRules = splitTop(clauseAfter(body, '有效的演练要设三个条件'));

  const counts = {
    mechanisms,
    failures,
    successPieces: successPieces.length,
    phases: phases.length,
    readiness: readiness.length,
    accounts,
    drillRules: drillRules.length,
  };
  const claims = [
    { label: '三种机制', want: 3, got: counts.mechanisms },
    { label: '两种失败', want: 2, got: counts.failures },
    { label: '成功协同三样东西', want: 3, got: counts.successPieces },
    { label: '应急四段', want: 4, got: counts.phases },
    { label: '准备三件事', want: 3, got: counts.readiness },
    { label: '平战三笔账', want: 3, got: counts.accounts },
    { label: '演练三条件', want: 3, got: counts.drillRules },
  ];
  const mismatched = claims.filter((c) => c.want !== c.got).map((c) => c.label);

  const times = clockTimes(body);
  if (times.length < 3) throw new Error('正文里少于三个时间点');
  const [reported, notified, sampled] = times;
  const [students] = numbersBy(body, /已收治\s*(\d+)\s*名学生/);
  const systems = body.includes('三套应急系统') ? 3 : NaN;
  const [assumed] = numbersBy(body, /信息\s*(\d+)\s*分钟内互通/);
  const [drillYears] = numbersBy(body, /实战演练是\s*(\d+)\s*年前/);

  const raw = { reported, notified, sampled, students, systems, assumed, drillYears };
  const derived = {
    notifyGap: notified - reported,
    sampleGap: sampled - reported,
    notifyLate: notified - reported - assumed,
    sampleLate: sampled - reported - assumed,
  };

  return {
    mechanisms, failures, successPieces, phases, readiness, accounts, drillRules,
    counts, claims, mismatched, raw, derived,
  };
}

function fmt(min) {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

function main() {
  const body = read();
  const a = audit(body);
  const secs = sections(body);
  const cites = [...new Set([...body.matchAll(/《([^》\n]+)》/g)].map((x) => x[1]))];

  console.log(`健康服务管理 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${hanzi(body)} 字 · 节 ${secs.length} 节 · 加粗判断 ${(body.match(/\*\*[^*\n]+\*\*/g) || []).length} 处 · 引书 ${cites.length} 部`);
  console.log('');
  console.log('结构清单（条数由正文数出，与句中的中文数字对账）：');
  console.log(`  三种协同机制 ${a.counts.mechanisms} 类 · 两种典型失败 ${a.counts.failures} 种`);
  console.log(`  成功协同三样东西 ${a.counts.successPieces} 样：${a.successPieces.join('；')}`);
  console.log(`  应急四段 ${a.counts.phases} 段：${a.phases.join('／')}`);
  console.log(`  准备三件事 ${a.counts.readiness} 件：${a.readiness.map((x) => x.split('（')[0]).join('／')}`);
  console.log(`  平战三笔账 ${a.counts.accounts} 笔（正文以「第一笔…第三笔」列出）`);
  console.log(`  演练三条件 ${a.counts.drillRules} 条：${a.drillRules.join('／')}`);
  console.log(`  → 对账${a.mismatched.length ? '不一致，须改稿：' + a.mismatched.join('、') : '一致'}`);
  console.log('');
  console.log('卷首时间线复算：');
  const { raw, derived } = a;
  console.log(`  接报 ${fmt(raw.reported)} → 通报卫健 ${fmt(raw.notified)}：${derived.notifyGap} 分钟`);
  console.log(`  接报 ${fmt(raw.reported)} → 现场采样 ${fmt(raw.sampled)}：${derived.sampleGap} 分钟`);
  console.log(`  演练脚本假设「信息 ${raw.assumed} 分钟内互通」→ 通报超时 ${derived.notifyLate} 分钟，采样超时 ${derived.sampleLate} 分钟`);
  console.log(`  ${raw.systems} 套系统、${raw.students} 名学生已收治，接诊信息没有同步到指挥平台；上次实战演练是 ${raw.drillYears} 年前。`);
  console.log('  → 耽误时间的不是救治，是接口。');
  console.log('');
  console.log('逐节字数：');
  for (const s of secs) {
    const share = hanzi(body) ? ((s.hanzi / hanzi(body)) * 100).toFixed(1) : '0.0';
    console.log(`  ${s.title.padEnd(28, '　')} ${String(s.hanzi).padStart(5)} 字（${share}%）`);
  }
  console.log('');
  console.log('→ 判据：流程单解决「做什么」，调度权解决「谁说了算」，数据解决「做到哪了」；三样缺一，协同就退回到开会。');
  console.log('※ 数字均从本章 docs/zh.md 现算，正文一改即随之变化；本输出仅用于教学演示，不构成应急指挥或政策意见，也不构成对任何真实事件的复盘结论。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, hanzi, sections, clauseAfter, splitTop, clockTimes, audit };
