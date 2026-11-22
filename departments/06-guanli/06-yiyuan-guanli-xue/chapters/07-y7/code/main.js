#!/usr/bin/env node
/**
 * 医院管理学 · 第 7 章 设备的账不在买贵了，在用坏了没人认
 * 课程: departments/06-guanli/06-yiyuan-guanli-xue/chapters/07-y7/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部从本章 docs/zh.md 现算：汉字、节、加粗判断、引文与问句。
 * 并复算本章的生命周期账——六段生命周期、效益四数、建筑三原则、学科四件事。
 * 段数或项数对不上，脚本报错，因为本章的立论是“只算采购价等于只看冰山一角”。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 7;
const TITLE = '设备的账不在买贵了，在用坏了没人认';
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

const LIFECYCLE = ['论证。', '采购。', '验收。', '使用。', '维保。', '报废。'];
const BENEFIT = ['单机收入', '单机成本', '开机率', '投资回收期'];
const BUILDING = ['洁污分流、人物流线分开。', '时间优先的科室要靠近。', '中医特色空间要单列。'];
const DISCIPLINE = ['稳定的方向', '梯队完整的队伍', '可持续的平台', '可评价的成果'];

/**
 * 复算六段生命周期、效益四数、建筑三原则与学科四件事。
 * 本章判断：买只是一段，用坏了没人认才是账真正失控的地方。
 */
function auditAsset(sections) {
  const s1 = sectionOf(sections, '六段生命周期');
  const s2 = sectionOf(sections, '效益分析');
  const s3 = sectionOf(sections, '建筑与流程');
  const s6 = sectionOf(sections, '学科建设');

  const lifecycle = LIFECYCLE.filter((x) => boldTerms(s1.text).some((b) => b === x));
  const benefit = BENEFIT.filter((x) => boldTerms(s2.text).some((b) => b === x));
  const building = BUILDING.filter((x) => boldTerms(s3.text).some((b) => b === x));
  const discipline = DISCIPLINE.filter((x) => boldTerms(s6.text).some((b) => b === x));
  const downtime = /停机损失/.test(s2.text);

  return { lifecycle, benefit, building, discipline, downtime };
}

function verify(a) {
  if (a.lifecycle.length !== 6) throw new Error(`生命周期只数到 ${a.lifecycle.length} 段，须六段`);
  if (a.benefit.length !== 4) throw new Error(`效益分析只数到 ${a.benefit.length} 个数，须四个`);
  if (a.building.length !== 3) throw new Error(`建筑原则只数到 ${a.building.length} 条，须三条`);
  if (a.discipline.length !== 4) throw new Error(`学科要素只数到 ${a.discipline.length} 件，须四件`);
  if (!a.downtime) throw new Error('正文没有写停机损失，效益账缺一项');
}

function main() {
  const a = analyze(read());
  const s = auditAsset(a.sections);
  verify(s);

  console.log(`医院管理学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 加粗判断 ${a.claims} 处 · 引文 ${a.quotes.length} 条 · 问句 ${a.questions} 个`);
  console.log('');
  console.log(`生命周期 ${s.lifecycle.length}/6：${s.lifecycle.map((x) => x.replace(/。$/, '')).join(' → ')}`);
  console.log(`效益四数 ${s.benefit.length}/4：${s.benefit.join('／')}${s.downtime ? '，另加停机损失' : ''}`);
  console.log(`建筑三原则 ${s.building.length}/3：${s.building.map((x) => x.replace(/。$/, '')).join('／')}`);
  console.log(`学科四件事 ${s.discipline.length}/4：${s.discipline.join('／')}`);
  console.log('');
  console.log('判断：设备的真实成本是采购价加安装、培训、维保、耗材、停机损失与报废处置；');
  console.log('      六段里只有验收能把厂家承诺变成书面责任，其余五段靠一本账和一个责任人。');
  console.log('');
  console.log('逐节字数：');
  for (const x of a.sections) {
    const share = a.hanzi ? ((x.hanzi / a.hanzi) * 100).toFixed(1) : '0.0';
    console.log(`  ${x.title.padEnd(28, '　')} ${String(x.hanzi).padStart(5)} 字（${share}%）`);
  }
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即随之变化；本输出仅用于教学演示，不构成设备采购或工程管理意见。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, parseSections, analyze, boldTerms, sectionOf, auditAsset, verify, LIFECYCLE, BENEFIT, BUILDING, DISCIPLINE };
