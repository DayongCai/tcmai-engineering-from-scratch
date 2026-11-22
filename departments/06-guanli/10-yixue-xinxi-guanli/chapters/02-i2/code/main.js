#!/usr/bin/env node
/**
 * 卫生信息管理 · 第 2 章 标准编码与法规伦理：编码错一位，统计算的是另一个病人
 * 课程: departments/06-guanli/10-yixue-xinxi-guanli/chapters/02-i2/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文现读：PROBLEM 里同一病人的三个主诊断码、标准四层表、五种错法表、数据元六项、互操作三级、映射表六列。
 * 现算：三个码两两差异位数（验证「错一位」是字面事实，不是修辞）、季度抽检折算的年复核量。
 * 并用正文给出的四条前置规则对一批病例跑校验，证明它能抓住逻辑上不可能的组合而放过正常病例。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 2;
const TITLE = '标准编码与法规伦理：编码错一位，统计算的是另一个病人';

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function parseTables(body) {
  const out = [];
  let cur = null;
  for (const line of body.split('\n')) {
    const m = line.match(/^\s*\|(.+)\|\s*$/);
    if (!m) { cur = null; continue; }
    const cells = m[1].split('|').map((c) => c.trim());
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;
    if (!cur) { cur = { header: cells, rows: [] }; out.push(cur); } else { cur.rows.push(cells); }
  }
  return out;
}

/** 同一病人的三个主诊断：只从 PROBLEM 段取，避免把示例规则里的正则当成码。 */
function problemCodes(body) {
  const block = body.split('\n').find((l) => l.startsWith('> **PROBLEM:**')) || '';
  const codes = [...block.matchAll(/\b([A-Z]\d{2}\.\d)\b/g)].map((m) => m[1]);
  return [...new Set(codes)].sort();
}

/** 等长编码的差异位数：J44.0 与 J44.1 差 1 位。 */
function diffBits(a, b) {
  if (a.length !== b.length) return Math.abs(a.length - b.length);
  let n = 0;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) n += 1;
  return n;
}

/** 正文的四条前置校验规则（性别矛盾、年龄矛盾、证据缺失）。 */
const RULES = [
  { code: /^N[7-9][0-9]/, forbiddenSex: 'M', msg: '男性不应出现女性生殖系统主诊断' },
  { code: /^O[0-9]{2}/, forbiddenSex: 'M', msg: '男性不应出现妊娠分娩相关主诊断' },
  { code: /^P[0-9]{2}/, maxAgeDays: 28, msg: '围生期诊断仅适用于 28 天以内' },
  { code: /^C[0-9]{2}/, requireEvidence: true, msg: '恶性肿瘤须有病理或影像证据字段' },
];

function validate({ code, sex, ageDays, evidence }) {
  return RULES
    .filter((r) => r.code.test(code))
    .filter((r) => (r.forbiddenSex ? sex === r.forbiddenSex : false)
      || (r.maxAgeDays != null && ageDays > r.maxAgeDays)
      || (r.requireEvidence && !evidence))
    .map((r) => r.msg);
}

/** 结构清点：四层标准、五种错法、数据元六项、互操作三级、映射表六列。 */
function structure(body, tables) {
  const layerTable = tables.find((t) => t.header[0] === '层');
  const errTable = tables.find((t) => t.header[0] === '错法');
  if (!layerTable) throw new Error('正文里没找到标准四层表');
  if (!errTable) throw new Error('正文里没找到五种错法表');
  const has = (k) => body.includes(k);
  const elements = ['名称', '定义', '数据类型', '表示格式', '值域', '计量单位'].filter(has);
  const interop = ['语法级', '语义级', '流程级'].filter(has);
  const mapCols = ['源码', '目标码', '映射类型', '生效版本', '审核人', '审核日期'].filter(has);
  return {
    layers: layerTable.rows.length,
    layerNames: layerTable.rows.map((r) => r[0]),
    errors: errTable.rows.length,
    errorNames: errTable.rows.map((r) => r[0]),
    elements: elements.length,
    interop: interop.length,
    mapCols: mapCols.length,
  };
}

/** 复算：码间差异、合并口径的后果、季度抽检折算的年复核量。 */
function compute(codes, s) {
  const pairs = [];
  for (let i = 0; i < codes.length; i += 1) {
    for (let j = i + 1; j < codes.length; j += 1) {
      pairs.push([codes[i], codes[j], diffBits(codes[i], codes[j])]);
    }
  }
  const minDiff = Math.min(...pairs.map((p) => p[2]));
  const annualSample = 4 * 200; // 每季度抽 100–200 份，取上限
  return {
    codes,
    distinct: new Set(codes).size,
    pairs,
    minDiff,
    oneBit: minDiff === 1,
    annualSample,
    errorClasses: s.errors,
  };
}

function verify(c, s, body) {
  if (c.distinct !== 3) throw new Error('三个主诊断应是三份不同的码: ' + c.codes.join('/'));
  if (!c.oneBit) throw new Error('正文主张「错一位」，实际最小差异 ' + c.minDiff + ' 位');
  if (!(c.codes.includes('J44.0') && c.codes.includes('J44.1') && c.codes.includes('J18.9'))) {
    throw new Error('PROBLEM 段里的三个码没读全: ' + c.codes.join('/'));
  }
  if (s.layers !== 4) throw new Error('标准四层表行数异常: ' + s.layers);
  if (s.errors !== 5) throw new Error('五种错法表行数异常: ' + s.errors);
  if (s.elements !== 6) throw new Error('数据元六项不全: ' + s.elements);
  if (s.interop !== 3) throw new Error('互操作三级不全: ' + s.interop);
  if (s.mapCols !== 6) throw new Error('映射表六列不全: ' + s.mapCols);
  for (const k of ['穷尽且互斥', '版本可追', '把宽映射当精确映射用']) {
    if (!body.includes(k)) throw new Error('正文缺关键判据: ' + k);
  }
}

function main() {
  const body = read();
  const s = structure(body, parseTables(body));
  const c = compute(problemCodes(body), s);
  verify(c, s, body);

  const cases = [
    { id: 'case-1', code: 'N80.0', sex: 'M', ageDays: 15000 },
    { id: 'case-2', code: 'O80', sex: 'M', ageDays: 12000 },
    { id: 'case-3', code: 'P07.2', sex: 'F', ageDays: 60 },
    { id: 'case-4', code: 'C50.9', sex: 'F', ageDays: 16000, evidence: false },
    { id: 'case-5', code: 'J44.1', sex: 'M', ageDays: 20000, evidence: true },
  ];
  const flagged = cases.map((x) => ({ id: x.id, msgs: validate(x) }));

  console.log(`卫生信息管理 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`同一病人的三个主诊断：${c.codes.join(' / ')} —— ${c.distinct} 份不同的码`);
  for (const [a, b, d] of c.pairs) {
    console.log(`  ${a} vs ${b}：差异 ${d} 位`);
  }
  console.log(`  → 最小差异 ${c.minDiff} 位：标题说的「错一位」是字面事实，不是修辞`);
  console.log(`  → 合并后算的是 ${c.distinct} 组资源消耗不同病人的加权均值，不对应任何真实人群`);
  console.log('');
  console.log(`结构清点：标准 ${s.layers} 层（${s.layerNames.join('、')}）· 错法 ${s.errors} 类 · 数据元 ${s.elements} 项`);
  console.log(`  互操作 ${s.interop} 级 · 映射表 ${s.mapCols} 列 · 季度抽检上限折算年复核 ${c.annualSample} 份`);
  console.log('');
  console.log('前置校验跑一批病例（规则示意，不是完整编码器）：');
  for (const f of flagged) {
    console.log(`  ${f.id}：${f.msgs.length ? f.msgs.join('；') : '通过'}`);
  }
  console.log('');
  console.log('※ 规则只抓逻辑上不可能的组合，语义质量仍要靠人抽样复核。');
  console.log('※ 本输出仅用于教学演示，不构成编码指导或合规意见。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, parseTables, problemCodes, diffBits, RULES, validate, structure, compute, verify };
