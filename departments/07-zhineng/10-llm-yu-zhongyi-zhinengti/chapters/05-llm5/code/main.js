#!/usr/bin/env node
/**
 * 大模型与中医智能体 · 第 5 章 标注不够时，最贵的不是算法，是判断哪些样本值得标
 * 课程: departments/07-zhineng/10-llm-yu-zhongyi-zhinengti/chapters/05-llm5/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文现读并复算四笔账：
 *   ① 全标与部分标的工时（份数 × 每份分钟数 → 小时 → 年／周）
 *   ② 自训练节奏：每轮加入比例 × 轮数，剩多少没动
 *   ③ 主动学习：每轮配额、按不确定性／随机 70/30 的拆分
 *   ④ 抽检灵敏度：抽 k 条时，在给定伪标签错误率下「至少发现一条」的概率
 * 全部是正文口径的算术，不含任何实测项目数据。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const readDoc = () => fs.readFileSync(DOC, 'utf8');
const toInt = (s) => Number(String(s).replace(/,/g, ''));

/** 标注预算：份数、每份分钟数、全标工时、部分标注的份数与工时 */
function parseLabelBudget(text) {
  const cases = text.match(/库里\s*([\d,]+)\s*份病案/);
  const minutes = text.match(/每份\s*(\d+)\s*分钟/);
  const full = text.match(/全部标完是\s*([\d,]+)\s*小时/);
  const part = text.match(/只标\s*([\d,]+)\s*份（(\d+)%），是\s*(\d+)\s*小时/);
  if (!cases || !minutes || !full || !part) throw new Error('正文里没找到标注工时的三句');
  return {
    cases: toInt(cases[1]),
    minutesPerCase: Number(minutes[1]),
    fullHours: toInt(full[1]),
    partCases: toInt(part[1]),
    partPct: Number(part[2]) / 100,
    partHours: Number(part[3]),
  };
}

/** 「每轮加入无标签池的 10%，跑 5 轮，累计 40% 左右」 */
function parseSelfTraining(text) {
  const m = text.match(/每轮加入无标签池的\s*(\d+)%，跑\s*(\d+)\s*轮，累计\s*(\d+)%\s*左右/);
  if (!m) throw new Error('正文里没找到自训练节奏');
  return { perRound: Number(m[1]) / 100, rounds: Number(m[2]), quotedTotal: Number(m[3]) / 100 };
}

/** 「600 份已标、11,400 份无标签，每轮标 50 份」 */
function parseActiveLearning(text) {
  const m = text.match(/([\d,]+)\s*份已标、([\d,]+)\s*份无标签，每轮标\s*(\d+)\s*份/);
  if (!m) throw new Error('正文里没找到主动学习的池子与每轮配额');
  return { labelled: toInt(m[1]), unlabelled: toInt(m[2]), batch: Number(m[3]) };
}

/** 「70% 按不确定性抽，30% 随机抽」 */
function parseMix(text) {
  const m = text.match(/(\d+)%\s*按不确定性抽，\s*(\d+)%\s*随机抽/);
  if (!m) throw new Error('正文里没找到 70/30 配比');
  return { uncertain: Number(m[1]) / 100, random: Number(m[2]) / 100 };
}

/** 「每轮抽样人工复核伪标签（抽 50 条…若准确率低于 90%，停止加注）」 */
function parseAudit(text) {
  const m = text.match(/抽\s*(\d+)\s*条，算准确率）。若准确率低于\s*(\d+)%/);
  const perRound = text.match(/若每轮引入的伪标签中有\s*(\d+)%\s*是错的/);
  if (!m || !perRound) throw new Error('正文里没找到抽检条数与错误率');
  return { sample: Number(m[1]), floor: Number(m[2]) / 100, injectedError: Number(perRound[1]) / 100 };
}

/** 抽 k 条，至少发现一条错误的概率 */
const detectAtLeastOne = (p, k) => 1 - (1 - p) ** k;

function main() {
  const doc = readDoc();
  const b = parseLabelBudget(doc);
  const st = parseSelfTraining(doc);
  const al = parseActiveLearning(doc);
  const mix = parseMix(doc);
  const au = parseAudit(doc);

  const fullHours = (b.cases * b.minutesPerCase) / 60;
  const partHours = (b.partCases * b.minutesPerCase) / 60;

  console.log('═══ 标注不够时，最贵的不是算法，是判断哪些样本值得标 ═══');
  console.log('');

  console.log(`一、标注预算（正文：${b.cases.toLocaleString('en-US')} 份 × ${b.minutesPerCase} 分钟）`);
  console.log(`  全标 ${fullHours.toLocaleString('en-US')} 小时（正文 ${b.fullHours.toLocaleString('en-US')}），按每年 2,000 工时约 ${(fullHours / 2000).toFixed(1)} 年`);
  console.log(`  只标 ${b.partCases} 份 = ${partHours} 小时（正文 ${b.partHours}），按每周 40 工时约 ${(partHours / 40).toFixed(2)} 周`);
  console.log(`  覆盖率 ${((b.partCases / b.cases) * 100).toFixed(0)}% 的样本买到了判据，其余 ${(b.cases - b.partCases).toLocaleString('en-US')} 份只能买分布。`);
  console.log('');

  console.log('二、自训练节奏（渐进加注，不是一次性押注）');
  const added = 1 - (1 - st.perRound) ** st.rounds;
  console.log(`  每轮 ${(st.perRound * 100).toFixed(0)}% × ${st.rounds} 轮 ⇒ 累计覆盖 ${(added * 100).toFixed(1)}%（正文记 ${(st.quotedTotal * 100).toFixed(0)}% 左右）`);
  console.log(`  仍留在池外 ${((1 - added) * 100).toFixed(1)}% —— 这部分是后续轮次的余量，也是「可撤」的余地。`);
  console.log('  验证集必须来自已标数据：从伪标签里抽验证集，等于用自己判的卷子给自己打分。');
  console.log('');

  console.log('三、主动学习（同样标 300 份，路径不同）');
  const rounds = 300 / al.batch;
  console.log(`  池子：${al.labelled} 已标 + ${al.unlabelled.toLocaleString('en-US')} 无标签，每轮 ${al.batch} 份 ⇒ 300 份需 ${rounds} 轮`);
  console.log(`  每轮拆分：不确定性 ${Math.round(al.batch * mix.uncertain)} 条 + 随机 ${Math.round(al.batch * mix.random)} 条（${(mix.uncertain * 100).toFixed(0)}/${(mix.random * 100).toFixed(0)}）`);
  console.log('  随机那部分不提效，专门用来估计整体性能；全用不确定性抽样会让验证集偏离真实分布。');
  console.log('');

  console.log('四、抽检挡得住什么（抽 50 条，伪标签错误率 p）');
  for (const p of [au.injectedError, 0.1, 0.2]) {
    const d = detectAtLeastOne(p, au.sample);
    console.log(`  p=${(p * 100).toFixed(0)}% ⇒ 至少发现一条错误的概率 ${(d * 100).toFixed(1)}%`);
  }
  console.log(`  抽检门槛：准确率低于 ${(au.floor * 100).toFixed(0)}% 即停止加注；成本按正文约 20 分钟。`);
  console.log(`  注意：抽检只能发现「已经错到能看出来」的错误，错得自信的伪标签要靠那份从不参与训练的标注集兜住。`);
  console.log('');
  console.log('※ 本章数字均从 docs/zh.md 现读现算；正文为演算设定，不对应任何实测项目或数据集；输出仅用于教学演示，不构成诊疗或数据治理建议。');
}

if (require.main === module) main();

module.exports = {
  DOC,
  readDoc,
  parseLabelBudget,
  parseSelfTraining,
  parseActiveLearning,
  parseMix,
  parseAudit,
  detectAtLeastOne,
  main,
};
