#!/usr/bin/env node
/**
 * 中医国际教育 · 第 5 章 · 合作办学签的是协议，赌的是师资与病床
 * 课程: departments/06-guanli/15-zhongyi-guojijiaoyu/chapters/05-e155/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的结构与数字全部从正文现算：
 *   四种形态与各自的负担、师资三项成本、临床基地三问、认证五要素、退出四件事，
 *   以及「80% 篇幅」「两年一轮换 → 五年三轮」「真实周期十年」这几笔账。
 * 不写死结论：正文一改，重跑就能看出是哪一行对不上，测试再把结论固定下来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '5';
const SLUG = '05-e155';
const TITLE = '合作办学签的是协议，赌的是师资与病床';

/** 四种形态，正文第一节按序给出 */
const FORMS = ['课程输出', '联合培养与双学位', '境外办学机构', '培训中心与继续教育'];
/** 师资三项成本，正文第二节 */
const COSTS = ['派驻', '本地化', '解释权的转移'];
/** 临床基地三问，正文第三节 */
const CLINIC_ISSUES = ['产权与使用权', '责任归属', '病例构成'];
/** 认证五要素，正文第四节一句话列全 */
const ACCREDITATION = ['治理结构', '师资资质', '学习成果的设计与测量', '学生支持服务', '质量改进机制'];
/** 退出时最脆弱的四件事，正文第四节 */
const EXIT_ITEMS = ['学籍算哪边的', '已修学分能否转出', '剩下几年由谁授课', '学费怎么退'];

const LINES = /\r?\n/;

const readDoc = (file = DOC) => fs.readFileSync(file, 'utf8');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const occurrences = (text, term) => String(text).split(term).length - 1;

const CN_DIGIT = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
const CN_UNIT = { 十: 10, 百: 100, 千: 1000 };
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
  for (const m of String(body).matchAll(/\*\*([^*。]{2,12})。\*\*/g)) out.push(m[1].trim());
  return out;
}

/** 第二节：三项成本，第三种写作「第三项成本，也是最容易被忽略的：……」 */
function costs(text) {
  const body = sectionAt(text, 1).body;
  const out = [];
  for (const m of body.matchAll(/\*\*第([一二三])项成本(?:，也是最容易被忽略的)?[：是]?([^*。]+?)。\*\*/g)) {
    out.push({ n: m[1], name: m[2].trim() });
  }
  return out;
}

/** 第四节：认证五要素与退出四件事，各自一句列全 */
function lists(text) {
  const body = sectionAt(text, 3).body;
  const acc = /评估的框架高度相似：([^。]+)。/.exec(body);
  const exit = /最脆弱的是在读学生：([^。]+)。/.exec(body);
  return {
    accreditation: acc ? acc[1].split('、').map((s) => s.trim()) : [],
    exit: exit ? exit[1].split('、').map((s) => s.trim()) : [],
  };
}

/**
 * 周期账：
 *   五年制课程 × 两年一轮换 → 需要几轮；正文说三轮，现算取上界。
 *   另一笔：80% 篇幅给三件事，剩两成留给师资与基地。
 */
function cycleLedger(text) {
  const ym = /一个([一二三四五六七八九十]+)年制项目需要/.exec(text);
  const years = ym ? cn2num(ym[1]) : NaN;
  const rot = /按([一二三两])年一轮换/.exec(text);
  const rotation = rot ? cn2num(rot[1]) : NaN;
  const stated = /需要([一二三])轮派驻/.exec(text);
  const statedRounds = stated ? cn2num(stated[1]) : NaN;
  const real = /真实周期是([一二三四五六七八九十]+)年，不是([一二三四五六七八九十]+)年/.exec(text);
  const realYears = real ? cn2num(real[1]) : NaN;
  const plannedYears = real ? cn2num(real[2]) : NaN;
  const share = /通常把\s*(\d+)%\s*的篇幅/.exec(text);
  const percent = share ? Number(share[1]) : NaN;
  return {
    years,
    rotation,
    rounds: Math.ceil(years / rotation),
    statedRounds,
    realYears,
    plannedYears,
    percent,
    remainingPercent: 100 - percent,
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
    forms: boldHeads(sectionAt(text, 0).body),
    costs: costs(text),
    clinicIssues: boldHeads(sectionAt(text, 2).body),
    lists: lists(text),
    cycle: cycleLedger(text),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  const c = r.cycle;
  console.log(`中医国际教育 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`四种形态（第 1 节）：${r.forms.join(' / ')}`);
  console.log(`师资三项成本（第 2 节）：${r.costs.map((x) => x.name).join(' / ')}`);
  console.log(`临床基地三问（第 3 节）：${r.clinicIssues.join(' / ')}`);
  console.log(`认证五要素（第 4 节）：${r.lists.accreditation.join(' · ')}`);
  console.log(`退出四件事：${r.lists.exit.join(' · ')}`);
  console.log('');
  console.log('周期账（读自正文）：');
  console.log(`  ${c.years} 年制项目 ÷ ${c.rotation} 年一轮换 = 需要 ${c.rounds} 轮（正文自述 ${c.statedRounds} 轮）`);
  console.log(`  真实周期 ${c.realYears} 年，不是 ${c.plannedYears} 年`);
  console.log(`  协议篇幅：${c.percent}% 给招生／分成／证书，剩下 ${c.remainingPercent}% 留给师资与基地`);
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）· 答案 ${r.quiz.answers.join('/')} · 最短解释 ${r.quiz.minExplain} 汉字`
  );
  console.log('');
  console.log('※ 以上结构与数字全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为跨境办学的教学讨论，不构成法律、投资或教育认证意见。');
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
  costs,
  lists,
  cycleLedger,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  FORMS,
  COSTS,
  CLINIC_ISSUES,
  ACCREDITATION,
  EXIT_ITEMS,
};
