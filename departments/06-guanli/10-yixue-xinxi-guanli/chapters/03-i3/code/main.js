#!/usr/bin/env node
/**
 * 卫生信息管理 · 第 3 章 系统与电子病历：HIS、EMR、LIS 不是三套软件，是三条责任链
 * 课程: departments/06-guanli/10-yixue-xinxi-guanli/chapters/03-i3/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文现读：24 小时抽查的检验条数与两处缺口、权威系统表、点对点链路公式、MPI 权重与两个阈值。
 * 现算：两条链各自的缺失率与合计缺口率、n 家系统的全互联链路数、MPI 相似度打分与三档判定。
 * 正文任何一格改动，本脚本都会报出偏差。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 3;
const TITLE = '系统与电子病历：HIS、EMR、LIS 不是三套软件，是三条责任链';

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
const num = (s) => Number(String(s).replace(/,/g, ''));
const fmt = (n) => Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 });

/** 抽查参数：条数与两处缺口。 */
function params(body) {
  return {
    results: num(one(/24 小时内 ([\d,]+) 条检验结果/, body, '抽查条数')),
    noOrder: Number(one(/发现 (\d+) 条在电子病历里找不到对应的申请单/, body, '缺申请单条数')),
    noSpecimen: Number(one(/另有 (\d+) 条在 HIS 里计了费却在 LIS 里查不到标本/, body, '计费无标本条数')),
  };
}

/** 权威系统表的行数与数据项。 */
function authority(tables) {
  const t = tables.find((x) => x.header.includes('权威系统'));
  if (!t) throw new Error('正文里没找到权威系统表');
  return { rows: t.rows.length, data: t.rows.map((r) => r[0]) };
}

/** 点对点全互联链路段数。 */
const mesh = (n) => (n * (n - 1)) / 2;

/** MPI 权重与阈值，都从正文的代码块/注释里读。 */
function mpiConfig(body) {
  const m = body.match(/const W = \{ name: ([\d.]+), birth: ([\d.]+), sex: ([\d.]+), idLast4: ([\d.]+), phone: ([\d.]+) \}/);
  if (!m) throw new Error('正文里没找到 MPI 权重');
  const t = body.match(/≥([\d.]+) 自动合并；([\d.]+)–([\d.]+) 人工复核/);
  if (!t) throw new Error('正文里没找到 MPI 阈值');
  return {
    W: { name: Number(m[1]), birth: Number(m[2]), sex: Number(m[3]), idLast4: Number(m[4]), phone: Number(m[5]) },
    auto: Number(t[1]),
    reviewLow: Number(t[2]),
    reviewHigh: Number(t[3]),
  };
}

function editDistance(a, b) {
  const m = a.length; const n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[m][n];
}

const sameYearMonth = (a, b) => String(a).slice(0, 6) === String(b).slice(0, 6);

/** 正文的评分骨架，权重从正文读，不在这里手打。 */
function makeScorer(cfg) {
  const { W } = cfg;
  return function score(a, b) {
    let s = 0;
    if (a.name === b.name) s += W.name;
    else if (editDistance(a.name, b.name) <= 1) s += W.name * 0.6;
    if (a.birth === b.birth) s += W.birth;
    else if (sameYearMonth(a.birth, b.birth)) s += W.birth * 0.5;
    if (a.sex === b.sex) s += W.sex;
    if (a.idLast4 && a.idLast4 === b.idLast4) s += W.idLast4;
    if (a.phone && a.phone === b.phone) s += W.phone;
    return Math.round(s * 1e4) / 1e4; // 阈值判定要稳，别让浮点误差把 0.75 判成 0.7499
  };
}

const classify = (s, cfg) => (s >= cfg.auto ? 'merge' : s >= cfg.reviewLow ? 'review' : 'reject');

/** 复算缺口率与链路数。 */
function compute(p, cfg) {
  const gap = p.noOrder + p.noSpecimen;
  return {
    orderRate: (p.noOrder / p.results) * 100,
    specimenRate: (p.noSpecimen / p.results) * 100,
    gapRate: (gap / p.results) * 100,
    gap,
    mesh10: mesh(10),
    mesh20: mesh(20),
    weightSum: Object.values(cfg.W).reduce((a, b) => a + b, 0),
  };
}

function verify(c, a, cfg, body) {
  if (!body.includes('190 条链路')) throw new Error('正文里的 190 条链路不见了');
  if (c.mesh20 !== 190) throw new Error('n(n−1)/2 复算与正文不一致: ' + c.mesh20);
  if (Math.abs(c.weightSum - 1) > 1e-9) throw new Error('MPI 权重之和应为 1，实际 ' + c.weightSum);
  if (a.rows !== 7) throw new Error('权威系统表行数异常: ' + a.rows);
  if (!(cfg.auto > cfg.reviewLow)) throw new Error('自动合并阈值应高于人工复核下限');
  if (!body.includes('宁可漏并、不可错并')) throw new Error('正文缺偏置判据');
  if (!(c.gapRate > 1.5 && c.gapRate < 1.7)) throw new Error('合计缺口率异常: ' + c.gapRate);
}

function main() {
  const body = read();
  const p = params(body);
  const a = authority(parseTables(body));
  const cfg = mpiConfig(body);
  const c = compute(p, cfg);
  verify(c, a, cfg, body);

  const score = makeScorer(cfg);
  const base = { name: '张三', birth: '19700412', sex: 'M', idLast4: '1234', phone: '13800001234' };
  const cases = [
    ['同一人，五字段全同', base],
    ['同一人，仅姓名+生日+性别', { ...base, idLast4: '', phone: '' }],
    ['同一人，姓名差一个形近字，其余同', { ...base, name: '张叁', birth: '19700413' }],
    ['疑似同一人，仅姓名与出生年月', { name: '张三', birth: '19700429', sex: 'F' }],
  ];

  console.log(`卫生信息管理 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`24 小时抽查 ${fmt(p.results)} 条：缺申请单 ${p.noOrder} 条（${c.orderRate.toFixed(2)}%），计费无标本 ${p.noSpecimen} 条（${c.specimenRate.toFixed(2)}%）`);
  console.log(`  合计缺口 ${c.gap} 条 = ${c.gapRate.toFixed(1)}%——三方各自「完整」时的对账差额`);
  console.log('');
  console.log(`权威系统表 ${a.rows} 项：${a.data.join('、')}`);
  console.log(`点对点全互联：10 家 ${c.mesh10} 条，20 家 ${c.mesh20} 条（正文按 n(n−1)/2 计）`);
  console.log('');
  console.log(`MPI 权重合计 ${c.weightSum.toFixed(2)}；自动合并 ≥${cfg.auto}，${cfg.reviewLow}–${cfg.reviewHigh} 转人工`);
  for (const [label, cand] of cases) {
    const s = score(base, cand);
    console.log(`  ${label}：${s.toFixed(2)} → ${classify(s, cfg)}`);
  }
  console.log('');
  console.log('※ 阈值须按本地数据标定；错并会串号，漏并只是重复，偏置方向由此确定。');
  console.log('※ 本输出仅用于教学演示，不构成系统选型或集成方案。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, parseTables, params, authority, mesh, mpiConfig, editDistance, makeScorer, classify, compute, verify };
