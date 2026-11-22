#!/usr/bin/env node
/**
 * 卫生事业管理 · 第 2 章 规划不能只写在纸上：资源配置是按规则分，不是按需要给
 * 课程: departments/06-guanli/04-weisheng-shiye-guanli/chapters/02-w2/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 输出从本章正文现算：汉字、节、表、加粗判断等文本量，
 * 以及正文里「三种算法三种数」那张表的复算：同一人口基数、三种口径各自的医生数。
 * 表里的起点与表里的结论必须能互推；推不出来，说明正文自相矛盾。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 2;
const TITLE = '规划不能只写在纸上：资源配置是按规则分，不是按需要给';

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function parseTables(body) {
  const out = [];
  let cur = null;
  for (const line of body.split('\n')) {
    const m = line.match(/^\s*\|(.+)\|\s*$/);
    if (!m) {
      cur = null;
      continue;
    }
    const cells = m[1].split('|').map((c) => c.trim());
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;
    if (!cur) {
      cur = { header: cells, rows: [] };
      out.push(cur);
    } else {
      cur.rows.push(cells);
    }
  }
  return out;
}

function num(cell) {
  const m = String(cell || '').replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : NaN;
}

function analyze(text) {
  const body = String(text || '').replace(/\r\n/g, '\n');
  const hanzi = (body.match(HANZI) || []).length;

  const sections = [];
  let cur = null;
  for (const line of body.split('\n')) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) {
      cur = { title: h[1], hanzi: 0 };
      sections.push(cur);
      continue;
    }
    if (cur) cur.hanzi += (line.match(HANZI) || []).length;
  }

  const tables = parseTables(body);
  const cites = [...new Set([...body.matchAll(/《([^》\n]+)》/g)].map((m) => m[1]))];
  const claims = (body.match(/\*\*[^*\n]+\*\*/g) || []).length;

  return { hanzi, sections, tables, tableCount: tables.length, cites, claims };
}

/**
 * 复算「三种算法三种数」：人口 × 口径比例 = 目标人数；
 * 目标人数 ÷ 每名医生可管理人数 = 所需医生（四舍五入）。
 * 同时读回表里写的目标人数与医生数，逐格核对。
 */
function auditMethods(tables) {
  const t = tables.find((x) => x.header.includes('需要量法') && x.header.includes('需求法'));
  if (!t) throw new Error('正文里没找到三种算法的对照表');
  const row = (kw) => {
    const r = t.rows.find((x) => x[0] && x[0].includes(kw));
    if (!r) throw new Error('对照表缺行: ' + kw);
    return r;
  };
  const population = num(row('人口对应人数')[0]); // 40 万
  const counts = row('人口对应人数').slice(1).map(num); // 3.2 / 1.2 / 2.24 万
  const capacity = num(row('每名医生可管理人数')[1]); // 2000
  const rates = row('起点').slice(1).map(num); // 8 / 3 / 70
  const doctorsStated = row('所需医生').slice(1).map(num); // 16 / 6 / 11

  const doctors = counts.map((c) => Math.round((c * 10000) / capacity));
  // 需要量法、需求法按人口取比例；服务目标法是先有应治人数，再按管理率目标取其中一部分。
  const derivedCounts = [
    Number(((population * rates[0]) / 100).toFixed(2)),
    Number(((population * rates[1]) / 100).toFixed(2)),
    Number((((population * rates[0]) / 100) * (rates[2] / 100)).toFixed(2)),
  ];
  const countOk = derivedCounts.every((v, i) => Math.abs(v - counts[i]) < 0.011);
  const doctorOk = doctors.every((v, i) => v === doctorsStated[i]);
  const spread = Math.max(...doctors) / Math.min(...doctors);

  return { population, capacity, rates, counts, derivedCounts, doctors, doctorsStated, countOk, doctorOk, spread };
}

function main() {
  const a = analyze(read());
  const m = auditMethods(a.tables);
  const names = ['需要量法', '需求法', '服务目标法'];

  console.log(`卫生事业管理 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 表格 ${a.tableCount} 张 · 加粗判断 ${a.claims} 处 · 引文 ${a.cites.length} 条`);
  console.log('');
  console.log(`口径复算：人口 ${m.population} 万 · 每名医生可管理 ${m.capacity} 人`);
  names.forEach((n, i) => {
    console.log(`  ${n}：${m.rates[i]}% → ${m.derivedCounts[i]} 万人（表载 ${m.counts[i]} 万）→ ${m.doctors[i]} 名医生（表载 ${m.doctorsStated[i]}）`);
  });
  console.log(`  → 目标人数${m.countOk ? '复算一致' : '复算不一致'}，医生数${m.doctorOk ? '复算一致' : '复算不一致'}；最大与最小相差 ${m.spread.toFixed(2)} 倍。`);
  console.log('  → 差距不是误差，是口径：应然、实然、可控三件事，规划必须同时交代。');
  console.log('');
  console.log('逐节字数：');
  for (const s of a.sections) {
    const share = a.hanzi ? ((s.hanzi / a.hanzi) * 100).toFixed(1) : '0.0';
    console.log(`  ${s.title.padEnd(24, '　')} ${String(s.hanzi).padStart(5)} 字（${share}%）`);
  }
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即随之变化；本输出仅用于教学演示，不构成行政决策建议，也不构成诊疗意见。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, analyze, parseTables, num, auditMethods };
