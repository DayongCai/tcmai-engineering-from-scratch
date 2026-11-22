#!/usr/bin/env node
/**
 * 管理学基础 · 第 17 章 中医院的难题不是要不要特色，是特色怎么被计量和付钱
 * 课程: departments/06-guanli/17-guanli-xue-jichu/chapters/17-m17/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文取六个结构数，现算：
 *   一、特色服务的密度：多少次门诊才出现一次非药物疗法、多少张处方里没有中药；
 *   二、收入结构：药品收入里饮片占多少、其余占多少；
 *   三、结余与特色科室的关系——把特色做上去的那部分在现行价格里几乎不挣钱。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 17;
const TITLE = '中医院的难题不是要不要特色，是特色怎么被计量和付钱';

const D = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
const U = { 十: 10, 百: 100, 千: 1000, 万: 10000 };

function cnInt(s) {
  if (!/^[零一二两三四五六七八九十百千万]+$/.test(s)) throw new Error('认不出的中文数字: ' + s);
  let total = 0;
  let section = 0;
  let num = 0;
  for (const ch of s) {
    if (ch in D) { num = D[ch]; continue; }
    const unit = U[ch];
    if (unit === 10000) { section = (section + num) * unit; total += section; section = 0; num = 0; }
    else { if (num === 0) num = 1; section += num * unit; num = 0; }
  }
  return total + section + num;
}

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function grab(text, re, label, conv) {
  const m = text.match(re);
  if (!m) throw new Error('正文里找不到「' + label + '」，章节是否已被改写？');
  const n = conv === 'cn' ? cnInt(m[1]) : Number(m[1]);
  if (!Number.isFinite(n)) throw new Error('「' + label + '」取到的不是数: ' + m[1]);
  return n;
}

/** 正文第 5 行的六个数字。 */
function facts(text) {
  return {
    tcmDoctorPct: grab(text, /中医类别执业医师占医师总数\s*([\d.]+)%/, '54.3%'),
    herbalRxPct: grab(text, /门诊中药处方占处方总数\s*([\d.]+)%/, '41.2%'),
    nonDrugPct: grab(text, /门诊中医非药物疗法使用率\s*([\d.]+)%/, '18.7%'),
    sliceRevenuePct: grab(text, /中药饮片收入占药品收入\s*([\d.]+)%/, '22.4%'),
    surplusWan: grab(text, /全年结余([零一二两三四五六七八九十百千万]+)万元/, '二百一十七万', 'cn'),
  };
}

/** 按使用率折算：多少次门诊出现一次。 */
function visitsPerUse(usePct) {
  if (!(usePct > 0) || usePct > 100) throw new Error('使用率应在 0–100 之间');
  return 100 / usePct;
}

/** 结构占比的另一侧：多少比例不在这一侧。 */
const restPct = (pct) => 100 - pct;

/** 每 100 张处方里不含中药的份数。 */
const rxWithoutHerbal = (herbalRxPct) => restPct(herbalRxPct);

function main() {
  const text = read();
  const f = facts(text);
  const perUse = visitsPerUse(f.nonDrugPct);

  console.log(`管理学基础 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 取数后现算）');
  console.log('');
  console.log(`一、特色密度：非药物疗法使用率 ${f.nonDrugPct}% → 每 ${perUse.toFixed(2)} 人次门诊出现 1 次`);
  console.log(`  中药处方占处方总数 ${f.herbalRxPct}% → 每 100 张处方有 ${rxWithoutHerbal(f.herbalRxPct).toFixed(1)} 张不含中药`);
  console.log(`  中医类别医师占比 ${f.tcmDoctorPct}%（低于该院等级评审自评目标）`);
  console.log('  → 特色指标偏低不是态度问题，是能力、结构与价格的合成结果。');
  console.log('');
  console.log(`二、收入结构：药品收入中饮片占 ${f.sliceRevenuePct}%，其余 ${restPct(f.sliceRevenuePct).toFixed(1)}% 是非饮片`);
  console.log(`  全年结余 ${f.surplusWan} 万元，主要来自检查与西药；针灸、推拿按全成本核算为负`);
  console.log('  → 政策要求以中医为主，价格与分配却奖励以检查为主：这是核心矛盾。');
  console.log('');
  console.log('三、五组指标的关系：人决定能做什么 · 服务结构决定在做什么 · 药决定安全 · 效决定有用 · 运行决定可持续');
  console.log('  → 最容易被做成数字的是使用率，所以质控查适配而不是查次数。');
  console.log('');
  console.log(`※ 数字由本章正文现算，正文一改即报错或随之变化；${f.tcmDoctorPct}% 等六个数为合成示例，不对应真实机构。`);
  console.log('※ 本输出仅用于教学演示，不构成执业准入意见、价格与医保政策解读或管理咨询意见。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, cnInt, facts, visitsPerUse, restPct, rxWithoutHerbal };
