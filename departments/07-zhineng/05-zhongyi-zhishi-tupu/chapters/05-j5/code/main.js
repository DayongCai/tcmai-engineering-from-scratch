#!/usr/bin/env node
/**
 * 中医知识图谱 · 第 5 章 「消渴」「糖尿病」「E11」：三个名字都不算错，但系统只认一个
 * 课程: departments/07-zhineng/05-zhongyi-zhishi-tupu/chapters/05-j5/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文现算：等价类与成员数、三种写法的构成、平均写法数、等价强度三级之和、
 * 覆盖率漏斗的每一档百分比、四种「不同写法」的关系类型、文献核对的硬命中率。
 * 所有比例都由分子分母当场相除，正文改动会立刻改变输出。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 5;
const TITLE = '「消渴」「糖尿病」「E11」：三个名字都不算错，但系统只认一个';

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

function analyze(text) {
  const body = String(text || '').replace(/\r\n/g, '\n');
  const tables = parseTables(body);

  // 等价类规模表：项 → 数
  const scaleTable = tables.find((t) => t.header[0] === '项' && t.header[1] === '数');
  if (!scaleTable) throw new Error('正文里没有等价类规模表');
  const scale = {};
  for (const r of scaleTable.rows) scale[r[0]] = num(r[1]);

  const classes = scale['等价类'];
  const members = scale['类内成员合计'];
  const avgStated = scale['平均每类写法'];

  // 简体 / 繁体 / 英文 三档来自同一行的比值写法
  const langRow = scaleTable.rows.find((r) => r[1] && r[1].includes('/'));
  const langs = langRow ? langRow[1].split('/').map((s) => num(s)) : [];
  const langSum = langs.reduce((a, b) => a + b, 0);

  const avgComputed = members / classes;

  // 等价强度 A/B/C
  const strengthTable = tables.find((t) => t.header[0] === '强度');
  const strength = strengthTable
    ? strengthTable.rows.map((r) => ({ level: r[0], basis: r[1], count: num(r[2]) }))
    : [];
  const strengthSum = strength.reduce((a, x) => a + x.count, 0);
  const aShare = strength.length ? strength[0].count / strengthSum : null;

  // 覆盖率漏斗：117 类 → 41 → 19 → 15 → 66
  const funnelFence = fences(body).find((f) => f.includes('WHO 传统医学术语表条目'));
  const funnel = funnelFence
    ? funnelFence.split('→').map((s) => ({
      count: num(s),
      pct: (s.match(/（(\d+(?:\.\d+)?)%）/) || [])[1],
      label: s
        .replace(/（\d+(?:\.\d+)?%）/g, '')
        .replace(/^\s*\d+\s*类/, '')
        .trim(),
    })).filter((x) => x.count != null)
    : [];

  // 四种「不同写法」
  const relTable = tables.find((t) => t.header.join('').includes('证据怎么算'));
  const relations = relTable
    ? relTable.rows.map((r) => (r[0].match(/`([a-z]+)`/) || [])[1]).filter(Boolean)
    : [];

  // 文献核对结果
  const litFence = fences(body).find((f) => f.includes('specific'));
  const lit = {};
  if (litFence) {
    for (const line of litFence.split('\n')) {
      const m = line.match(/^\s*([A-Za-z]+)\s+(\d+)/);
      if (m) lit[m[1]] = num(m[2]);
    }
  }
  const checkedHit = body.match(/对\s*(\d+)\s*条证名的文献核对/);
  const checked = checkedHit ? num(checkedHit[1]) : null;
  const hardHits = (lit.specific || 0) + (lit.viaSynonymAlias || 0);
  const hardRate = checked ? hardHits / checked : null;

  return {
    body,
    hanzi: (body.match(HANZI) || []).length,
    scale,
    classes,
    members,
    avgStated,
    langs,
    langSum,
    avgComputed,
    strength,
    strengthSum,
    aShare,
    funnel,
    relations,
    lit,
    checked,
    hardHits,
    hardRate,
    noVectorNeighborMerge: /相似度取近邻的做法在这里不适用/.test(body),
    aliasMustAppear: /必须在来源里字面出现/.test(body),
    unverifiedMark: /未能核实/.test(body),
    wholeNameEmpty: /wholeStandardName.*恒为空/.test(body),
  };
}

function main() {
  const a = analyze(read());
  const pct = (x) => (x == null ? '—' : (x * 100).toFixed(1) + '%');

  console.log(`中医知识图谱 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`正文 ${a.hanzi} 汉字`);
  console.log('');
  console.log(`等价类 ${a.classes} 个 · 成员 ${a.members} 种写法 · 三类写法 ${a.langs.join(' / ')}（和 ${a.langSum}）`);
  console.log(`平均每类写法：${a.members} / ${a.classes} = ${a.avgComputed.toFixed(2)}（正文 ${a.avgStated}）`);
  console.log(`等价强度：${a.strength.map((s) => s.level + '=' + s.count).join(' / ')}，合计 ${a.strengthSum}；A 级占比 ${pct(a.aShare)}`);
  console.log('');
  console.log('覆盖漏斗（每一档的百分比由分子分母相除）：');
  for (const f of a.funnel) {
    const p = a.classes ? ((f.count / a.classes) * 100).toFixed(1) + '%' : '—';
    const name = f.label || '（全部等价类）';
    console.log(`  ${String(f.count).padStart(3)} 类 ${name.padEnd(16, '　')} 现算 ${p}（正文 ${f.pct || '—'}%）`);
  }
  console.log('');
  console.log(`四种不同写法：${a.relations.join(' / ')}`);
  console.log(`文献核对 ${a.checked} 条：硬命中 ${a.hardHits}（${pct(a.hardRate)}）· 待人工确认 ${a.lit.variantUnconfirmed || 0} · 泛论 ${a.lit.generic || 0}`);
  console.log('');
  console.log(`近邻合并不适用：${a.noVectorNeighborMerge ? '已写明' : '未出现'} · 别名须字面出现：${a.aliasMustAppear ? '已写明' : '未出现'}`);
  console.log(`合称整条正名恒为空：${a.wholeNameEmpty ? '已写明' : '未出现'} · 离线标未能核实：${a.unverifiedMark ? '已写明' : '未出现'}`);
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即随之变化；本章讨论术语与编码治理，不构成诊疗建议。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, analyze, parseTables, fences, num };
