#!/usr/bin/env node
/**
 * 医院管理学 · 第 3 章 门诊的瓶颈不在医生手速，在患者动线的乘法
 * 课程: departments/06-guanli/06-yiyuan-guanli-xue/chapters/03-y3/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部从本章 docs/zh.md 现算：汉字、节、加粗判断、引文与问句。
 * 并复算本章的流程账——门诊串联链几段、三种手法几项、住院日几个“等”字。
 * 串联段数与“等”字数对不上，脚本报错，因为本章的结论是“瓶颈由串联最慢一段决定”。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 3;
const TITLE = '门诊的瓶颈不在医生手速，在患者动线的乘法';
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

/** 从「甲—乙—丙」这样的顿号链里数出环节。 */
function dashChain(text, head) {
  const m = String(text).match(new RegExp(head + '[^。\\n]*'));
  if (!m) return [];
  return m[0].split('—').map((s) => s.trim()).filter(Boolean);
}

/**
 * 复算门诊串联链、三种改进手法、住院日的五个“等”。
 * 本章判断：串行决定总时长，所以手法必须组合而不是单点提速。
 */
function auditFlow(sections) {
  const s1 = sectionOf(sections, '门诊：把动线');
  const s3 = sectionOf(sections, '住院与手术');
  const s4 = sectionOf(sections, '护理单元');

  const chain = dashChain(s1.text, '挂号—');
  const tactics = boldTerms(s1.text).filter((b) => ['削峰。', '并联。', '分流。'].includes(b));
  const waits = boldTerms(s3.text).filter((b) => b.startsWith('等'));
  const reversible = /平均住院日与床位使用率不是同向指标/.test(s3.text);
  const indicatorRule = /结果指标用来发现科室，过程指标用来发现问题/.test(s4.text);

  return { chain, tactics, waits, reversible, indicatorRule };
}

function verify(a) {
  if (a.chain.length !== 7) throw new Error(`门诊串联链数到 ${a.chain.length} 段，与正文的七段不符`);
  if (a.tactics.length !== 3) throw new Error(`改进手法数到 ${a.tactics.length} 种，须削峰／并联／分流三种`);
  if (a.waits.length !== 5) throw new Error(`住院日“等”字只数到 ${a.waits.length} 个，须五个`);
  if (!a.reversible) throw new Error('正文没有写明平均住院日与床位使用率不同向');
  if (!a.indicatorRule) throw new Error('正文没有写明结果指标与过程指标的分工');
}

function main() {
  const a = analyze(read());
  const f = auditFlow(a.sections);
  verify(f);

  console.log(`医院管理学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 加粗判断 ${a.claims} 处 · 引文 ${a.quotes.length} 条 · 问句 ${a.questions} 个`);
  console.log('');
  console.log(`门诊串联链 ${f.chain.length} 段：${f.chain.join(' → ')}`);
  console.log(`改进手法 ${f.tactics.length}/3：${f.tactics.map((x) => x.replace(/。$/, '')).join('／')}（须组合使用）`);
  console.log(`住院日“等”字 ${f.waits.length}/5：${f.waits.join('／')}`);
  console.log(`平均住院日与床位使用率不同向：${f.reversible ? '已写明' : '缺失'}`);
  console.log(`指标分工：${f.indicatorRule ? '结果指标发现科室，过程指标发现问题' : '缺失'}`);
  console.log('');
  console.log('判断：吞吐量由串联最慢的一段决定，局部提速只把队列挪位；');
  console.log('      要动总时长，只能削峰、并联、分流三法同时上。');
  console.log('');
  console.log('逐节字数：');
  for (const s of a.sections) {
    const share = a.hanzi ? ((s.hanzi / a.hanzi) * 100).toFixed(1) : '0.0';
    console.log(`  ${s.title.padEnd(28, '　')} ${String(s.hanzi).padStart(5)} 字（${share}%）`);
  }
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即随之变化；本输出仅用于教学演示，不构成诊疗意见或流程改造方案。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, parseSections, analyze, boldTerms, sectionOf, dashChain, auditFlow, verify };
