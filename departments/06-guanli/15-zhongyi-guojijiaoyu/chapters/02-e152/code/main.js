#!/usr/bin/env node
/**
 * 中医国际教育 · 第 2 章 · 名字定不下来，课就讲不下去
 * 课程: departments/06-guanli/15-zhongyi-guojijiaoyu/chapters/02-e152/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的结构与数字全部从正文现算：
 *   三层标准各管什么、三种失配、三种不可译处理、四道工程约束，
 *   以及「300 个术语 × 每个 2–3 个版本 × 每次 30 分钟」折成的那笔工时账。
 * 不写死结论：正文一改，重跑就能看出是哪一行对不上，测试再把结论固定下来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '2';
const SLUG = '02-e152';
const TITLE = '名字定不下来，课就讲不下去';

/** 三层标准，正文第一节按序给出；各自管什么一并核 */
const LAYERS = ['术语标准', '分类标准', '产品与服务标准'];
/** 三种失配，正文第二节 */
const MISMATCHES = ['一对多', '假朋友', '过度归化'];
/** 三种不可译处理，正文第三节 */
const TREATMENTS = ['音译加定义', '保留原词加注释', '拒绝等号式对译'];
/** 四道工程约束，正文第四节 */
const CONSTRAINTS = ['编码', '多语种一致', '版本的不可逆', '维护的组织成本'];

const LINES = /\r?\n/;

const readDoc = (file = DOC) => fs.readFileSync(file, 'utf8');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const occurrences = (text, term) => String(text).split(term).length - 1;

const CN_DIGIT = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
const CN_UNIT = { 十: 10, 百: 100, 千: 1000 };
const CN_NUM = '[零一二三四五六七八九十百千两]+';
const CN_CHARS = '零一二三四五六七八九十百千两';

function cn2num(s) {
  let total = 0;
  let num = 0;
  for (const ch of String(s || '')) {
    if (CN_UNIT[ch]) {
      total += (num || 1) * CN_UNIT[ch];
      num = 0;
    } else if (CN_DIGIT[ch] !== undefined) {
      num = CN_DIGIT[ch];
    }
  }
  return total + num;
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

const h2Titles = (text) => h2Sections(text).map((s) => s.title);
const sectionAt = (text, i) => h2Sections(text)[i] || { title: '', body: '' };

function grams(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

/** 某节里以「**标题。**」起头的段首句 */
function boldHeads(body) {
  const out = [];
  for (const m of String(body).matchAll(/\*\*([^*。]{2,10})。\*\*/g)) out.push(m[1].trim());
  return out;
}

/** 第一节：三层标准，各管一件事 */
function layers(text) {
  const body = sectionAt(text, 0).body;
  const out = [];
  for (const m of body.matchAll(/\*\*第([一二三])层是(.+?)，管「(.+?)」。\*\*/g)) {
    out.push({ n: m[1], name: m[2].trim(), scope: m[3].trim() });
  }
  return out;
}

/** 第二节：三种失配 */
function mismatches(text) {
  const body = sectionAt(text, 1).body;
  const out = [];
  for (const m of body.matchAll(/\*\*第([一二三])种是(.+?)。\*\*/g)) out.push({ n: m[1], name: m[2].trim() });
  return out;
}

/**
 * 开头那笔工时账：术语数 × 版本数 × 每次共识分钟数 → 小时。
 * 四个输入全部读自正文，上下界都算，再与正文自述的区间对读。
 */
function consensusCost(text) {
  const terms = Number((/收\s*(\d+)\s*个核心术语/.exec(text) || [])[1]);
  const vm = new RegExp(`平均每个有([${CN_CHARS}])到([${CN_CHARS}])个版本`).exec(text);
  const lowV = vm ? cn2num(vm[1]) : NaN;
  const highV = vm ? cn2num(vm[2]) : NaN;
  const minutes = Number((/一次\s*(\d+)\s*分钟/.exec(text) || [])[1]);
  const sm = new RegExp(`就是\\s*(\\d+)\\s*至\\s*(\\d+)\\s*小时`).exec(text);
  const statedLow = sm ? Number(sm[1]) : NaN;
  const statedHigh = sm ? Number(sm[2]) : NaN;
  const hoursLow = (terms * lowV * minutes) / 60;
  const hoursHigh = (terms * highV * minutes) / 60;
  return { terms, lowV, highV, minutes, statedLow, statedHigh, hoursLow, hoursHigh };
}

/** 标准落地的年份与组织，正文第一、四节各提一次 */
function standardsFacts(text) {
  return {
    whoTerms: Number((/于\s*(\d{4})\s*年发布《传统医学术语国际标准》/.exec(text) || [])[1]),
    isoCommittee: Number((/于\s*(\d{4})\s*年设立中医药技术委员会/.exec(text) || [])[1]),
    icd11: /第十一次修订本/.test(text),
    secretariatInChina: /秘书处由中国承担/.test(text),
  };
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
    answers: qs.map((q) => q.correct),
  };
}

function analyze() {
  const text = readDoc();
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  return {
    hanzi: hanzi(text),
    sections: h2Titles(text),
    layers: layers(text),
    mismatches: mismatches(text),
    treatments: boldHeads(sectionAt(text, 2).body),
    constraints: boldHeads(sectionAt(text, 3).body),
    cost: consensusCost(text),
    standards: standardsFacts(text),
    inverseRule: /可读性与概念的保真度成反比/.test(text),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  const c = r.cost;
  console.log(`中医国际教育 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log('三层标准，三种管辖（第 1 节）：');
  for (const l of r.layers) console.log(`  第${l.n}层 ${l.name} → 管「${l.scope}」`);
  console.log(`  年份与机构：术语标准 ${r.standards.whoTerms} · 技术委员会 ${r.standards.isoCommittee} · 秘书处在中国 ${r.standards.secretariatInChina ? '是' : '否'} · 分类表第十一次修订本 ${r.standards.icd11 ? '是' : '否'}`);
  console.log('');
  console.log(`三种失配（第 2 节）：${r.mismatches.map((m) => m.name).join(' / ')}`);
  console.log(`  共同点（可读性与保真度成反比）已写：${r.inverseRule ? '是' : '否'}`);
  console.log(`三种不可译处理（第 3 节）：${r.treatments.join(' / ')}`);
  console.log(`四道工程约束（第 4 节）：${r.constraints.join(' / ')}`);
  console.log('');
  console.log('工时账（四个输入均读自正文）：');
  console.log(`  ${c.terms} 个术语 × ${c.lowV}–${c.highV} 个译名版本 × ${c.minutes} 分钟/次`);
  console.log(`  → ${c.hoursLow}–${c.hoursHigh} 小时；正文自述 ${c.statedLow}–${c.statedHigh} 小时`);
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）· 答案 ${r.quiz.answers.join('/')} · 最短解释 ${r.quiz.minExplain} 汉字`
  );
  console.log('');
  console.log('※ 以上结构与数字全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为术语标准与翻译工程的教学讨论，不构成标准化、翻译或合规意见。');
}

if (require.main === module) main();

module.exports = {
  analyze,
  readDoc,
  hanzi,
  occurrences,
  cn2num,
  h2Titles,
  h2Sections,
  sectionAt,
  grams,
  boldHeads,
  layers,
  mismatches,
  consensusCost,
  standardsFacts,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  LAYERS,
  MISMATCHES,
  TREATMENTS,
  CONSTRAINTS,
};
