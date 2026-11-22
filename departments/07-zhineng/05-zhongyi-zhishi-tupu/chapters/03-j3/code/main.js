#!/usr/bin/env node
/**
 * 中医知识图谱 · 第 3 章 六类边撑起半张中医图，但两套坐标系不能合并
 * 课程: departments/07-zhineng/05-zhongyi-zhishi-tupu/chapters/03-j3/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文现算：五行的生克配对数、十二经流注链的节点数与闭环、
 * 表里配对数、证据等级的级数、病证单元的四个侧面、两套病证资料的重叠数。
 * 乘侮若单独立边会让图长到多少，也由「节点数 × 有序对 × 两式」当场算出，
 * 不用正文里那个带加号的约数。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 3;
const TITLE = '六类边撑起半张中医图，但两套坐标系不能合并';

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function splitRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((s) => s.trim());
}

function parseTables(md) {
  const lines = String(md).split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!/^\s*\|/.test(lines[i])) continue;
    if (i + 1 >= lines.length || !/^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) continue;
    const header = splitRow(lines[i]);
    const rows = [];
    let j = i + 2;
    while (j < lines.length && /^\s*\|/.test(lines[j])) { rows.push(splitRow(lines[j])); j += 1; }
    out.push({ header, rows });
    i = j - 1;
  }
  return out;
}

function num(s) {
  const m = String(s == null ? '' : s).replace(/[,\s]/g, '').match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}

function fences(md) {
  return [...String(md).matchAll(/```[a-z]*\n([\s\S]*?)```/g)].map((m) => m[1]);
}

/** 括号内以顿号分隔的条目，形如「相生五对（木生火、…）」。 */
function pairsIn(body, keyword) {
  const re = new RegExp(keyword + '[一二三四五六七八九十]+对（([^）]+)）');
  const hit = body.match(re);
  if (!hit) return [];
  return hit[1].split('、').map((s) => s.trim()).filter(Boolean);
}

function analyze(text) {
  const body = String(text || '').replace(/\r\n/g, '\n');
  const tables = parseTables(body);

  // 五行：五个节点、生五对、克五对
  const sheng = pairsIn(body, '相生');
  const ke = pairsIn(body, '相克');
  const wuxingNodes = 5;
  const wuxingEdges = sheng.length + ke.length;
  // 乘侮若各自单独立一类边：每个节点对另四个节点都可能乘或侮
  const chengwuIfSeparate = wuxingNodes * (wuxingNodes - 1) * 2;

  // 十二经流注链
  const chainFence = fences(body).find((f) => f.includes('手太阴肺经'));
  const chain = chainFence
    ? chainFence.split('→').map((s) => s.trim()).filter((s) => s.endsWith('经'))
    : [];
  const chainClosed = /（回手太阴）/.test(body);

  // 两类经脉边
  const meridianTable = tables.find((t) => t.header.join('').includes('是否成环'));
  const meridianTypes = meridianTable
    ? meridianTable.rows.map((r) => ({
      type: (r[0].match(/`([a-z_]+)`/) || [])[1],
      count: num(r[2]),
    })).filter((x) => x.type)
    : [];

  // 证据等级 A–F
  const levelFence = fences(body).find((f) => /^A\s/m.test(f) && f.includes('RCT'));
  const evidence = levelFence
    ? [...levelFence.matchAll(/([A-F])\s+(?=[\u4e00-\u9fff])/g)].map((m) => m[1])
    : [];

  // 病证单元的四个侧面
  const sideTable = tables.find((t) => t.header.join('').includes('边型') && t.header[0] === '侧');
  const sides = sideTable ? sideTable.rows.map((r) => r[0]) : [];

  // 两套病证资料的重叠核对
  const overlap = body.match(/重叠部分为\s*(\d+)\s*\/\s*(\d+)/);
  const overlapHit = overlap ? { same: num(overlap[1]), total: num(overlap[2]) } : null;

  // 六经的取值个数
  const sixHit = body.match(/六经（([^）]+)）/);
  const sixMeridians = sixHit ? sixHit[1].split('、').map((s) => s.trim()).filter(Boolean) : [];

  return {
    body,
    hanzi: (body.match(HANZI) || []).length,
    sheng,
    ke,
    wuxingNodes,
    wuxingEdges,
    chengwuIfSeparate,
    chain,
    chainClosed,
    meridianTypes,
    evidence,
    sides,
    overlapHit,
    sixMeridians,
    evidenceDecidesUse: /等级决定用途/.test(body),
    noCodeGuess: /未能核实/.test(body),
  };
}

function main() {
  const a = analyze(read());
  const liuzhu = a.meridianTypes.find((x) => x.type === 'meridian_liuzhu');
  const biaoli = a.meridianTypes.find((x) => x.type === 'meridian_biaoli');

  console.log(`中医知识图谱 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`正文 ${a.hanzi} 汉字`);
  console.log('');
  console.log(`五行：${a.wuxingNodes} 节点 · 生 ${a.sheng.length} 对 + 克 ${a.ke.length} 对 = ${a.wuxingEdges} 条边`);
  console.log(`  若乘、侮各建一类边：${a.wuxingNodes} × ${a.wuxingNodes - 1} 个有序对 × 2 = ${a.chengwuIfSeparate} 条`);
  console.log(`  生：${a.sheng.join('、')}`);
  console.log(`  克：${a.ke.join('、')}`);
  console.log('');
  console.log(`十二经流注：${a.chain.length} 个节点${a.chainClosed ? '，末经回手太阴、闭环' : '，未见闭环'}`);
  console.log(`  首：${a.chain[0]}；尾：${a.chain[a.chain.length - 1]}`);
  console.log(`  边型：${a.meridianTypes.map((x) => x.type + '=' + x.count).join(' / ')}`);
  console.log(`  表里对数应为流注节点数的一半：${liuzhu ? liuzhu.count : '—'} / 2 = ${liuzhu ? liuzhu.count / 2 : '—'}（正文 ${biaoli ? biaoli.count : '—'}）`);
  console.log('');
  console.log(`六经 ${a.sixMeridians.length} 值：${a.sixMeridians.join('、')}`);
  console.log(`证据等级 ${a.evidence.length} 级：${a.evidence.join(' → ')}；等级决定用途：${a.evidenceDecidesUse ? '已写明' : '未出现'}`);
  console.log(`病证单元四侧：${a.sides.join(' / ')}`);
  console.log(`两套资料重叠：${a.overlapHit ? a.overlapHit.same + ' / ' + a.overlapHit.total : '—'}；编码不可猜：${a.noCodeGuess ? '标未能核实' : '未写明'}`);
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即随之变化；本章只讨论结构，不构成诊断或用药建议。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, analyze, parseTables, fences, num };
