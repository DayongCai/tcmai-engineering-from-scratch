#!/usr/bin/env node
/**
 * 医学生物学 · 第 15 章 临床遗传学：四步、五档与补证据，从正文里算出来
 * 课程: departments/09-jichu/04-yixue-shengwu-xue/chapters/15-linchuang-yichuan-xue/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：四个动作、五档分级、六类证据、补证据的四个缺口、伦理三原则、
 * 长期管理三项要求的条数，都从本章正文读出后计算。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = '15';
const SLUG = '15-linchuang-yichuan-xue';
const TITLE = '临床遗传学最难的环节不是测出变异，是把变异说成人话';

/** 本章论证链上的关键词：正文必须出现，否则说明正文与习题已经脱节 */
const CONCEPTS = ['认表型', '判结果', '给交代', '意义未明', '级联检测', '非指令性', '知情'];

function readDoc(file) {
  return fs.readFileSync(file || DOC, 'utf8');
}

function lines(text) {
  return text.split(/\r?\n/);
}

function sections(text = readDoc()) {
  return lines(text)
    .filter((l) => /^##\s+/.test(l))
    .map((l) => l.replace(/^##\s+/, '').trim());
}

function hanzi(text = readDoc()) {
  return (text.match(/[\u4e00-\u9fff]/g) || []).length;
}

/** 取某一节到下一节之间的文本 */
function slice(text, startRe, endRe) {
  const ls = lines(text);
  const start = ls.findIndex((l) => startRe.test(l));
  if (start < 0) return '';
  let end = ls.length;
  for (let i = start + 1; i < ls.length; i += 1) {
    if (/^##\s/.test(ls[i])) {
      if (!endRe || endRe.test(ls[i])) {
        end = i;
        break;
      }
    }
  }
  return ls.slice(start, end).join('\n');
}

/** 编号条目（**加粗** 开头的 1. 2. 3.） */
function numbered(text) {
  return lines(text)
    .map((l) => l.trim())
    .filter((l) => /^\d+\.\s+\*\*/.test(l))
    .map((l) => (l.match(/\*\*([^*]+)\*\*/) || [, ''])[1]);
}

/** 破折号条目：有加粗取加粗，无加粗取箭头或冒号前的短语 */
function bulleted(text) {
  return lines(text)
    .map((l) => l.trim())
    .filter((l) => /^-\s+/.test(l))
    .map((l) => {
      const bold = l.match(/^-\s+\*\*([^*]+)\*\*/);
      if (bold) return bold[1];
      return l.replace(/^-\s+/, '').split(/→/)[0].replace(/[：:].*/, '').trim();
    })
    .filter(Boolean);
}

/** 四步动作 */
function actions(text = readDoc()) {
  return numbered(slice(text, /^##\s*一、四个动作/));
}

/** 五档分级：正文「变异分五档：A、B、C、D、E」 */
function tiers(text = readDoc()) {
  const m = text.match(/变异分五档：([^。]+)/);
  if (!m) return [];
  return m[1].split(/[、，]/).map((x) => x.trim()).filter(Boolean);
}

/** 证据表：证据类型 / 例子 / 强度 */
function evidenceTable(text = readDoc()) {
  const rows = [];
  for (const line of lines(text)) {
    if (!/^\|/.test(line)) continue;
    if (/^\|[\s\-:|]+\|$/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length !== 3) continue;
    if (/^证据类型$/.test(cells[0])) continue;
    rows.push({ kind: cells[0], example: cells[1], strength: cells[2] });
  }
  return rows;
}

/** 四类缺口（补证据的方向） */
function evidenceGaps(text = readDoc()) {
  return bulleted(slice(text, /^##\s*四、意义未明变异/));
}

/** 伦理三原则与长期管理三要求 */
function ethics(text = readDoc()) {
  return bulleted(slice(text, /^##\s*五、产前与筛查/));
}

function management(text = readDoc()) {
  return numbered(slice(text, /^##\s*六、遗传病是长期管理/));
}

function conceptHits(text = readDoc()) {
  return CONCEPTS.map((term) => ({ term, hits: text.split(term).length - 1 }));
}

function missing(text = readDoc()) {
  return conceptHits(text).filter((c) => c.hits === 0).map((c) => c.term);
}

function boundaries(text = readDoc()) {
  const s = slice(text, /^##\s*代价与边界/);
  return lines(s).map((l) => l.trim()).filter((l) => /^-\s+/.test(l)).map((l) => l.replace(/^-\s+/, ''));
}

function summarize(text = readDoc()) {
  return {
    hanzi: hanzi(text),
    sections: sections(text),
    actions: actions(text),
    tiers: tiers(text),
    evidence: evidenceTable(text),
    gaps: evidenceGaps(text),
    ethics: ethics(text),
    management: management(text),
    concepts: conceptHits(text),
    boundaries: boundaries(text),
  };
}

function main() {
  const s = summarize();
  console.log('医学生物学 · 第 ' + CHAPTER + ' 章 ' + TITLE);
  console.log('');
  console.log('正文 ' + s.hanzi.toLocaleString('en-US') + ' 汉字 · ' + s.sections.length + ' 节 · 边界 '
    + s.boundaries.length + ' 条');
  console.log('');
  console.log('四个动作（正文现算 ' + s.actions.length + ' 个）：' + s.actions.join(' → '));
  console.log('  → 只有「选检测」是技术，其余三步是判断与沟通；最容易被跳过的是第一步。');
  console.log('');
  console.log('分级五档（' + s.tiers.length + ' 档）：' + s.tiers.join('、'));
  console.log('证据类型（正文表格现算 ' + s.evidence.length + ' 类）：');
  for (const e of s.evidence) console.log('  ' + e.kind + '：' + e.strength);
  console.log('  → 计算预测只能作辅助，不能单独定级。');
  console.log('');
  console.log('补证据的缺口（' + s.gaps.length + ' 类）：' + s.gaps.join('、'));
  console.log('伦理三原则（' + s.ethics.length + ' 条）：' + s.ethics.join('、'));
  console.log('长期管理三要求（' + s.management.length + ' 条）：' + s.management.join('、'));
  console.log('');
  console.log('判据词命中（正文现算）：');
  for (const x of s.concepts) console.log('  ' + (x.hits ? '✓' : '✗') + ' ' + x.term + '：' + x.hits);
  console.log('');
  console.log('边界（「代价与边界」一节，取前 3 条）：');
  s.boundaries.slice(0, 3).forEach((b) => console.log('  - ' + b));
  console.log('');
  console.log('※ 现算自 ' + SLUG + '/docs/zh.md；正文改版后重跑即可复现。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, SLUG, TITLE, CONCEPTS,
  readDoc, sections, hanzi, slice, numbered, bulleted, actions, tiers, evidenceTable,
  evidenceGaps, ethics, management, conceptHits, missing, boundaries, summarize,
};
