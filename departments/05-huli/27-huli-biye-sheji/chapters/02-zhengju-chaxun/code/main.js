#!/usr/bin/env node
/**
 * 护理毕业设计 · 第 2 章 证据检索的目的不是找到支持，是找到边界：正文判断卡
 * 课程: departments/05-huli/27-huli-biye-sheji/chapters/02-zhengju-chaxun/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：汉字数、节数、表格与数据行、问题四格、证据层级、适配三道、
 * 留档四样与五条失效；以及开篇那条检索漏斗——来源库 × 概念组 → 检索式 → 命中 →
 * 去重 → 读题 → 全文 → 纳入——每一层都由本脚本从正文读出数字重算，
 * 并按「相对上一层的保留率」与「相对命中的保留率」两个口径输出。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = '2';
const SLUG = '02-zhengju-chaxun';
const TITLE = '证据检索的目的不是找到支持，是找到边界';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

// 排除理由取自本章点名的五个类别；筛选记录少了「结局不符」，标准就是围绕主题设的。
const EXCLUSION_KINDS = ['人群不符', '干预不符', '结局不符', '非原文', '无法获取全文'];

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

/** 检索漏斗：来源库 × 概念组 → 检索式 → 命中 → 去重 → 读题 → 全文 → 纳入 */
function funnel(text) {
  const num = (re, name) => {
    const m = text.match(re);
    if (!m) throw new Error('正文里找不到这个数：' + name);
    return Number(m[1].replace(/,/g, ''));
  };
  const databases = num(/用\s*(\d+)\s*个来源库/, '来源库数');
  const concepts = num(/×\s*(\d+)\s*组概念/, '概念组数');
  const statedFormulas = num(/=\s*(\d+)\s*条检索式/, '检索式条数');
  const perHit = num(/平均命中\s*(\d+)\s*条/, '每式命中数');
  const statedTotal = num(/合计\s*(\d+)\s*条/, '命中合计');
  const dedup = num(/去重后约\s*(\d+)\s*条/, '去重后');
  const byTitle = num(/读题筛后\s*(\d+)\s*条/, '读题后');
  const byFull = num(/读全文\s*(\d+)\s*条/, '读全文后');
  const included = num(/最终纳入\s*(\d+)\s*条/, '纳入');

  const formulas = databases * concepts;
  const total = formulas * perHit;
  const ladder = [
    { label: '命中', count: total },
    { label: '去重后', count: dedup },
    { label: '读题后', count: byTitle },
    { label: '读全文后', count: byFull },
    { label: '纳入', count: included }
  ];
  const steps = ladder.map((s, i) => ({
    ...s,
    fromPrev: i === 0 ? null : Number(((s.count / ladder[i - 1].count) * 100).toFixed(1)),
    ofStart: Number(((s.count / total) * 100).toFixed(1))
  }));
  return {
    databases, concepts, formulas, perHit, total, ladder, steps,
    stated: { formulas: statedFormulas, total: statedTotal },
    consistent: formulas === statedFormulas && total === statedTotal
      && ladder.every((s, i) => i === 0 || s.count <= ladder[i - 1].count)
  };
}

/** 本章可数的结构：问题四格、证据层级、漏斗五层、留档四样、适配三道、五条失效 */
function structure(text) {
  const lines = text.split(/\r?\n/);
  const rows = tableBlocks(lines).map((b) => dataRows(b).length);
  return {
    questionGrid: rows[0],
    evidenceLevels: rows[1],
    funnelRows: rows[2],
    records: (sectionText(text, '检索与筛选').match(/^\d+\.\s/gm) || []).length,
    fitSteps: (sectionText(text, '从证据到方案').match(/\*\*第[一二三四]道，/g) || []).length,
    failures: (sectionText(text, '五种失效模式').match(/\*\*其[一二三四五六七八九]，/g) || []).length
  };
}

/** 排除理由归类：五类之外一律记为「其他」 */
function exclusionKind(reason) {
  const t = String(reason || '');
  if (/(人群|对象不符)/.test(t)) return '人群不符';
  if (/(干预|措施不符)/.test(t)) return '干预不符';
  if (/(结局|指标不符)/.test(t)) return '结局不符';
  if (/(非原文|不是原文|二手转述)/.test(t)) return '非原文';
  if (/(无法获取|拿不到全文|获取失败)/.test(t)) return '无法获取全文';
  return '其他';
}

/** 标准是围绕问题设的，还是围绕主题设的：看有没有「结局不符」这一栏 */
function hasOutcomeExclusion(reasons) {
  return reasons.map(exclusionKind).includes('结局不符');
}

function report() {
  const text = readDoc();
  const lines = text.split(/\r?\n/);
  const blocks = tableBlocks(lines);
  let rows = 0;
  for (const b of blocks) rows += dataRows(b).length;
  const f = funnel(text);
  return {
    chapter: CHAPTER,
    title: TITLE,
    size: { hanzi: hanzi(text), sections: sectionTitles(text).length, tables: blocks.length, rows },
    funnel: f,
    structure: structure(text),
    exclusions: EXCLUSION_KINDS.map((k) => ({ text: k, kind: exclusionKind(k) }))
  };
}

function main() {
  const r = report();
  const f = r.funnel;
  const s = r.structure;
  console.log(`护理毕业设计 · 第 ${r.chapter} 章 ${r.title}`);
  console.log(`正文: chapters/${SLUG}/docs/zh.md`);
  console.log('');
  console.log(`规模: 汉字 ${r.size.hanzi.toLocaleString('en-US')} · 节 ${r.size.sections} · 表格 ${r.size.tables} 张（数据行 ${r.size.rows}）`);
  console.log('');
  console.log('检索漏斗:');
  console.log(`  ${f.databases} 个来源库 × ${f.concepts} 组概念 = ${f.formulas} 条检索式；每条平均命中 ${f.perHit} 条 → 合计 ${f.total} 条`);
  console.log(`  对账: 正文写出的 ${f.stated.formulas}/${f.stated.total} 与重算${f.consistent ? '一致' : '不一致'}`);
  console.log('');
  console.log('  层        条数   对上一层   对命中');
  for (const st of f.steps) {
    const prev = st.fromPrev === null ? '   —   ' : `${st.fromPrev.toFixed(1)}%`.padStart(7);
    console.log(`  ${st.label.padEnd(6)} ${String(st.count).padStart(6)}   ${prev}   ${`${st.ofStart.toFixed(1)}%`.padStart(7)}`);
  }
  console.log(`  读法: 每降一层留下的必须是对得上你这个问题；纳入 ${f.ladder[4].count} 条不说明证据少，说明筛选标准够严。`);
  console.log('');
  console.log(`结构: 问题 ${s.questionGrid} 格 · 证据层级 ${s.evidenceLevels} 类 · 漏斗 ${s.funnelRows} 层 · 留档 ${s.records} 样 · 适配 ${s.fitSteps} 道 · 失效模式 ${s.failures} 条`);
  console.log('');
  console.log('排除理由归类（看标准是否围绕问题设）:');
  for (const x of r.exclusions) console.log(`  · ${x.kind} ← ${x.text}`);
  console.log(hasOutcomeExclusion(EXCLUSION_KINDS) ? '  结局不符一栏存在：标准围绕问题设，结局这一格写清了。' : '  结局不符一栏缺失：标准可能围绕主题设，回查结局这一格。');
  console.log('');
  console.log(`结论: 命中 ${f.total} 条里最终纳入 ${f.ladder[4].count} 条（${f.steps[4].ofStart}%）；若这 ${f.ladder[4].count} 条只对上干预、对不上结局，方案最该补的是结局这一格。`);
  console.log('边界声明: 本输出为教学样例，数字由本章正文现算，不构成临床判断依据，也不替代检索指引与分级体系。');
}

if (require.main === module) main();

module.exports = {
  readDoc, hanzi, sectionTitles, sectionText, tableBlocks, dataRows,
  funnel, structure, exclusionKind, hasOutcomeExclusion, EXCLUSION_KINDS,
  report, CHAPTER, SLUG, TITLE
};
