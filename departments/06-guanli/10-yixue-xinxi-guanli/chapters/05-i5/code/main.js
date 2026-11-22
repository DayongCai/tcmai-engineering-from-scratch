#!/usr/bin/env node
/**
 * 卫生信息管理 · 第 5 章 技术与资源检索：检索能力决定你能看见多少证据
 * 课程: departments/06-guanli/10-yixue-xinxi-guanli/chapters/05-i5/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文现读：金标准集体量、两个检索式的命中数与命中其中的相关数。
 * 现算：查全率、查准率、F1，以及扩展同义词之后两个比率的反向变化。
 * 结论必须由复算得出：查全升、查准降，F1 反而下降——所以用途决定检索式，而不是「越全越好」。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 5;
const TITLE = '技术与资源检索：检索能力决定你能看见多少证据';

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
  return Number(m[1]);
};

/** 正文的演算段落：金标准 40 篇；A 命中 52 含 26；扩展后命中 96 含 36。 */
function params(body) {
  return {
    gold: one(/金标准集 (\d+) 篇/, body, '金标准集篇数'),
    hitsA: one(/检索式 A 命中 (\d+) 篇/, body, '检索式 A 命中数'),
    relA: one(/其中 (\d+) 篇属于金标准集/, body, 'A 命中相关数'),
    hitsB: one(/命中升到 (\d+) 篇/, body, '扩展后命中数'),
    relB: one(/金标准集覆盖 (\d+) 篇/, body, '扩展后相关数'),
  };
}

const recall = (rel, gold) => rel / gold;
const precision = (rel, hits) => rel / hits;
const f1 = (r, p) => (r + p === 0 ? 0 : (2 * r * p) / (r + p));

/** 结构清点：四变量、PICO 四项、三类知识资源组织要求、三种云模式、五类院内资源。 */
function structure(body, tables) {
  const cloud = tables.find((t) => t.header.includes('厂商管'));
  if (!cloud) throw new Error('正文里没找到责任划分表');
  const must = {
    四变量: ['词', '字段', '逻辑', '限定'],
    PICO: ['人群（P）', '干预（I）', '对照（C）', '结局（O）'],
    组织: ['统一入口', '元数据', '版本可见'],
    模式: ['IaaS', 'PaaS', 'SaaS'],
    资源: ['诊疗指南', '临床路径', '处方集', '检验手册'],
  };
  const out = { 云模式行数: cloud.rows.length };
  for (const [k, list] of Object.entries(must)) {
    const hit = list.filter((s) => body.includes(s));
    if (hit.length !== list.length) throw new Error(k + '不全，缺: ' + list.filter((s) => !hit.includes(s)).join('、'));
    out[k] = hit.length;
  }
  return out;
}

function compute(p) {
  const rA = recall(p.relA, p.gold);
  const pA = precision(p.relA, p.hitsA);
  const rB = recall(p.relB, p.gold);
  const pB = precision(p.relB, p.hitsB);
  return {
    rA, pA, rB, pB,
    f1A: f1(rA, pA),
    f1B: f1(rB, pB),
    hitGrowth: ((p.hitsB - p.hitsA) / p.hitsA) * 100,
    recallGain: (rB - rA) * 100,
    precisionLoss: (pA - pB) * 100,
    missedA: p.gold - p.relA,
    missedB: p.gold - p.relB,
  };
}

function verify(c, s, body) {
  const must = [
    [`${(c.rA * 100).toFixed(0)}%`, 'A 的查全率'],
    [`${(c.pA * 100).toFixed(0)}%`, 'A 的查准率'],
    [`${(c.rB * 100).toFixed(0)}%`, 'B 的查全率'],
    [`${(c.pB * 100).toFixed(1)}%`, 'B 的查准率'],
  ];
  const miss = must.filter(([str]) => !body.includes(str)).map(([, k]) => k);
  if (miss.length) throw new Error('正文与复算不一致，缺: ' + miss.join('、'));
  if (!(c.rB > c.rA)) throw new Error('扩展同义词后查全率应上升');
  if (!(c.pB < c.pA)) throw new Error('扩展同义词后查准率应下降');
  if (!(c.f1B < c.f1A)) throw new Error('本例 F1 应下降——否则取舍故事不成立');
  if (s.证据等级 !== undefined) throw new Error('未知分组');
  if (s.四变量 !== 4 || s.PICO !== 4 || s.组织 !== 3 || s.模式 !== 3) throw new Error('结构清点不足');
  if (s.云模式行数 !== 3) throw new Error('云模式表行数异常: ' + s.云模式行数);
}

function main() {
  const body = read();
  const p = params(body);
  const s = structure(body, parseTables(body));
  const c = compute(p);
  verify(c, s, body);

  console.log(`卫生信息管理 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`金标准集 ${p.gold} 篇 —— 用专家确认的必读集近似「全部相关文献」`);
  console.log('');
  console.log(`检索式 A：命中 ${p.hitsA}，其中相关 ${p.relA}`);
  console.log(`  查全率 ${(c.rA * 100).toFixed(0)}%（漏 ${c.missedA} 篇） · 查准率 ${(c.pA * 100).toFixed(0)}% · F1 ${c.f1A.toFixed(3)}`);
  console.log(`扩展同义词后：命中 ${p.hitsB}，其中相关 ${p.relB}`);
  console.log(`  查全率 ${(c.rB * 100).toFixed(0)}%（漏 ${c.missedB} 篇） · 查准率 ${(c.pB * 100).toFixed(1)}% · F1 ${c.f1B.toFixed(3)}`);
  console.log('');
  console.log(`命中数 +${c.hitGrowth.toFixed(1)}%，查全率 +${c.recallGain.toFixed(0)} 个百分点，查准率 −${c.precisionLoss.toFixed(1)} 个百分点`);
  console.log(`  → F1 ${c.f1A.toFixed(3)} → ${c.f1B.toFixed(3)}：越查越全不等于越查越准，用途决定取舍`);
  console.log('');
  console.log(`结构清点：检索式 ${s.四变量} 变量 · PICO ${s.PICO} 项 · 组织 ${s.组织} 要求 · 云模式 ${s.模式} 种 · 院内资源 ${s.资源} 类`);
  console.log('');
  console.log('※ 金标准集与同义词表需要长期维护，这是人力投入，不是一次性配置。');
  console.log('※ 本输出仅用于教学演示，不构成检索策略或临床用药建议。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, parseTables, params, recall, precision, f1, structure, compute, verify };
