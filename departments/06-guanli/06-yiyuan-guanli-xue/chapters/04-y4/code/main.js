#!/usr/bin/env node
/**
 * 医院管理学 · 第 4 章 药事管理管的是处方权的边界，不是药房的库存
 * 课程: departments/06-guanli/06-yiyuan-guanli-xue/chapters/04-y4/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部从本章 docs/zh.md 现算：汉字、节、加粗判断、引文与问句。
 * 并复算本章的三条链——委员会三项技术支撑、五专五项、中药四环节、质控双轨。
 * 任何一条链数不齐，脚本报错，因为本章的立论是“用药决定这条链不能断”。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 4;
const TITLE = '药事管理管的是处方权的边界，不是药房的库存';
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

/** 从「甲、乙、丙」的顿号链里数出并列项。 */
function commaList(text, head) {
  const m = String(text).match(new RegExp(head + '[^。\\n]*'));
  if (!m) return [];
  return m[0].split('、').map((s) => s.trim()).filter(Boolean);
}

/** 从「甲—乙—丙」的破折号链里数出环节。 */
function dashChain(text, head) {
  const m = String(text).match(new RegExp(head + '[^。\\n]*'));
  if (!m) return [];
  return m[0].split('”')[0].split('—').map((s) => s.trim()).filter(Boolean);
}

/**
 * 复算用药决定链：委员会几项支撑、五专几专、中药几个环节、质控几轨。
 * 本章判断：只查库存与金额，这条链断了也看不出来。
 */
function auditChain(sections) {
  const s1 = sectionOf(sections, '药事管理与药物治疗学委员会');
  const s2 = sectionOf(sections, '处方权');
  const s3 = sectionOf(sections, '中药这条链');
  const s4 = sectionOf(sections, '医技');

  const supports = boldTerms(s1.text).filter((b) => b !== '否决权而不是同意权');
  const fiveSpecial = commaList(s2.text, '专人负责、');
  const herbal = dashChain(s3.text, '饮片质量—');
  const dualTrack = ['室内质控', '室间质评'].filter((k) => s4.text.includes(k));

  return { supports, fiveSpecial, herbal, dualTrack, grantByCategory: /按类别逐项授予/.test(s2.text) };
}

function verify(a) {
  if (a.supports.length !== 3) throw new Error(`委员会技术支撑数到 ${a.supports.length} 项，须三项`);
  if (a.fiveSpecial.length !== 5) throw new Error(`五专只数到 ${a.fiveSpecial.length} 专，须五专齐全`);
  if (a.herbal.length !== 4) throw new Error(`中药风险环节数到 ${a.herbal.length} 个，须四个`);
  if (a.dualTrack.length !== 2) throw new Error(`质控只数到 ${a.dualTrack.length} 轨，双轨缺一即半张网`);
  if (!a.grantByCategory) throw new Error('正文没有写明处方权按类别逐项授予');
}

function main() {
  const a = analyze(read());
  const c = auditChain(a.sections);
  verify(c);

  console.log(`医院管理学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 加粗判断 ${a.claims} 处 · 引文 ${a.quotes.length} 条 · 问句 ${a.questions} 个`);
  console.log('');
  console.log(`委员会技术支撑 ${c.supports.length}/3：${c.supports.join('／')}`);
  console.log(`五专 ${c.fiveSpecial.length}/5：${c.fiveSpecial.join('／')}`);
  console.log(`中药风险环节 ${c.herbal.length}/4：${c.herbal.join(' → ')}`);
  console.log(`医技质控双轨 ${c.dualTrack.length}/2：${c.dualTrack.join('／')}`);
  console.log('');
  console.log('判断：药事管理的对象不是药品本身，是“谁有权开、谁审、谁评、谁改”这条链；');
  console.log('      指标全绿而个案失守，说明断的是链，不是库存。');
  console.log('');
  console.log('逐节字数：');
  for (const s of a.sections) {
    const share = a.hanzi ? ((s.hanzi / a.hanzi) * 100).toFixed(1) : '0.0';
    console.log(`  ${s.title.padEnd(28, '　')} ${String(s.hanzi).padStart(5)} 字（${share}%）`);
  }
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即随之变化；本输出仅用于教学演示，不构成用药、检验或感控指令。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, parseSections, analyze, boldTerms, sectionOf, commaList, dashChain, auditChain, verify };
