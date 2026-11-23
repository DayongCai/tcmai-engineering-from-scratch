#!/usr/bin/env node
/**
 * 护理毕业设计 · 第 4 章 指标选错，做得再规范也回答不了问题：正文判断卡
 * 课程: departments/05-huli/27-huli-biye-sheji/chapters/04-jieju-pingjia/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：汉字数、节数、表格与数据行、三层指标、可测量化四要素、
 * 替代指标三风险、四类偏倚与五条失效；以及开篇与正文里的三段算术——
 * 「三类 × 两时点」的读数与缺失、「两季留空率」的降幅、「单价 ÷ 年节省价值」的占比——
 * 都由本脚本从正文读出数字重算，并与正文写出的结果逐项对账。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = '4';
const SLUG = '04-jieju-pingjia';
const TITLE = '指标选错，做得再规范也回答不了问题';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

// 指标写法样例取自本章三类毛病的原例：没有分母的总量、无法定义的感觉、以及空话。
const METRIC_SAMPLES = [
  { text: '共完成 120 次', note: '写成总量，没有分母' },
  { text: '患者满意', note: '写成感受，无法定义' },
  { text: '交接栏留空率 35%', note: '有分母的率' },
  { text: '评估完成率 92%', note: '有分母的率' },
  { text: '已建立流程', note: '结构指标写成空话' }
];

const BIAS_TYPES = ['选择偏倚', '测量偏倚', '失访偏倚', '报告偏倚'];

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

/** 读数：三类指标 × 两个时点；只测结局时缺的是过程那两层的读数 */
function readings(text) {
  const num = (re, name) => {
    const m = text.match(re);
    if (!m) throw new Error('正文里找不到这个数：' + name);
    return Number(m[1].replace(/,/g, ''));
  };
  const layers = /三类指标/.test(text) ? 3 : 0;
  const timepoints = /两个时点/.test(text) ? 2 : 0;
  const statedTotal = num(/=\s*(\d+)\s*个读数/, '读数总数');
  const outcomeOnly = num(/只测结局那\s*(\d+)\s*个读数/, '只测结局的读数');
  const statedMissing = num(/少了过程指标的\s*(\d+)\s*个读数/, '缺失读数');
  const total = layers * timepoints;
  const missing = total - outcomeOnly;
  return {
    layers, timepoints, total, outcomeOnly, missing,
    stated: { total: statedTotal, missing: statedMissing },
    consistent: total === statedTotal && missing === statedMissing
  };
}

/** 两季留空率与降幅：同一批抽样方式下，降幅才成立 */
function blankRate(text) {
  const num = (re, name) => {
    const m = text.match(re);
    if (!m) throw new Error('正文里找不到这个数：' + name);
    return Number(m[1].replace(/,/g, ''));
  };
  const admissions = num(/入院\s*(\d+)\s*例/, '入院例数');
  const sample = num(/抽查\s*(\d+)\s*例/, '抽查例数');
  const samplePct = num(/（(\d+)%）/, '抽查比例');
  const blank = num(/其中\s*(\d+)\s*例的交接五栏有留空/, '留空例数');
  const statedRate = num(/留空率为\s*\d+\s*÷\s*\d+\s*=\s*(\d+)%/, '第一季留空率');
  const nextBlank = num(/留空\s*(\d+)\s*例，则为\s*\d+%/, '第二季留空例数');
  const nextRate = num(/留空\s*\d+\s*例，则为\s*(\d+)%/, '第二季留空率');
  const statedDrop = num(/降幅为[^=]*=\s*([\d.]+)%/, '降幅');
  const rate1 = Number(((blank / sample) * 100).toFixed(1));
  const rate2 = Number(((nextBlank / sample) * 100).toFixed(1));
  const drop = Number((((rate1 - rate2) / rate1) * 100).toFixed(1));
  return {
    admissions, sample, samplePct, blank, rate1, nextBlank, rate2, drop,
    stated: { rate1: statedRate, rate2: nextRate, drop: statedDrop },
    consistent: rate1 === statedRate && rate2 === nextRate && drop === statedDrop
  };
}

/** 替代指标占比：客单价 ÷ 年节省价值；它说明「省了」，不说明「好了」 */
function substitution(text) {
  const num = (re, name) => {
    const m = text.match(re);
    if (!m) throw new Error('正文里找不到这个数：' + name);
    return Number(m[1].replace(/,/g, ''));
  };
  const saving = num(/每客户年节省价值\s*([\d,]+)\s*元/, '年节省价值');
  const price = num(/客单价\s*([\d,]+)\s*元/, '客单价');
  const stated = num(/比例为\s*[\d,]+\s*÷\s*[\d,]+\s*=\s*([\d.]+)%/, '占比');
  const ratio = Number(((price / saving) * 100).toFixed(2));
  return { saving, price, ratio, stated, consistent: ratio === stated };
}

/** 本章可数的结构：三层指标、四要素、三风险、四类偏倚、五条失效 */
function structure(text) {
  const lines = text.split(/\r?\n/);
  const rows = tableBlocks(lines).map((b) => dataRows(b).length);
  return {
    layers: rows[0],
    measurableParts: (sectionText(text, '可测量化').match(/\*\*(分子|分母|时点|比较)\*\*/g) || []).length,
    substitutionRisks: (sectionText(text, '替代指标').match(/^\d+\.\s/gm) || []).length,
    biasTypes: BIAS_TYPES.filter((k) => text.includes(k)).length,
    failures: (sectionText(text, '五种失效模式').match(/\*\*其[一二三四五六七八九]，/g) || []).length
  };
}

/** 指标写法：有没有分母——有分母才有率，有率才能比 */
function metricKind(metric) {
  const t = String(metric || '');
  if (/率/.test(t)) return '率';
  if (/(满意|好评|认可|体验|感觉)/.test(t)) return '感受';
  if (/(共|累计|合计|完成)\s*\d+|\d+\s*次/.test(t)) return '总量';
  return '空话';
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
    readings: readings(text),
    blanks: blankRate(text),
    substitution: substitution(text),
    structure: structure(text),
    metrics: METRIC_SAMPLES.map((s) => ({ ...s, kind: metricKind(s.text) }))
  };
}

function main() {
  const r = report();
  const d = r.readings;
  const b = r.blanks;
  const u = r.substitution;
  const s = r.structure;
  console.log(`护理毕业设计 · 第 ${r.chapter} 章 ${r.title}`);
  console.log(`正文: chapters/${SLUG}/docs/zh.md`);
  console.log('');
  console.log(`规模: 汉字 ${r.size.hanzi.toLocaleString('en-US')} · 节 ${r.size.sections} · 表格 ${r.size.tables} 张（数据行 ${r.size.rows}）`);
  console.log('');
  console.log('指标读数算术:');
  console.log(`  ${d.layers} 类指标 × ${d.timepoints} 个时点 = ${d.total} 个读数；只测结局 ${d.outcomeOnly} 个 → 缺 ${d.missing} 个`);
  console.log(`  对账: 正文写出的 ${d.stated.total}/${d.stated.missing} 与重算${d.consistent ? '一致' : '不一致'}`);
  console.log(`  读法: 缺的 ${d.missing} 个读数正是解释力所在——没有它们，方案无效、没执行、测量偏移三种解释分不开。`);
  console.log('');
  console.log('留空率与降幅算术:');
  console.log(`  第一季：入院 ${b.admissions} 例，抽查 ${b.sample} 例（${b.samplePct}%），留空 ${b.blank} 例 → ${b.blank} ÷ ${b.sample} = ${b.rate1}%`);
  console.log(`  第二季：同样抽 ${b.sample} 例，留空 ${b.nextBlank} 例 → ${b.rate2}%`);
  console.log(`  降幅：(${b.rate1}% − ${b.rate2}%) ÷ ${b.rate1}% = ${b.drop}%`);
  console.log(`  对账: 正文写出的 ${b.stated.rate1}/${b.stated.rate2}/${b.stated.drop} 与重算${b.consistent ? '一致' : '不一致'}`);
  console.log(`  读法: 降幅可以写，但要同时写清两季抽样方式是否一致；${b.rate1}% 是这 ${b.sample} 例的，不是全院的。`);
  console.log('');
  console.log('替代指标占比算术:');
  console.log(`  客单价 ${u.price.toLocaleString('en-US')} 元 ÷ 年节省价值 ${u.saving.toLocaleString('en-US')} 元 = ${u.ratio}%`);
  console.log(`  对账: 正文写出的 ${u.stated}% 与重算${u.consistent ? '一致' : '不一致'}`);
  console.log(`  读法: 替代指标说明「省了」，不说明「好了」；假设要写在明面上，敏感性分析要跟着做。`);
  console.log('');
  console.log(`结构: 指标 ${s.layers} 层 · 可测量化 ${s.measurableParts} 要素 · 替代三风险 ${s.substitutionRisks} 条 · 偏倚 ${s.biasTypes} 类 · 失效模式 ${s.failures} 条`);
  console.log('');
  console.log('指标写法样例（有没有分母）:');
  for (const x of r.metrics) {
    console.log(`  ${x.kind === '率' ? '✅' : '❌'} ${x.kind.padEnd(2)} ← ${x.text}　〔${x.note}〕`);
  }
  console.log('');
  console.log(`结论: ${r.metrics.length} 个写法里 ${r.metrics.filter((x) => x.kind === '率').length} 个有分母；三层各取其一、总数六个以内，是采集成本与解释力的平衡点。`);
  console.log('边界声明: 本输出为教学样例，数字由本章正文现算，不构成临床判断依据，也不作任何收益或效果承诺。');
}

if (require.main === module) main();

module.exports = {
  readDoc, hanzi, sectionTitles, sectionText, tableBlocks, dataRows,
  readings, blankRate, substitution, structure, metricKind, BIAS_TYPES, METRIC_SAMPLES,
  report, CHAPTER, SLUG, TITLE
};
