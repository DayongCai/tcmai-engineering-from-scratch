#!/usr/bin/env node
/**
 * 骨伤毕业设计与知识移交 · 第 3 章 · 手法与支具的系统实现
 * 课程: departments/04-gushang/17-gushang-biye-sheji/chapters/03-shoufa-zhiju/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的操作规范五要素、量化三条线、支具六字段、伦理六环节、六种失败模式，
 * 以及三线的指标定位与取材规模，全部从正文表格与段落现算，不手打。
 * 「哪一条是过程指标」也从正文的加粗句读出，不从表头猜。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '3';
const SLUG = '03-shoufa-zhiju';
const TITLE = '把手法写成流程、把支具写成参数，才算做完；「手感」和「定制」都交不出去';

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

function cell(i, row, col) {
  const b = tableBlocks(readDoc())[i];
  return b && b.rows[row] ? b.rows[row][col] || '' : '';
}

/** 操作规范最小可执行单元的五要素 */
const positions = () => firstColumn(0);

/** 量化三条线：力学、影像、症状与功能 */
const channels = () => firstColumn(1);

/** 支具设计单六字段 */
const braceFields = () => firstColumn(2);

/** 伦理审查六环节 */
const ethics = () => firstColumn(3);

/** 六种常见失败模式 */
const failures = () => firstColumn(4);

/** 每条量化线的「能支持什么结论」 */
function channelClaims() {
  const keys = channels();
  return keys.map((k, i) => ({ line: k, claim: cell(1, i, 2) }));
}

/** 正文把哪条线标成过程指标（加粗句「力学是**过程指标**」） */
function processIndicator() {
  const text = readDoc();
  const m = /([\u4e00-\u9fff]{2,4})是\*\*过程指标\*\*/.exec(text);
  return m ? m[1] : null;
}

/** 正文口径：主终点的个数与「至少留两条线」的门槛 */
function endpointRule() {
  const text = readDoc();
  return {
    atLeastLines: /三条线里至少要留两条/.test(text) ? 2 : null,
    mainOnly: /主终点只能有一个/.test(text),
  };
}

/** 正文口径：本章取材的手法与量化单元数与字数规模（万字） */
function sourceScale() {
  const text = readDoc();
  const u = /(\d+)\s*个手法与量化单元/.exec(text);
  const w = /([\d.]+)\s*万字/.exec(text);
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
    positions: positions(),
    channels: channels(),
    channelClaims: channelClaims(),
    processIndicator: processIndicator(),
    endpointRule: endpointRule(),
    braceFields: braceFields(),
    ethics: ethics(),
    failures: failures(),
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
  console.log(`操作规范五要素（${r.positions.length} 项）：${r.positions.join(' / ')}`);
  console.log('');
  console.log('量化三条线与各自能支持的结论（同表成对读出）：');
  for (const c of r.channelClaims) console.log(`  ${c.line.padEnd(6)} → ${c.claim}`);
  console.log(`  → 过程指标是：${r.processIndicator || '—'}`);
  console.log('');
  console.log(`支具设计单（${r.braceFields.length} 字段）：${r.braceFields.join(' / ')}`);
  console.log(`伦理审查（${r.ethics.length} 环节）：${r.ethics.join(' / ')}`);
  console.log(`六种失败模式：${r.failures.join(' / ')}`);
  console.log('');
  const e = r.endpointRule;
  console.log(`终点口径：至少 ${e.atLeastLines} 条线 · 主终点唯一 = ${e.mainOnly}`);
  const s = r.sourceScale;
  console.log(`取材规模：${s.units} 个手法与量化单元 · ${s.wanzi} 万字`);
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）· 答案落在 ${r.quiz.spread} 个位置`
  );
  console.log('');
  console.log('※ 以上结构、配线与口径全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，不构成医学意见或操作指导；手法与支具的实际应用须由具备资质者判断并承担。');
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
  cell,
  positions,
  channels,
  channelClaims,
  processIndicator,
  endpointRule,
  braceFields,
  ethics,
  failures,
  sourceScale,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
};
