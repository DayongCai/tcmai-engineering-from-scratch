#!/usr/bin/env node
/**
 * 中医嗓音医学 · 第 6 章 喉喑与失音
 * 正文: departments/08-wuguan/14-zhongyi-sangyin-yixue/chapters/06-e146/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文读出三组判据、声音的三层结构、金实三型与金破三型、六条红旗，
 * 再复算：一句主诉（说不久／发不出声／说不清字）落在哪一层，
 * 以及「该散、该补、还是该查」这个分岔由什么决定。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = '6';
const SLUG = '06-e146';

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

/** 三组判据：暴／久、金实／金破、功能性／器质性 */
function criteria(doc) {
  return table(doc, '先说清刻度')
    .slice(1)
    .map((r) => ({ sign: r[0], answers: r[1], decides: r[2] }));
}

/** 声音的三层：动力、振动、形 */
function layers(doc) {
  const sec = section(doc, '先说清刻度');
  return [...sec.text.matchAll(/\*\*第[一二三]层是([^*]{1,4})\*\*：([^。]+)。/g)].map((m) => ({
    layer: m[1].trim(),
    body: m[2].trim(),
  }));
}

/** 一句主诉落在哪一层（判据取自正文三种「病人说」） */
function layerOfComplaint(text) {
  const s = String(text || '');
  const L = layers(readDoc());
  const pick = (kw) => (L.find((x) => x.layer.includes(kw)) || {}).layer || null;
  if (/说不了多久|说不久|不能持久|多言即累|话多就累|讲十分钟/.test(s)) return pick('动力');
  if (/发不出声|气息声|音质|粗糙|断裂/.test(s)) return pick('振动');
  if (/大舌头|说不清|咬不住|构音/.test(s)) return pick('形');
  return null;
}

/** 金实不鸣三型 */
function jinShi(doc) {
  return table(doc, '金实不鸣')
    .slice(1)
    .map((r) => ({ type: r[0], sign: r[1], tongue: r[2], therapy: r[3], formula: r[4] }));
}

/** 金破不鸣三型 */
function jinPo(doc) {
  return table(doc, '金破不鸣')
    .slice(1)
    .map((r) => ({ type: r[0], sign: r[1], tongue: r[2], therapy: r[3], formula: r[4] }));
}

/** 六条红旗 */
function redFlags(doc) {
  const sec = section(doc, '时间是诊断线');
  const line = sec.text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.startsWith('六条红旗'));
  if (!line) throw new Error('正文没有六条红旗');
  return line
    .replace(/^.*?：/, '')
    .replace(/。$/, '')
    .split('；')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * 「突然说不出话」的两条相反的路：先看咳嗽、哭、笑时有没有声。
 * 有声而声带形态正常，指向功能性；单侧固定指向声带麻痹。
 */
function suddenLossRoute({ coughVoice, glottisClosed, unilateralFix }) {
  if (unilateralFix) return '声带麻痹：查神经路径，双侧者还属气道急症';
  if (coughVoice && glottisClosed !== false) return '功能性失音：先做喉镜排除，再解释与发声练习';
  return null;
}

function report() {
  const doc = readDoc();
  const cs = criteria(doc);
  const ls = layers(doc);
  const js = jinShi(doc);
  const jp = jinPo(doc);
  const flags = redFlags(doc);

  console.log(`中医嗓音医学 · 第 ${CHAPTER} 章 喉喑与失音（${SLUG}）`);
  console.log('');
  console.log(`正文 ${hanzi(doc)} 汉字`);
  console.log('');
  console.log(`一、三组判据（${cs.length} 组）`);
  for (const c of cs) console.log(`  ${c.sign}：答「${c.answers}」→ ${c.decides}`);
  console.log('');
  console.log(`二、声音三层（${ls.length} 层）`);
  for (const l of ls) console.log(`  ${l.layer}：${l.body}`);
  console.log('');
  console.log(`三、金实不鸣${js.length}型：${js.map((x) => x.type).join(' / ')}`);
  for (const x of js) console.log(`  ${x.type} → ${x.therapy}；${x.formula}`);
  console.log('');
  console.log(`四、金破不鸣${jp.length}型：${jp.map((x) => x.type).join(' / ')}`);
  for (const x of jp) console.log(`  ${x.type} → ${x.therapy}；${x.formula}`);
  console.log('');
  console.log(`五、六条红旗（读到 ${flags.length} 条）`);
  for (const f of flags) console.log(`  - ${f}`);
  console.log('');
  console.log('※ 条目与计数由 docs/zh.md 现算，改正文后重跑即可复现。');
  console.log('※ 六条红旗任一条成立即停止辨证、转诊；时间用来决定查不查喉镜，不直接当补泻依据。');
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
  criteria,
  layers,
  layerOfComplaint,
  jinShi,
  jinPo,
  redFlags,
  suddenLossRoute,
};
