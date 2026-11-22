#!/usr/bin/env node
/**
 * 医院管理学 · 第 10 章 分级诊疗的堵点不在基层能力，在向上转诊的那张纸
 * 课程: departments/06-guanli/06-yiyuan-guanli-xue/chapters/10-y10/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部从本章 docs/zh.md 现算：汉字、节、加粗判断、引文与问句。
 * 并复算本章的转诊账——六位一体六项、转诊三件事、紧密型三统一、数字化三层。
 * 项数或层数对不上，脚本报错，因为本章的立论是“四句话都要落到标准、通道、支付上”。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 10;
const TITLE = '分级诊疗的堵点不在基层能力，在向上转诊的那张纸';
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

function commaList(text, head) {
  const m = String(text).match(new RegExp(head + '[^。\\n]*'));
  if (!m) return [];
  return m[0].split('”')[0].split('、').map((s) => s.trim()).filter(Boolean);
}

const REFERRAL = ['标准。', '通道。', '激励。'];
const UNIFIED = ['人统一。', '财统一。', '事统一。'];

/**
 * 复算六位一体、转诊三件事、紧密型三统一与数字化三层。
 * 本章判断：协议签的是意愿，缺的是规则；规则落在标准、通道、支付三处。
 */
function auditReferral(sections) {
  const s1 = sectionOf(sections, '社区卫生服务');
  const s3 = sectionOf(sections, '转诊');
  const s4 = sectionOf(sections, '医联体');
  const s6 = sectionOf(sections, '数字');

  const six = commaList(s1.text, '预防、');
  const referral = REFERRAL.filter((x) => boldTerms(s3.text).some((b) => b === x));
  const unified = UNIFIED.filter((x) => boldTerms(s4.text).some((b) => b === x));
  const layers = boldTerms(s6.text).filter((b) => b.startsWith('第'));
  const settlement = /医保结余归谁/.test(s4.text);
  const samePrice = /同病同效同价/.test(s5text(sections));

  return { six, referral, unified, layers, settlement, samePrice };
}

function s5text(sections) {
  const s = sections.find((x) => x.title.includes('支付改革'));
  if (!s) throw new Error('正文里没找到含「支付改革」的节');
  return s.text;
}

function verify(a) {
  if (a.six.length !== 6) throw new Error(`六位一体只数到 ${a.six.length} 项，须六项`);
  if (a.referral.length !== 3) throw new Error(`转诊要件只数到 ${a.referral.length} 件，须三件`);
  if (a.unified.length !== 3) throw new Error(`紧密型统一只数到 ${a.unified.length} 条，须三条`);
  if (a.layers.length !== 3) throw new Error(`数字化只数到 ${a.layers.length} 层，须三层`);
  if (!a.settlement) throw new Error('正文没有写“医保结余归谁”这一句判据');
  if (!a.samePrice) throw new Error('正文没有写“同病同效同价”的支付路径');
}

function main() {
  const a = analyze(read());
  const r = auditReferral(a.sections);
  verify(r);

  console.log(`医院管理学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 加粗判断 ${a.claims} 处 · 引文 ${a.quotes.length} 条 · 问句 ${a.questions} 个`);
  console.log('');
  console.log(`六位一体 ${r.six.length}/6：${r.six.join('／')}`);
  console.log(`转诊三件事 ${r.referral.length}/3：${r.referral.map((x) => x.replace(/。$/, '')).join('／')}`);
  console.log(`紧密型三统一 ${r.unified.length}/3：${r.unified.map((x) => x.replace(/。$/, '')).join('／')}`);
  console.log(`数字化三层 ${r.layers.length}/3：${r.layers.map((x) => x.replace(/。$/, '')).join(' → ')}`);
  console.log(`真假紧密判据：${r.settlement ? '医保结余归谁' : '缺失'}`);
  console.log(`中医支付路径：${r.samePrice ? '按疗效价值付费，同病同效同价' : '缺失'}`);
  console.log('');
  console.log('判断：协议签的是意愿，缺的是规则；');
  console.log('      标准、通道、激励三件不齐，下转率不会因为发文件而动。');
  console.log('');
  console.log('逐节字数：');
  for (const s of a.sections) {
    const share = a.hanzi ? ((s.hanzi / a.hanzi) * 100).toFixed(1) : '0.0';
    console.log(`  ${s.title.padEnd(28, '　')} ${String(s.hanzi).padStart(5)} 字（${share}%）`);
  }
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即随之变化；本输出仅用于教学演示，不构成政策解读或支付方式建议。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, parseSections, analyze, boldTerms, sectionOf, commaList, auditReferral, verify, REFERRAL, UNIFIED };
