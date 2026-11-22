#!/usr/bin/env node
/**
 * 骨伤毕业设计与知识移交 · 第 2 章 · 影像与生物力学数据准备
 * 课程: departments/04-gushang/17-gushang-biye-sheji/chapters/02-yingxiang-shuju/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的三类数据、测量协议五件、一致性四档、数据卡八字段、六种失败模式，
 * 以及文中交代的取材规模，全部从正文表格与段落现算，不手打。
 * 一致性档位与它的「该做什么」由同一张表成对读出，避免档位与动作脱钩。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '2';
const SLUG = '02-yingxiang-shuju';
const TITLE = '影像不是插图，是把「看得见」变成「量得出、量得一样」的那一步';

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

/** 三类数据：影像、力学、量表 */
const dataClasses = () => firstColumn(0);

/** 测量协议五件 */
const protocol = () => firstColumn(1);

/** 一致性四档（由低到高，按表内顺序） */
const agreementTiers = () => firstColumn(2);

/** 每一档对应的「该做什么」，与档位同表成对读出 */
function agreementActions() {
  const tiers = column(2, 0);
  const acts = column(2, 2);
  return tiers.map((t, k) => ({ tier: t, action: acts[k] }));
}

/** 数据卡八字段 */
const dataCard = () => firstColumn(3);

/** 六种常见失败模式 */
const failures = () => firstColumn(4);

/** 正文口径：本章取材的影像单元数与其字数规模（万字） */
function sourceScale() {
  const text = readDoc();
  const u = /(\d+)\s*个影像单元/.exec(text);
  const w = /不到\s*([\d.]+)\s*万字/.exec(text);
  return { units: u ? Number(u[1]) : null, wanzi: w ? Number(w[1]) : null };
}

/** 正文里的核心区分句：一致与准确不是一回事 */
function accuracyVsAgreement() {
  const text = readDoc();
  const m = /准确指接近真值，一致指不同人、不同次之间彼此接近/.exec(text);
  return m ? m[0] : null;
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
    dataClasses: dataClasses(),
    protocol: protocol(),
    agreementTiers: agreementTiers(),
    agreementActions: agreementActions(),
    dataCard: dataCard(),
    failures: failures(),
    sourceScale: sourceScale(),
    accuracyVsAgreement: accuracyVsAgreement(),
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
  console.log(`三类数据（${r.dataClasses.length} 类）：${r.dataClasses.join(' / ')}`);
  console.log(`测量协议（${r.protocol.length} 件）：${r.protocol.join(' / ')}`);
  console.log('');
  console.log('一致性与对应动作（同表成对读出）：');
  for (const a of r.agreementActions) console.log(`  ${a.tier.padEnd(6)} → ${a.action}`);
  console.log('');
  console.log(`数据卡（${r.dataCard.length} 字段）：${r.dataCard.join(' / ')}`);
  console.log(`六种失败模式：${r.failures.join(' / ')}`);
  console.log('');
  const s = r.sourceScale;
  console.log(`取材规模：${s.units} 个影像单元 · 不到 ${s.wanzi} 万字`);
  console.log(`核心区分句：${r.accuracyVsAgreement || '—'}`);
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）· 答案落在 ${r.quiz.spread} 个位置`
  );
  console.log('');
  console.log('※ 以上结构、档位与动作全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，不构成医学意见或诊断依据；真实影像与患者数据须依伦理批件办理。');
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
  dataClasses,
  protocol,
  agreementTiers,
  agreementActions,
  dataCard,
  failures,
  sourceScale,
  accuracyVsAgreement,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
};
