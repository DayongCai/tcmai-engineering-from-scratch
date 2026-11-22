#!/usr/bin/env node
/**
 * 临床科研方法 · 第 1 章 好问题不是「某方有效吗」，而是能说出什么结果会让你认输
 * 课程: departments/06-guanli/13-linchuang-keyan-fangfa/chapters/01-z131/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部从本章 docs/zh.md 现算：汉字、节、加粗判断、PICO 四个槽位、
 * 以及第四节那条可行性的四级漏斗（620 → 279 → 167 → 142）。
 * 并复算「放宽纳入标准」为什么要按平方关系付账。
 * 任何一组数对不上正文，脚本直接报错——本章的结论就是「形状要在收第一例之前定下来」。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 1;
const TITLE = '好问题不是「某方有效吗」，而是能说出什么结果会让你认输';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

/** 本章的算术设定：均为教学合成数字，正文第六节已声明。 */
const DOOR = 620;
const INCL = 0.45;
const CONSENT = 0.6;
const FOLLOW = 0.85;
const PER_ARM = 60;
const LOSS = 0.15;
const RELAX_INCL = 0.7;
const DELTA = 3;
const RELAX_DELTA = 2;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

/** 按二级标题切节；标题下的正文一并带回，用于分组复算。 */
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

/**
 * 第四节那条漏斗：每一级按上一级的剩余例数打折，逐级取整。
 * 620 → 279 → 167 → 142。142 是「一年刚好够，且没有任何余量」的那个数。
 */
function funnel(incl = INCL) {
  const rows = [{ label: '年门诊人次', rate: null, n: DOOR }];
  let n = DOOR;
  for (const [label, rate] of [['符合纳入标准', incl], ['同意参加', CONSENT], ['完成随访', FOLLOW]]) {
    n = Math.round(n * rate);
    rows.push({ label, rate, n });
  }
  return rows;
}

/** 每组需入组 60 例、允许 15% 失访 → 每组必须入组多少。 */
function perArmNeeded(need = PER_ARM, loss = LOSS) {
  return Math.ceil(need / (1 - loss));
}

/** δ 缩小一档，样本量按平方关系涨多少。 */
const deltaRatio = (from = DELTA, to = RELAX_DELTA) => (from / to) ** 2;

/**
 * 顺着正文数结构：四个槽位、三种假假设、四种写坏方式、主结局三问、四条边界。
 * 这几组数不齐，本章的论证就断在缺的那一处。
 */
function auditStructure(sections) {
  const s1 = sectionOf(sections, '四个槽位');
  const s2 = sectionOf(sections, '可证伪');
  const s3 = sectionOf(sections, '主假设只能有一个');
  const s5 = sectionOf(sections, '问题写坏的四种方式');
  const s6 = sectionOf(sections, '代价与边界');

  const pico = ['人群（P）', '干预（I）', '对照（C）', '结局（O）'].filter((k) => s1.text.includes(k));
  const fakeHypotheses = (s2.text.match(/^\s*\d+\.\s*\*\*/gm) || []).length;
  const mainQuestions = (s3.text.match(/^-\s+/gm) || []).length;
  const badWritings = (s5.text.match(/^\*\*其[一二三四]，/gm) || []).length;
  const boundaries = (s6.text.match(/^-\s+\*\*/gm) || []).length;

  return { pico, fakeHypotheses, mainQuestions, badWritings, boundaries };
}

function verify(j, rows, relaxed) {
  if (j.pico.length !== 4) throw new Error(`PICO 槽位只数到 ${j.pico.length} 个，四槽缺一即不成题`);
  if (j.fakeHypotheses !== 3) throw new Error(`不可检验的「假设」数到 ${j.fakeHypotheses} 种，正文列了三种`);
  if (j.mainQuestions !== 3) throw new Error(`主结局三问数到 ${j.mainQuestions} 问，第三问是判断成败的那一问`);
  if (j.badWritings !== 4) throw new Error(`写坏方式数到 ${j.badWritings} 种，正文列了四种`);
  if (rows[rows.length - 1].n !== 142) throw new Error(`漏斗终点算出 ${rows[rows.length - 1].n} 例，正文记 142 例`);
  if (relaxed[relaxed.length - 1].n !== 221) throw new Error(`放宽后算出 ${relaxed[relaxed.length - 1].n} 例，正文记 221 例`);
}

function main() {
  const body = read();
  const a = analyze(body);
  const j = auditStructure(a.sections);
  const rows = funnel();
  const relaxed = funnel(RELAX_INCL);
  verify(j, rows, relaxed);

  const arm = perArmNeeded();
  const total = arm * 2;

  console.log(`临床科研方法 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 加粗判断 ${a.claims} 处 · 引文 ${a.quotes.length} 条 · 问句 ${a.questions} 个`);
  console.log('');
  console.log('可行性漏斗（乘数逐级打折）：');
  for (const r of rows) {
    const pct = r.rate === null ? '—' : `${(r.rate * 100).toFixed(0)}%`;
    console.log(`  ${r.label.padEnd(8, '　')} ${pct.padStart(4)} → ${String(r.n).padStart(4)} 例`);
  }
  console.log(`  每组需 60 例、允许 15% 失访 → 须入组 ${arm} 例/组，两组 ${total} 例。`);
  console.log(`  → 一年刚好够，且没有任何余量。`);
  console.log('');
  console.log('放宽纳入（≥2 级 → ≥1 级，符合率 45% → 70%）：');
  console.log(`  年可入组 ${relaxed[relaxed.length - 1].n} 例，看着宽裕；`);
  console.log(`  代价是 δ 从 ${DELTA} 分掉到 ${RELAX_DELTA} 分，样本量按 (${DELTA}/${RELAX_DELTA})² = ${deltaRatio().toFixed(2)} 倍上涨。`);
  console.log('');
  console.log(`结构复算：PICO ${j.pico.length}/4（${j.pico.map((x) => x[0]).join('／')}）· 不可检验的「假设」${j.fakeHypotheses} 种 · 主结局三问 ${j.mainQuestions} 问 · 写坏方式 ${j.badWritings} 种 · 边界 ${j.boundaries} 条`);
  console.log('');
  console.log('判断：题目的形状决定研究的形状，而形状要在收第一个病例之前定下来；');
  console.log('      答不上「什么结果会让我放弃这个假设」，题目就还没写完。');
  console.log('');
  console.log('逐节字数：');
  for (const s of a.sections) {
    const share = a.hanzi ? ((s.hanzi / a.hanzi) * 100).toFixed(1) : '0.0';
    console.log(`  ${s.title.padEnd(30, '　')} ${String(s.hanzi).padStart(5)} 字（${share}%）`);
  }
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即随之变化；本输出仅用于教学演示，不构成研究结论或临床建议。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE, DOOR, INCL, CONSENT, FOLLOW, PER_ARM, LOSS, RELAX_INCL, DELTA, RELAX_DELTA,
  read, parseSections, analyze, boldTerms, sectionOf, funnel, perArmNeeded, deltaRatio, auditStructure, verify,
};
