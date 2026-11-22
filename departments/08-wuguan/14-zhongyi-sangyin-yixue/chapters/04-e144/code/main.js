#!/usr/bin/env node
/**
 * 中医嗓音医学 · 第 4 章 咽喉病的治法
 * 正文: departments/08-wuguan/14-zhongyi-sangyin-yixue/chapters/04-e144/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文读出四条内治路（及其依据与边界）、三法外治、五道闸门，
 * 再复算：一道闸门没过，后面几道都不启动；哪些情形必须把主辅反转。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = '4';
const SLUG = '04-e144';

function readDoc() {
  return fs.readFileSync(DOC, 'utf8');
}

function sections(md) {
  const out = [];
  let cur = { title: '(前言)', lines: [] };
  for (const line of String(md).split(/\r?\n/)) {
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
  for (const line of String(text).split(/\r?\n/)) {
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

/** 四条内治路：序号名、辨证依据、边界 */
function internalRoads(doc) {
  const text = section(doc, '内治四条路').text;
  const blocks = text.split(/(?=\*\*[一二三四]、[^*]+\*\*)/).filter((b) => /^\*\*[一二三四]、/.test(b.trim()));
  return blocks.map((b) => {
    const name = (/^\*\*([一二三四]、[^*]+)\*\*/.exec(b.trim()) || [])[1] || '';
    const basis = (/依据是([^。]+)。/.exec(b) || [])[1] || '';
    const boundary = (/边界[：:]\**\s*([^。]+)。/.exec(b) || [])[1] || '';
    const clean = (s) => String(s || '').replace(/\*\*/g, '').trim();
    return { name: name.replace(/^[一二三四]、/, '').replace(/。$/, '').trim(), basis: clean(basis), boundary: clean(boundary) };
  });
}

/** 外治三法：名、管哪一层、适用 */
function externalMethods(doc) {
  const text = section(doc, '外治三法').text;
  return [...text.matchAll(/\*\*([^*]{2,4})\*\*管「([^」]+)」。(?:([^\n]*))?/g)].map((m) => ({
    name: m[1].trim(),
    scope: m[2].trim(),
    detail: (m[3] || '').trim(),
  }));
}

/** 五道闸门：串行，前一道没过后面不启动 */
function gates(doc) {
  return table(doc, '五道闸门').slice(1).map((r) => ({ gate: r[0], sign: r[1], action: r[2] }));
}

/** 从某道闸门开始，后面还有几道要等它 */
function blockedAfter(gatesList, gateName) {
  const idx = gatesList.findIndex((g) => g.gate.includes(gateName));
  if (idx < 0) return null;
  return gatesList.slice(idx + 1).map((g) => g.gate);
}

/** 主辅反转的两个触发判据 */
function reversal(doc) {
  const sec = section(doc, '主辅是权重');
  const m = /有没有已成之脓、气道通不通/.exec(sec.text);
  const pus = /喉痈脓已成：([^。]+)。/.exec(sec.text);
  const airway = /急喉风：([^。]+)。/.exec(sec.text);
  return {
    trigger: m ? m[0] : '',
    pusSign: pus ? pus[1].trim() : '',
    airwaySign: airway ? airway[1].trim() : '',
  };
}

/** 三法一句话：含漱管面，吹药管点，雾化管腔 */
function oneLiner(doc) {
  const sec = section(doc, '外治三法');
  const m = /含漱管面，吹药管点，雾化管腔/.exec(sec.text);
  return m ? m[0] : '';
}

function report() {
  const doc = readDoc();
  const roads = internalRoads(doc);
  const ext = externalMethods(doc);
  const gs = gates(doc);
  const rv = reversal(doc);

  console.log(`中医嗓音医学 · 第 ${CHAPTER} 章 咽喉病的治法（${SLUG}）`);
  console.log('');
  console.log(`正文 ${hanzi(doc)} 汉字`);
  console.log('');
  console.log(`一、内治四条路（${roads.length} 条）`);
  for (const r of roads) {
    console.log(`  ${r.name}`);
    console.log(`      依据：${r.basis}`);
    console.log(`      边界：${r.boundary}`);
  }
  console.log('');
  console.log(`二、外治三法（${ext.length} 法）：${oneLiner(doc)}`);
  for (const e of ext) console.log(`  ${e.name} → 管「${e.scope}」`);
  console.log('');
  console.log(`三、五道闸门（${gs.length} 道，串行不并行）`);
  for (const g of gs) console.log(`  ${g.gate}：${g.sign} → ${g.action}`);
  console.log('');
  console.log(`  第一道闸门未过时，其后 ${blockedAfter(gs, '气道').length} 道一律不启动。`);
  console.log('');
  console.log(`四、主辅反转的判据：${rv.trigger}`);
  console.log(`  喉痈脓已成：${rv.pusSign}`);
  console.log(`  急喉风：${rv.airwaySign}`);
  console.log('');
  console.log('※ 条目由 docs/zh.md 现算；本章不给剂量、疗程与器械参数。');
  console.log('※ 本输出为教学样例，不构成诊断或治疗建议。');
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
  internalRoads,
  externalMethods,
  gates,
  blockedAfter,
  reversal,
  oneLiner,
};
