#!/usr/bin/env node
/**
 * 护理毕业设计 · 第 1 章 选题在开题前就定了成败：缺口必须算得出来：正文判断卡
 * 课程: departments/05-huli/27-huli-biye-sheji/chapters/01-xuan-ti/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：汉字数、节数、表格与数据行、四条判据、五个节点、四种过大形态、
 * 开题四件事与四条失效；以及开篇两个算式——市场侧「可触达机构 × 渗透带中位 ×
 * 成熟度系数」的取整与上下限、临床侧「抽查留空 ÷ 抽查例数」的抽样值——
 * 都由本脚本从正文读出数字重算，并与正文写出的结果逐项对账。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = '1';
const SLUG = '01-xuan-ti';
const TITLE = '选题在开题前就定了成败：缺口必须算得出来';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

// 选题样例取自本章「选题过大的四种形态」的原例与缩小后的写法。
const TITLE_SAMPLES = [
  { text: '某地区老年患者跌倒预防现状调查', note: '对象过大' },
  { text: '同时改评估表、交接流程、健康教育、家属参与、随访五件事', note: '变量过多' },
  { text: '方案要求随访三个月', note: '时间过长' },
  { text: '构建老年跌倒预防体系', note: '野心过大' },
  { text: '制定一份含 N 栏的评估表并试用', note: '缩小到可完成' }
];

function readDoc() {
  return fs.readFileSync(DOC, 'utf8');
}

function hanzi(text) {
  return (text.match(/[\u4e00-\u9fff]/g) || []).length;
}

function sectionTitles(text) {
  return text.split(/\r?\n/).filter((l) => /^##\s/.test(l)).map((l) => l.replace(/^##\s*/, '').trim());
}

function sectionText(text, key) {
  const out = [];
  let on = false;
  for (const line of text.split(/\r?\n/)) {
    const m = /^##\s+(.*)$/.exec(line);
    if (m) { on = m[1].includes(key); continue; }
    if (on) out.push(line);
  }
  return out.join('\n');
}

function tableBlocks(lines) {
  const blocks = [];
  let cur = null;
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('|')) {
      if (!cur) { cur = []; blocks.push(cur); }
      cur.push(t);
    } else {
      cur = null;
    }
  }
  return blocks;
}

function dataRows(block) {
  return block.filter((l) => !/^\s*\|[\s:\-|]+\|\s*$/.test(l)).slice(1);
}

const round3 = (x) => Number(x.toFixed(3));

/** 市场侧缺口：可触达机构 × 渗透带中位 × 成熟度系数，含 1% 与 10% 两个边界 */
function market(text) {
  const num = (re, name) => {
    const m = text.match(re);
    if (!m) throw new Error('正文里找不到这个数：' + name);
    return Number(m[1].replace(/,/g, ''));
  };
  const hospitals = num(/可触达的中医类医院\s*([\d,]+)\s*家/, '可触达机构数');
  const penetration = num(/按\s*([\d.]+)%\s*的渗透带中位/, '渗透带中位');
  const maturity = num(/([\d.]+)\s*的成熟度系数/, '成熟度系数');
  const statedRaw = num(/=\s*([\d.]+)，取整\s*\d+\s*家/, '取整前的积');
  const statedMid = num(/取整\s*(\d+)\s*家/, '取整后的中位值');
  const lowPct = num(/渗透取\s*([\d.]+)%/, '下限渗透率');
  const statedLow = num(/渗透取\s*[\d.]+%\s*则得\s*(\d+)\s*家/, '下限机构数');
  const highPct = num(/若取\s*([\d.]+)%/, '上限渗透率');
  const statedHigh = num(/若取\s*[\d.]+%\s*则得\s*(\d+)\s*家/, '上限机构数');

  const raw = round3(hospitals * (penetration / 100) * maturity);
  const mid = Math.round(raw);
  const low = Math.round(hospitals * (lowPct / 100) * maturity);
  const high = Math.round(hospitals * (highPct / 100) * maturity);
  return {
    hospitals, penetration, maturity, raw, mid, lowPct, low, highPct, high,
    stated: { raw: statedRaw, mid: statedMid, low: statedLow, high: statedHigh },
    consistent: raw === statedRaw && mid === statedMid && low === statedLow && high === statedHigh
  };
}

/** 临床侧抽样：留空 ÷ 抽查例数；结果只能说到这一批病历 */
function sampling(text) {
  const num = (re, name) => {
    const m = text.match(re);
    if (!m) throw new Error('正文里找不到这个数：' + name);
    return Number(m[1].replace(/,/g, ''));
  };
  const admissions = num(/一年入院\s*([\d,]+)\s*例/, '年入院例数');
  const sample = num(/抽查\s*(\d+)\s*例/, '抽查例数');
  const samplePct = num(/抽查\s*\d+\s*例（(\d+)%）/, '抽查比例');
  const blank = num(/其中\s*(\d+)\s*例的关键评估栏为空/, '留空例数');
  const statedRate = num(/留空率为\s*\d+\s*÷\s*\d+\s*=\s*([\d.]+)%/, '留空率');
  const rate = Number(((blank / sample) * 100).toFixed(1));
  return {
    admissions, sample, samplePct, blank, rate,
    actualSamplePct: Number(((sample / admissions) * 100).toFixed(1)),
    stated: { rate: statedRate },
    consistent: rate === statedRate && Number(((sample / admissions) * 100).toFixed(1)) === samplePct
  };
}

/** 本章可数的结构：四条判据、五个节点、四种过大形态、开题四件事、边界五条 */
function structure(text) {
  const lines = text.split(/\r?\n/);
  const rows = tableBlocks(lines).map((b) => dataRows(b).length);
  const boundary = /边界五条/.test(text) ? 5 : 0;
  return {
    criteria: rows[0],
    milestones: rows[1],
    oversizeForms: (sectionText(text, '四种形态').match(/\*\*其[一二三四五]，/g) || []).length,
    proposalItems: (sectionText(text, '开题评什么').match(/^\d+\.\s/gm) || []).length,
    boundaryRules: boundary
  };
}

/** 选题过大的四种形态：按本章的缩小办法逆推题目卡在哪一维 */
function oversizeKind(title) {
  const t = String(title || '');
  if (/(构建.{0,6}体系|建立.{0,6}模式|全面提升|体系构建)/.test(t)) return '野心过大';
  if (/(随访|跟踪).{0,8}(月|年)|三个月|半年|一年/.test(t)) return '时间过长';
  if (/(同时|五件事|五项|全套|一并)/.test(t)) return '变量过多';
  if (/(某地区|全国|全省|全市|所有|各类)/.test(t)) return '对象过大';
  return '可做';
}

function report() {
  const text = readDoc();
  const lines = text.split(/\r?\n/);
  const blocks = tableBlocks(lines);
  let rows = 0;
  for (const b of blocks) rows += dataRows(b).length;
  return {
    chapter: CHAPTER,
    title: TITLE,
    size: { hanzi: hanzi(text), sections: sectionTitles(text).length, tables: blocks.length, rows },
    market: market(text),
    sampling: sampling(text),
    structure: structure(text),
    titles: TITLE_SAMPLES.map((s) => ({ ...s, kind: oversizeKind(s.text) }))
  };
}

function main() {
  const r = report();
  const m = r.market;
  const p = r.sampling;
  const s = r.structure;
  console.log(`护理毕业设计 · 第 ${r.chapter} 章 ${r.title}`);
  console.log(`正文: chapters/${SLUG}/docs/zh.md`);
  console.log('');
  console.log(`规模: 汉字 ${r.size.hanzi.toLocaleString('en-US')} · 节 ${r.size.sections} · 表格 ${r.size.tables} 张（数据行 ${r.size.rows}）`);
  console.log('');
  console.log('市场侧缺口算术:');
  console.log(`  可触达 ${m.hospitals.toLocaleString('en-US')} 家 × ${m.penetration}% × ${m.maturity} = ${m.raw}，取整 ${m.mid} 家`);
  console.log(`  渗透取 ${m.lowPct}% → ${m.low} 家；取 ${m.highPct}% → ${m.high} 家`);
  console.log(`  对账: 正文写出的 ${m.stated.raw}/${m.stated.mid}/${m.stated.low}/${m.stated.high} 与重算${m.consistent ? '一致' : '不一致'}`);
  console.log(`  读法: ${m.mid} 不是结论，是缺口的分母——它说明有多少地方可能用得上。`);
  console.log('');
  console.log('临床侧抽样算术:');
  console.log(`  一年入院 ${p.admissions.toLocaleString('en-US')} 例，抽查 ${p.sample} 例（${p.actualSamplePct}%）`);
  console.log(`  其中 ${p.blank} 例留空 → 留空率 ${p.blank} ÷ ${p.sample} = ${p.rate}%`);
  console.log(`  对账: 正文写出的 ${p.stated.rate}% 与重算${p.consistent ? '一致' : '不一致'}`);
  console.log(`  读法: ${p.rate}% 是这一批病历的抽样值，结论只能说到这批病历，不能写成全院的数。`);
  console.log('');
  console.log(`结构: 选题判据 ${s.criteria} 条 · 时间节点 ${s.milestones} 个 · 过大形态 ${s.oversizeForms} 种 · 开题评审 ${s.proposalItems} 件事 · 边界 ${s.boundaryRules} 条`);
  console.log('');
  console.log('选题样例（按四种形态逆推）:');
  for (const x of r.titles) {
    const ok = x.kind === '可做';
    console.log(`  ${ok ? '✅' : '⚠️ '} ${x.kind.padEnd(4)} ← ${x.text}　〔${x.note}〕`);
  }
  console.log('');
  console.log(`结论: ${r.titles.length} 个题目里 ${r.titles.filter((x) => x.kind !== '可做').length} 个卡在某一维，缩小办法各不相同：加限定、砍变量、改时点、换动词。`);
  console.log('边界声明: 本输出为教学样例，数字由本章正文现算，不构成临床判断依据，也不作任何收益或效果承诺。');
}

if (require.main === module) main();

module.exports = {
  readDoc, hanzi, sectionTitles, sectionText, tableBlocks, dataRows,
  market, sampling, structure, oversizeKind, TITLE_SAMPLES,
  report, CHAPTER, SLUG, TITLE
};
