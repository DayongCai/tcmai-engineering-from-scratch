#!/usr/bin/env node
/**
 * 医学细胞生物学 · 第 12 章 细胞与分子技术：可信度由对照决定
 * 正文: departments/09-jichu/03-yixue-xibao-shengwu-xue/chapters/12-xibao-yu-fenzi-jishu/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 成像表、分子三条线、模型表、陷阱表都从正文现抓。核心动作是一个定级函数：
 * 方法数、有没有因果干预、对照缺不缺——三件事决定一条结论是「相关」「稳健」还是「因果」。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const readDoc = () => fs.readFileSync(DOC, 'utf8');

function tableRows(doc, keys) {
  const lines = doc.split(/\r?\n/);
  const head = lines.findIndex((l) => l.trim().startsWith('|') && keys.every((k) => l.includes(k)));
  if (head < 0) throw new Error('正文里找不到表头: ' + keys.join(' / '));
  const rows = [];
  for (let i = head + 2; i < lines.length; i += 1) {
    const l = lines[i].trim();
    if (!l.startsWith('|')) break;
    rows.push(l.split('|').slice(1, -1).map((c) => c.trim()));
  }
  if (!rows.length) throw new Error('表头之后没有数据行');
  return rows;
}

/** 成像与分离：方式 / 分辨能力 / 能回答什么 / 主要假象 */
function imaging(doc) {
  return tableRows(doc, ['方式', '分辨能力', '能回答什么']).map((r) => ({
    method: r[0],
    resolution: r[1],
    answers: r[2],
    artifact: r[3],
  }));
}

/** 分子三条线：层面 / 常用方法 / 回答什么 / 关键对照 */
function molecular(doc) {
  return tableRows(doc, ['层面', '常用方法', '回答什么', '关键对照']).map((r) => ({
    layer: r[0],
    methods: r[1],
    answers: r[2],
    controls: r[3],
  }));
}

/** 模型系统：保留了什么 / 丢掉了什么 */
function models(doc) {
  return tableRows(doc, ['模型', '保留了什么', '丢掉了什么']).map((r) => ({ model: r[0], keeps: r[1], loses: r[2] }));
}

/** 陷阱表：现象 / 机制 / 识别办法 */
function pitfalls(doc) {
  return tableRows(doc, ['现象', '机制', '识别办法']).map((r) => ({ symptom: r[0], cause: r[1], check: r[2] }));
}

const CONTROL_KINDS = ['阴性', '阳性', '内参', '无关对照'];

/** 定级：单一方法只能给相关，两种独立方法给稳健，再加因果干预才给因果；对照缺一类降一级 */
function grade({ methods, causal = false, controls = [] }, doc) {
  if (!(methods >= 1)) throw new Error('方法数至少为一');
  const known = controls.filter((c) => CONTROL_KINDS.includes(c));
  const missing = CONTROL_KINDS.length - known.length;
  let level;
  if (methods >= 2 && causal) level = '因果';
  else if (methods >= 2) level = '稳健';
  else level = '相关';
  // 对照缺一类降一级，但不降到「相关」以下
  const ladder = ['相关', '稳健', '因果'];
  let i = ladder.indexOf(level);
  if (missing > 0) i = Math.max(0, i - 1);
  return { level: ladder[i], missingControls: missing, missingNames: CONTROL_KINDS.filter((c) => !known.includes(c)) };
}

/** 三问定级：用什么方法 / 在什么系统 / 对照齐不齐 */
function threeQuestions(doc) {
  const d = String(doc);
  const a = d.indexOf('任何一条细胞生物学结论，都可以用三问定级');
  const b = d.indexOf('三问答完');
  if (a < 0 || b < 0) throw new Error('正文里没有三问定级那一段');
  const out = [];
  for (const m of d.slice(a, b).matchAll(/\d\.\s*\*\*([^*]+)\*\*/g)) out.push(m[1].trim());
  if (out.length !== 3) throw new Error('定级不是三问: ' + out.length);
  return out;
}

/** 抗体是最大的不确定源：最硬的验证在敲除样本里做一次 */
function antibodyRule(doc) {
  const d = String(doc);
  return {
    biggestUncertainty: d.includes('抗体是最大的不确定源'),
    knockoutCheck: d.includes('在敲除该基因的样本里做一次'),
    corollary: d.includes('免疫共沉淀证明的是「在一起」，不是「直接结合」'),
  };
}

function main() {
  const doc = readDoc();
  const im = imaging(doc);
  const mol = molecular(doc);
  const md = models(doc);
  const pf = pitfalls(doc);

  console.log('医学细胞生物学 · 第 12 章 细胞与分子技术');
  console.log('');
  console.log(`正文里读到 ${im.length} 种成像/分离方式、${mol.length} 条分子层面、${md.length} 类模型、${pf.length} 条陷阱。`);
  console.log('');
  console.log('结论定级的三个例子：');
  const cases = [
    { label: '一种方法、无因果干预、对照齐', probe: { methods: 1, causal: false, controls: CONTROL_KINDS } },
    { label: '两种独立方法、无因果干预、对照齐', probe: { methods: 2, causal: false, controls: CONTROL_KINDS } },
    { label: '两种独立方法 + 敲除与回补、对照齐', probe: { methods: 2, causal: true, controls: CONTROL_KINDS } },
    { label: '两种独立方法 + 因果干预、但缺阴性对照', probe: { methods: 2, causal: true, controls: ['阳性', '内参', '无关对照'] } },
  ];
  for (const c of cases) {
    const g = grade(c.probe, doc);
    console.log(`  ${c.label} → ${g.level}${g.missingControls ? `（缺 ${g.missingNames.join('、')}）` : ''}`);
  }
  console.log('');
  console.log('三问定级：' + threeQuestions(doc).join(' / '));
  console.log('');
  console.log('抗体：最大不确定源 ' + antibodyRule(doc).biggestUncertainty + '；敲除样本验证 ' + antibodyRule(doc).knockoutCheck);
  console.log('模型表用法：任何结论都要标注「在哪个模型上成立」。');
  console.log('');
  console.log('※ 表格与三问都从本章正文现抓；定级规则是正文判据的直译，不涉及任何具体仪器的参数。');
  console.log('※ 本输出仅用于教学演示，不构成实验操作规范，也不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = {
  readDoc,
  tableRows,
  imaging,
  molecular,
  models,
  pitfalls,
  grade,
  threeQuestions,
  antibodyRule,
  CONTROL_KINDS,
};
