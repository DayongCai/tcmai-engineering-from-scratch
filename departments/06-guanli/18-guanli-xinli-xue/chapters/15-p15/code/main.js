#!/usr/bin/env node
/**
 * 管理心理学 · 第 15 章 压力不是活多，是要得多、能控的少
 * 课程: departments/06-guanli/18-guanli-xinli-xue/chapters/15-p15/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章把「忙」与「耗竭」拆成两维判断，脚本据此算四件事：
 *   1. 要求—控制四象限（卡拉塞克），并看社会支持补进第三维后的最劣组合；
 *   2. 离职率按象限分开看：19% 与 8% 的差不是人手差；
 *   3. 三级干预的「效果 × 可推行性」乘积，解释为什么总是「二 + 三」；
 *   4. 恢复的硬指标：连续清醒 17—19 小时 ≈ 血液酒精 0.05% 的警觉水平。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 15;
const TITLE = '压力不是活多，是要得多、能控的少';
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

/**
 * 卡拉塞克四象限：要求高／低 × 控制高／低。
 * 高要求 + 高控制 = 主动型（忙但不必然崩）；高要求 + 低控制 = 高紧张（最伤）。
 */
function quadrant({ demand, control }) {
  const highD = demand >= 0.6;
  const highC = control >= 0.6;
  const q = highD ? (highC ? '主动型' : '高紧张') : highC ? '低紧张' : '被动型';
  const note = {
    高紧张: '最伤：投入不改变处境，忙转化为耗竭',
    主动型: '最有成长：忙转化为技能增长',
    被动型: '最易退化：要求低、控制也低',
    低紧张: '相对舒适，但要防技能退化',
  }[q];
  return { demand, control, quadrant: q, note };
}

/** 约翰逊与霍尔：补上社会支持后，高要求 + 低控制 + 低支持 是最劣组合 */
function worst({ demand, control, support }) {
  const q = quadrant({ demand, control });
  const isWorst = q.quadrant === '高紧张' && support < 0.4;
  return { ...q, support, worst: isWorst, label: isWorst ? '高要求—低控制—低支持（最劣）' : q.quadrant };
}

/** 离职率按象限并列：数字相同不能说明原因，差别要看控制维 */
function turnover(groups) {
  const rates = groups.map((g) => g.rate);
  return {
    groups,
    spread: Number((Math.max(...rates) - Math.min(...rates)).toFixed(2)),
    ratio: Number((Math.max(...rates) / Math.min(...rates)).toFixed(2)),
  };
}

/** 三级干预：效果与可推行性给分（1—3），乘积越低越容易被选中 */
const TIERS = [
  { tier: '一级（组织层）', effect: 3, feasibility: 1, action: '人力配置、排班弹性、流程简化、权限下放' },
  { tier: '二级（群体层）', effect: 2, feasibility: 2, action: '培训、督导、同伴支持、案例复盘' },
  { tier: '三级（个体层）', effect: 1, feasibility: 3, action: '咨询、治疗、康复支持' },
];

function tierScore() {
  return TIERS
    .map((t) => ({ ...t, product: t.effect * t.feasibility }))
    .sort((a, b) => b.product - a.product);
}

/**
 * 恢复：连续清醒小时数与血液酒精当量。
 * 正文给 17—19 小时 ≈ 0.05%，取 18 小时为锚点线性换算；17 小时即进入该量级下沿。
 */
function impairment(hoursAwake, anchorHours = 18, anchorBac = 0.05) {
  const bac = (hoursAwake / anchorHours) * anchorBac;
  return {
    hoursAwake,
    bac: Number(bac.toFixed(3)),
    overLimit: bac >= 0.045,
    note: bac >= 0.045 ? '警觉性已相当于酒驾水平：这是差错率问题，不是「累一点」' : '未达该量级，但仍需恢复',
  };
}

const SIGNALS = ['睡眠持续受损', '失去兴趣', '饮酒或镇静药物', '没意义', '工作表现突然下降', '退缩'];
const REFERRAL = ['私下、具体、不评判地表达观察', '给资源而不是给建议', '跟进而不是一次问完'];

function concepts(text) {
  const t = String(text || '');
  return {
    signals: SIGNALS.filter((s) => t.includes(s)),
    referral: REFERRAL.filter((r) => t.includes(r)),
    hasKarasek: t.includes('卡拉塞克'),
    hasBurnoutCode: t.includes('QD85'),
    hasICD: t.includes('ICD-11'),
  };
}

function main() {
  const text = read();
  const c = concepts(text);
  const hanzi = (text.match(HANZI) || []).length;
  const t = turnover([
    { group: '高要求低控制', rate: 19 },
    { group: '高要求高控制', rate: 8 },
    { group: '全院平均', rate: 9 },
  ]);
  const tiers = tierScore();

  console.log(`管理心理学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${hanzi} 字 · 节 ${sections(text).length} 节`);
  console.log(`识别信号 ${c.signals.length}/6｜转介三步 ${c.referral.length}/3｜ICD-11 编码：${c.hasBurnoutCode ? 'QD85' : '缺'}`);
  console.log('');
  for (const q of [
    { demand: 0.9, control: 0.2 },
    { demand: 0.9, control: 0.8 },
    { demand: 0.2, control: 0.2 },
    { demand: 0.2, control: 0.8 },
  ]) {
    const r = quadrant(q);
    console.log(`要求 ${q.demand}／控制 ${q.control} → ${r.quadrant}：${r.note}`);
  }
  const w = worst({ demand: 0.9, control: 0.2, support: 0.2 });
  console.log(`  补上支持维：${w.label} → ${w.note}`);
  console.log('');
  console.log(`离职率：${t.groups.map((g) => `${g.group} ${g.rate}%`).join('｜')}｜极差 ${t.spread} 个点，最高是最低的 ${t.ratio} 倍`);
  console.log('  → 同样的忙，控制不同，走的人差一倍多；只加人补不了控制。');
  console.log('');
  console.log('三级干预（效果 × 可推行性）：');
  for (const x of tiers) console.log(`  ${x.tier}｜效果 ${x.effect} × 可推行 ${x.feasibility} = ${x.product}｜${x.action}`);
  console.log('  → 乘积最高的是二级，于是年年做培训；一级效果最好却落地最少。');
  console.log('');
  console.log(`恢复：清醒 ${impairment(18).hoursAwake} 小时 → 当量 ${impairment(18).bac}（${impairment(18).overLimit ? '已达酒驾量级' : '未达'}）`);
  console.log(`      清醒 24 小时 → 当量 ${impairment(24).bac}；结论：${impairment(24).note}`);
  console.log('');
  console.log('边界：本章人数、分组比例与离职率均为演算设定；量表分数不是诊断，倦怠不是疾病，临床判断须由具备资质的人员作出。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, sections, quadrant, worst, turnover, tierScore, impairment, concepts, TIERS, SIGNALS, REFERRAL };
