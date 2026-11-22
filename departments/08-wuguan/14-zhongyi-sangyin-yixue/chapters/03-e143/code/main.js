#!/usr/bin/env node
/**
 * 中医嗓音医学 · 第 3 章 咽喉病的辨证
 * 正文: departments/08-wuguan/14-zhongyi-sangyin-yixue/chapters/03-e143/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文读出三层读法的次序、八纲三问、脏腑四条经、六行记录与四条一票否决，
 * 再复算两件事：一个「咽干」按兼症该落到肺、胃还是肾；一处征象落在气分还是血分。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = '3';
const SLUG = '03-e143';

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

/** 三层读法：层名 / 它在这一次判断里产出什么 */
function readingOrder(doc) {
  const sec = section(doc, '三层读法');
  return [...sec.text.matchAll(/\*\*([^*]{2,20}?)的产物是([^*]{1,6}?)。\*\*/g)].map((m) => ({
    layer: m[1].trim(),
    product: m[2].trim(),
  }));
}

/** 八纲三问 */
function bagang(doc) {
  return table(doc, '八纲').slice(1).map((r) => ({ ask: r[0], one: r[1], other: r[2], sign: r[3] }));
}

/** 脏腑四条 */
function organs(doc) {
  return table(doc, '脏腑：四条经').slice(1).map((r) => ({ organ: r[0], basis: r[1], sign: r[2], therapy: r[3] }));
}

/** 红/肿/白/痰/声 各自读成什么物 */
function signsAsMaterial(doc) {
  const sec = section(doc, '读成物');
  return [...sec.text.matchAll(/^-\s+\*\*([^*]+?)\*\*(?:（[^）]*）)?＝([^。]+)。/gm)].map((m) => ({
    sign: m[1].trim(),
    meaning: m[2].trim(),
  }));
}

/** 一页记录的六行 */
function recordRows(doc) {
  return table(doc, '一页记录').slice(1).map((r) => ({ row: r[0], fill: r[1], bad: r[2] }));
}

/** 一票否决四条 */
function vetoes(doc) {
  const sec = section(doc, '一页记录');
  const idx = sec.text.indexOf('一票否决');
  if (idx < 0) throw new Error('正文没有一票否决');
  const tail = sec.text.slice(idx);
  const line = tail
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.includes('；') && l.length > 40 && !l.startsWith('**'));
  if (!line) throw new Error('一票否决的四条没写成一句');
  const body = line.replace(/^.*?：/, '').split('这四条')[0];
  return body
    .replace(/。$/, '')
    .split('；')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * 「咽干」的分脏：只在兼症与舌脉同向时才写脏名。
 * 判据取自正文第三节末段：干而声嘶干咳属肺，干而口臭便秘属胃，干而腰膝酸软夜甚属肾。
 */
function organOfDryness(signs = {}) {
  const has = (k) => Boolean(signs[k]);
  if (has('soreWaist') || has('worseAtNight')) return '肾';
  if (has('badBreath') || has('constipation')) return '胃';
  if (has('hoarse') || has('dryCough')) return '肺';
  return null;
}

/** 一处征象落在气分还是血分 */
function phaseOfSign(sign) {
  const s = String(sign || '').trim();
  if (s === '红') return { phase: '气分（鲜红而弥漫，热已入血则色深而边界清）', note: '气壅血滞' };
  if (s === '白') return { phase: '血分（脓点、脓栓、伪膜）', note: '津液被熬成腐' };
  const hit = signsAsMaterial(readDoc()).find((x) => x.sign === s);
  return hit ? { phase: hit.meaning, note: '' } : null;
}

function report() {
  const doc = readDoc();
  const order = readingOrder(doc);
  const bg = bagang(doc);
  const og = organs(doc);
  const mat = signsAsMaterial(doc);
  const rows = recordRows(doc);
  const veto = vetoes(doc);

  console.log(`中医嗓音医学 · 第 ${CHAPTER} 章 咽喉病的辨证（${SLUG}）`);
  console.log('');
  console.log(`正文 ${hanzi(doc)} 汉字`);
  console.log('');
  console.log('一、三层读法，次序不能倒');
  order.forEach((o, i) => console.log(`  ${i + 1}. ${o.layer} → ${o.product}`));
  console.log('');
  console.log(`二、八纲三问（${bg.length} 问）`);
  for (const b of bg) console.log(`  ${b.ask}：${b.one} ｜ ${b.other}`);
  console.log('');
  console.log(`三、脏腑四条（${og.length} 条）`);
  for (const o of og) console.log(`  ${o.organ}（${o.basis}）：${o.sign} → ${o.therapy}`);
  console.log('');
  console.log(`四、征象读成物（${mat.length} 项）`);
  for (const m of mat) console.log(`  ${m.sign}＝${m.meaning}`);
  console.log('');
  console.log(`五、一页记录 ${rows.length} 行：${rows.map((r) => r.row).join(' / ')}`);
  console.log('');
  console.log(`六、一票否决 ${veto.length} 条，任一条成立即取消辨证`);
  for (const v of veto) console.log(`  - ${v}`);
  console.log('');
  console.log('※ 条目与计数由 docs/zh.md 现算，改正文后重跑即可复现。');
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
  readingOrder,
  bagang,
  organs,
  signsAsMaterial,
  recordRows,
  vetoes,
  organOfDryness,
  phaseOfSign,
};
