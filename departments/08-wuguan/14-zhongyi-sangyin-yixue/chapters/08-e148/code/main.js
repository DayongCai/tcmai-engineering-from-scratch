#!/usr/bin/env node
/**
 * 中医嗓音医学 · 第 8 章 咽喉急症与调护
 * 正文: departments/08-wuguan/14-zhongyi-sangyin-yixue/chapters/08-e148/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文读出四度分度、四条病因线、六步顺序、三不做、四档转与留、调护六件事，
 * 再复算：一组床旁所见该报第几度；这一步该就地处理、边治边转，还是先建气道。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = '8';
const SLUG = '08-e148';
const NL = /\r?\n/;

function readDoc() {
  return fs.readFileSync(DOC, 'utf8');
}

function sections(md) {
  const out = [];
  let cur = { title: '(前言)', lines: [] };
  for (const line of String(md).split(NL)) {
    const m = /^##\s+(.+)$/.exec(line);
    if (m) {
      out.push(cur);
      cur = { title: m[1].trim(), lines: [] };
    } else {
      cur.lines.push(line);
    }
  }
  out.push(cur);
  return out.map((s) => ({ title: s.title, text: s.lines.join('\n') }));
}

function section(doc, kw) {
  const hit = sections(doc).find((s) => s.title.includes(kw));
  if (!hit) throw new Error('正文缺小节: ' + kw);
  return hit;
}

function tables(text) {
  const groups = [];
  let cur = null;
  for (const line of String(text).split(NL)) {
    if (/^\s*\|/.test(line)) {
      if (!cur) {
        cur = [];
        groups.push(cur);
      }
      const cells = line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
      cur.push(cells);
    } else {
      cur = null;
    }
  }
  return groups.map((g) => g.filter((cells) => !cells.every((c) => /^:?-{2,}:?$/.test(c) || c === '')));
}

function table(doc, sectionKw, index = 0) {
  const t = tables(section(doc, sectionKw).text);
  if (!t[index]) throw new Error(`${sectionKw} 里没有第 ${index + 1} 张表`);
  return t[index];
}

const HAN = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const hanzi = (s) => (String(s || '').match(HAN) || []).length;

/** 四度分度：安静时 / 活动时 / 缺氧征象 / 处理方向 */
function degrees(doc) {
  return table(doc, '四度')
    .slice(1)
    .map((r) => ({ degree: r[0], rest: r[1], active: r[2], hypoxia: r[3], action: r[4] }));
}

/**
 * 一组床旁所见该报第几度。判据取自分度表：
 * 只在活动或哭闹时出现→Ⅰ；安静时已有而无缺氧征象→Ⅱ；烦躁发绀→Ⅲ；衰竭昏迷→Ⅳ。
 */
function gradeOf(signs = {}) {
  if (signs.collapse) return 'Ⅳ 度';
  if (signs.agitatedOrCyanotic) return 'Ⅲ 度';
  if (signs.atRest) return 'Ⅱ 度';
  if (signs.onlyOnExertion) return 'Ⅰ 度';
  return null;
}

/** 病因四条线：按处理方式归，不按病名罗列 */
function causeLines(doc) {
  const sec = section(doc, '病名');
  return [...sec.text.matchAll(/^\*\*([^*]{2,4})\*\*——([^\n]+)$/gm)].map((m) => ({
    line: m[1].trim(),
    how: m[2].trim().replace(/。$/, ''),
  }));
}

/** 六步：顺序即第一原则 */
function steps(doc) {
  const sec = section(doc, '六步与三不做');
  return [...sec.text.matchAll(/\*\*(第[一二三四五六]步，[^*]+)\*\*/g)].map((m) => m[1].trim().replace(/。$/, ''));
}

/** 三不做 */
function neverDo(doc) {
  const sec = section(doc, '六步与三不做');
  const tail = sec.text.split('三不做')[1] || '';
  return [...tail.matchAll(/\*\*(不[^*]{2,14})\*\*/g)].map((m) => m[1].trim().replace(/。$/, ''));
}

/** 四档转与留 */
function disposition(doc) {
  return table(doc, '不行就转')
    .slice(1)
    .map((r) => ({ case: r[0], sign: r[1], action: r[2] }));
}

/** 调护六件事 */
function care(doc) {
  const sec = section(doc, '调护六件事');
  return [...sec.text.matchAll(/^\*\*([一二三四五六]、[^*]+)\*\*/gm)].map((m) => m[1].trim().replace(/。$/, ''));
}

/** 拔管后三件事 */
function afterExtubation(doc) {
  const sec = section(doc, '调护六件事');
  const tail = sec.text.split('拔管后至少三件事')[1] || '';
  return [...tail.matchAll(/\*\*([^*]{2,8})\*\*/g)].map((m) => m[1].trim().replace(/。$/, ''));
}

/** 三条硬升级判据与一条反判据 */
function escalation(doc) {
  const sec = section(doc, '不行就转');
  const lines = sec.text.split(NL);
  const hardLine = lines.find((l) => l.includes('任何一条成立就该升级')) || '';
  const hard = [...hardLine.matchAll(/\*\*([^*]+)\*\*/g)].map((m) => m[1].trim());
  const counterLine = lines.find((l) => l.includes('反判据') && l.includes('**')) || '';
  const cm = /\*\*([^*]+)\*\*/.exec(counterLine);
  return {
    hard,
    counter: cm ? cm[1].trim().replace(/。$/, '') : '',
  };
}

function report() {
  const doc = readDoc();
  const dg = degrees(doc);
  const cl = causeLines(doc);
  const st = steps(doc);
  const nd = neverDo(doc);
  const dp = disposition(doc);
  const cr = care(doc);
  const ae = afterExtubation(doc);
  const es = escalation(doc);

  console.log(`中医嗓音医学 · 第 ${CHAPTER} 章 咽喉急症与调护（${SLUG}）`);
  console.log('');
  console.log(`正文 ${hanzi(doc)} 汉字`);
  console.log('');
  console.log(`一、四度分度（${dg.length} 度）`);
  for (const d of dg) console.log(`  ${d.degree}：安静时 ${d.rest}｜活动时 ${d.active}｜缺氧 ${d.hypoxia} → ${d.action}`);
  console.log('');
  console.log(`二、病因四条线（${cl.length} 条，按处理方式归）`);
  for (const c of cl) console.log(`  ${c.line}：${c.how}`);
  console.log('');
  console.log(`三、六步顺序（${st.length} 步，顺序即第一原则）`);
  for (const s of st) console.log(`  ${s}`);
  console.log('');
  console.log(`四、三不做（${nd.length} 条）：${nd.join('；')}`);
  console.log('');
  console.log(`五、四档转与留（${dp.length} 档）`);
  for (const d of dp) console.log(`  ${d.case}：${d.sign} → ${d.action}`);
  console.log('');
  console.log(`  三条硬判据：${es.hard.join('；')}`);
  console.log(`  反判据：${es.counter}`);
  console.log('');
  console.log(`六、调护 ${cr.length} 件事：${cr.join(' / ')}`);
  console.log(`    拔管后 ${ae.length} 件事：${ae.join(' / ')}`);
  console.log('');
  console.log('※ 条目与计数由 docs/zh.md 现算；分度看趋势不看点数，先保气道其余后推。');
  console.log('※ 本输出为教学样例，不构成急救指令或治疗建议。');
}

if (require.main === module) report();

module.exports = {
  DOC,
  CHAPTER,
  SLUG,
  readDoc,
  sections,
  section,
  tables,
  table,
  hanzi,
  degrees,
  gradeOf,
  causeLines,
  steps,
  neverDo,
  disposition,
  care,
  afterExtubation,
  escalation,
};
