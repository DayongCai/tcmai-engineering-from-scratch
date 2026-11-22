#!/usr/bin/env node
/**
 * 口腔内科学 · 第 6 章 牙痛是一条按深度排列的阶梯上的某一点
 * 课程: departments/08-wuguan/09-kouqiang-neike-xue/chapters/06-e96/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的阶梯量全部从正文现算：五级分层表的行数与名称、三处分界、
 * 六种「不在牙上」的痛、四种证型，以及「去净腐质」这一条不可替代的动作。
 * 正文改一句，这里跟着变。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 6;
const SLUG = '06-e96';

const LADDER = ['浅龋', '中龋', '深龋', '牙髓炎', '根尖周炎'];
const BOUNDARIES = ['有无症状', '痛会不会停', '有没有自发痛'];
const ELSEWHERE = ['三叉神经痛', '上颌窦炎', '心源性牙痛', '智齿冠周炎', '颞下颌关节紊乱', '干槽症'];
const PATTERNS = ['风火牙痛', '胃火牙痛', '虚火牙痛', '龋蚀牙痛'];

const readDoc = (file = DOC) => fs.readFileSync(file, 'utf8');
const splitLines = (doc) => doc.split(/\r?\n/);
const sections = (doc) => [...doc.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());

function tableRows(doc, anchor) {
  const rows = splitLines(doc);
  const start = rows.findIndex((l) => l.trim().startsWith('|') && l.includes(anchor));
  if (start < 0) return [];
  const out = [];
  for (let i = start; i < rows.length; i += 1) {
    const line = rows[i].trim();
    if (!line.startsWith('|')) {
      if (out.length) break;
      continue;
    }
    if (/^\|[\s:|-]+\|$/.test(line)) continue;
    if (i === start) continue;
    out.push(line.split('|').slice(1, -1).map((s) => s.trim()));
  }
  return out;
}

function audit(doc = readDoc()) {
  const ladderRows = tableRows(doc, '| 层级 |');
  const diffRows = tableRows(doc, '| 需鉴别的病 |');
  const patternRows = tableRows(doc, '| 证型 |');
  const title = (splitLines(doc)[0] || '').replace(/^#\s*第\s*\d+\s*章\s*·\s*/, '').trim();
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title,
    sections: sections(doc),
    ladder: ladderRows.map((r) => r[0].replace(/（不可逆）/, '')),
    ladderRows: ladderRows.length,
    boundaries: BOUNDARIES.filter((t) => doc.includes(t)),
    elsewhereRows: diffRows.length,
    elsewhere: diffRows.map((r) => r[0]),
    treatmentCol: ladderRows.map((r) => r[5] || ''),
    patterns: patternRows.map((r) => r[0]),
    noSubstitute: doc.includes('这个动作没有中药替代品') || doc.includes('没有中药替代品'),
    deciduous: doc.includes('乳牙龋必须治'),
  };
}

function main() {
  const a = audit();
  console.log(`口腔内科学 · 第 ${a.chapter} 章 ${a.title}`);
  console.log('');
  console.log(`小节 ${a.sections.length} 节`);
  console.log(`阶梯 ${a.ladderRows} 级（由正文表格读出）：${a.ladder.join(' → ')}`);
  console.log(`三处分界：${a.boundaries.join('、')}（${a.boundaries.length}／3）`);
  console.log('');
  console.log(`处置去向：`);
  a.ladder.forEach((n, i) => console.log(`  ${n}：${a.treatmentCol[i]}`));
  console.log('');
  console.log(`不在牙上的痛 ${a.elsewhereRows} 种：${a.elsewhere.join('、')}`);
  console.log(`中医四型：${a.patterns.join('、')}（${a.patterns.length}／4）`);
  console.log(`「没有中药替代品」：${a.noSubstitute ? '已写明' : '缺'}`);
  console.log(`乳牙龋必须治：${a.deciduous ? '已写明' : '缺'}`);
  console.log('');
  console.log('※ 教学样例：阶梯、分界与鉴别表均由 docs/zh.md 现算，不手打。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, SLUG, LADDER, BOUNDARIES, ELSEWHERE, PATTERNS, readDoc, sections, tableRows, audit };
