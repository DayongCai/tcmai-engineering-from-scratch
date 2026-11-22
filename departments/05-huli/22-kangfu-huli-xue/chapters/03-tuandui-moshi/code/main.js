#!/usr/bin/env node
/**
 * 康复护理学 · 第 3 章 康复的效果写在交接里，不在某个人手上：本章正文的自身统计
 * 课程: departments/05-huli/22-kangfu-huli-xue/chapters/03-tuandui-moshi/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 只读本章 docs/zh.md：汉字、小节、表格、团队角色数与一天交接的必答项，全部现算。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 3;
const SLUG = '03-tuandui-moshi';
const TITLE = '康复的效果写在交接里，不在某个人手上';

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function readDoc(file = DOC) {
  return fs.readFileSync(file, 'utf8');
}

function countHanzi(text) {
  return (text.match(HANZI) || []).length;
}

function sections(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => /^##\s+/.test(line))
    .map((line) => line.replace(/^##\s+/, '').trim());
}

function tables(text) {
  let blocks = 0;
  let rows = 0;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line.startsWith('|')) continue;
    rows += 1;
    if (/^\|[\s:|-]+\|$/.test(line)) blocks += 1;
  }
  return { blocks, rows };
}

/** 团队表：以「| 角色 |」开头的那张表，数出正文列了哪些角色 */
function teamRoles(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const start = lines.findIndex((l) => l.startsWith('| 角色 |'));
  if (start < 0) throw new Error('正文里找不到团队角色表，正文是否已改写？');
  const roles = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.startsWith('|')) break;
    if (/^\|[\s:|-]+\|$/.test(line)) continue;
    const cells = line.split('|').map((c) => c.trim()).filter(Boolean);
    if (cells[0]) roles.push(cells[0]);
  }
  return roles;
}

/** 一天的交接口：两次班次之间 × 交接四问 */
function handoverPerDay(text) {
  if (!text.includes('四问') || !text.includes('两次班次')) {
    throw new Error('正文里找不到「四问」或「两次班次」，交接口径已变');
  }
  const questions = 4;
  const shifts = 2;
  return { questions, shifts, answersPerDay: questions * shifts };
}

function summarize(text = readDoc()) {
  return {
    hanzi: countHanzi(text),
    sections: sections(text),
    tables: tables(text),
    roles: teamRoles(text),
    handover: handoverPerDay(text),
  };
}

function main() {
  const s = summarize();
  console.log(`康复护理学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('');
  console.log(`正文汉字 ${s.hanzi} 个 · 小节 ${s.sections.length} 节 · 表格 ${s.tables.blocks} 张 / ${s.tables.rows} 行`);
  console.log('');
  console.log('小节：');
  s.sections.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));
  console.log('');
  console.log(`团队表列出 ${s.roles.length} 个角色：${s.roles.join('、')}`);
  console.log(
    `一天交接：${s.handover.shifts} 次班次 × ${s.handover.questions} 问 = ${s.handover.answersPerDay} 个必答项`
  );
  console.log('');
  console.log('※ 教学样例：数字由 docs/zh.md 现算，不手打；改正文后重跑即可复现。');
  console.log('※ 本输出仅用于说明交接口径，不构成管理规范。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, SLUG, TITLE, readDoc, countHanzi, sections, tables, teamRoles, handoverPerDay, summarize };
