#!/usr/bin/env node
/**
 * 口腔内科学 · 第 8 章 黏膜病先分三层，再谈病名
 * 课程: departments/08-wuguan/09-kouqiang-neike-xue/chapters/08-e98/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的结构量全部从正文现算：三落点、六个病名的落点表、三个动作的次序、
 * 火有虚实的五型、七条红线。正文改一句，这里跟着变。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 8;
const SLUG = '08-e98';

const LAYERS = ['菌层', '上皮', '上皮下'];
const TYPES = ['上焦实热', '中焦虚寒', '下焦阴火', '脾虚湿困', '心脾积热'];
const ACTIONS = ['先擦', '最后摸硬不硬'];

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
  const diseaseRows = tableRows(doc, '| 病名 |');
  const redLines = (doc.match(/^\d+\.\s+\*\*/gm) || []).length;
  const title = (splitLines(doc)[0] || '').replace(/^#\s*第\s*\d+\s*章\s*·\s*/, '').trim();
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title,
    sections: sections(doc),
    layers: LAYERS.filter((t) => doc.includes(t)),
    diseaseRows: diseaseRows.length,
    diseases: diseaseRows.map((r) => r[0]),
    diseaseLayers: diseaseRows.map((r) => r[1] || ''),
    redLines,
    types: TYPES.filter((t) => doc.includes(t)),
    actions: ACTIONS.filter((t) => doc.includes(t)),
    hardnessIsDepth: doc.includes('硬是深度的体征'),
    noPercentage: doc.includes('不写任何比例数字'),
  };
}

function main() {
  const a = audit();
  console.log(`口腔内科学 · 第 ${a.chapter} 章 ${a.title}`);
  console.log('');
  console.log(`小节 ${a.sections.length} 节`);
  console.log(`三个落点：${a.layers.join('、')}（${a.layers.length}／3）`);
  console.log(`病名表 ${a.diseaseRows} 行：`);
  a.diseases.forEach((d, i) => console.log(`  ${d} → ${a.diseaseLayers[i]}`));
  console.log('');
  console.log(`动作次序：${a.actions.join('，')}`);
  console.log(`火有虚实五型：${a.types.join('、')}（${a.types.length}／5）`);
  console.log(`红线 ${a.redLines} 条`);
  console.log('');
  console.log(`硬是深度的体征：${a.hardnessIsDepth ? '已写明' : '缺'}`);
  console.log(`不写比例数字：${a.noPercentage ? '已写明' : '缺'}`);
  console.log('');
  console.log('※ 教学样例：落点表行数与红线数均由 docs/zh.md 现算，不手打。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, SLUG, LAYERS, TYPES, ACTIONS, readDoc, sections, tableRows, audit };
