#!/usr/bin/env node
/**
 * 中医管理学 · 第 5 章 中医治疗率 92%，没有一张方是对证的
 * 课程: departments/06-guanli/03-zhongyi-guanli-xue/chapters/05-z35/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的账从正文取数后现算：
 *   抽查 100 份的三类缺陷 → 可见缺陷数 → 方证相应对得上的上限 → 与报表的差距
 *   分母剔除 10% 与 20% 后的比率（用来显示改分母会在比率高处撞上天花板）
 * 比率与上限都由计数推出，不引用任何结论性形容词。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 5;
const TITLE = '中医治疗率 92%，没有一张方是对证的';

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function grab(text, re, label, conv) {
  const m = text.match(re);
  if (!m) throw new Error('正文里找不到「' + label + '」，章节是否已被改写？');
  const raw = String(m[1]).replace(/,/g, '');
  const n = conv === 'cn' ? cn(raw) : Number(raw);
  if (!Number.isFinite(n)) throw new Error('「' + label + '」取到的不是数: ' + raw);
  return n;
}

/** 正文第 5、13 行的抽查数据与考核设定。 */
function facts(text) {
  return {
    reportedRate: grab(text, /年底报表全院\s*(\d+)%/, '全院 92%'),
    requiredRate: grab(text, /要求不低于\s*(\d+)%/, '不低于 85%'),
    sample: grab(text, /抽查\s*(\d+)\s*份出院病历/, '抽查 100 份'),
    onlyPatent: grab(text, /(\d+)\s*份的「中医治疗」只有一项中成药/, '23 份只有中成药'),
    mismatch: grab(text, /(\d+)\s*份的辨证结论与处方不合/, '7 份辨证不合'),
    copied: grab(text, /(\d+)\s*份的舌脉记录与首诊完全一致/, '5 份记录照抄'),
    shrinkLow: grab(text, /可以把分母减掉([一二两三四五六七八九十]+)到两成/, '减掉一到两成', 'cn'),
    shrinkHigh: grab(text, /减掉一到\s*([一二两三四五六七八九十]+)成/, '减掉一到两成', 'cn'),
  };
}

function cn(s) {
  const d = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
  if (!(s in d)) throw new Error('不认识的中文数字: ' + s);
  return d[s];
}

/** 可见缺陷数：三类互不包含，直接相加。 */
function visibleDefects(f) {
  return f.onlyPatent + f.mismatch + f.copied;
}

/** 方证相应对得上的上限：剩余份数 ÷ 抽查总数。 */
function ceilingRate(sample, defects) {
  if (!(sample > 0)) throw new Error('抽查份数必须为正');
  if (defects > sample) throw new Error('缺陷数不能超过抽查份数');
  return (sample - defects) / sample;
}

/**
 * 改分母后的比率：分子不变（被剔除的假定都是未治疗者），分母按比例缩小。
 * 比率超过 1 就说明这条路已撞天花板，剩下的只能靠改记录补。
 */
function shrunkRate(numerator, denominator, shrinkShare) {
  const d = denominator * (1 - shrinkShare);
  return { denominator: d, rate: numerator / d, overflow: numerator / d > 1 };
}

function main() {
  const text = read();
  const f = facts(text);
  const defects = visibleDefects(f);
  const ceiling = ceilingRate(f.sample, defects);
  const gap = (f.reportedRate / 100 - ceiling) * 100;

  console.log(`中医管理学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 取数后现算）');
  console.log('');
  console.log(`一、抽查 ${f.sample} 份的三类缺陷`);
  console.log(`  只有中成药、方剂栏空白：${f.onlyPatent} 份`);
  console.log(`  辨证结论与处方不合：${f.mismatch} 份`);
  console.log(`  舌脉记录与首诊逐字相同：${f.copied} 份`);
  console.log(`  可见缺陷合计 ${defects} 份 → 对得上证的上限 ${(ceiling * 100).toFixed(0)}%`);
  console.log(`  报表 ${f.reportedRate}%（考核要求不低于 ${f.requiredRate}%）→ 与上限相差 ${gap.toFixed(0)} 个百分点`);
  console.log('');
  console.log('二、改分母能抬多少（分子不变，剔除的都是未治疗者）');
  for (const s of [f.shrinkLow / 10, f.shrinkHigh / 10]) {
    const r = shrunkRate(f.reportedRate, 100, s);
    console.log(`  分母减 ${(s * 100).toFixed(0)}% → ${f.reportedRate}/${r.denominator.toFixed(0)} = ${(r.rate * 100).toFixed(1)}%${r.overflow ? '（超过 100%，只能再叠改记录）' : ''}`);
  }
  console.log('  → 比率越接近满值，分母可腾的空间越小；这正是改记录成为最省力路径的原因。');
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即报错或随之变化；比率与抽查例数均为演算设定。');
  console.log('※ 本输出仅用于教学演示，不构成医疗质量管理、绩效考核或医保监管意见。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, facts, visibleDefects, ceilingRate, shrunkRate };
