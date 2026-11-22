#!/usr/bin/env node
/**
 * 卫生事业管理 · 第 7 章 指标测的是能被记录的东西，不是要紧的东西
 * 课程: departments/06-guanli/04-weisheng-shiye-guanli/chapters/07-w7/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 输出从本章正文现算：汉字、节、表等文本量，以及正文那组风险调整算例的复算——
 * 粗死亡率 = 死亡数 ÷ 收治例数；标准化死亡比 = 实际死亡 ÷ 预期死亡。
 * 两把尺子给出相反的排名，这是本章全部论点的算术依据。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 7;
const TITLE = '指标测的是能被记录的东西，不是要紧的东西';

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
  const s = String(cell || '').replace(/,/g, '').replace(/[−–—]/g, '-');
  const m = s.match(/-?\d+(?:\.\d+)?/);
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
 * 结果指标的两种算法：粗率与标准化死亡比。
 * 表里同时写了粗率与 SMR，复算后逐格核对，并给出两种排名各取谁。
 */
function outcomeRanking(tables) {
  const t = tables.find((x) => x.header.some((h) => h.includes('预期死亡')));
  if (!t) throw new Error('正文里没找到风险调整算例表');
  const idx = (kw) => t.header.findIndex((h) => h.includes(kw));
  const ic = idx('收治例数');
  const id = idx('死亡数');
  const icr = idx('粗死亡率');
  const ie = idx('预期死亡');
  const is = idx('标准化死亡比');

  const rows = t.rows.filter((r) => r[0]).map((r) => {
    const cases = num(r[ic]);
    const deaths = num(r[id]);
    const expected = num(r[ie]);
    return {
      name: r[0],
      cases,
      deaths,
      expected,
      crude: (deaths / cases) * 100,
      smr: deaths / expected,
      statedCrude: num(r[icr]),
      statedSmr: num(r[is]),
    };
  });

  const ok = rows.every((x) => Math.abs(x.crude - x.statedCrude) < 0.051 && Math.abs(x.smr - x.statedSmr) < 0.005);
  const bestByCrude = rows.reduce((m, x) => (x.crude < m.crude ? x : m), rows[0]);
  const bestBySmr = rows.reduce((m, x) => (x.smr < m.smr ? x : m), rows[0]);

  return { rows, ok, bestByCrude, bestBySmr, reversed: bestByCrude.name !== bestBySmr.name };
}

/** 数据四来源、质量四维、监督三工具：都从正文逐项数出来。 */
function dataSources(body) {
  const m = body.match(/四种来源，可靠性依次递减：\n\n([\s\S]*?)\n\n/);
  if (!m) throw new Error('正文里没找到四种数据来源');
  return [...m[1].matchAll(/\*\*([^*]+)\*\*/g)].map((x) => x[1]);
}

function qualityDims(body) {
  const m = body.match(/数据的质量有四个维度，缺一不可：([^。]+)。/);
  if (!m) throw new Error('正文里没找到数据质量四维');
  return m[1].split('、').map((s) => s.replace(/（[^）]*）/g, '').trim());
}

function supervisionTools(body) {
  const m = body.match(/监督的工具有三种。([\s\S]*?)医德医风与利益冲突/);
  if (!m) throw new Error('正文里没找到监督三种工具');
  return [...m[1].matchAll(/^\*\*([^*]+)\*\*/gm)].map((x) => x[1]);
}

function main() {
  const body = read();
  const a = analyze(body);
  const r = outcomeRanking(a.tables);
  const sources = dataSources(body);
  const dims = qualityDims(body);
  const tools = supervisionTools(body);

  console.log(`卫生事业管理 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 表格 ${a.tableCount} 张 · 加粗判断 ${a.claims} 处 · 引文 ${a.cites.length} 条`);
  console.log('');
  console.log('两种尺子的复算：');
  for (const x of r.rows) {
    console.log(`  ${x.name}：${x.deaths}/${x.cases} = 粗死亡 ${x.crude.toFixed(1)}%（表载 ${x.statedCrude}%）· ${x.deaths}/${x.expected} = SMR ${x.smr.toFixed(2)}（表载 ${x.statedSmr}）`);
  }
  console.log(`  → 表算${r.ok ? '一致' : '不一致，须改稿'}；按粗率 ${r.bestByCrude.name} 更优，按标准化死亡比 ${r.bestBySmr.name} 更优，排名${r.reversed ? '确实反转' : '没有反转'}。`);
  console.log('  → 粗率排名会系统性惩罚重症收治者，这就是结果指标必须做风险调整的原因。');
  console.log('');
  console.log(`数据来源 ${sources.length} 种（可靠性递减）：${sources.join('、')}`);
  console.log(`数据质量 ${dims.length} 维：${dims.join('、')}；正文点名最容易被忽略的是「可比」。`);
  console.log(`监督工具 ${tools.length} 种：${tools.join('、')}；三者的关系是闭环，不是流水线。`);
  console.log('');
  console.log('逐节字数：');
  for (const s of a.sections) {
    const share = a.hanzi ? ((s.hanzi / a.hanzi) * 100).toFixed(1) : '0.0';
    console.log(`  ${s.title.padEnd(24, '　')} ${String(s.hanzi).padStart(5)} 字（${share}%）`);
  }
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即随之变化；本输出仅用于教学演示，不构成对任何机构服务质量的判断，也不构成诊疗意见。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE, read, analyze, parseTables, num,
  outcomeRanking, dataSources, qualityDims, supervisionTools,
};
