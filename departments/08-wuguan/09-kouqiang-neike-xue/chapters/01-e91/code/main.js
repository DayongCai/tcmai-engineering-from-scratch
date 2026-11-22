#!/usr/bin/env node
/**
 * 口腔内科学 · 第 1 章 口腔内科的边界不按器官划，按「能不能不动刀」划
 * 课程: departments/08-wuguan/09-kouqiang-neike-xue/chapters/01-e91/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的结构量全部从正文现算：六步次序、分诊表的行数与归口、红旗清单、
 * 记录的「六个位置＋四个量」。正文改一句，这里跟着变。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 1;
const SLUG = '01-e91';

const STEPS = ['视诊', '探诊', '叩诊', '冷热诊', '松动度', 'X 线'];
const RED_FLAGS = ['面肿而硬', '张口受限', '吞咽困难', '出血不止', '逾两周不愈'];
const POSITIONS = ['牙位', '龈缘', '龈乳头', '附着水平', '根分叉', '黏膜病灶'];
const QUANTITIES = ['探诊深度', '探后出血', '松动度', '病灶尺寸'];

const readDoc = (file = DOC) => fs.readFileSync(file, 'utf8');
const splitLines = (doc) => doc.split(/\r?\n/);
const sections = (doc) => [...doc.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());

/** 取以 anchor 那行为表头的那张表；返回去掉表头与分隔行的单元格数组 */
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
    if (/^\|[\s:|-]+\|$/.test(line)) continue;      // 分隔行
    const cells = line.split('|').slice(1, -1).map((s) => s.trim());
    if (i === start) continue;                       // 表头
    out.push(cells);
  }
  return out;
}

function audit(doc = readDoc()) {
  const stepRows = tableRows(doc, '| 步序 |');
  const steps = stepRows.map((r) => (r[0] || '').replace(/^[一二三四五六]、/, '').trim());
  const triageRows = tableRows(doc, '| 事项 |');
  const title = (splitLines(doc)[0] || '').replace(/^#\s*第\s*\d+\s*章\s*·\s*/, '').trim();
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title,
    sections: sections(doc),
    steps,
    stepsOk: steps.length === 6 && steps[0] === '视诊' && steps[5] === 'X 线',
    triageRows: triageRows.length,
    triageTo: triageRows.map((r) => r[1] || ''),
    triageSurgical: triageRows.filter((r) => /外科/.test(r[1] || '')).length,
    redFlags: RED_FLAGS.filter((t) => doc.includes(t)),
    positions: POSITIONS.filter((t) => doc.includes(t)),
    quantities: QUANTITIES.filter((t) => doc.includes(t)),
    noBoundaryByOrgan: doc.includes('不按器官划，按处置手段划'),
  };
}

function main() {
  const a = audit();
  console.log(`口腔内科学 · 第 ${a.chapter} 章 ${a.title}`);
  console.log('');
  console.log(`小节 ${a.sections.length} 节`);
  console.log(`六步次序（由正文表格读出）：${a.steps.join(' → ')}`);
  console.log(`次序符合「从无创到有创」：${a.stepsOk ? '是' : '否'}`);
  console.log('');
  console.log(`分诊表 ${a.triageRows} 行，归口：${a.triageTo.join('／')}`);
  console.log(`其中需手术处置（颌面外科）者 ${a.triageSurgical} 行`);
  console.log('');
  console.log(`红旗清单命中：${a.redFlags.length}／${RED_FLAGS.length}（${a.redFlags.join('、')}）`);
  console.log(`记录的位置：${a.positions.length}／${POSITIONS.length}`);
  console.log(`记录的量：${a.quantities.length}／${QUANTITIES.length}`);
  console.log('');
  console.log(`边界写在处置手段上：${a.noBoundaryByOrgan ? '是' : '否'}`);
  console.log('');
  console.log('※ 教学样例：步序、分诊归口与记录项均由 docs/zh.md 现算，不手打。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, SLUG, STEPS, RED_FLAGS, POSITIONS, QUANTITIES, readDoc, sections, tableRows, audit };
