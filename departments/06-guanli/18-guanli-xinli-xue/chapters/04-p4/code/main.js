#!/usr/bin/env node
/**
 * 管理心理学 · 第 4 章 选人不是挑最好的，是挑最不容易在这个岗位上失败的
 * 课程: departments/06-guanli/18-guanli-xinli-xue/chapters/04-p4/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的核心是一个数字：人格测验对绩效的相关约 0.2。这个数字不能靠背，
 * 本脚本把它算开：
 *   1. r² 只解释 4% 的变异；
 *   2. 在二元正态假设下，测验过中位数的人里，绩效也过中位数的比例
 *      为 1/2 + asin(r)/π —— r=0.2 时约 56%，比掷硬币好一点点；
 *   3. 人岗匹配两端的错配（负担过重／能力过剩）用需求量与能力量比较得出。
 * 结论由此可算：足以改善群体排序，远不足以对个人下判决。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 4;
const TITLE = '选人不是挑最好的，是挑最不容易在这个岗位上失败的';
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

const BIG_FIVE = ['开放性', '尽责性', '外向性', '宜人性', '神经质'];
const GATES = ['信度', '效度', '常模'];
const PRINCIPLES = ['参照原则', '区间原则', '综合原则'];
const PLACEMENTS = ['配置', '筛选', '评价'];
const PLACEMENT_WEIGHT = { 配置: 3, 筛选: 2, 评价: 1 };

function concepts(text) {
  const t = String(text || '');
  return {
    bigFive: BIG_FIVE.filter((x) => t.includes(x)),
    gates: GATES.filter((x) => t.includes(x)),
    principles: PRINCIPLES.filter((x) => t.includes(x)),
    placements: PLACEMENTS.filter((x) => t.includes(x)),
    hasFit: t.includes('能力—岗位匹配') || t.includes('人岗匹配'),
  };
}

/** r → 解释的变异比例 */
function explained(r) {
  return { r, r2: Number((r * r).toFixed(4)), pct: Number((r * r * 100).toFixed(2)) };
}

/**
 * 二元正态下：预测过中位数者，效标也过中位数的条件概率。
 * P(两者都过中位) = 1/4 + asin(r)/(2π)；除以 1/2 得条件概率 = 1/2 + asin(r)/π。
 */
function conditionalHit(r) {
  const p = 0.5 + Math.asin(r) / Math.PI;
  return { r, joint: Number((0.25 + Math.asin(r) / (2 * Math.PI)).toFixed(4)), hit: Number(p.toFixed(4)) };
}

/** 人岗匹配：需求与能力的比较，三种形态 */
function fitForm(demand, capacity) {
  const gap = Number((capacity - demand).toFixed(4));
  const form = gap < -0.15 ? '负担过重' : gap > 0.3 ? '能力过剩' : '适配';
  return { demand, capacity, gap, form };
}

/** 三个落点：按可靠性排序，不是并列 */
function placementOrder() {
  return PLACEMENTS.slice().sort((a, b) => PLACEMENT_WEIGHT[b] - PLACEMENT_WEIGHT[a]);
}

/** 选人顺序：先岗位分析，再定要求，最后选工具；颠倒则工具越精密偏得越远 */
const SEQUENCE = ['岗位分析', '能力与特质要求', '选工具'];

function main() {
  const text = read();
  const c = concepts(text);
  const hanzi = (text.match(HANZI) || []).length;

  console.log(`管理心理学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${hanzi} 字 · 节 ${sections(text).length} 节`);
  console.log(`大五 ${c.bigFive.length}/5：${c.bigFive.join(' · ')}`);
  console.log(`技术关口 ${c.gates.length}/3：${c.gates.join(' · ')}｜解释原则 ${c.principles.length}/3：${c.principles.join(' · ')}`);
  console.log(`差异落点顺序：${placementOrder().join(' ＞ ')}`);
  console.log('');
  console.log('0.2 的相关到底有多大：');
  for (const r of [0.1, 0.2, 0.3]) {
    const e = explained(r);
    const h = conditionalHit(r);
    console.log(`  r=${r}：解释 ${e.pct}% 的变异；测验过中位者中绩效也过中位的占 ${(h.hit * 100).toFixed(1)}%（掷硬币 50.0%）`);
  }
  console.log('  → 群体排序上稳定地赢一点点；对单个人，赢的那 6 个百分点撑不起一句「他不适合」。');
  console.log('');
  console.log('人岗匹配的三种形态（需求 1.0 为基准）：');
  for (const s of [fitForm(1, 0.7), fitForm(1, 1.05), fitForm(0.5, 1.0)]) {
    console.log(`  需求 ${s.demand}／能力 ${s.capacity} → ${s.form}（差 ${s.gap}）`);
  }
  console.log('');
  console.log(`选人顺序：${SEQUENCE.join(' → ')}；顺序颠倒，工具越精密，偏得越远。`);
  console.log('');
  console.log('边界：本章的招聘人数、淘汰比例与离职率均为演算设定；测评不得用于与岗位无关的筛选，也不构成人事决策意见。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, sections, concepts, explained, conditionalHit, fitForm, placementOrder, SEQUENCE, BIG_FIVE, GATES, PRINCIPLES };
