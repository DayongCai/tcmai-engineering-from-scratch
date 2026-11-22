#!/usr/bin/env node
/**
 * 大模型与中医智能体 · 第 6 章 泛化不是模型的本事，是假设与问题凑巧对上了
 * 课程: departments/07-zhineng/10-llm-yu-zhongyi-zhinengti/chapters/06-llm6/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文现读并复算四件事：
 *   ① 同源与换人的落差（答案缺主语，落差就是主语）；
 *   ② 泛化界 O(√(C/n)) 在这个规模上大到没有约束力；
 *   ③ 二项比例的标准误与 95% 区间，反推「分辨两百分点需要多少例」；
 *   ④ 小类样本量：十几例上错两例，比率会跳多少。
 * 不引用任何模型的实测分数，正文数字全部现读。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const readDoc = () => fs.readFileSync(DOC, 'utf8');
const toInt = (s) => Number(String(s).replace(/,/g, ''));

/** 「800 份病案来自 3 位医师，模型在同源测试集上准确率 0.91；换第 4 位医师的 200 份病案，掉到 0.72」 */
function parseShiftStory(text) {
  const a = text.match(/([\d,]+)\s*份病案来自\s*(\d+)\s*位医师/);
  const b = text.match(/同源测试集上准确率\s*(0\.\d+)/);
  const c = text.match(/第\s*(\d+)\s*位医师的\s*([\d,]+)\s*份病案，掉到\s*(0\.\d+)/);
  if (!a || !b || !c) throw new Error('正文里没找到「同源 / 换人」两组准确率');
  return {
    cases: toInt(a[1]),
    doctors: Number(a[2]),
    sameSource: Number(b[1]),
    newDoctor: Number(c[1]),
    newCases: toInt(c[2]),
    shifted: Number(c[3]),
  };
}

/** 「假设空间容量按 1,000 计，样本 800，$\sqrt{1000/800}\approx1.12$」 */
function parseGeneralizationBound(text) {
  const cap = text.match(/假设空间容量按\s*([\d,]+)\s*计，样本\s*([\d,]+)/);
  const val = text.match(/\\sqrt\{([\d,]+)\/([\d,]+)\}\\approx([\d.]+)/);
  if (!cap || !val) throw new Error('正文里没找到泛化界的算例');
  return { capacity: toInt(cap[1]), samples: toInt(cap[2]), quoted: Number(val[3]) };
}

/** 「测 200 例，准确率 $p=0.90$」「95% 置信区间约 $0.90\pm1.96\times0.021$，即 0.859–0.941」 */
function parseStandardError(text) {
  const n = text.match(/测\s*(\d+)\s*例，准确率\s*\$p=([\d.]+)\$/);
  const se = text.match(/\\approx(0\.0\d+)\$/);
  const ci = text.match(/即\s*(0\.\d+)–(0\.\d+)/);
  if (!n || !se || !ci) throw new Error('正文里没找到标准误与置信区间');
  return {
    n: Number(n[1]),
    p: Number(n[2]),
    seQuoted: Number(se[1]),
    ciLow: Number(ci[1]),
    ciHigh: Number(ci[2]),
  };
}

/** 「想分辨 2 个百分点的差异…需要 n≈…」 */
function parseResolution(text) {
  const d = text.match(/分辨\s*(\d+)\s*个百分点的差异/);
  const n = text.match(/需要\s*\$n\\approx\s*([\d,]+)\$/);
  if (!d || !n) throw new Error('正文里没找到分辨率与所需样本量');
  return { deltaPoints: Number(d[1]), needed: toInt(n[1]) };
}

/** 「总量 1,000、其中某兼证只有 12 例」「12 例里错 2 例，比率就从 0.83 跳到 1.0」 */
function parseMinorityCase(text) {
  const n = text.match(/其中某兼证只有\s*(\d+)\s*例/);
  const e = text.match(/(\d+)\s*例里错\s*(\d+)\s*例[^。\n]*?(0\.\d+)[^。\n]*?(0?\.\d+|[01]\.\d+)/);
  if (!n || !e) throw new Error('正文里没找到小类样本量的例子');
  return {
    cases: Number(n[1]),
    errors: Number(e[2]),
    quotedLo: Number(e[3]),
    quotedHi: Number(e[4]),
  };
}

const seBinom = (p, n) => Math.sqrt((p * (1 - p)) / n);

function main() {
  const doc = readDoc();
  const story = parseShiftStory(doc);
  const bound = parseGeneralizationBound(doc);
  const st = parseStandardError(doc);
  const res = parseResolution(doc);
  const minor = parseMinorityCase(doc);

  const gap = story.sameSource - story.shifted;
  const b = Math.sqrt(bound.capacity / bound.samples);
  const se = seBinom(st.p, st.n);
  const lo = st.p - 1.96 * se;
  const hi = st.p + 1.96 * se;
  const nAt = (seTarget) => (st.p * (1 - st.p)) / seTarget ** 2;
  const nDoc = nAt(0.01);
  const minorRate = (minor.cases - minor.errors) / minor.cases;

  console.log('═══ 泛化不是模型的本事，是假设与问题凑巧对上了 ═══');
  console.log('');

  console.log(`一、「准确率 ${story.sameSource}」缺主语（正文：${story.cases} 份来自 ${story.doctors} 位医师）`);
  console.log(`  同源 ${story.sameSource} → 第 ${story.newDoctor} 位医师的 ${story.newCases} 份 ${story.shifted}`);
  console.log(`  落差 ${gap.toFixed(2)} = ${(gap * 100).toFixed(0)} 个百分点。过拟合通常只差几个点；这个量级是分布变了。`);
  console.log(`  完整表述应是：在来自 ${story.doctors} 位医师、共 ${story.cases} 份病案上，准确率 ${story.sameSource}。`);
  console.log('');

  console.log('二、泛化界在这个规模上没有约束力');
  console.log(`  C=${bound.capacity.toLocaleString('en-US')}，n=${bound.samples} ⇒ √(C/n) = ${b.toFixed(3)}（正文 ${bound.quoted}）`);
  console.log(`  界 ${b.toFixed(2)} > 1：对概率没有任何约束。理论不是错了，是它只在大样本下有指导意义。`);
  console.log(`  小样本该用的工具：交叉验证 + 按患者分组留出（分组指标通常比随机切分低 3–8 个百分点，那才是真实的数）。`);
  console.log('');

  console.log('三、二百例上的 0.90 能说明什么');
  console.log(`  SE = √(p(1−p)/n) = √(${st.p}×${(1 - st.p).toFixed(2)}/${st.n}) = ${se.toFixed(4)}（正文 ${st.seQuoted}）`);
  console.log(`  95% 区间 ${lo.toFixed(3)}–${hi.toFixed(3)}（正文 ${st.ciLow}–${st.ciHigh}）`);
  console.log(`  想分辨 ${res.deltaPoints} 个百分点，按 SE≈0.01 反推 n ≈ ${Math.round(nDoc)}（正文 ${res.needed}）`);
  console.log('  样本量决定你能回答多细的问题，而不是反过来。');
  console.log('');

  console.log('四、小类不能只看总量');
  console.log(`  总量 1,000 里某兼证 ${minor.cases} 例；错 ${minor.errors} 例即 ${(minorRate * 100).toFixed(1)}%（正文 ${minor.quotedLo}）`);
  console.log(`  同一批数据再多错两例，比率直接到 ${(((minor.cases - minor.errors - 2) / minor.cases) * 100).toFixed(1)}%；全对则是 ${(minor.quotedHi * 100).toFixed(0)}%。`);
  console.log('  关于这个兼证的任何指标都不可信 —— 报告里必须带上每类的例数。');
  console.log('');
  console.log('※ 本章数字均从 docs/zh.md 现读现算；正文为演算设定，不对应任何实测模型或数据集；输出仅用于教学演示，不构成诊疗或系统验收建议。');
}

if (require.main === module) main();

module.exports = {
  DOC,
  readDoc,
  parseShiftStory,
  parseGeneralizationBound,
  parseStandardError,
  parseResolution,
  parseMinorityCase,
  seBinom,
  main,
};
