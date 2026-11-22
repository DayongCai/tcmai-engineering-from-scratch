#!/usr/bin/env node
/**
 * 骨伤毕业设计与知识移交 · 第 4 章 · 疗效与并发症评价
 * 课程: departments/04-gushang/17-gushang-biye-sheji/chapters/04-liaoxiao-pingjia/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的三层终点、三个临床概念、并发症六环节、四种设计、六种失败模式，
 * 以及零事件的置信上限口径，全部从正文表格与段落现算，不手打。
 * 零事件的两个示例（n=20、n=60）由脚本按 3/n 重算，与正文陈述对账。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '4';
const SLUG = '04-liaoxiao-pingjia';
const TITLE = '疗效不是「好转了」，是先在纸上写死「什么叫没好转」';

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
    const cells = b.map((r) =>
      r
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((c) => c.trim())
    );
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

function firstColumn(i) {
  const b = tableBlocks(readDoc())[i];
  return b ? b.rows.map((r) => r[0]) : [];
}

function column(i, j) {
  const b = tableBlocks(readDoc())[i];
  return b ? b.rows.map((r) => r[j] || '') : [];
}

/** 终点三层：结构、功能、体验 */
const outcomeLayers = () => firstColumn(0);

/** 三个容易混用的概念：统计学差异、最小临床重要差异、应答者比例 */
const concepts = () => firstColumn(1);

/** 并发症六环节 */
const adverseElements = () => firstColumn(2);

/** 四种对照设计 */
const designs = () => firstColumn(3);

/** 每种设计「撑不住什么」 */
function designLimits() {
  const keys = designs();
  const limits = column(3, 2);
  return keys.map((k, i) => ({ design: k, limit: limits[i] || '' }));
}

/** 六种常见失败模式 */
const failures = () => firstColumn(4);

/**
 * 零事件口径：正文的公式是 3/n 与 95% 置信上限，
 * 并给了 n=20、n=60 两个示例。这里把示例逐条重算，供测试对账。
 */
function zeroEvent() {
  const text = readDoc();
  const formula = /上限约为\s*3\/n/.test(text) ? '3/n' : null;
  const ci = /在\s*95%\s*置信水平下的上限/.test(text) ? 95 : null;
  const examples = [];
  const re = /n\s*是\s*(\d+)，上限约\s*([^；。]+)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const n = Number(m[1]);
    examples.push({ n, stated: m[2].trim(), computed: n > 0 ? 3 / n : null });
  }
  return { formula, ci, examples };
}

/** 最小临床重要差异不能拍脑袋定：正文的判断句 */
function mcidRule() {
  const text = readDoc();
  const m = /最小临床重要差异不是可以拍脑袋定的量/.exec(text);
  return m ? m[0] : null;
}

/** 正文口径：本章取材的评定与康复单元数、字数规模（万字） */
function sourceScale() {
  const text = readDoc();
  const u = /(\d+)\s*个评定与康复单元/.exec(text);
  const w = /([\d.]+)\s*万[余]?字/.exec(text);
  return { units: u ? Number(u[1]) : null, wanzi: w ? Number(w[1]) : null };
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
  };
}

function analyze() {
  const text = readDoc();
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  return {
    hanzi: hanzi(text),
    sections: h2Titles(text),
    tables: tableBlocks(text).length,
    outcomeLayers: outcomeLayers(),
    concepts: concepts(),
    adverseElements: adverseElements(),
    designs: designs(),
    designLimits: designLimits(),
    failures: failures(),
    zeroEvent: zeroEvent(),
    mcidRule: mcidRule(),
    sourceScale: sourceScale(),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  console.log(`骨伤毕业设计与知识移交 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个 · 表格 ${r.tables} 张`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`终点三层（${r.outcomeLayers.length} 层）：${r.outcomeLayers.join(' / ')}`);
  console.log(`三个易混概念（${r.concepts.length} 个）：${r.concepts.join(' / ')}`);
  console.log(`  判据句：${r.mcidRule || '—'}`);
  console.log('');
  console.log(`并发症（${r.adverseElements.length} 环节）：${r.adverseElements.join(' / ')}`);
  console.log('');
  console.log('对照设计与其撑不住的东西（同表成对读出）：');
  for (const d of r.designLimits) console.log(`  ${d.design.padEnd(10)} → ${d.limit}`);
  console.log('');
  console.log(`六种失败模式：${r.failures.join(' / ')}`);
  console.log('');
  const z = r.zeroEvent;
  console.log(`零事件口径：上限 = ${z.formula || '—'}，置信水平 ${z.ci === null ? '—' : z.ci + '%'}`);
  for (const e of z.examples) {
    console.log(`  n = ${e.n}：正文写「${e.stated}」，按 3/n 重算 = ${(e.computed * 100).toFixed(1)}%`);
  }
  const s = r.sourceScale;
  console.log(`取材规模：${s.units} 个评定与康复单元 · ${s.wanzi} 万字`);
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）· 答案落在 ${r.quiz.spread} 个位置`
  );
  console.log('');
  console.log('※ 以上结构、配线、上限与示例均由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，不构成医学意见、诊断或治疗建议，也不构成统计或合规意见。');
}

if (require.main === module) main();

module.exports = {
  analyze,
  readDoc,
  h2Titles,
  tableBlocks,
  occurrences,
  grams,
  firstColumn,
  column,
  outcomeLayers,
  concepts,
  adverseElements,
  designs,
  designLimits,
  failures,
  zeroEvent,
  mcidRule,
  sourceScale,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
};
