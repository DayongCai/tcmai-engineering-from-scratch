#!/usr/bin/env node
/**
 * 口腔内科学 · 第 9 章 口气与口干都要先定位，再谈清热与滋阴
 * 课程: departments/08-wuguan/09-kouqiang-neike-xue/chapters/09-e99/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的分层量全部从正文现算：口气四层、口干三路、诊室三个动作、四个自查、
 * 下游链的环数与三条转诊触发。正文改一句，这里跟着变。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 9;
const SLUG = '09-e99';

const BREATH_LAYERS = ['口腔内', '口腔邻近', '呼吸道与消化道', '代谢与全身'];
const DRY_PATHS = ['津亏', '燥', '药物与腺体'];
const EXIT_TRIGGERS = ['单侧鼻塞', '单侧腮腺', '多饮多尿'];

const readDoc = (file = DOC) => fs.readFileSync(file, 'utf8');
const splitLines = (doc) => doc.split(/\r?\n/);
const sections = (doc) => [...doc.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());

/** 取某一节正文（从匹配 marker 的 ## 标题到下一个 ## 标题） */
function sectionBody(doc, marker) {
  const re = new RegExp(`^##\\s+[^\\n]*${marker}[^\\n]*$`, 'm');
  const m = doc.match(re);
  if (!m) return '';
  const start = m.index + m[0].length;
  const rest = doc.slice(start);
  const next = rest.search(/^##\s+/m);
  return next < 0 ? rest : rest.slice(0, next);
}

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

function numbered(body) {
  return (body.match(/^\d+\.\s+\*\*/gm) || []).length;
}

function audit(doc = readDoc()) {
  const breath = tableRows(doc, '| 层 |');
  const dry = tableRows(doc, '| 路径 |');
  const stepBody = sectionBody(doc, '二、时相');
  const selfBody = sectionBody(doc, '四、四个自查');
  const chainMatch = doc.match(/口干→[^\n]*/);
  const title = (splitLines(doc)[0] || '').replace(/^#\s*第\s*\d+\s*章\s*·\s*/, '').trim();
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title,
    sections: sections(doc),
    breathRows: breath.length,
    breathLayers: breath.map((r) => r[0].replace(/^[一二三四]、/, '')),
    dryRows: dry.length,
    dryPaths: dry.map((r) => r[0]),
    roomSteps: numbered(stepBody),
    selfChecks: numbered(selfBody),
    exits: EXIT_TRIGGERS.filter((t) => doc.includes(t)),
    medicineFirst: doc.includes('先数药，再辨证'),
    pseudo: doc.includes('假性口臭'),
    chain: chainMatch ? chainMatch[0].split('→').map((s) => s.trim()).filter(Boolean).length : 0,
  };
}

function main() {
  const a = audit();
  console.log(`口腔内科学 · 第 ${a.chapter} 章 ${a.title}`);
  console.log('');
  console.log(`小节 ${a.sections.length} 节`);
  console.log(`口气 ${a.breathRows} 层：${a.breathLayers.join('、')}`);
  console.log(`口干 ${a.dryRows} 路：${a.dryPaths.join('、')}`);
  console.log(`诊室动作 ${a.roomSteps} 个；自查 ${a.selfChecks} 问`);
  console.log('');
  console.log(`下游链环节：${a.chain} 段（原文照录，不手打）`);
  console.log(`转诊触发命中：${a.exits.join('、')}（${a.exits.length}／3）`);
  console.log(`先数药，再辨证：${a.medicineFirst ? '已写明' : '缺'}`);
  console.log(`假性口臭单列：${a.pseudo ? '已写明' : '缺'}`);
  console.log('');
  console.log('※ 教学样例：分层与条目数均由 docs/zh.md 现算，不手打。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, SLUG, BREATH_LAYERS, DRY_PATHS, EXIT_TRIGGERS, readDoc, sections, sectionBody, tableRows, audit };
