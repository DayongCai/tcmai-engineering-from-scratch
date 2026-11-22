#!/usr/bin/env node
/**
 * 中医嗓音医学 · 第 2 章 咽喉病的病因病机
 * 正文: departments/08-wuguan/14-zhongyi-sangyin-yixue/chapters/02-e142/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文读出三层因、外因四条路、内因四条、病机三字与传变四步，再用它们复算：
 * 给定一组判据（红肿著不著、有无恶寒无汗、是否群体同病），该落在哪一条外因路上；
 * 给定病程位置，该用「通之／养之／化之」里的哪一个方向。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = '2';
const SLUG = '02-e142';

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

/** 加粗小标题（「**外感一层，答「什么时候发」。**」）里的条目名 */
function boldLeads(text) {
  return [...String(text).matchAll(/\*\*([^*]{2,40}?)\*\*/g)].map((m) => m[1].trim());
}

/** 三层因：外感 / 内伤 / 不内外因，各自回答一个问题 */
function layers(doc) {
  const sec = section(doc, '三层因');
  return boldLeads(sec.text)
    .map((s) => {
      const m = /^(外感|内伤|不内外因)[^，,]*[，,]\s*答\s*「?([^」。]+)」?/.exec(s);
      return m ? { layer: m[1], question: m[2] } : null;
    })
    .filter(Boolean);
}

/** 外因四条路：路 / 判据 / 治法方向 / 误治后果 */
function externalPaths(doc) {
  return table(doc, '外因四条路')
    .slice(1)
    .map((r) => ({ path: r[0], sign: r[1], therapy: r[2], mistreat: r[3] }));
}

/** 内因四条：热 / 虚 / 痰瘀 / 郁 */
function internalTypes(doc) {
  return boldLeads(section(doc, '内因四条').text)
    .map((s) => s.replace(/[。：].*$/, '').trim())
    .filter((s) => s.length <= 8);
}

/** 把判据落回一条外因路。规则全部取自正文第二节的两处分界句。 */
function classifyExternal(signs = {}) {
  const has = (k) => Boolean(signs[k]);
  if (has('outbreak')) return '疫毒';
  if (has('rednessSlight') && has('aversionCold') && has('noSweat')) return '风寒';
  if (has('dryness')) return '燥';
  if (has('red') && has('soreThroat')) return '风热';
  return null;
}

/** 病机三字与对应治法方向（正文原句：壅者通之，损者养之，结者化之） */
function mechanism(doc) {
  const sec = section(doc, '病机三字');
  const m = /壅者([^，。]+)，损者([^，。]+)，结者([^。]+)。/.exec(sec.text);
  if (!m) throw new Error('正文没有给出三字与治法的对应');
  const quote = (re) => {
    const q = re.exec(sec.text);
    return q ? q[1] : '';
  };
  return [
    { key: '壅', gloss: quote(/壅者，([^。]+)。/), therapy: m[1].trim(), stage: '新病多壅' },
    { key: '损', gloss: quote(/损者，([^。]+)。/), therapy: m[2].trim(), stage: '久病多损' },
    { key: '结', gloss: quote(/结者，([^。]+)。/), therapy: m[3].trim(), stage: '壅损日久多结' },
  ];
}

/** 传变四步：从「为表；……为里实；……」一句里读 */
function transmission(doc) {
  const sec = section(doc, '传变');
  const line = sec.text.split(/\r?\n/).find((l) => l.includes('咽喉病的转归有一条清楚的路线'));
  if (!line) throw new Error('正文没有传变路线句');
  return line
    .replace(/^.*?路线：/, '')
    .split('；')
    .map((c) => {
      const m = /为([^，。]+)/.exec(c);
      return m ? m[1].trim() : null;
    })
    .filter(Boolean);
}

/** 金实不鸣 / 金破不鸣 两句总纲 */
function twoBells(doc) {
  const sec = section(doc, '传变');
  const real = /「实者其病在标，因窍闭而喑也」/.exec(sec.text);
  const weak = /「虚者其病在本，因内夺而喑也」/.exec(sec.text);
  return { real: real ? real[0] : '', weak: weak ? weak[0] : '' };
}

function report() {
  const doc = readDoc();
  const ls = layers(doc);
  const ext = externalPaths(doc);
  const inn = internalTypes(doc);
  const mech = mechanism(doc);
  const trans = transmission(doc);
  const bells = twoBells(doc);

  console.log(`中医嗓音医学 · 第 ${CHAPTER} 章 咽喉病的病因病机（${SLUG}）`);
  console.log('');
  console.log(`正文 ${hanzi(doc)} 汉字`);
  console.log('');
  console.log(`一、三层因（${ls.length} 层，每层答一个问题）`);
  for (const l of ls) console.log(`  ${l.layer}：答「${l.question}」`);
  console.log('');
  console.log(`二、外因四条路（${ext.length} 条）`);
  for (const e of ext) {
    console.log(`  ${e.path}：${e.sign}`);
    console.log(`      治法 ${e.therapy}；误治则 ${e.mistreat}`);
  }
  console.log('');
  console.log(`三、内因（${inn.length} 条）：${inn.join('、')}`);
  console.log('');
  console.log('四、病机三字');
  for (const m of mech) console.log(`  ${m.key}（${m.gloss}）→ ${m.therapy}　${m.stage}`);
  console.log('');
  console.log(`五、传变${trans.length}步：${trans.join(' → ')}`);
  console.log('');
  console.log(`六、两声总纲：${bells.real} / ${bells.weak}`);
  console.log('');
  console.log('※ 判据与条目由 docs/zh.md 现算，改正文后重跑即可复现。');
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
  boldLeads,
  layers,
  externalPaths,
  internalTypes,
  classifyExternal,
  mechanism,
  transmission,
  twoBells,
};
