#!/usr/bin/env node
/**
 * 康复护理学 · 第 16 章 出院不是终点，是把病房里的假设全部推翻：本章正文的自身统计
 * 课程: departments/05-huli/22-kangfu-huli-xue/chapters/16-shequ-jujia/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 只读本章 docs/zh.md：汉字、小节、表格、病房与家的五个差异、居家六项必查，全部现算。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 16;
const SLUG = '16-shequ-jujia';
const TITLE = '出院不是终点，是把病房里的假设全部推翻';

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

function tableShape(text, header) {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const start = lines.findIndex((l) => l.startsWith(header));
  if (start < 0) throw new Error(`正文里找不到表格：${header}`);
  const cols = lines[start].split('|').map((c) => c.trim()).filter(Boolean).length;
  let rows = 0;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (!lines[i].startsWith('|')) break;
    if (/^\|[\s:|-]+\|$/.test(lines[i])) continue;
    rows += 1;
  }
  return { rows, cols };
}

/** 居家六项必查：正文用 1.–6. 的有序列表写出 */
function homeChecklist(text) {
  return (text.match(/^\d+\.\s+\*\*/gm) || []).length;
}

/** 照护者需要的三样东西：技术、时间、心理支持（按正文加粗的三项计） */
function caregiverNeeds(text) {
  const m = text.match(/照护者需要三样东西：([\s\S]*?)。/);
  if (!m) throw new Error('正文里找不到照护者三样东西');
  return (m[1].match(/\*\*[^*]+\*\*/g) || []).length;
}

function summarize(text = readDoc()) {
  const gaps = tableShape(text, '| 差异 |');
  const services = tableShape(text, '| 服务类别 |');
  const burden = tableShape(text, '| 照护者负担的信号 |');
  return {
    hanzi: countHanzi(text),
    sections: sections(text),
    tables: tables(text),
    gaps,
    services,
    burden,
    checklist: homeChecklist(text),
    caregiver: caregiverNeeds(text),
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
  console.log(`病房与家 ${s.gaps.rows} 个差异，逐个对应一个居家失效点`);
  console.log(`居家必查 ${s.checklist} 项，社区服务 ${s.services.rows} 类，照护者负担信号 ${s.burden.rows} 类`);
  console.log(`照护者需要 ${s.caregiver} 样东西：技术、时间、心理支持`);
  console.log('');
  console.log('※ 教学样例：数字由 docs/zh.md 现算，不手打；改正文后重跑即可复现。');
  console.log('※ 本输出仅用于说明居家评估口径，不构成适老化改造规范。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, SLUG, TITLE, readDoc, countHanzi, sections, tables, tableShape, homeChecklist, caregiverNeeds, summarize };
