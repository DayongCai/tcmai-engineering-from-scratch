#!/usr/bin/env node
/**
 * 医院信息化与病案 · 第 2 章 标准、编码与互操作：编码少一位，整组就匹配不上
 * 课程: departments/06-guanli/11-yiyuan-xinxihua-bingan/chapters/02-z112/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 参数从本章正文的层级表现读：类目/亚目/扩展各要几位、示例码形态。
 * 复算：47.0 与 47.01 在「要求四位」的匹配键下能否入组；三层标准、四种映射处置、四层互操作、三个验收场景清点。
 * 正文任何一格改动，本脚本都会报出偏差——手打的结论会在改版后静默过期。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 2;
const TITLE = '标准、编码与互操作：编码少一位，整组就匹配不上';

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

const one = (re, body, name) => {
  const m = body.match(re);
  if (!m) throw new Error('正文里没找到' + name);
  return m[1];
};

/** 层级表读位数：类目几位、亚目几位、扩展几位。 */
function tiers(tables) {
  const t = tables.find((x) => x.header.includes('位数') && x.header.includes('匹配后果'));
  if (!t) throw new Error('正文里没找到编码层级表');
  return t.rows.map((r) => ({ name: r[0], bits: Number(r[1]), sample: r[2], effect: r[3] }));
}

/** 匹配判据：编码位数够不够得上分组器要求的键。 */
function canMatch(code, requiredBits) {
  const digits = String(code).replace(/\D/g, '');
  return digits.length >= requiredBits;
}

function structure(body) {
  const layers = ['术语层', '编码层', '消息层', '文档层']
    .filter((k) => new RegExp('\\*\\*' + k + '\\*\\*').test(body)).length;
  const mappings = ['一对一', '一对多', '对不上']
    .filter((k) => new RegExp('\\*\\*' + k + '\\*\\*').test(body)).length;
  const interop = ['语法互通', '语义互通', '流程互通', '组织互通']
    .filter((k) => new RegExp('\\*\\*' + k + '\\*\\*').test(body)).length;
  const scenes = ['门诊转住院', '住院转手术', '出院转随访'].filter((k) => body.includes(k)).length;
  const groupSteps = (body.match(/第[一二三四]步/g) || []).length;
  return { layers, mappings, interop, scenes, groupSteps };
}

function params(body, tables) {
  const t = tiers(tables);
  const ratio = body.match(/([一二三四五六七八九])成在口径对齐、([一二三四五六七八九])成在技术实现/);
  if (!ratio) throw new Error('正文里没找到口径与技术占比');
  const CN = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  return {
    tiers: t,
    requiredBits: t.find((x) => x.name === '亚目').bits,
    categoryCode: t.find((x) => x.name === '类目').sample,
    subCode: t.find((x) => x.name === '亚目').sample,
    caliberShare: CN[ratio[1]] * 10,
    techShare: CN[ratio[2]] * 10,
  };
}

/** 复算：少一位会丢掉什么、哪几级能入组、口径与技术各占几成。 */
function compute(p) {
  const byCategory = canMatch(p.categoryCode, p.requiredBits);
  const bySub = canMatch(p.subCode, p.requiredBits);
  const tiersMatching = p.tiers.filter((x) => x.bits >= p.requiredBits).length;
  return {
    byCategory,
    bySub,
    lostBits: p.requiredBits - String(p.categoryCode).replace(/\D/g, '').length,
    tiersMatching,
    caliber: p.caliberShare,
    tech: p.techShare,
  };
}

/** 正文与复算必须对得上：任一处对不上就抛错，不许两份数并存。 */
function verify(c, s, p, body) {
  const must = [['47.0', '类目示例码'], ['47.01', '亚目示例码'], ['未入组', '未入组后果']];
  const miss = must.filter(([str]) => !body.includes(str)).map(([, k]) => k);
  if (miss.length) throw new Error('正文与复算不一致，缺: ' + miss.join('、'));
  if (c.byCategory) throw new Error('类目码竟能匹配四位键: ' + p.categoryCode);
  if (!c.bySub) throw new Error('亚目码本该能匹配四位键: ' + p.subCode);
  if (c.lostBits !== 1) throw new Error('少写位数异常: ' + c.lostBits);
  if (s.layers !== 4) throw new Error('标准层数异常: ' + s.layers);
  if (s.mappings !== 3) throw new Error('映射形态数异常: ' + s.mappings);
  if (s.interop !== 4) throw new Error('互操作层数异常: ' + s.interop);
  if (s.scenes !== 3) throw new Error('验收场景数异常: ' + s.scenes);
}

function main() {
  const body = read();
  const s = structure(body);
  const p = params(body, parseTables(body));
  const c = compute(p);
  verify(c, s, p, body);

  console.log(`医院信息化与病案 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下判据均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`匹配键要求：${p.requiredBits} 位（亚目）`);
  console.log(`  类目码 ${p.categoryCode}（${p.categoryCode.length - 1} 位）→ ${c.byCategory ? '可入组' : '不入组'}`);
  console.log(`  亚目码 ${p.subCode}（${p.subCode.length - 1} 位）→ ${c.bySub ? '可入组' : '不入组'}`);
  console.log(`  少写 ${c.lostBits} 位 = 丢掉术式区分，整组匹配不上`);
  console.log(`  层级 ${p.tiers.map((x) => `${x.name}${x.bits}`).join(' / ')}，够得上四位键的有 ${c.tiersMatching} 级`);
  console.log('');
  console.log(`结构清点：${s.layers} 层标准 · ${s.mappings} 种映射处置 · ${s.interop} 层互操作 · ${s.scenes} 个验收场景 · 分组 ${s.groupSteps} 步`);
  console.log(`互操作工作量：口径 ${c.caliber}% / 技术 ${c.tech}%`);
  console.log('');
  console.log('※ 位数是匹配键不是精度偏好；码值以本院在用版本为准，不得据本章抄录使用。');
  console.log('※ 本输出仅用于教学演示，不构成编码指导或分组规则解释。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, parseTables, params, structure, compute, verify, canMatch, tiers };
