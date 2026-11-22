#!/usr/bin/env node
/**
 * 医院管理学 · 第 5 章 质量指标可以修饰，质量成本修饰不了
 * 课程: departments/06-guanli/06-yiyuan-guanli-xue/chapters/05-y5/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部从本章 docs/zh.md 现算：汉字、节、加粗判断、引文与问句。
 * 并复算本章的指标结构——质量三层、核心制度四项、上报分级五档、变异三类、成本四级。
 * 层级或档数对不上，脚本报错，因为本章的立论是“单层都能修饰，三层与成本不能”。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 5;
const TITLE = '质量指标可以修饰，质量成本修饰不了';
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

const LAYERS = ['结构', '过程', '结果'];
const CORE_RULES = ['三级查房。', '会诊。', '危急值。', '死亡病例讨论。'];
const REPORT_LEVELS = ['隐患事件', '未遂事件', '无伤害事件', '轻度伤害', '重度伤害'];
const VARIANCES = ['患者因素', '医师因素', '系统因素'];

/**
 * 复算质量三层、四项核心制度、五档上报分级、三类变异与四级成本。
 * 本章判断：结果好不等于质量好，聚合指标必须回到过程与成本去看。
 */
function auditQuality(sections) {
  const s1 = sectionOf(sections, '三层结构');
  const s2 = sectionOf(sections, '核心制度');
  const s3 = sectionOf(sections, '上报率悖论');
  const s4 = sectionOf(sections, '临床路径');
  const s5 = sectionOf(sections, '财务');

  const layers = LAYERS.filter((x) => boldTerms(s1.text).some((b) => b === x));
  const coreRules = CORE_RULES.filter((x) => boldTerms(s2.text).some((b) => b === x));
  const levels = REPORT_LEVELS.filter((x) => s3.text.includes(x));
  const variances = VARIANCES.filter((x) => boldTerms(s4.text).some((b) => b === x));
  const costLevels = /成本核算分四级/.test(s5.text) ? 4 : 0;

  return { layers, coreRules, levels, variances, costLevels };
}

function verify(a) {
  if (a.layers.length !== 3) throw new Error(`质量只数到 ${a.layers.length} 层，结构—过程—结果三层缺一不可`);
  if (a.coreRules.length !== 4) throw new Error(`核心制度样例只数到 ${a.coreRules.length} 项，须四项`);
  if (a.levels.length !== 5) throw new Error(`上报分级只数到 ${a.levels.length} 档，须五档`);
  if (a.variances.length !== 3) throw new Error(`变异只数到 ${a.variances.length} 类，须三类`);
  if (a.costLevels !== 4) throw new Error('正文没有写明成本核算分四级');
}

function main() {
  const a = analyze(read());
  const q = auditQuality(a.sections);
  verify(q);

  console.log(`医院管理学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 加粗判断 ${a.claims} 处 · 引文 ${a.quotes.length} 条 · 问句 ${a.questions} 个`);
  console.log('');
  console.log(`质量三层 ${q.layers.length}/3：${q.layers.join(' → ')}`);
  console.log(`核心制度样例 ${q.coreRules.length}/4：${q.coreRules.map((x) => x.replace(/。$/, '')).join('／')}`);
  console.log(`上报分级 ${q.levels.length}/5：${q.levels.join('／')}（前两档占比越高，报告文化越健康）`);
  console.log(`变异分类 ${q.variances.length}/3：${q.variances.join('／')}`);
  console.log(`成本核算 ${q.costLevels}/4 级：科室／项目／病种／病组`);
  console.log('');
  console.log('判断：结果好不等于质量好，聚合指标可以被修饰；');
  console.log('      成本会以多住两天、多换一次药、多一次再入院的形式，把被压掉的损失推回来。');
  console.log('');
  console.log('逐节字数：');
  for (const s of a.sections) {
    const share = a.hanzi ? ((s.hanzi / a.hanzi) * 100).toFixed(1) : '0.0';
    console.log(`  ${s.title.padEnd(28, '　')} ${String(s.hanzi).padStart(5)} 字（${share}%）`);
  }
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即随之变化；本输出仅用于教学演示，不构成审计意见或质量认证结论。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, parseSections, analyze, boldTerms, sectionOf, auditQuality, verify, LAYERS, CORE_RULES, REPORT_LEVELS, VARIANCES };
