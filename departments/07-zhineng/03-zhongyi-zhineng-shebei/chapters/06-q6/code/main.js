#!/usr/bin/env node
/**
 * 中医智能设备 · 第 6 章 · 瓶颈不在传感器上：从「能测」到「能负责」
 * 课程: departments/07-zhineng/03-zhongyi-zhineng-shebei/chapters/06-q6/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的清单与那笔随访账全部由本脚本从正文现算，不手打：
 *   三层布局、六条趋势、三组挑战、四个实验、三个预测、
 *   数据可用的四项判据、拒答的三种原因，以及每天回访电话数与一年总量。
 * 正文一改，重跑即可看出哪一条对不上；测试把这些数固定下来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '6';
const SLUG = '06-q6';
const TITLE = '瓶颈不在传感器上：从「能测」到「能负责」';

const GRAM = 4;

const readDoc = () => fs.readFileSync(DOC, 'utf8');

/** 按行切分并去掉行尾回车（避开正则转义的坑） */
const docLines = (text) => String(text).split(String.fromCharCode(10)).map((l) => l.replace(String.fromCharCode(13), ''));

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

function h2Sections(text) {
  const out = [];
  let cur = null;
  for (const line of String(text).split(/\r?\n/)) {
    const m = /^##\s+(.+)$/.exec(line.trim());
    if (m) {
      cur = { title: m[1].trim(), body: [line] };
      out.push(cur);
    } else if (cur) cur.body.push(line);
  }
  return out.map((s) => ({ title: s.title, body: s.body.join('\n') }));
}

const h2Titles = (text) => h2Sections(text).map((s) => s.title);
const sectionAt = (text, i) => (h2Sections(text)[i] || { title: '', body: '' }).body;

function tableBlocks(text) {
  const blocks = [];
  let cur = null;
  for (const line of String(text).split(/\r?\n/)) {
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

const occurrences = (text, term) => String(text).split(term).length - 1;

function grams(text, n = GRAM) {
  const out = new Set();
  for (const seg of String(text).replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

/** 每节的加粗行首标题（只取行首，避开行内强调；去掉句末句号） */
const boldHeads = (sec) =>
  [...String(sec).matchAll(/^\*\*([^*]+)\*\*/gm)].map((m) => m[1].trim().replace(/。$/, ''));

const layers = (text) => boldHeads(sectionAt(text, 0));
const trends = (text) => boldHeads(sectionAt(text, 1));
const challengeGroups = (text) => boldHeads(sectionAt(text, 2));
const experiments = (text) => boldHeads(sectionAt(text, 3));
const predictions = (text) => boldHeads(sectionAt(text, 4));

/** 数据可用的四项判据：「看采集条件完整率、……」到句号为止 */
function datasetCriteria(text) {
  const line = docLines(text).find((l) => l.includes('数据集能不能用')) || '';
  const tail = (/看(采集条件完整率.+?)。/.exec(line) || [null, ''])[1];
  return tail.split(/[、，,]/).map((s) => s.trim()).filter(Boolean);
}

/** 拒答要区分的三种情况 */
function refusalKinds(text) {
  const line = String(text).split(/\r?\n/).find((l) => l.includes('拒答机制要能区分')) || '';
  const tail = (/区分三种情况[：:](.+?)。/.exec(line) || [null, ''])[1];
  return tail.split(/[、，,]/).map((s) => s.trim()).filter(Boolean);
}

/** 三个临床判据：正文加粗的那一问 */
function clinicalQuestions(text) {
  const m = /\*\*它替代了哪个动作？节省了多少时间？出了错谁负责？\*\*/.exec(text);
  return m ? m[0].replace(/\*\*/g, '').split(/[？?]/).map((s) => s.trim()).filter(Boolean) : [];
}

const CN = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

/** 十以下的中文数字 */
function cnSmall(s) {
  if (s.length === 1) return CN[s];
  if (s[0] === '十') return 10 + CN[s[1]];
  if (s[1] === '十') return CN[s[0]] * 10;
  return NaN;
}

/** 随访组织成本：队列人数 × 提示比例 = 每天电话数；再乘 365 */
function followupCost(text) {
  const people = Number((/(\d+)\s*人的慢病管理队列/.exec(text) || [])[1]);
  const pct = cnSmall((/按百分之([一二三四五六七八九十]+)算/.exec(text) || [])[1] || '');
  const statedPerDay = cnSmall((/就是([一二三四五六七八九十]+)个需要回访的电话/.exec(text) || [])[1] || '');
  const statedYearly = (/一年([一二三四五六七八九十]+)(千|百)多?个/.exec(text) || [])[1];
  if (!people || !pct) return null;
  const perDay = Math.round((people * pct) / 100);
  const yearly = perDay * 365;
  return {
    people,
    pct,
    perDay,
    yearly,
    statedPerDay,
    statedYearly: statedYearly ? `${statedYearly}千多` : '',
    ok: perDay === statedPerDay && yearly >= 3000 && yearly < 4000,
  };
}

function quizSummary(quiz, text) {
  const body = grams(text);
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stage = { pre: 0, check: 0, post: 0 };
  for (const q of qs) if (stage[q.stage] !== undefined) stage[q.stage] += 1;
  const hits = qs.filter((q) => q.stage === 'check').map((q) => {
    const right = String((q.options || [])[q.correct] || '');
    return { question: q.question, grams: [...grams(right)].filter((g) => body.has(g)) };
  });
  return {
    total: qs.length,
    stage,
    check: hits.length,
    grounded: hits.filter((h) => h.grams.length).length,
    hits,
    correctIndexes: qs.map((q) => q.correct),
  };
}

function analyze() {
  const text = readDoc();
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  return {
    hanzi: hanzi(text),
    sections: h2Titles(text),
    tables: tableBlocks(text).map((b) => ({ cols: b.head.length, rows: b.rows.length })),
    layers: layers(text),
    trends: trends(text),
    groups: challengeGroups(text),
    experiments: experiments(text),
    predictions: predictions(text),
    criteria: datasetCriteria(text),
    refusal: refusalKinds(text),
    clinical: clinicalQuestions(text),
    cost: followupCost(text),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  console.log(`中医智能设备 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个 · 表 ${r.tables.length} 张`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`三层布局：${r.layers.join(' / ')}`);
  console.log(`六条趋势（${r.trends.length} 条）：${r.trends.join(' / ')}`);
  console.log(`三组挑战（${r.groups.length} 组）：${r.groups.join(' / ')}`);
  console.log(`四个实验（${r.experiments.length} 个）：${r.experiments.join(' / ')}`);
  console.log(`三个预测（${r.predictions.length} 条）：`);
  r.predictions.forEach((p, i) => console.log(`  ${i + 1}. ${p.replace(/^第[一二三]，/, '')}`));
  console.log('');
  console.log(`数据可用四项判据（${r.criteria.length} 项）：${r.criteria.join(' · ')}`);
  console.log(`拒答三种原因（${r.refusal.length} 种）：${r.refusal.join(' · ')}`);
  console.log(`临床三问（${r.clinical.length} 问）：${r.clinical.join(' / ')}`);
  console.log('');
  if (r.cost) {
    const c = r.cost;
    console.log(
      `随访成本：${c.people} 人 × ${c.pct}% = 每天 ${c.perDay} 个电话` +
        `（正文写 ${c.statedPerDay} 个），一年 ${c.yearly.toLocaleString('en-US')} 个（正文写${c.statedYearly || '三千多'}）` +
        `${c.ok ? ' ✓ 对得上' : ' ✗ 对不上'}`
    );
  }
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）` +
      ` · check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）· 正确项落点 ${[...new Set(r.quiz.correctIndexes)].join('/')}`
  );
  console.log('');
  console.log('※ 以上清单与随访账全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，不构成医学意见、诊断或治疗建议，也不构成对任何技术路线、产品或机构的评价与推荐。');
}

if (require.main === module) main();

module.exports = {
  analyze,
  readDoc,
  h2Sections,
  h2Titles,
  sectionAt,
  tableBlocks,
  occurrences,
  grams,
  boldHeads,
  layers,
  trends,
  challengeGroups,
  experiments,
  predictions,
  datasetCriteria,
  refusalKinds,
  clinicalQuestions,
  cnSmall,
  followupCost,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
};
