#!/usr/bin/env node
/**
 * 口腔内科学 · 第 5 章 外治的边界，就是药液与器械能触到的边界
 * 课程: departments/08-wuguan/09-kouqiang-neike-xue/chapters/05-e95/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的表量全部从正文现算：内治三法、外治四类、闸门九条、复评五栏与三个阶段，
 * 以及「含漱不能替代洁治」这一条边界。正文改一句，这里跟着变。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 5;
const SLUG = '05-e95';

const INNER_METHODS = ['清胃泻火', '滋阴降火', '补气摄血'];
const OUTER_METHODS = ['含漱', '吹药／涂敷', '牙周冲洗', '洁治／刮治'];
const REVIEW_COLUMNS = ['部位', '局部指标', '证候', '已施处置', '复诊间隔与判据'];
const PHASES = ['急性期', '缓解期', '维持期'];

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
  const outer = tableRows(doc, '| 方法 |');
  const gates = tableRows(doc, '| 情形 |');
  const title = (splitLines(doc)[0] || '').replace(/^#\s*第\s*\d+\s*章\s*·\s*/, '').trim();
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title,
    sections: sections(doc),
    innerMethods: INNER_METHODS.filter((t) => doc.includes(t)),
    outerRows: outer.length,
    outerMethods: outer.map((r) => r[0]),
    gateRows: gates.length,
    gateNames: gates.map((r) => r[0]),
    reviewColumns: REVIEW_COLUMNS.filter((t) => doc.includes(`**${t}**`)),
    phases: PHASES.filter((t) => doc.includes(`**${t}**`)),
    rinseNotScaling: doc.includes('含漱不能替代洁治'),
    localWins: doc.includes('两者不一致时以局部为准'),
  };
}

function main() {
  const a = audit();
  console.log(`口腔内科学 · 第 ${a.chapter} 章 ${a.title}`);
  console.log('');
  console.log(`小节 ${a.sections.length} 节`);
  console.log(`内治三法：${a.innerMethods.join('、')}（${a.innerMethods.length}／3）`);
  console.log(`外治 ${a.outerRows} 类：${a.outerMethods.join('、')}`);
  console.log(`闸门 ${a.gateRows} 条：`);
  for (const g of a.gateNames) console.log(`  ${g}`);
  console.log('');
  console.log(`复评五栏：${a.reviewColumns.join('、')}（${a.reviewColumns.length}／5）`);
  console.log(`三个阶段：${a.phases.join(' → ')}`);
  console.log(`含漱不能替代洁治：${a.rinseNotScaling ? '已写明' : '缺'}`);
  console.log(`局部与全身不一致时以局部为准：${a.localWins ? '已写明' : '缺'}`);
  console.log('');
  console.log('※ 教学样例：表行数与名单均由 docs/zh.md 现算，不手打。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, SLUG, INNER_METHODS, OUTER_METHODS, REVIEW_COLUMNS, PHASES, readDoc, sections, tableRows, audit };
