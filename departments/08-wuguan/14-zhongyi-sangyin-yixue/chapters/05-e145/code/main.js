#!/usr/bin/env node
/**
 * 中医嗓音医学 · 第 5 章 喉痹与乳蛾
 * 正文: departments/08-wuguan/14-zhongyi-sangyin-yixue/chapters/05-e145/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文读出四个病名与病位、急慢喉痹各三型、四条鉴别线与三条红旗，
 * 再复算两件事：一处局部体征该归喉痹还是乳蛾；脓在喉核内还是喉核外。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = '5';
const SLUG = '05-e145';

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

/** 四个病名及其病位 */
function diseaseNames(doc) {
  return table(doc, '四个病名')
    .slice(1)
    .map((r) => ({ name: r[0], site: r[1], sign: r[2], modern: r[3] }));
}

/** 病位决定病名：咽黏膜／咽壁归喉痹，喉核归乳蛾 */
function nameBySite(site) {
  const s = String(site || '');
  if (/喉核|腭扁桃体/.test(s)) return '乳蛾';
  if (/咽黏膜|咽壁/.test(s)) return '喉痹';
  return null;
}

/** 急喉痹三型：看红、痛、热的配比 */
function acuteBi(doc) {
  return table(doc, '急喉痹')
    .slice(1)
    .map((r) => ({ type: r[0], sign: r[1], tongue: r[2], therapy: r[3], formula: r[4] }));
}

/** 慢喉痹三型：看干、痰、虚的偏向 */
function chronicBi(doc) {
  return table(doc, '慢喉痹')
    .slice(1)
    .map((r) => ({ type: r[0], sign: r[1], tongue: r[2], therapy: r[3], formula: r[4] }));
}

/** 脓在喉核内还是喉核外，决定是不是越过本章上界 */
function pusLocation(where) {
  const w = String(where || '');
  if (w.includes('喉核内')) return '乳蛾';
  if (w.includes('喉核外')) return '喉关痈（已越过本章上界）';
  return null;
}

/** 四条鉴别线与三条红旗 */
function discriminators(doc) {
  const sec = section(doc, '四条鉴别线');
  const leads = [...sec.text.matchAll(/\*\*([^*]{2,12})\*\*/g)].map((m) => m[1].trim().replace(/。$/, ''));
  const lines = leads.filter((s) => /^(伪膜|化脓|发热|病程)/.test(s));
  const flags = leads.filter((s) => /^其[一二三]/.test(s));
  return { lines, flags };
}

/** 三条红旗的正文（每条的判据句） */
function redFlagText(doc) {
  const sec = section(doc, '四条鉴别线');
  const tail = sec.text.split('三条红旗')[1] || '';
  return [...tail.matchAll(/\*\*(其[一二三]，[^*]+)\*\*\s*([^。]+)。/g)].map((m) => ({
    title: m[1].trim().replace(/。$/, ''),
    sign: m[2].replace(/^——/, '').split('——')[0].trim(),
  }));
}

function report() {
  const doc = readDoc();
  const names = diseaseNames(doc);
  const ac = acuteBi(doc);
  const ch = chronicBi(doc);
  const d = discriminators(doc);
  const flags = redFlagText(doc);

  console.log(`中医嗓音医学 · 第 ${CHAPTER} 章 喉痹与乳蛾（${SLUG}）`);
  console.log('');
  console.log(`正文 ${hanzi(doc)} 汉字`);
  console.log('');
  console.log(`一、四个病名，先分病位（${names.length} 个）`);
  for (const n of names) console.log(`  ${n.name}（${n.site}）：${n.sign}　≈${n.modern}`);
  console.log('');
  console.log(`二、急喉痹${ac.length}型：${ac.map((x) => x.type).join(' / ')}`);
  for (const x of ac) console.log(`  ${x.type} → ${x.therapy}；${x.formula}`);
  console.log('');
  console.log(`三、慢喉痹${ch.length}型：${ch.map((x) => x.type).join(' / ')}`);
  for (const x of ch) console.log(`  ${x.type} → ${x.therapy}；${x.formula}`);
  console.log('');
  console.log(`四、鉴别线 ${d.lines.length} 条：${d.lines.join('、')}`);
  console.log(`五、红旗 ${d.flags.length} 条`);
  for (const f of flags) console.log(`  ${f.title}——${f.sign}`);
  console.log('');
  console.log('※ 由 docs/zh.md 现算；方名只标示治法方向，不含剂量与疗程。');
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
  diseaseNames,
  nameBySite,
  acuteBi,
  chronicBi,
  pusLocation,
  discriminators,
  redFlagText,
};
