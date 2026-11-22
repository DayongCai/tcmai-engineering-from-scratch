#!/usr/bin/env node
/**
 * 中医嗓音医学 · 第 7 章 声带疾病与用嗓卫生
 * 正文: departments/08-wuguan/14-zhongyi-sangyin-yixue/chapters/07-e147/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文读出四种病变的落点、六型辨证、四条用嗓规则与职业三层，
 * 再复算两件事：一组声带所见该落到哪一种病变；白斑的处置顺序为什么不能倒。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = '7';
const SLUG = '07-e147';

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

/** 四种病变：一条链，四个落点 */
function lesions(doc) {
  return table(doc, '四种病变')
    .slice(1)
    .map((r) => ({ lesion: r[0], side: r[1], form: r[2], voice: r[3], cause: r[4] }));
}

/** 六型辨证，声带所见是对读不是等号 */
function syndromes(doc) {
  return table(doc, '中医的对应')
    .slice(1)
    .map((r) => ({ type: r[0], sign: r[1], laryngo: r[2], therapy: r[3], common: r[4] }));
}

/** 四条能自查的用嗓规则 */
function voiceRules(doc) {
  return table(doc, '用嗓卫生')
    .slice(1)
    .map((r) => ({ dimension: r[0], rule: r[1], criterion: r[2], mistake: r[3] }));
}

/** 职业三层 */
function occupations(doc) {
  return table(doc, '职业用嗓')
    .slice(1)
    .map((r) => ({ tier: r[0], people: r[1], risk: r[2], advice: r[3] }));
}

/**
 * 一组声带所见落到哪一种病变。
 * 判据取自正文「四种病变对应四种记账方式」那段：对称落在前中三分之一的是小结，
 * 单侧局限的是息肉，全长水袋样的是任克水肿，白色斑块不可擦去的是白斑。
 */
function classifyLesion(signs = {}) {
  const has = (k) => Boolean(signs[k]);
  if (has('whitePatch')) return { lesion: '喉白斑', action: '先活检、再分级、后随访' };
  if (has('wholeLength')) return { lesion: '任克水肿', action: '戒烟、治反流、控滥用' };
  if (has('unilateral')) return { lesion: '声带息肉', action: '查单次极端用嗓与吸烟' };
  if (has('symmetric') && has('frontMiddle')) return { lesion: '声带小结', action: '长期中等应力，先保守与用嗓矫正' };
  return null;
}

/** 白斑的处置顺序与理由 */
function whitePatchOrder(doc) {
  const sec = section(doc, '四种病变');
  const m = /先活检、再分级、后随访/.exec(sec.text);
  const why = /潜在恶性病变/.exec(sec.text);
  return { order: m ? m[0] : '', isPremalignant: Boolean(why) };
}

/** 三个不等号：证名不等于检查所见 */
function gaps(doc) {
  const sec = section(doc, '中医的对应');
  return [...sec.text.matchAll(/\*\*([^*]{4,20}?)不等于([^*]{2,12}?)\*\*/g)].map((m) => ({
    left: m[1].trim(),
    right: m[2].trim(),
  }));
}

function report() {
  const doc = readDoc();
  const ls = lesions(doc);
  const sy = syndromes(doc);
  const rules = voiceRules(doc);
  const occ = occupations(doc);
  const wp = whitePatchOrder(doc);
  const gp = gaps(doc);

  console.log(`中医嗓音医学 · 第 ${CHAPTER} 章 声带疾病与用嗓卫生（${SLUG}）`);
  console.log('');
  console.log(`正文 ${hanzi(doc)} 汉字`);
  console.log('');
  console.log(`一、四种病变，四个落点（${ls.length} 种）`);
  for (const l of ls) {
    console.log(`  ${l.lesion}｜${l.side}｜${l.form}`);
    console.log(`      声音 ${l.voice}；诱因 ${l.cause}`);
  }
  console.log('');
  console.log(`二、对读六型（${sy.length} 型）`);
  for (const s of sy) console.log(`  ${s.type} → ${s.therapy}（常见对应：${s.common}）`);
  console.log('');
  console.log(`三、用嗓规则（${rules.length} 条，每条带判据）`);
  for (const r of rules) console.log(`  ${r.dimension}：${r.rule}｜判据 ${r.criterion}`);
  console.log('');
  console.log(`四、职业三层（${occ.length} 层）`);
  for (const o of occ) console.log(`  ${o.tier}：${o.people}`);
  console.log('');
  console.log(`五、白斑不是增生的同类项：潜在恶性=${wp.isPremalignant}，顺序「${wp.order}」`);
  console.log('');
  console.log(`六、三个不等号（${gp.length} 条）：${gp.map((g) => `${g.left}≠${g.right}`).join('；')}`);
  console.log('');
  console.log('※ 条目与计数由 docs/zh.md 现算；辨证与病理是两条轴，不能互替。');
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
  lesions,
  syndromes,
  voiceRules,
  occupations,
  classifyLesion,
  whitePatchOrder,
  gaps,
};
