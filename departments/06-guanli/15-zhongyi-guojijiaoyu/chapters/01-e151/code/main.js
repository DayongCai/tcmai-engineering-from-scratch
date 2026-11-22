#!/usr/bin/env node
/**
 * 中医国际教育 · 第 1 章 · 中医走出去，走的不是文化，是接口
 * 课程: departments/06-guanli/15-zhongyi-guojijiaoyu/chapters/01-e151/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的结构与数字全部从正文现算：
 *   三条路径与各自的遗产、三次形态位移、三条判据，
 *   以及「900 学时压到 320、临床只剩 40 小时观察」那笔账和「本地十五年」的门槛。
 * 不写死结论：正文一改，重跑就能看出是哪一行对不上，测试再把结论固定下来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '1';
const SLUG = '01-e151';
const TITLE = '中医走出去，走的不是文化，是接口';

/** 三条路径的名字，正文第一节按序给出；名字变了这里就该红 */
const PATHS = ['文本先行', '人员流动', '标准与立法'];
/** 三次形态位移，正文第三节 */
const SHIFTS = ['从师带到班', '从班到学院', '从学院到大学'];

const LINES = /\r?\n/;

const readDoc = (file = DOC) => fs.readFileSync(file, 'utf8');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const occurrences = (text, term) => String(text).split(term).length - 1;

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

/** 正文里长度为 n 的连续汉字片段，用来判一道题是否接地 */
function grams(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

/** 第一节：三条路径，各自留下什么遗产 */
function paths(text) {
  const body = sectionAt(text, 0).body;
  const out = [];
  for (const m of body.matchAll(/\*\*第([一二三])条路径是(.+?)，遗产是(.+?)。\*\*/g)) {
    out.push({ n: m[1], name: m[2].trim(), legacy: m[3].trim() });
  }
  return out;
}

/** 第三节：三次位移，每次把哪一部分裁量权交出去 */
function shifts(text) {
  const body = sectionAt(text, 2).body;
  const out = [];
  for (const m of body.matchAll(/\*\*第([一二三])次是(.+?)。\*\*/g)) out.push({ n: m[1], name: m[2].trim() });
  return out;
}

/** 第四节：三条判据的追问句 */
function criteria(text) {
  const body = sectionAt(text, 3).body;
  const out = [];
  for (const m of body.matchAll(/\*\*第([一二三])，([^？]+)？\*\*/g)) out.push({ n: m[1], ask: m[2].trim() });
  return out;
}

/**
 * 开头那笔学时账：
 *   900 学时 → 320 学时；「临床」一栏 40 小时观察。
 * 四个数都读自正文，压缩比与临床占比由此现算。
 */
function hourBudget(text) {
  const total = Number((/临床见习与跟师合计约\s*(\d+)\s*学时/.exec(text) || [])[1]);
  const packed = Number((/总学时压到\s*(\d+)/.exec(text) || [])[1]);
  const clinic = Number((/「临床」一栏填的是\s*(\d+)\s*小时/.exec(text) || [])[1]);
  return {
    total,
    packed,
    clinic,
    cut: total - packed,
    keepRatio: packed / total,
    clinicShare: clinic / packed,
    /** 每学时里真正用于观察病人的分钟数 */
    clinicMinutesPerHour: (clinic * 60) / packed,
  };
}

const CN_DIGIT = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
const CN_UNIT = { 十: 10, 百: 100, 千: 1000 };
const CN_NUM = '[零一二三四五六七八九十百千两]+';

/** 中文数字 → 数值（本章只用到「三十」「十五」这类两位以内的写法） */
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

/** 第二节：传统草药注册的「三十年／本地十五年」门槛 */
function herbalGate(text) {
  const m = new RegExp(`不少于(${CN_NUM})年使用史[^。]{0,12}?其中至少(${CN_NUM})年在欧盟境内`).exec(text);
  const years = m ? cn2num(m[1]) : NaN;
  const local = m ? cn2num(m[2]) : NaN;
  return { years, local, localShare: local / years };
}

/** quiz 结构与接地：check 题正确选项能在正文里对上几个四字原词 */
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
    paths: paths(text),
    shifts: shifts(text),
    criteria: criteria(text),
    budget: hourBudget(text),
    gate: herbalGate(text),
    interfaceHits: occurrences(text, '接口'),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  const b = r.budget;
  console.log(`中医国际教育 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`三条路径与遗产（第 1 节）：`);
  for (const p of r.paths) console.log(`  第${p.n}条 ${p.name} → 遗产：${p.legacy}`);
  console.log('');
  console.log(`学时账（四个数均读自正文）：`);
  console.log(`  ${b.total} → ${b.packed} 学时，砍掉 ${b.cut}；只剩 ${(b.keepRatio * 100).toFixed(1)}%`);
  console.log(`  「临床」${b.clinic} 小时观察，占剩下学时的 ${(b.clinicShare * 100).toFixed(1)}%（每小时约 ${b.clinicMinutesPerHour.toFixed(2)} 分钟）`);
  console.log('');
  console.log(`传统草药门槛：${r.gate.years} 年使用史，其中本地 ${r.gate.local} 年（${(r.gate.localShare * 100).toFixed(0)}%）`);
  console.log('');
  console.log(`三次形态位移（第 3 节）：${r.shifts.map((s) => s.name).join(' → ')}`);
  console.log(`三条判据（第 4 节）：`);
  for (const c of r.criteria) console.log(`  第${c.n}，${c.ask}`);
  console.log(`「接口」在正文出现 ${r.interfaceHits} 次。`);
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）· 答案 ${r.quiz.answers.join('/')} · 最短解释 ${r.quiz.minExplain} 汉字`
  );
  console.log('');
  console.log('※ 以上结构与数字全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为教育制度与跨境办学的教学讨论，不构成法律、合规或教育认证意见。');
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
  paths,
  shifts,
  criteria,
  hourBudget,
  herbalGate,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  PATHS,
  SHIFTS,
};
