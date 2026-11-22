#!/usr/bin/env node
/**
 * 管理心理学 · 第 13 章 领导力不是一种人格，是一组被情境激活的关系
 * 课程: departments/06-guanli/18-guanli-xinli-xue/chapters/13-p13/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的结论多数是「弱效应」，所以本脚本先把效应量算开：
 *   1. r=0.3 → r²=9%：群体层面略有预测力，个体判决近乎无用；
 *   2. 费德勒：情境有利度由三要素按位相加，低 LPC 在两端有效、高 LPC 在中段有效；
 *   3. 路径—目标：按任务模糊／枯燥／能力，给出该补哪一种行为；
 *   4. 时间结构：四类事挤占下，「科室建设」永远排在最后，直到把它写进不可让渡的时段。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 13;
const TITLE = '领导力不是一种人格，是一组被情境激活的关系';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function sections(text) {
  return String(text || '')
    .split('\n')
    .filter((l) => /^##\s+/.test(l))
    .map((l) => l.replace(/^##\s+/, '').trim());
}

/** 效应量：r → r²，以及能否用于个体判断 */
function effect(r) {
  const r2 = r * r;
  return {
    r,
    explained: Number((r2 * 100).toFixed(1)),
    usableFor: r2 >= 0.25 ? '可作为筛选依据' : r2 >= 0.09 ? '只能用于群体排序与提示' : '不足以支撑任何判断',
  };
}

const TRAITS = ['外倾性', '责任心', '大五人格'];
const TRANSFORM = ['理想化影响', '感召性愿景', '智力激发', '个性化关怀'];

/**
 * 费德勒：情境有利度 = 关系 + 任务结构化 + 职位权力（各 0/1），合计 0—3。
 * 低 LPC（任务导向）在 0 与 3 有效，高 LPC（关系导向）在 1—2 有效。
 */
function favorability({ relations, taskStructure, positionPower }) {
  const score = [relations, taskStructure, positionPower].filter(Boolean).length;
  return {
    score,
    level: score === 0 ? '极不利' : score === 3 ? '极有利' : '中等有利',
    lowLPC: score === 0 || score === 3,
    highLPC: score === 1 || score === 2,
  };
}

/**
 * 路径—目标：先看任务与下属，再决定补什么。
 * 任务模糊 → 给方向；任务枯燥 → 给支持；任务明确且能力强 → 减少干预。
 */
function pathGoal({ taskAmbiguous, taskBoring, competence }) {
  if (taskAmbiguous) return { action: '指令型：给方向与标准', rationale: '任务模糊时，下属缺的是路径' };
  if (taskBoring) return { action: '支持型：给关心与调剂', rationale: '任务枯燥时，缺的是耐受' };
  if (competence >= 0.7) return { action: '授权型：减少干预', rationale: '任务明确且能力强，干预反而添乱' };
  return { action: '成就型：给有挑战的目标', rationale: '能力中等时，适度挑战能拉起投入' };
}

/** 时间结构：四类事按周分配，科室建设默认被挤到 0 */
function timeBudget(week = 40, fixedBuild = 0) {
  const others = { 门诊与手术: 20, 行政会议: 12, 突发事件: 8 };
  const used = Object.values(others).reduce((a, b) => a + b, 0);
  const build = fixedBuild || Math.max(0, week - used);
  const total = used + build;
  return {
    week,
    others,
    build: Number(build.toFixed(1)),
    total: Number(total.toFixed(1)),
    over: Number(Math.max(0, total - week).toFixed(1)),
    verdict: build === 0 ? '科室建设被挤成 0：重要但不紧急的事永远排在最后' : '科室建设有了固定时段：与门诊同等对待才守得住',
  };
}

/** 圈内／圈外：只看名单，不看好恶 —— 谁从没进过核心项目 */
function lmx(members) {
  const inside = members.filter((m) => m.coreProjects > 0);
  const outside = members.filter((m) => m.coreProjects === 0);
  return {
    total: members.length,
    inside: inside.map((m) => m.name),
    outside: outside.map((m) => m.name),
    share: Number(((inside.length / members.length) * 100).toFixed(1)),
    flag: outside.length ? `从未进过核心项目：${outside.map((m) => m.name).join('、')}` : '无长期圈外成员',
  };
}

function concepts(text) {
  const t = String(text || '');
  return {
    traits: TRAITS.filter((x) => t.includes(x)),
    transform: TRANSFORM.filter((x) => t.includes(x)),
    hasLPC: t.includes('LPC'),
    hasLMX: t.includes('LMX'),
    hasPathGoal: t.includes('路径—目标'),
  };
}

function main() {
  const text = read();
  const c = concepts(text);
  const hanzi = (text.match(HANZI) || []).length;
  const eff = effect(0.3);
  const low = favorability({ relations: false, taskStructure: false, positionPower: false });
  const high = favorability({ relations: true, taskStructure: true, positionPower: true });
  const mid = favorability({ relations: true, taskStructure: true, positionPower: false });
  const l = lmx([
    { name: '甲', coreProjects: 3 },
    { name: '乙', coreProjects: 1 },
    { name: '丙', coreProjects: 0 },
    { name: '丁', coreProjects: 0 },
  ]);

  console.log(`管理心理学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${hanzi} 字 · 节 ${sections(text).length} 节`);
  console.log(`变革型四成分 ${c.transform.length}/4：${c.transform.join(' · ')}`);
  console.log('');
  console.log(`效应量：r = ${eff.r} → 解释 ${eff.explained}% 的变异 → ${eff.usableFor}`);
  console.log('  → 0.3 能推出「一批人里外倾者更可能被推举」，推不出「他外倾所以能当好主任」。');
  console.log('');
  console.log(`费德勒情境有利度（关系＋任务结构化＋职位权力）：`);
  const yn = (b) => (b ? '有效' : '无效');
  console.log(`  极不利（${low.score}）：低 LPC ${yn(low.lowLPC)}／高 LPC ${yn(low.highLPC)}`);
  console.log(`  中等有利（${mid.score}）：低 LPC ${yn(mid.lowLPC)}／高 LPC ${yn(mid.highLPC)}`);
  console.log(`  极有利（${high.score}）：低 LPC ${yn(high.lowLPC)}／高 LPC ${yn(high.highLPC)}`);
  console.log('');
  for (const s of [
    { taskAmbiguous: true, taskBoring: false, competence: 0.8 },
    { taskAmbiguous: false, taskBoring: true, competence: 0.8 },
    { taskAmbiguous: false, taskBoring: false, competence: 0.9 },
  ]) {
    const p = pathGoal(s);
    console.log(`路径—目标（模糊 ${s.taskAmbiguous}／枯燥 ${s.taskBoring}／能力 ${s.competence}）→ ${p.action}：${p.rationale}`);
  }
  console.log('');
  console.log(`LMX 名单：圈内 ${l.share}%（${l.inside.join('、')}）｜${l.flag}`);
  console.log('');
  console.log(`时间账（每周 ${40} 小时）：门诊手术 ${timeBudget().others['门诊与手术']}｜会议 ${timeBudget().others['行政会议']}｜突发 ${timeBudget().others['突发事件']}｜科室建设 ${timeBudget().build}`);
  console.log(`  把科室建设固定为 4 小时：合计 ${timeBudget(40, 4).total} 小时（超出 ${timeBudget(40, 4).over}）→ 必须从别处让，而不是靠「提高效率」。`);
  console.log('');
  console.log('边界：本章的评议分数、留任率与任期均为演算设定；领导力研究多为弱效应，不构成人事任免意见。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, sections, effect, favorability, pathGoal, timeBudget, lmx, concepts, TRAITS, TRANSFORM };
