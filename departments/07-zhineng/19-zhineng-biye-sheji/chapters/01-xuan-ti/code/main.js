#!/usr/bin/env node
/**
 * 智能毕业设计与知识移交 · 第 1 章 · 选题
 * 课程: departments/07-zhineng/19-zhineng-biye-sheji/chapters/01-xuan-ti/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字与清单全部由本脚本从正文现算，不手打：
 *   三条判据、四步降维、三种题目形态、四个里程碑、五种失败模式，
 *   以及文中的定价与人月口径；quiz 的接地情况也在这里对一遍。
 * 正文一改，重跑即可看出哪里对不上；测试再把它们固定下来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '1';
const SLUG = '01-xuan-ti';
const TITLE = '选题不是挑题目，是先把一个中医问题压成一条别人能重跑的实验';

const GRAM = 4;

const readDoc = () => fs.readFileSync(DOC, 'utf8');

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

function h2Titles(text) {
  const out = [];
  for (const line of String(text).split(/\r?\n/)) {
    const m = /^##\s+(.+)$/.exec(line.trim());
    if (m) out.push(m[1].trim());
  }
  return out;
}

/** 表格：连续以 | 开头的行成块；返回 { head, rows }，rows 已去掉表头与分隔行 */
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

/** 正文里长度为 n 的连续汉字片段集合 */
function grams(text, n = GRAM) {
  const out = new Set();
  for (const seg of String(text).replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

/** 第 i 张表的第一列（不含表头） */
function firstColumn(i) {
  const b = tableBlocks(readDoc())[i];
  return b ? b.rows.map((r) => r[0]) : [];
}

/** 三条判据：可复现、可对照、可接手 */
const criteria = () => firstColumn(0);

/** 四步降维：问题、对象、任务、终点 */
const dimensions = () => firstColumn(1);

/** 三种能交出去的题目形态 */
const forms = () => firstColumn(2);

/** 四个里程碑的编号（M1…M4） */
const milestones = () => firstColumn(3).map((s) => (/^(M\d)/.exec(s) || [null, s])[1]);

/** 五种常见失败模式 */
const failures = () => firstColumn(4);

/** 三条判据的分量顺序：正文「可对照最硬」「可复现次之」「可接手最软」 */
const rank = () => {
  const text = readDoc();
  return ['可对照', '可复现', '可接手'].map((k) => ({ key: k, at: text.search(new RegExp(`\\*\\*${k}[^*]*\\*\\*`)) }));
};

/** 正文口径：模块分包定价（元/院） */
const price = () => {
  const m = /([\d,]+)\s*元\/院/.exec(readDoc());
  return m ? Number(m[1].replace(/,/g, '')) : null;
};

/** 正文口径：毕设容量（人月） */
const personMonths = () => {
  const m = /(\d+)\s*人月/.exec(readDoc());
  return m ? Number(m[1]) : null;
};

/** quiz 的结构与接地情况：check 题的正确选项能对上几个四字原词 */
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
  };
}

function analyze() {
  const text = readDoc();
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  return {
    hanzi: hanzi(text),
    sections: h2Titles(text),
    tables: tableBlocks(text).length,
    criteria: criteria(),
    dimensions: dimensions(),
    forms: forms(),
    milestones: milestones(),
    failures: failures(),
    rank: rank(),
    price: price(),
    personMonths: personMonths(),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  console.log(`智能毕业设计与知识移交 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个 · 表格 ${r.tables} 张`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`三条判据（正文现算，${r.criteria.length} 条）：${r.criteria.join(' / ')}`);
  console.log('  分量顺序（按正文出现位置）：' + r.rank.map((x) => x.key).join(' > '));
  console.log('');
  console.log(`四步降维（${r.dimensions.length} 步）：${r.dimensions.join(' → ')}`);
  console.log(`三种题目形态（${r.forms.length} 类）：${r.forms.join(' / ')}`);
  console.log(`四个里程碑（${r.milestones.length} 个）：${r.milestones.join(' ')}`);
  console.log(`五种失败模式（${r.failures.length} 种）：${r.failures.join(' / ')}`);
  console.log('');
  console.log(`口径：模块分包 ${r.price === null ? '—' : r.price.toLocaleString('en-US')} 元/院 · 毕设容量 ${r.personMonths} 人月`);
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）`
  );
  console.log('');
  console.log('※ 以上数字与清单全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，不构成医学意见、诊断或治疗建议，也不构成商业报价。');
}

if (require.main === module) main();

module.exports = {
  analyze,
  readDoc,
  h2Titles,
  tableBlocks,
  occurrences,
  grams,
  criteria,
  dimensions,
  forms,
  milestones,
  failures,
  rank,
  price,
  personMonths,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
};
