#!/usr/bin/env node
/**
 * 管理心理学 · 第 12 章 冲突不需要消灭，需要定价
 * 课程: departments/06-guanli/18-guanli-xinli-xue/chapters/12-p12/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章三笔账，脚本各算一次：
 *   1. 冲突的显性成本：27 次 × 2.5 小时 × 2 人 = 67.5 管理小时，换 4 小时产能缺口；
 *   2. 干预时点的成本倍数（庞迪五段）：越靠前越便宜；
 *   3. 谈判的议题包：找出「我方成本低、对方价值高」的项，算整合式谈判的空间。
 * 另附托马斯—基尔曼五方式的两维判定与适用条件。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 12;
const TITLE = '冲突不需要消灭，需要定价';
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

function tables(text) {
  const lines = String(text || '').split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!/^\s*\|/.test(lines[i]) || !/^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] || '')) continue;
    const cells = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((s) => s.trim());
    const header = cells(lines[i]);
    const rows = [];
    let j = i + 2;
    while (j < lines.length && /^\s*\|/.test(lines[j])) {
      rows.push(cells(lines[j]));
      j += 1;
    }
    out.push({ header, rows });
    i = j - 1;
  }
  return out;
}

/** 五方式：正文表格「方式／适用条件／代价」 */
function styles(text) {
  const t = tables(text).find((x) => x.header[0] === '方式') || { rows: [] };
  return t.rows.map((r) => ({ mode: r[0], when: r[1], cost: r[2] }));
}

/** 冲突的显性成本：次数 × 每次小时（正文的 2.5 小时已含两级管理者） */
function conflictCost({ events, hoursEach, people = 1, capacityGap }) {
  const hours = events * hoursEach * people;
  return {
    events,
    hours: Number(hours.toFixed(1)),
    capacityGap,
    // 每换回 1 小时产能，要付出多少小时管理时间
    perGapHour: Number((hours / capacityGap).toFixed(2)),
    verdict: '成本主要在往返协调与上交裁决，不在冲突本身',
  };
}

/** 托马斯—基尔曼两维判定 */
function orientation(assertive, cooperative) {
  const hi = (v) => v >= 0.6;
  const lo = (v) => v <= 0.4;
  let mode = '妥协';
  if (hi(assertive) && lo(cooperative)) mode = '竞争';
  else if (hi(assertive) && hi(cooperative)) mode = '协作';
  else if (lo(assertive) && lo(cooperative)) mode = '回避';
  else if (lo(assertive) && hi(cooperative)) mode = '迁就';
  return { assertive, cooperative, mode };
}

/** 庞迪五段：成本倍数按干预难度递增（1、2、4、8、16） */
const PONDY = ['潜在', '知觉', '感受', '显现', '后果'];

function interventionCost(stage) {
  const i = PONDY.indexOf(stage);
  if (i < 0) return null;
  const note = i === 0
    ? '改一条规则就够'
    : i === 1
      ? '点明分歧就能谈，成本还低'
      : i === 2
        ? '需要第三方在场、需要给双方台阶'
        : i === 3
          ? '只剩裁决与分离，裁决必有一方记账'
          : '结构已改：只能复盘与赔偿';
  return { stage, index: i + 1, multiplier: Math.pow(2, i), note };
}

/**
 * 整合式谈判：把议题拆成项，标注「我方成本」「对方价值」，取差值最大的组合。
 * 差值 = 对方价值 − 我方成本；正值越大，越值得拿去交换。
 */
function issuePackage(items) {
  const scored = items
    .map((x) => ({ ...x, spread: Number((x.theirValue - x.ourCost).toFixed(2)) }))
    .sort((a, b) => b.spread - a.spread);
  return {
    items: scored,
    tradeable: scored.filter((x) => x.spread > 0),
    totalGain: Number(scored.filter((x) => x.spread > 0).reduce((s, x) => s + x.spread, 0).toFixed(2)),
  };
}

const MEDIATION = ['双方都有继续合作的预期', '调解人不持有裁决权', '程序被双方认可'];

function mediation(has) {
  const missing = MEDIATION.filter((m) => !has.includes(m));
  return { ok: missing.length === 0, missing, verdict: missing.length ? '退化成走流程：缺 ' + missing.join('、') : '三条齐，可进入调解' };
}

function concepts(text) {
  const t = String(text || '');
  return {
    styles: styles(t),
    pondy: PONDY.filter((p) => t.includes(p)),
    hasBATNA: t.includes('BATNA'),
    hasCommitment: t.includes('承诺升级'),
    hasProcedural: t.includes('程序公正'),
  };
}

function main() {
  const text = read();
  const c = concepts(text);
  const hanzi = (text.match(HANZI) || []).length;
  const cost = conflictCost({ events: 27, hoursEach: 2.5, capacityGap: 4 });
  const pk = issuePackage([
    { item: '周几固定', ourCost: 1, theirValue: 5 },
    { item: '总时长补在别的日子', ourCost: 2, theirValue: 4 },
    { item: '设备维护时段由我方承担', ourCost: 4, theirValue: 1 },
  ]);

  console.log(`管理心理学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${hanzi} 字 · 节 ${sections(text).length} 节 · 表格 ${tables(text).length} 张`);
  console.log(`五种处理方式 ${c.styles.length}/5：${c.styles.map((s) => s.mode).join(' · ')}`);
  for (const s of c.styles) console.log(`  ${s.mode}｜适用：${s.when}｜代价：${s.cost}`);
  console.log('');
  console.log(`冲突成本：${cost.events} 次 × 2.5 小时（已含两级管理者）= ${cost.hours} 管理小时，换 ${cost.capacityGap} 小时产能`);
  console.log(`  → 每换回 1 小时产能，付出 ${cost.perGapHour} 小时管理时间；${cost.verdict}。`);
  console.log('');
  console.log('干预时点（庞迪五段）：');
  for (const s of PONDY) {
    const i = interventionCost(s);
    console.log(`  ${s}（第 ${i.index} 段，成本倍数 ${i.multiplier}）：${i.note}`);
  }
  console.log('');
  console.log('谈判议题包（整合式）：');
  for (const x of pk.items) console.log(`  ${x.item}：我方成本 ${x.ourCost}／对方价值 ${x.theirValue} → 差值 ${x.spread}`);
  console.log(`  可交换项 ${pk.tradeable.length} 项，合计空间 ${pk.totalGain} → 核心诉求可能根本不重叠，却在争同一个格子。`);
  console.log('');
  console.log(`调解三条件：${mediation(MEDIATION).verdict}`);
  console.log(`两维判定示例：高坚持 + 低合作 → ${orientation(0.9, 0.2).mode}；低坚持 + 低合作 → ${orientation(0.2, 0.2).mode}`);
  console.log('');
  console.log('边界：本章的时段、次数与工时均为演算设定；不构成法律或人事意见。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, sections, tables, styles, conflictCost, orientation, interventionCost, issuePackage, mediation, concepts, PONDY, MEDIATION };
