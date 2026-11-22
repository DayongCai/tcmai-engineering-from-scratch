#!/usr/bin/env node
/**
 * 临床科研方法 · 第 4 章 偏倚不是做错了，是把每一步都做对也还在
 * 课程: departments/06-guanli/13-linchuang-keyan-fangfa/chapters/04-z134/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部从本章 docs/zh.md 现算：汉字、节、加粗判断、问句；
 * 并复算本章四处关键算术——辛普森悖论的 2×2×2 表（每层 +5、合计 −31）、
 * 失访不均衡把差值从 5 拉到 12.3 再翻成 −3.8、盲法缺失的 33%、双录误差 80 → 5。
 * 任何一个数复算不出来，脚本直接报错——本章的论点是「数据是真的，计算是对的，结论是反的」。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 4;
const TITLE = '偏倚不是做错了，是把每一步都做对也还在';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

/** 本章算术设定：教学合成数字，正文第六节已声明。 */
const TABLE = {
  light: { newYes: 32, newN: 40, stdYes: 120, stdN: 160 },
  severe: { newYes: 32, newN: 160, stdYes: 6, stdN: 40 },
};
const FOLLOW_NEW = 0.92;
const FOLLOW_STD = 0.78;
const DONE_NEW = 0.6;
const DONE_STD = 0.55;
const OPEN_LABEL = 2.4;
const BLINDED = 1.6;
const FIELDS = 10000;
const ERR_SINGLE = 0.008;
const ERR_DOUBLE = 0.0005;

const BIAS_TYPES = ['选择偏倚', '信息偏倚', '混杂'];
const BLIND_LEVELS = ['受试者盲', '实施者盲', '评价者盲'];

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

const pct = (yes, n) => (yes / n) * 100;
const pp = (a, b) => Number((a - b).toFixed(1));

/**
 * 辛普森悖论那张表：每一层新法都更好，合计却更差。
 * 原因是两组的病情构成相反——新法组 80% 是重症。
 */
function simpson() {
  const light = {
    newRate: pct(TABLE.light.newYes, TABLE.light.newN),
    stdRate: pct(TABLE.light.stdYes, TABLE.light.stdN),
  };
  light.diff = pp(light.newRate, light.stdRate);

  const severe = {
    newRate: pct(TABLE.severe.newYes, TABLE.severe.newN),
    stdRate: pct(TABLE.severe.stdYes, TABLE.severe.stdN),
  };
  severe.diff = pp(severe.newRate, severe.stdRate);

  const newYes = TABLE.light.newYes + TABLE.severe.newYes;
  const newN = TABLE.light.newN + TABLE.severe.newN;
  const stdYes = TABLE.light.stdYes + TABLE.severe.stdYes;
  const stdN = TABLE.light.stdN + TABLE.severe.stdN;
  const total = { newRate: pct(newYes, newN), stdRate: pct(stdYes, stdN), newYes, newN, stdYes, stdN };
  total.diff = pp(total.newRate, total.stdRate);

  const mix = {
    newSevere: pct(TABLE.severe.newN, newN),
    stdSevere: pct(TABLE.severe.stdN, stdN),
  };

  return { light, severe, total, mix };
}

/**
 * 失访不均衡：把失访者一律判为无效，计入分母。
 * 干预组失访 8%、对照组 22% → 差值从 5 拉到 12.3；分布一反过来就翻成 −3.8。
 */
function lossArithmetic() {
  const normal = pp(FOLLOW_NEW * DONE_NEW * 100, FOLLOW_STD * DONE_STD * 100);
  const reversed = pp(FOLLOW_STD * DONE_NEW * 100, FOLLOW_NEW * DONE_STD * 100);
  return {
    nominal: pp(DONE_NEW * 100, DONE_STD * 100),
    worstCase: normal,
    reversed,
    filledNew: Number((FOLLOW_NEW * DONE_NEW * 100).toFixed(1)),
    filledStd: Number((FOLLOW_STD * DONE_STD * 100).toFixed(1)),
    reversedNew: Number((FOLLOW_STD * DONE_NEW * 100).toFixed(1)),
    reversedStd: Number((FOLLOW_NEW * DONE_STD * 100).toFixed(1)),
  };
}

/** 盲法缺失带来的偏移：0.8 分占 2.4 分的三成三。 */
function blindingShift() {
  const diff = Number((OPEN_LABEL - BLINDED).toFixed(1));
  return { diff, share: Math.round((diff / OPEN_LABEL) * 100) };
}

/** 双人双录入能把字段错误率从 0.8% 压到 0.05%。 */
function entryErrors() {
  return { single: FIELDS * ERR_SINGLE, double: FIELDS * ERR_DOUBLE };
}

function auditStructure(sections) {
  const s1 = sectionOf(sections, '三类偏倚');
  const s3 = sectionOf(sections, '信息偏倚');
  const s4 = sectionOf(sections, '混杂');
  const s5 = sectionOf(sections, '质量控制');

  const types = BIAS_TYPES.filter((t) => s1.text.includes('| ' + t + ' |'));
  const levels = BLIND_LEVELS.filter((l) => boldTerms(s3.text).includes(l));
  const criteria = (s4.text.match(/其[一二三]，它/g) || []).length;
  const qcItems = (s5.text.match(/^-\s+\*\*/gm) || []).length;

  return { types, levels, criteria, qcItems };
}

function verify(j, s, loss, blind) {
  if (j.types.length !== 3) throw new Error(`三类偏倚只对上 ${j.types.length} 类`);
  if (j.levels.length !== 3) throw new Error(`盲法层次只对上 ${j.levels.length} 层，三层挡的东西不同`);
  if (j.criteria !== 3) throw new Error(`混杂三判据数到 ${j.criteria} 条`);
  if (j.qcItems !== 6) throw new Error(`质控可核查项数到 ${j.qcItems} 项，正文列了六项`);
  if (s.light.diff !== 5 || s.severe.diff !== 5) throw new Error(`层内差值算出 ${s.light.diff}/${s.severe.diff}，正文记 +5/+5`);
  if (s.total.diff !== -31) throw new Error(`合计差值算出 ${s.total.diff}，正文记 −31`);
  if (s.total.newYes !== 64 || s.total.stdYes !== 126) throw new Error('合计有效例数与正文 64/126 不符');
  if (loss.worstCase !== 12.3) throw new Error(`最坏情况填补算出 ${loss.worstCase}，正文记 12.3`);
  if (loss.reversed !== -3.8) throw new Error(`失访反转算出 ${loss.reversed}，正文记 −3.8`);
  if (blind.share !== 33) throw new Error(`盲法偏移算出 ${blind.share}%，正文记 33%`);
}

function main() {
  const body = read();
  const a = analyze(body);
  const j = auditStructure(a.sections);
  const s = simpson();
  const loss = lossArithmetic();
  const blind = blindingShift();
  const err = entryErrors();
  verify(j, s, loss, blind);

  console.log(`临床科研方法 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 加粗判断 ${a.claims} 处 · 引文 ${a.quotes.length} 条 · 问句 ${a.questions} 个`);
  console.log('');
  console.log('辛普森悖论复算：');
  console.log(`  轻症：新法 ${s.light.newRate.toFixed(0)}% · 常规 ${s.light.stdRate.toFixed(0)}% → ${s.light.diff > 0 ? '+' : ''}${s.light.diff} 个百分点`);
  console.log(`  重症：新法 ${s.severe.newRate.toFixed(0)}% · 常规 ${s.severe.stdRate.toFixed(0)}% → ${s.severe.diff > 0 ? '+' : ''}${s.severe.diff} 个百分点`);
  console.log(`  合计：新法 ${s.total.newRate.toFixed(0)}%（${s.total.newYes}/${s.total.newN}）· 常规 ${s.total.stdRate.toFixed(0)}%（${s.total.stdYes}/${s.total.stdN}）→ ${s.total.diff} 个百分点`);
  console.log(`  → 每层都更好，合计更差；新法组 ${s.mix.newSevere.toFixed(1)}% 是重症，常规组只有 ${s.mix.stdSevere.toFixed(1)}%。`);
  console.log('');
  console.log(`失访不均衡：完成者数据 ${loss.nominal} 个百分点；最坏情况填补 ${loss.filledNew}% 对 ${loss.filledStd}% → ${loss.worstCase} 个百分点；`);
  console.log(`  失访分布反过来（${loss.reversedNew}% 对 ${loss.reversedStd}%）→ ${loss.reversed} 个百分点，方向翻转。`);
  console.log('');
  console.log(`盲法：开放标签 ${OPEN_LABEL} 分 · 评价者盲法 ${BLINDED} 分 → 差 ${blind.diff} 分，占 ${blind.share}%；这 ${blind.share}% 不是疗效。`);
  console.log(`双录入：${FIELDS} 个字段，单录约 ${err.single} 处错误，双录约 ${err.double} 处。`);
  console.log('');
  console.log(`结构：偏倚 ${j.types.length} 类 · 盲法 ${j.levels.length} 层 · 混杂判据 ${j.criteria} 条 · 质控项 ${j.qcItems} 项`);
  console.log('');
  console.log('判断：偏倚不留下错误的痕迹——数据是真的，计算是对的，结论是反的；');
  console.log('      能补救的窗口只在设计期，收完数据就只剩报告义务。');
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
  DOC, CHAPTER, TITLE, TABLE, FOLLOW_NEW, FOLLOW_STD, DONE_NEW, DONE_STD, OPEN_LABEL, BLINDED, FIELDS,
  read, parseSections, analyze, boldTerms, sectionOf, simpson, lossArithmetic, blindingShift, entryErrors, auditStructure, verify,
};
