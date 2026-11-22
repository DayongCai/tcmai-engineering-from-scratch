#!/usr/bin/env node
/**
 * 健康服务管理 · 第 4 章 公共卫生的产出，是“没有发生的事”
 * 课程: departments/06-guanli/08-jiankang-fuwu-guanli/chapters/04-z84/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 输出全部从本章正文现算：汉字、节、加粗判断、引文；十二项内容由正文自己数出来并与
 * 「十二」对账；三种产出形态、三个条件、三种失真、分工四件事分别计数；卷首那组考核
 * 分数与居民知晓率读回正文，算出「分数」与「感受」之间的差。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 4;
const TITLE = '公共卫生的产出，是“没有发生的事”';
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

const splitList = (s, re = /[、，]/) =>
  String(s).replace(/以及/g, '、').split(re).map((x) => x.trim()).filter(Boolean);

function numberBy(body, re) {
  const m = body.match(re);
  if (!m) throw new Error('正文里没找到：' + re);
  return Number(m[1].replace(/,/g, ''));
}

/** 十二项基本公共卫生服务内容：正文用「从…，到…，再到…」列举。 */
function services(body) {
  const i = body.indexOf('列了十二项内容，');
  if (i < 0) throw new Error('正文里没找到十二项内容的列举');
  const seg = body.slice(i + '列了十二项内容，'.length, body.indexOf('。', i));
  return seg
    .replace(/^从/, '')
    .replace(/，(到|再到)/g, '、')
    .split('、')
    .map((s) => s.trim())
    .filter(Boolean);
}

function audit(body) {
  const items = services(body);
  const forms = (body.match(/第[一二三]种是/g) || []).length;
  const conditions = (body.match(/第[一二三]，/g) || []).length;
  const distortions = (body.match(/第[一二三]种失真是/g) || []).length;
  const division = splitList(clauseAfter(body, '真正的分工要落到四件事'));
  const money = (body.match(/哪部分钱是/g) || []).length;

  const counts = {
    services: items.length,
    forms,
    conditions,
    distortions,
    division: division.length,
    money,
  };
  const claims = [
    { label: '十二项内容', want: 12, got: counts.services },
    { label: '三种产出形态', want: 3, got: counts.forms },
    { label: '经费闭环三个条件', want: 3, got: counts.conditions },
    { label: '三种失真', want: 3, got: counts.distortions },
    { label: '分工四件事', want: 4, got: counts.division },
    { label: '三笔钱', want: 3, got: counts.money },
  ];
  const mismatched = claims.filter((c) => c.want !== c.got).map((c) => c.label);

  const raw = {
    score: numberBy(body, /考核得了\s*(\d+)\s*分/),
    fileRate: numberBy(body, /建档率\s*([\d.]+)%/),
    htnRate: numberBy(body, /高血压规范管理率\s*([\d.]+)%/),
    elderRate: numberBy(body, /老年人健康管理率\s*([\d.]+)%/),
    reportRate: numberBy(body, /传染病报告及时率\s*([\d.]+)%/),
    awareness: numberBy(body, /知晓率只有\s*([\d.]+)%/),
    control: numberBy(body, /血压控制率\s*([\d.]+)%/),
    reportForms: numberBy(body, /填了\s*(\d+)\s*张报表/),
    activeFind: numberBy(body, /只有\s*([\d.]+)%\s*是基层/),
    systems: numberBy(body, /在\s*(\d+)\s*个系统里各录一遍/),
  };
  const derived = {
    scoreGap: raw.score - raw.awareness,
    passiveFind: 100 - raw.activeFind,
    formsPerMonth: raw.reportForms / 12,
  };

  return { items, forms, conditions, distortions, division, money, counts, claims, mismatched, raw, derived };
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
  console.log(`  十二项内容 ${a.counts.services} 项：`);
  a.items.forEach((s, i) => console.log(`    ${String(i + 1).padStart(2)}. ${s}`));
  console.log(`  三种产出形态 ${a.counts.forms} 种 · 经费闭环三个条件 ${a.counts.conditions} 条 · 三种失真 ${a.counts.distortions} 种`);
  console.log(`  三笔钱 ${a.counts.money} 笔 · 分工四件事 ${a.counts.division} 件：${a.division.join('／')}`);
  console.log(`  → 对账${a.mismatched.length ? '不一致，须改稿：' + a.mismatched.join('、') : '一致'}`);
  console.log('');
  console.log('卷首数字复算：');
  const { raw, derived } = a;
  console.log(`  考核 ${raw.score} 分 ／ 居民知晓率 ${raw.awareness}% → 差 ${derived.scoreGap} 个百分点`);
  console.log(`  建档 ${raw.fileRate}% · 高血压规范管理 ${raw.htnRate}% · 老年管理 ${raw.elderRate}% · 报告及时 ${raw.reportRate}%`);
  console.log(`  在管高血压控制率 ${raw.control}% ，低于建档率 ${(raw.fileRate - raw.control).toFixed(0)} 个百分点`);
  console.log(`  全年 ${raw.reportForms} 张报表 ≈ 每月 ${derived.formsPerMonth.toFixed(2)} 张；同一数据在 ${raw.systems} 个系统各录一遍`);
  console.log(`  肺结核主动发现 ${raw.activeFind}% → 其余 ${derived.passiveFind}% 是病人自己因症状就诊`);
  console.log('  → 分数买的是台账，不是「没有发生的事」。');
  console.log('');
  console.log('逐节字数：');
  for (const s of secs) {
    const share = hanzi(body) ? ((s.hanzi / hanzi(body)) * 100).toFixed(1) : '0.0';
    console.log(`  ${s.title.padEnd(26, '　')} ${String(s.hanzi).padStart(5)} 字（${share}%）`);
  }
  console.log('');
  console.log('→ 判据：项目化让经费与责任可核算，也会把不可计数的预防工作挤到边缘；保留一部分不挂项目的常规监测与应急准备经费，是必要的制度余量。');
  console.log('※ 数字均从本章 docs/zh.md 现算，正文一改即随之变化；本输出仅用于教学演示，不构成政策解读意见，也不构成对具体机构的评价。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, hanzi, sections, clauseAfter, splitList, services, audit };
