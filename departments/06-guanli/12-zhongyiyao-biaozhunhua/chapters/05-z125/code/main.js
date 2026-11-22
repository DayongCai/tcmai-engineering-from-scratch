#!/usr/bin/env node
/**
 * 中医药标准化 · 第 5 章 · 一张古方的标准，卡在「一两」是多少克
 * 课程: departments/06-guanli/12-zhongyiyao-biaozhunhua/chapters/05-z125/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的结构与数字全部从正文现算：
 *   标准化的三件对象、三重不确定、三条折算路线、炮制三件、基准样品五步，
 *   以及「十三点八 ÷ 三」的倍差与出膏率区间的宽度。
 * 不写死常数：正文一改，重跑即可看出哪一行对不上，测试再把结论固定下来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '5';
const SLUG = '05-z125';
const TITLE = '一张古方的标准，卡在「一两」是多少克';

/** 标准化的三件对象，正文第一节 */
const OBJECTS = ['组成', '炮制', '煎服法'];

/** 剂量不确定的三处来源，正文第二节 */
const UNCERTAINTIES = ['衡制变迁', '传抄讹误', '地方惯用'];

/** 三条处理路线，正文第二节 */
const ROUTES = ['考古实物', '方书自注', '临床惯用'];

/** 炮制项要写到的三件，正文第三节 */
const PROCESSING = ['辅料种类', '比例范围', '终点判断'];

/** 基准样品的链，正文第五节按箭头顺序 */
const BASELINE_CHAIN = ['固定饮片', '固定加水量与煎煮次数', '固定浓缩与干燥方式', '基准样品', '测出膏率与指标成分转移率'];

/** 每节一个探针词：第 i 个必须出现在第 i 节 */
const SECTION_PROBES = [
  '标准化的对象是三件',
  '三条路线不可能同时满足',
  '炮制品规格',
  '它约束的是体积比',
  '出膏率',
  '本方加减不属于本标准范围',
  '择一有代价',
];

const NUM = '一二三四五六七八九十百千万两';
const NUMD = '一二三四五六七八九十百千万两点';
const LINES = /\r?\n/;

const readDoc = (file = DOC) => fs.readFileSync(file, 'utf8');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const occurrences = (text, term) => String(text).split(term).length - 1;

const CN_DIGIT = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
const CN_UNIT = { 十: 10, 百: 100, 千: 1000 };

function cnInt(s) {
  if (!s) return 0;
  if (/^[零一二三四五六七八九两]+$/.test(s)) {
    return Number([...s].map((c) => CN_DIGIT[c]).join(''));
  }
  let total = 0;
  let section = 0;
  let num = 0;
  for (const ch of s) {
    if (ch === '万') {
      section = (section + num) * 10000;
      total += section;
      section = 0;
      num = 0;
    } else if (CN_UNIT[ch]) {
      section += (num || 1) * CN_UNIT[ch];
      num = 0;
    } else if (CN_DIGIT[ch] !== undefined) {
      num = CN_DIGIT[ch];
    }
  }
  return total + section + num;
}

function cn2num(s) {
  const raw = String(s || '').trim();
  if (!raw) return NaN;
  const [intPart, decPart] = raw.split('点');
  const intVal = cnInt(intPart);
  if (decPart === undefined) return intVal;
  const dec = [...decPart].map((c) => CN_DIGIT[c]).join('');
  return Number(`${intVal}.${dec}`);
}

function h2Titles(text) {
  const out = [];
  for (const line of String(text).split(LINES)) {
    const m = /^##\s+(.+)$/.exec(line.trim());
    if (m) out.push(m[1].trim());
  }
  return out;
}

function h2Sections(text) {
  const out = [];
  let cur = null;
  for (const line of String(text).split(LINES)) {
    const m = /^##\s+(.+)$/.exec(line.trim());
    if (m) {
      cur = { title: m[1].trim(), body: [line] };
      out.push(cur);
    } else if (cur) cur.body.push(line);
  }
  return out.map((s) => ({ title: s.title, body: s.body.join('\n') }));
}

const sectionAt = (text, i) => h2Sections(text)[i] || { title: '', body: '' };

function tableBlocks(text) {
  const blocks = [];
  let cur = null;
  for (const line of String(text).split(LINES)) {
    const s = line.trim();
    if (s.startsWith('|')) {
      if (!cur) {
        cur = [];
        blocks.push(cur);
      }
      cur.push(s);
    } else cur = null;
  }
  return blocks.map((b) => {
    const cells = b.map((r) => r.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()));
    return { head: cells[0] || [], rows: cells.slice(2) };
  });
}

function grams(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

const numFrom = (text, re) => {
  const m = re.exec(text);
  return m ? cn2num(m[1]) : NaN;
};

/** 基准样品链：从「固定饮片」起按箭头顺序逐个向后找，避免撞上第三节的同名词 */
function chain(text) {
  let from = text.indexOf(BASELINE_CHAIN[0]);
  if (from < 0) return BASELINE_CHAIN.map((t) => ({ t, at: -1 }));
  const out = [];
  for (const t of BASELINE_CHAIN) {
    const at = text.indexOf(t, from);
    out.push({ t, at });
    if (at >= 0) from = at + t.length;
  }
  return out;
}

/** 确定顺序：正文说合理的顺序是先煎服法、再炮制、最后剂量 */
function order(text) {
  const body = sectionAt(text, 0).body;
  const i = body.indexOf('合理的顺序是');
  const seg = i < 0 ? '' : body.slice(i);
  const seq = ['煎服法', '炮制', '剂量'].map((t) => ({ t, at: seg.indexOf(t) }));
  return seq;
}

/** 两条折算口径与倍差：一两折十三点八克 vs 折三克 */
function conversion(text) {
  const high = numFrom(text, new RegExp(`一两约折([${NUMD}]+)克`));
  const low = numFrom(text, new RegExp(`一两折([${NUMD}]+)克左右`));
  const ratio = high / low;
  return { high, low, ratio };
}

/**
 * 出膏率区间：正文说十批标准汤剂的出膏率落在某个区间，判据要给区间不给单值。
 * 区间的两个端点与批次数都从正文读取。
 */
function extractRange(text) {
  const m = new RegExp(`出膏率落在百分之([${NUM}]+)到([${NUM}]+)之间`).exec(text);
  const low = m ? cn2num(m[1]) : NaN;
  const high = m ? cn2num(m[2]) : NaN;
  const batches = numFrom(text, new RegExp(`([${NUM}]+)批标准汤剂`));
  return { low, high, width: high - low, batches };
}

function quizSummary(quiz, text) {
  const body = grams(text);
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stage = { pre: 0, check: 0, post: 0 };
  for (const q of qs) if (stage[q.stage] !== undefined) stage[q.stage] += 1;
  const hits = qs
    .filter((q) => q.stage === 'check')
    .map((q) => {
      const right = String((q.options || [])[q.correct] || '');
      return { question: q.question, grams: [...grams(right)].filter((g) => body.has(g)) };
    });
  return {
    total: qs.length,
    stage,
    check: hits.length,
    grounded: hits.filter((h) => h.grams.length).length,
    hits,
    spread: new Set(qs.map((q) => q.correct)).size,
    minExplain: Math.min(...qs.map((q) => hanzi(q.explain))),
  };
}

function analyze() {
  const text = readDoc();
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  return {
    hanzi: hanzi(text),
    sections: h2Titles(text),
    objects: OBJECTS.map((t) => ({ t, n: occurrences(text, t) })),
    uncertainties: UNCERTAINTIES.map((t) => ({ t, n: occurrences(text, t) })),
    routes: ROUTES.map((t) => ({ t, n: occurrences(text, t) })),
    processing: PROCESSING.map((t) => ({ t, n: occurrences(text, t) })),
    chain: chain(text),
    order: order(text),
    conv: conversion(text),
    range: extractRange(text),
    boundary: /本方加减不属于本标准范围/.test(text),
    probes: SECTION_PROBES.map((p, i) => ({ probe: p, ok: sectionAt(text, i).body.includes(p) })),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  console.log(`中医药标准化 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`三件对象：${r.objects.map((x) => `${x.t}(${x.n})`).join(' · ')}`);
  console.log(`三重不确定：${r.uncertainties.map((x) => `${x.t}(${x.n})`).join(' · ')}`);
  console.log(`三条路线：${r.routes.map((x) => `${x.t}(${x.n})`).join(' · ')}`);
  console.log(`炮制三件：${r.processing.map((x) => `${x.t}(${x.n})`).join(' · ')}`);
  console.log('');
  console.log('确定顺序（正文第 1 节，「合理的顺序是」之后首次出现的次序）：');
  console.log('  ' + r.order.map((x) => `${x.t}@${x.at}`).join(' → '));
  console.log('');
  const c = r.conv;
  console.log('折算倍差（两个口径均读自正文）：');
  console.log(`  一两 ≈ ${c.high} 克 vs 一两 ≈ ${c.low} 克 → 相差 ${c.ratio.toFixed(1)} 倍`);
  console.log('');
  const g = r.range;
  console.log('出膏率（正文十批的实测区间）：');
  console.log(`  ${g.low}%–${g.high}%，宽度 ${g.width} 个百分点；批次 ${g.batches}`);
  console.log(`  判据给区间不给单值：${Number.isNaN(g.width) ? '未读到' : '区间已在正文'}`);
  console.log('');
  console.log('基准样品链（第五节箭头顺序）：');
  r.chain.forEach((x, i) => console.log(`  ${i + 1}. ${x.t}`));
  console.log(`加减在标准范围之外：${r.boundary ? '已写' : '未写'}`);
  console.log('');
  console.log('小节探针（每节一个词，须落在本节）：');
  console.log('  ' + r.probes.map((p) => `${p.ok ? '✓' : '✗'} ${p.probe}`).join(' · '));
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）· 答案落在 ${r.quiz.spread} 个位置 · 最短解释 ${r.quiz.minExplain} 汉字`
  );
  console.log('');
  console.log('※ 以上结构与数字全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为名方标准化方法的教学讨论，不构成诊疗、处方、剂量或药品质量判定建议。');
}

if (require.main === module) main();

module.exports = {
  analyze,
  readDoc,
  hanzi,
  occurrences,
  cn2num,
  cnInt,
  h2Titles,
  h2Sections,
  sectionAt,
  tableBlocks,
  grams,
  order,
  conversion,
  extractRange,
  chain,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  OBJECTS,
  UNCERTAINTIES,
  ROUTES,
  PROCESSING,
  BASELINE_CHAIN,
  SECTION_PROBES,
};
