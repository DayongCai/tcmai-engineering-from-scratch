#!/usr/bin/env node
/**
 * 中医嗓音医学 · 第 1 章 咽喉的中医解剖与生理
 * 正文: departments/08-wuguan/14-zhongyi-sangyin-yixue/chapters/01-e141/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本脚本不存任何数字。咽/喉两列、七环链、七条经脉全部当场从正文的表里读出来，
 * 再按正文明写的分叉规则复算一遍：给定一个主诉词，它该落在咽还是喉；给一句听感，
 * 它该落在七环的哪一环。正文改了，脚本跟着改，不存在手打常数过期的问题。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = '1';
const SLUG = '01-e141';

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

/** 取一段文本里的所有表格，返回 [行][列]（已去掉分隔行） */
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

const CN = { 一: 1, 两: 2, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

/** 正文明写的环数（「七环」），不另行硬编码 */
function declaredRingCount(doc) {
  const m = /([一二两三四五六七八九十])环/.exec(doc);
  if (!m) throw new Error('正文没有写明环数');
  return CN[m[1]];
}

/** 咽/喉两列：从表里读出主诉词，构成分叉表 */
function splitChannels(doc) {
  const rows = table(doc, '咽与喉');
  const head = rows[0];
  const body = rows.slice(1);
  const get = (label) => {
    const r = body.find((x) => x[0] === label);
    if (!r) throw new Error('咽/喉表缺行: ' + label);
    return r;
  };
  const cues = (label) => get(label).slice(1).map((c) => c.split('、').map((s) => s.trim()).filter(Boolean));
  return {
    headers: head.slice(1),
    yan: cues('主诉')[0] || [],
    hou: cues('主诉')[1] || [],
    entryYan: get('辨证入口')[1] || '',
    entryHou: get('辨证入口')[2] || '',
    flowYan: get('所主')[1] || '',
    flowHou: get('所主')[2] || '',
    classicYan: get('经典依据')[1] || '',
    classicHou: get('经典依据')[2] || '',
  };
}

/** 给定主诉词，按表里的分叉落回咽或喉 */
function routeComplaint(word) {
  const c = splitChannels(readDoc());
  const w = String(word || '').trim();
  if (c.yan.includes(w)) return '咽';
  if (c.hou.includes(w)) return '喉';
  return null;
}

/** 七环：环名 / 古义 / 坏了的听感 / 要问的一句 */
function rings(doc) {
  return table(doc, '七环').slice(1).map((r) => ({
    name: r[0],
    classic: r[1],
    symptom: r[2],
    ask: r[3],
  }));
}

/** 给定一句听感，落回哪一环（按表中「坏了的听感」原文匹配） */
function ringOf(symptom) {
  const hit = rings(readDoc()).find((r) => r.symptom === String(symptom || '').trim());
  return hit || null;
}

/** 七条经脉 */
function meridians(doc) {
  return table(doc, '经络').slice(1).map((r) => ({ name: r[0], route: r[1], sign: r[2] }));
}

/** 三本 + 两脏：从加粗小标题里读，不手列 */
function roots(doc) {
  const sec = section(doc, '三本');
  return [...sec.text.matchAll(/\*\*([^*]{2,20}?)(?:。|：)\*\*/g)].map((m) => m[1]).filter((x) => /^[心肝脾肺肾]/.test(x));
}

/** 三路一口的处置次序 */
function triad(doc) {
  const sec = section(doc, '要道');
  const m = /先保气道，再论声音，最后才谈音色/.exec(sec.text);
  return m ? m[0] : null;
}

function report() {
  const doc = readDoc();
  const ch = splitChannels(doc);
  const chain = rings(doc);
  const claim = declaredRingCount(doc);
  const jing = meridians(doc);
  const rs = roots(doc);
  const order = triad(doc);

  console.log(`中医嗓音医学 · 第 ${CHAPTER} 章 咽喉的中医解剖与生理（${SLUG}）`);
  console.log('');
  console.log(`正文 ${hanzi(doc)} 汉字；七环链读得 ${chain.length} 环（正文自述 ${claim} 环）`);
  console.log('');
  console.log('一、两条通道的分叉（读自「咽与喉」表）');
  console.log(`  咽：${ch.yan.join(' / ')}　→ 入口 ${ch.entryYan}`);
  console.log(`  喉：${ch.hou.join(' / ')}　→ 入口 ${ch.entryHou}`);
  console.log(`  经典：${ch.classicYan} ｜ ${ch.classicHou}`);
  console.log('');
  console.log('二、七环，一环一种坏法');
  for (const [i, r] of chain.entries()) {
    console.log(`  ${i + 1}. ${r.name}（${r.classic}）：${r.symptom} → 问「${r.ask}」`);
  }
  console.log('');
  console.log('三、循行到咽喉的经脉');
  for (const m of jing) console.log(`  ${m.name}：${m.route} → ${m.sign}`);
  console.log('');
  console.log(`四、声音归属：${rs.join('、')}（共 ${rs.length} 条）`);
  console.log('');
  console.log(`五、三路一口的处置次序：${order || '（正文未找到）'}`);
  console.log('');
  console.log('※ 数字与条目均由 docs/zh.md 现算，改正文后重跑即可复现。');
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
  declaredRingCount,
  splitChannels,
  routeComplaint,
  rings,
  ringOf,
  meridians,
  roots,
  triad,
};
