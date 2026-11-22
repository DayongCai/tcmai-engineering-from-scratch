#!/usr/bin/env node
/**
 * 医院管理学 · 第 6 章 绩效方案按收入分配的那天，质量指标就成了成本
 * 课程: departments/06-guanli/06-yiyuan-guanli-xue/chapters/06-y6/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部从本章 docs/zh.md 现算：汉字、节、加粗判断、引文与问句。
 * 并复算本章的绩效结构——闭环四环节、三次分配、三种工具、三条红线、闭环四节点。
 * 结构数对不上，脚本报错，因为本章的立论是“翻译器输入只剩金额，输出必然是金额行为”。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 6;
const TITLE = '绩效方案按收入分配的那天，质量指标就成了成本';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function parseSections(body) {
  const out = [];
  let cur = null;
  for (const line of body.split('\n')) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) { cur = { title: h[1], lines: [] }; out.push(cur); continue; }
    if (cur) cur.lines.push(line);
  }
  return out.map((s) => ({
    title: s.title,
    text: s.lines.join('\n'),
    hanzi: (s.lines.join('\n').match(HANZI) || []).length,
  }));
}

const boldTerms = (text) => [...String(text).matchAll(/\*\*([^*\n]+)\*\*/g)].map((m) => m[1]);

function analyze(text) {
  const body = String(text || '').replace(/\r\n/g, '\n');
  const sections = parseSections(body);
  return {
    hanzi: (body.match(HANZI) || []).length,
    sections,
    claims: boldTerms(body).length,
    quotes: [...new Set([...body.matchAll(/《([^》\n]+)》/g)].map((m) => m[1]))],
    questions: (body.match(/？/g) || []).length,
  };
}

const sectionOf = (sections, kw) => {
  const s = sections.find((x) => x.title.includes(kw));
  if (!s) throw new Error('正文里没找到含「' + kw + '」的节');
  return s;
};

function dashChain(text, pattern) {
  const m = String(text).match(new RegExp(pattern));
  if (!m) return [];
  return m[0].split('—').map((s) => s.trim()).filter(Boolean);
}

const ALLOCS = ['一次分配', '二次分配', '三次分配'];
const TOOLS = ['RBRVS（以资源为基础的相对价值比率）', 'DRG/DIP', '平衡计分卡'];

/**
 * 复算绩效闭环、三次分配、三种工具、三条红线与信息系统闭环四节点。
 * 本章判断：权重就是政策声明，红线是制度要求而非道德要求。
 */
function auditPerf(sections) {
  const s1 = sectionOf(sections, '四个环节');
  const s2 = sectionOf(sections, '三种工具');
  const s3 = sectionOf(sections, '红线');
  const s5 = sectionOf(sections, '信息系统');

  const loop = dashChain(s1.text, '目标设定—指标与权重—考核与核算—反馈与应用');
  const allocs = ALLOCS.filter((x) => boldTerms(s1.text).some((b) => b === x));
  const tools = TOOLS.filter((x) => boldTerms(s2.text).some((b) => b === x));
  const redlines = boldTerms(s3.text).filter((b) => b.startsWith('第'));
  const eRClosed = dashChain(s5.text, '医嘱—执行—记录—评价');

  return { loop, allocs, tools, redlines, eRClosed };
}

function verify(a) {
  if (a.loop.length !== 4) throw new Error(`绩效闭环数到 ${a.loop.length} 环，须四环`);
  if (a.allocs.length !== 3) throw new Error(`分配层次数到 ${a.allocs.length} 次，须三次`);
  if (a.tools.length !== 3) throw new Error(`绩效工具数到 ${a.tools.length} 种，须三种`);
  if (a.redlines.length !== 3) throw new Error(`红线只数到 ${a.redlines.length} 条，须三条`);
  if (a.eRClosed.length !== 4) throw new Error(`电子病历闭环数到 ${a.eRClosed.length} 个节点，须四个`);
}

function main() {
  const a = analyze(read());
  const p = auditPerf(a.sections);
  verify(p);

  console.log(`医院管理学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 加粗判断 ${a.claims} 处 · 引文 ${a.quotes.length} 条 · 问句 ${a.questions} 个`);
  console.log('');
  console.log(`绩效闭环 ${p.loop.length}/4：${p.loop.join(' → ')}`);
  console.log(`三次分配 ${p.allocs.length}/3：${p.allocs.join('／')}`);
  console.log(`三种工具 ${p.tools.length}/3：${p.tools.join('／')}`);
  console.log(`红线 ${p.redlines.length}/3：${p.redlines.map((x) => x.replace(/^第(一|二|三)条：/, '')).join('｜')}`);
  console.log(`电子病历闭环 ${p.eRClosed.length}/4：${p.eRClosed.join(' → ')}`);
  console.log('');
  console.log('判断：权重是最诚实的政策声明，指标是组织行为的翻译器；');
  console.log('      输入只剩金额时，输出必然是金额行为，质量随即变成成本项。');
  console.log('');
  console.log('逐节字数：');
  for (const s of a.sections) {
    const share = a.hanzi ? ((s.hanzi / a.hanzi) * 100).toFixed(1) : '0.0';
    console.log(`  ${s.title.padEnd(28, '　')} ${String(s.hanzi).padStart(5)} 字（${share}%）`);
  }
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即随之变化；本输出仅用于教学演示，不构成薪酬方案或合规审查意见。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, parseSections, analyze, boldTerms, sectionOf, dashChain, auditPerf, verify, ALLOCS, TOOLS };
