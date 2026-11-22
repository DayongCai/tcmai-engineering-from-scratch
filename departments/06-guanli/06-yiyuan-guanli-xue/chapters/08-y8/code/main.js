#!/usr/bin/env node
/**
 * 医院管理学 · 第 8 章 风险管理的成败，在于第一个发现异常的人有没有权限喊停
 * 课程: departments/06-guanli/06-yiyuan-guanli-xue/chapters/08-y8/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部从本章 docs/zh.md 现算：汉字、节、加粗判断、引文与问句。
 * 并复算本章的风险链——三条差异化路线、四类风险、七步事件链、三层预案、三类演练。
 * 链条或层数对不上，脚本报错，因为本章的立论是“报告意愿而不是报告数量”。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 8;
const TITLE = '风险管理的成败，在于第一个发现异常的人有没有权限喊停';
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

const ROUTES = ['优势病种路线。', '治未病与健康管理路线。', '中西医协同的疑难病路线。'];
const RISKS = ['技术风险', '沟通风险', '系统风险', '伦理与法律风险'];
const PLANS = ['总体应急预案', '专项预案', '现场处置方案'];
const DRILLS = ['桌面推演', '单项演练', '综合演练'];

/**
 * 复算本章的风险链：三条路线、四类风险、七步事件链、三层预案、三类演练。
 * 本章判断：链条断在任何一环，这套系统就只是个记录本。
 */
function auditRisk(sections) {
  const s1 = sectionOf(sections, '战略');
  const s2 = sectionOf(sections, '风险识别');
  const s3 = sectionOf(sections, '不良事件');
  const s5 = sectionOf(sections, '应急与危重转运');

  const routes = ROUTES.filter((x) => boldTerms(s1.text).some((b) => b === x));
  const risks = RISKS.filter((x) => boldTerms(s2.text).some((b) => b === x));
  const chain = dashChain(s3.text, '发现—上报—分级—调查—分析—改进—复核');
  const plans = PLANS.filter((x) => s5.text.includes(x));
  const drills = DRILLS.filter((x) => s5.text.includes(x));

  return { routes, risks, chain, plans, drills, noTransfer: /不转运比转运更安全/.test(s5.text) };
}

function verify(a) {
  if (a.routes.length !== 3) throw new Error(`差异化路线数到 ${a.routes.length} 条，须三条`);
  if (a.risks.length !== 4) throw new Error(`风险类别数到 ${a.risks.length} 类，须四类`);
  if (a.chain.length !== 7) throw new Error(`事件链数到 ${a.chain.length} 环，须七环`);
  if (a.plans.length !== 3) throw new Error(`预案体系数到 ${a.plans.length} 层，须三层`);
  if (a.drills.length !== 3) throw new Error(`演练类型数到 ${a.drills.length} 类，须三类`);
  if (!a.noTransfer) throw new Error('正文没有保留“不转运比转运更安全”这句判断');
}

function main() {
  const a = analyze(read());
  const r = auditRisk(a.sections);
  verify(r);

  console.log(`医院管理学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 加粗判断 ${a.claims} 处 · 引文 ${a.quotes.length} 条 · 问句 ${a.questions} 个`);
  console.log('');
  console.log(`差异化路线 ${r.routes.length}/3：${r.routes.map((x) => x.replace(/。$/, '')).join('／')}`);
  console.log(`风险类别 ${r.risks.length}/4：${r.risks.join('／')}`);
  console.log(`事件链 ${r.chain.length}/7：${r.chain.join(' → ')}`);
  console.log(`预案体系 ${r.plans.length}/3：${r.plans.join(' → ')}`);
  console.log(`演练类型 ${r.drills.length}/3：${r.drills.join('／')}`);
  console.log(`“不转运比转运更安全”保留：${r.noTransfer ? '是' : '否'}——这句话删掉，所有转运都会变成必须转。`);
  console.log('');
  console.log('判断：惩罚性文化让数据消失，数据消失让系统失去学习能力；');
  console.log('      成败不在预案厚度，在第一个发现异常的人有没有权限喊停。');
  console.log('');
  console.log('逐节字数：');
  for (const s of a.sections) {
    const share = a.hanzi ? ((s.hanzi / a.hanzi) * 100).toFixed(1) : '0.0';
    console.log(`  ${s.title.padEnd(28, '　')} ${String(s.hanzi).padStart(5)} 字（${share}%）`);
  }
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即随之变化；本输出仅用于教学演示，不构成法律意见或应急预案文本。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, parseSections, analyze, boldTerms, sectionOf, dashChain, auditRisk, verify, ROUTES, RISKS, PLANS, DRILLS };
