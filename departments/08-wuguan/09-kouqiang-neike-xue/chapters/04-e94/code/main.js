#!/usr/bin/env node
/**
 * 口腔内科学 · 第 4 章 证名是结论，不是起点
 * 课程: departments/08-wuguan/09-kouqiang-neike-xue/chapters/04-e94/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的流程量全部从正文现算：四步的次序、病位表的行数、六性的名单、
 * 记录字段的行数，以及最易漏的三项。正文改一句，这里跟着变。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 4;
const SLUG = '04-e94';

const STEPS = ['定病位', '定病性', '归脏腑', '落记录'];
const SIX_NATURES = ['火', '虚', '湿', '风', '瘀', '虫'];
const MUST_RECORD = ['病程', '出血之色量', '全身与用药'];

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
  const secs = sections(doc);
  const stepSections = secs
    .map((s) => (s.match(/第[一二三四]步[：:]\s*(.+)$/) || []).slice(1))
    .filter((x) => x.length);
  const steps = stepSections.map((x) => x[0].trim());
  const locations = tableRows(doc, '| 病位 |');
  const fields = tableRows(doc, '| 字段 |');
  const title = (splitLines(doc)[0] || '').replace(/^#\s*第\s*\d+\s*章\s*·\s*/, '').trim();
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title,
    sections: secs,
    steps,
    stepsOk: steps.join('/') === STEPS.join('/'),
    locationRows: locations.length,
    locationNames: locations.map((r) => r[0]),
    fieldRows: fields.length,
    mustRecord: MUST_RECORD.filter((t) => doc.includes(t)),
    sixNatures: SIX_NATURES.filter((t) => doc.includes(`**属${t}者**`)),
    noEquation: doc.includes('两栏并列、互不翻译'),
    redFlagFirst: doc.includes('红旗之前不谈辨证'),
  };
}

function main() {
  const a = audit();
  console.log(`口腔内科学 · 第 ${a.chapter} 章 ${a.title}`);
  console.log('');
  console.log(`小节 ${a.sections.length} 节`);
  console.log(`四步次序（由正文小标题读出）：${a.steps.join(' → ')}`);
  console.log(`次序与正文一致：${a.stepsOk ? '是' : '否'}`);
  console.log('');
  console.log(`病位表 ${a.locationRows} 行：${a.locationNames.join('、')}`);
  console.log(`六性命中：${a.sixNatures.join('、')}（${a.sixNatures.length}／${SIX_NATURES.length}）`);
  console.log(`记录字段 ${a.fieldRows} 项`);
  console.log(`最易漏的三项：${a.mustRecord.join('、')}（${a.mustRecord.length}／3）`);
  console.log('');
  console.log(`两栏并列、互不翻译：${a.noEquation ? '已写明' : '缺'}`);
  console.log(`红旗之前不谈辨证：${a.redFlagFirst ? '已写明' : '缺'}`);
  console.log('');
  console.log('※ 教学样例：四步、表格行数与字段数均由 docs/zh.md 现算，不手打。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, SLUG, STEPS, SIX_NATURES, MUST_RECORD, readDoc, sections, tableRows, audit };
