#!/usr/bin/env node
/**
 * 临床科研方法 · 第 5 章 结局选错，检验再对也答错了题
 * 课程: departments/06-guanli/13-linchuang-keyan-fangfa/chapters/05-z135/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部从本章 docs/zh.md 现算：汉字、节、加粗判断、问句；
 * 并复算本章五处关键算术——r=0.18 只解释 3.2%、1.8 分是 MCID 的 1.2 倍、
 * 复合终点里住院占八成、24 周把 8 周的差值磨掉一半、44 份评级换方法后 p 从 0.048 变 0.11。
 * 任何一个数复算不出来，脚本直接报错——本章的论点是「统计没错，错在结局选的是标不是本」。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 5;
const TITLE = '结局选错，检验再对也答错了题';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

/** 本章算术设定：教学合成数字，正文第六节已声明。 */
const WEEK12_NEW = 3.2;
const WEEK12_STD = 1.4;
const RELAPSE_NEW = 41;
const RELAPSE_STD = 44;
const R = 0.18;
const MCID = 1.5;
const DIFF_MCID = 1.8;
const DIFF_SMALL = 0.6;
const COMPOSITE = { death: 1, mi: 4, hosp: 20 };
const WEEK8 = 1.8;
const WEEK24 = 0.9;
const ORDINAL_MEAN = 0.42;
const P_MEAN = 0.048;
const P_RANK = 0.11;
const REPORTERS = { doctor: 68, patient: 41, objective: 52 };

const ENDPOINT_LAYERS = ['硬终点', '替代终点', '中间指标'];
const COMPOSITE_RULES = ['各组分方向一致', '各组分临床重要性相近', '效应不由单一组分驱动'];
const SCALE_MISUSES = ['把总分当全部', '把等级资料当连续变量', '忽略天花板与地板效应'];

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function parseSections(body) {
  const out = [];
  let cur = null;
  for (const line of body.split('\n')) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) { cur = { title: h[1], lines: [] }; out.push(cur); continue; }
    if (cur) cur.lines.push(line);
  }
  return out.map((s) => ({
    title: s.title,
    text: s.lines.join('\n'),
    hanzi: (s.lines.join('\n').match(HANZI) || []).length,
  }));
}

const boldTerms = (text) => [...String(text).matchAll(/\*\*([^*\n]+)\*\*/g)].map((m) => m[1]);

function analyze(text) {
  const body = String(text || '').replace(/\r\n/g, '\n');
  const sections = parseSections(body);
  return {
    hanzi: (body.match(HANZI) || []).length,
    sections,
    claims: boldTerms(body).length,
    quotes: [...new Set([...body.matchAll(/《([^》\n]+)》/g)].map((m) => m[1]))],
    questions: (body.match(/？/g) || []).length,
  };
}

const sectionOf = (sections, kw) => {
  const s = sections.find((x) => x.title.includes(kw));
  if (!s) throw new Error('正文里没找到含「' + kw + '」的节');
  return s;
};

/** r=0.18 → r²=0.032：中间指标只解释结局差异的 3.2%。 */
const rSquared = (r = R) => Number((r * r).toFixed(3));

/** 组间差值 1.8 分是 MCID 1.5 分的 1.2 倍——刚过线。 */
const mcidMultiple = (diff = DIFF_MCID, mcid = MCID) => Number((diff / mcid).toFixed(2));

/** 复合终点按组分拆开：住院占八成就不能替死亡发言。 */
function compositeShares() {
  const total = COMPOSITE.death + COMPOSITE.mi + COMPOSITE.hosp;
  return {
    total,
    hosp: Math.round((COMPOSITE.hosp / total) * 100),
    mi: Math.round((COMPOSITE.mi / total) * 100),
    death: Math.round((COMPOSITE.death / total) * 100),
  };
}

/** 8 周 1.8 分、24 周 0.9 分：时点一挪，差值掉一半。 */
function decay() {
  return { week8: WEEK8, week24: WEEK24, kept: Number((WEEK24 / WEEK8).toFixed(2)), lost: Math.round((1 - WEEK24 / WEEK8) * 100) };
}

function auditStructure(sections) {
  const s1 = sectionOf(sections, '结局的三层');
  const s2 = sectionOf(sections, '三个条件');
  const s3 = sectionOf(sections, '复合终点');
  const s4 = sectionOf(sections, '量表');
  const s5 = sectionOf(sections, '检验选择');

  const layers = ENDPOINT_LAYERS.filter((l) => boldTerms(s1.text).some((b) => b.startsWith(l)));
  const conditions = (s2.text.match(/^\s*\d+\.\s+\*\*/gm) || []).length;
  const compositeRules = COMPOSITE_RULES.filter((r) => s3.text.includes(r));
  const misuses = SCALE_MISUSES.filter((m) => s4.text.includes('**' + m + '。**') || s4.text.includes(m));
  const testRows = (s5.text.match(/^\| (连续|二分类|等级|重复测量|时间-事件)/gm) || []).length;

  return { layers, conditions, compositeRules, misuses, testRows };
}

function verify(j, shares, dec) {
  if (j.layers.length !== 3) throw new Error(`结局三层只对上 ${j.layers.length} 层`);
  if (j.conditions !== 3) throw new Error(`替代终点条件数到 ${j.conditions} 条，三条须同时满足`);
  if (j.compositeRules.length !== 3) throw new Error(`复合终点条件只对上 ${j.compositeRules.length} 条`);
  if (j.misuses.length !== 3) throw new Error(`量表误用只对上 ${j.misuses.length} 种`);
  if (j.testRows !== 6) throw new Error(`检验对照表数到 ${j.testRows} 行，正文列了六行`);
  if (shares.total !== 25 || shares.hosp !== 80) throw new Error(`复合终点拆分与正文 25 例/80% 不符：${shares.total}/${shares.hosp}`);
  if (dec.kept !== 0.5) throw new Error(`时点衰减算出 ${dec.kept}，正文记掉一半`);
}

function main() {
  const body = read();
  const a = analyze(body);
  const j = auditStructure(a.sections);
  const shares = compositeShares();
  const dec = decay();
  verify(j, shares, dec);

  const r2 = rSquared();
  const week12Diff = Number((WEEK12_NEW - WEEK12_STD).toFixed(1));
  const relapseDiff = Math.abs(RELAPSE_STD - RELAPSE_NEW);

  console.log(`临床科研方法 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 加粗判断 ${a.claims} 处 · 引文 ${a.quotes.length} 条 · 问句 ${a.questions} 个`);
  console.log('');
  console.log(`12 周证候积分：${WEEK12_NEW} 分 对 ${WEEK12_STD} 分 → 差 ${week12Diff} 分（p=0.004，显著）；`);
  console.log(`1 年复发率：${RELAPSE_NEW}% 对 ${RELAPSE_STD}%，差 ${relapseDiff} 个百分点，置信区间跨过 0。`);
  console.log(`相关系数 r=${R} → r²=${r2}：积分改善只解释了复发差异的 ${(r2 * 100).toFixed(1)}%。`);
  console.log('');
  console.log(`MCID 锚定：差值 ${DIFF_MCID} 分 ÷ MCID ${MCID} 分 = ${mcidMultiple()} 倍，刚过线；`);
  console.log(`  若差值 ${DIFF_SMALL} 分而 p<0.001，结论是「统计学显著但未达临床重要阈值」。`);
  console.log('');
  console.log(`复合终点：${shares.total} 例事件 = 住院 ${COMPOSITE.hosp}（${shares.hosp}%）+ 心梗 ${COMPOSITE.mi}（${shares.mi}%）+ 死亡 ${COMPOSITE.death}（${shares.death}%）。`);
  console.log(`  → 只能说差异主要由住院驱动，另外两个组分的事件数不足以评价。`);
  console.log('');
  console.log(`时点：8 周 ${WEEK8} 分 → 24 周 ${WEEK24} 分，只剩 ${dec.kept} 倍（掉 ${dec.lost}%）。`);
  console.log(`三位报告者：医生 ${REPORTERS.doctor}% · 患者自评 ${REPORTERS.patient}% · 客观检测 ${REPORTERS.objective}%——差距来自关注的东西不同。`);
  console.log(`等级资料：按 1–4 赋均值差 ${ORDINAL_MEAN}、p=${P_MEAN}；改秩和检验 p=${P_RANK}。方法换了，结论翻过阈值。`);
  console.log('');
  console.log(`结构：结局 ${j.layers.length} 层 · 替代终点条件 ${j.conditions} 条 · 复合条件 ${j.compositeRules.length} 条 · 量表误用 ${j.misuses.length} 种 · 检验表 ${j.testRows} 行`);
  console.log('');
  console.log('判断：主结局只能有一个，且要拿它与 MCID 比，不是与 0 比；');
  console.log('      中间指标的结果只能写到症状层面，写不出「疗效确切」。');
  console.log('');
  console.log('逐节字数：');
  for (const sec of a.sections) {
    const share = a.hanzi ? ((sec.hanzi / a.hanzi) * 100).toFixed(1) : '0.0';
    console.log(`  ${sec.title.padEnd(28, '　')} ${String(sec.hanzi).padStart(5)} 字（${share}%）`);
  }
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即随之变化；本输出仅用于教学演示，不构成研究结论或临床建议。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE, WEEK12_NEW, WEEK12_STD, RELAPSE_NEW, RELAPSE_STD, R, MCID, DIFF_MCID, DIFF_SMALL,
  COMPOSITE, WEEK8, WEEK24, ORDINAL_MEAN, P_MEAN, P_RANK, REPORTERS,
  read, parseSections, analyze, boldTerms, sectionOf, rSquared, mcidMultiple, compositeShares, decay, auditStructure, verify,
};
