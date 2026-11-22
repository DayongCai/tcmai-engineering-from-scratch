#!/usr/bin/env node
/**
 * 口腔内科学 · 第 2 章 齿属肾说的是来源，络属阳明说的是通路
 * 课程: departments/08-wuguan/09-kouqiang-neike-xue/chapters/02-e92/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的结构量全部从正文现算：三种挂法、经络归属表、上胃下大肠的分工、
 * 涎与唾的二分，以及两处翻译边界。正文改一句，这里跟着变。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 2;
const SLUG = '02-e92';

const ATTACH = ['挂形质', '挂通路', '挂外候'];
const CLAIMS = ['齿为骨之余', '龈为肉之余', '舌为心之苗', '唇为脾之官', '口为脾之窍'];
const SALIVA = ['涎', '唾'];

const readDoc = (file = DOC) => fs.readFileSync(file, 'utf8');
const splitLines = (doc) => doc.split(/\r?\n/);
const sections = (doc) => [...doc.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());
const countOf = (doc, term) => (doc.split(term).length - 1);

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
  const meridianRows = tableRows(doc, '| 经 |');
  const meridians = meridianRows.map((r) => r[0] || '');
  const title = (splitLines(doc)[0] || '').replace(/^#\s*第\s*\d+\s*章\s*·\s*/, '').trim();
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title,
    sections: sections(doc),
    attach: ATTACH.filter((t) => doc.includes(t)),
    claims: CLAIMS.filter((t) => doc.includes(t)),
    meridians,
    meridianRows: meridianRows.length,
    upperToStomach: doc.includes('上齿、上龈多责胃'),
    lowerToLargeIntestine: doc.includes('下齿、下龈多责大肠'),
    saliva: Object.fromEntries(SALIVA.map((t) => [t, countOf(doc, t)])),
    boundaryEmbryo: doc.includes('矿化同源，不等于胚胎同源'),
    boundaryAxis: doc.includes('脏腑是功能轴，不是器官'),
  };
}

function main() {
  const a = audit();
  console.log(`口腔内科学 · 第 ${a.chapter} 章 ${a.title}`);
  console.log('');
  console.log(`小节 ${a.sections.length} 节`);
  console.log(`三种挂法：${a.attach.join('、')}`);
  console.log(`固定说法命中：${a.claims.length}／${CLAIMS.length}（${a.claims.join('、')}）`);
  console.log('');
  console.log(`经络归属表 ${a.meridianRows} 行：`);
  for (const m of a.meridians) console.log(`  ${m}`);
  console.log('');
  console.log(`上齿归胃：${a.upperToStomach ? '是' : '否'}；下齿归大肠：${a.lowerToLargeIntestine ? '是' : '否'}`);
  console.log(`涎出现 ${a.saliva['涎']} 次，唾出现 ${a.saliva['唾']} 次（二者分家）`);
  console.log('');
  console.log(`翻译边界：矿化同源≠胚胎同源 ${a.boundaryEmbryo ? '在' : '缺'}；脏腑是功能轴 ${a.boundaryAxis ? '在' : '缺'}`);
  console.log('');
  console.log('※ 教学样例：归属表与计数均由 docs/zh.md 现算，不手打。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, SLUG, ATTACH, CLAIMS, readDoc, sections, tableRows, audit };
