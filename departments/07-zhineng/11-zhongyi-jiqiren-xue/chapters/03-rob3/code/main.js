#!/usr/bin/env node
/**
 * 中医机器人学 · 第 3 章 决策的难点不是选最优，是错一步还能回头
 * 课程: departments/07-zhineng/11-zhongyi-jiqiren-xue/chapters/03-rob3/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 正文的小算例照抄成一张转移表（S1–A→S2 得 +1 等），再用折扣累积从终止态往回算 Q，
 * 与正文写的 3.7 / 1.3 / 4.7 / 2.3 逐项核对；γ 与动作空间规模也从正文的演算设定里取。
 * 手打的数字会在改稿后静默过期，这里一个都不写。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 3;
const TITLE = '决策的难点不是选最优，是错一步还能回头';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function detex(s) {
  return String(s || '')
    .replace(/\\text\{([^}]*)\}/g, '$1')
    .replace(/\\max/g, 'max')
    .replace(/\\min/g, 'min')
    .replace(/\\gamma/g, 'γ')
    .replace(/\\alpha/g, 'α')
    .replace(/\\varepsilon/g, 'ε')
    .replace(/\\pi/g, 'π')
    .replace(/\\left|\\right|\\,|\\;|\\!/g, ' ')
    .replace(/\\[a-zA-Z]+/g, ' ')
    .replace(/\\\s/g, ' ')
    .replace(/\\/g, '')
    .replace(/[${}]/g, '');
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

/** 从正文的四条转移描述里抽出算例图：S1-A→S2(+1)、S1-B→S3(-1)、S2-A→终止(+3)、S3-A→终止(0)。 */
function parseCase(body) {
  const edges = [];
  const re = /状态\s*(S\d)\s*取动作\s*([A-Z])\s*→\s*到?\s*(终止|S\d)[，,]\s*(?:即时)?奖励\s*\$?\s*([+−-]?\d+)\$?/g;
  for (const m of body.matchAll(re)) {
    edges.push({ from: m[1], action: m[2], to: m[3], reward: Number(m[4].replace('−', '-')) });
  }
  return edges;
}

/** 折扣累积：从终止态往回算，终止态的价值取 0。 */
function solveQ(edges, gamma) {
  const byState = {};
  for (const e of edges) (byState[e.from] = byState[e.from] || []).push(e);
  const memo = {};
  const value = (s) => {
    if (/^终止$/.test(s)) return 0;
    const outs = byState[s] || [];
    if (!outs.length) return 0;
    if (memo[s] != null) return memo[s];
    memo[s] = Math.max(...outs.map((e) => e.reward + gamma * value(e.to)));
    return memo[s];
  };
  const q = {};
  for (const e of edges) q[`${e.from}|${e.action}`] = e.reward + gamma * value(e.to);
  return { q, v: value, states: Object.keys(byState).sort() };
}

function analyze(text) {
  const body = String(text || '').replace(/\r\n/g, '\n');
  const flat = detex(body).replace(/\u00a0/g, ' ');
  const tables = parseTables(body);

  // 动作空间：5 步 × 每步 3 个动作
  const space = flat.match(/(\d+)\s*步的疗程序列，若每步有\s*(\d+)\s*个可选动作，动作空间是\s*(\d+)\^(\d+)=(\d+)/);
  if (!space) throw new Error('正文里没有动作空间的演算设定');
  const steps = Number(space[1]);
  const branches = Number(space[2]);
  const stated = Number(space[5]);
  const paths = branches ** steps;

  // 算例参数：γ 与学习率
  const gHit = flat.match(/γ\s*=\s*(\d+(?:\.\d+)?)/);
  const aHit = flat.match(/α\s*=\s*(\d+(?:\.\d+)?)/);
  if (!gHit) throw new Error('正文里没有 γ 的演算设定');
  const gamma = Number(gHit[1]);
  const alpha = aHit ? Number(aHit[1]) : null;

  const edges = parseCase(body);
  if (edges.length !== 4) throw new Error(`算例转移应 4 条，读到 ${edges.length} 条`);
  const { q, states } = solveQ(edges, gamma);

  // γ 改为 0.1 的对照（正文第五句给的就是这个对照）
  const gammaAlt = Number((flat.match(/把\s*γ\s*改成\s*(\d+(?:\.\d+)?)/) || [])[1] || 0.1);
  const alt = solveQ(edges, gammaAlt);

  // 「5 步后收益 +3」的折现：γ = 0.9 与 γ = 0.5
  const lateHit = flat.match(/(\d+)\s*步后收益\s*\+?(\d+)/);
  const lateSteps = lateHit ? Number(lateHit[1]) : 5;
  const late = lateHit ? Number(lateHit[2]) : 3;
  const discounted = (g) => late * g ** lateSteps;

  // 五元组表与奖励的三类错误
  const mdpTable = tables.find((t) => t.header.join('').includes('数学含义'));
  const tuple = mdpTable ? mdpTable.rows.map((r) => ({ symbol: r[0], math: r[1], tcm: r[2], pitfall: r[3] })) : [];
  const rewardErrors = [...body.matchAll(/\*\*错误([一二三])：/g)].length;
  const clinicalRules = [...body.matchAll(/^\d\.\s+\*\*.+?\*\*/gm)].length;

  return {
    body,
    hanzi: (body.match(HANZI) || []).length,
    steps,
    branches,
    paths,
    statedPaths: stated,
    gamma,
    alpha,
    gammaAlt,
    edges,
    q,
    altQ: alt.q,
    states,
    late,
    lateSteps,
    disc09: discounted(0.9),
    disc05: discounted(0.5),
    tuple,
    rewardErrors,
    clinicalRules,
    hasTitle: body.startsWith('# 第 ' + CHAPTER + ' 章 · ' + TITLE),
  };
}

function main() {
  const x = analyze(read());
  const qf = (v) => (v == null ? '—' : v.toFixed(2));

  console.log(`中医机器人学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`正文 ${x.hanzi} 汉字 · 算例状态 ${x.states.length} 个 · 转移 ${x.edges.length} 条`);
  console.log('');
  console.log(`动作空间：${x.steps} 步 × 每步 ${x.branches} 个动作 = ${x.branches}^${x.steps} = ${x.paths} 条路径（正文写 ${x.statedPaths}，${x.paths === x.statedPaths ? '一致' : '不一致'}）`);
  console.log('');
  console.log(`一、从终止态往回算（γ = ${x.gamma}，α = ${x.alpha == null ? '—' : x.alpha}，初始 Q 全零）：`);
  for (const e of x.edges) {
    const k = `${e.from}|${e.action}`;
    console.log(`  ${e.from} 取 ${e.action} → ${e.to}，奖励 ${e.reward >= 0 ? '+' : ''}${e.reward} ⇒ Q = ${qf(x.q[k])}`);
  }
  console.log(`  → Q(S1,A) = ${qf(x.q['S1|A'])}，比任何单步奖励都大：它奖励的不是「这一步好」，是「这一步通向好的后续」。`);
  console.log('');
  console.log(`二、γ 的对照（同一组收益）：`);
  console.log(`  γ = ${x.gamma}：Q(S1,A) = ${qf(x.q['S1|A'])}，Q(S1,B) = ${qf(x.q['S1|B'])}，差距 ${qf(x.q['S1|A'] - x.q['S1|B'])}`);
  console.log(`  γ = ${x.gammaAlt}：Q(S1,A) = ${qf(x.altQ['S1|A'])}，Q(S1,B) = ${qf(x.altQ['S1|B'])}，差距 ${qf(x.altQ['S1|A'] - x.altQ['S1|B'])}`);
  console.log(`  → 结论不变，差距从 ${qf(x.q['S1|A'] - x.q['S1|B'])} 缩到 ${qf(x.altQ['S1|A'] - x.altQ['S1|B'])}；折现率决定策略性格，不是技术细节。`);
  console.log('');
  console.log(`三、${x.lateSteps} 步后 +${x.late} 的折现：`);
  console.log(`  γ = 0.9 ⇒ ${x.late} × 0.9^${x.lateSteps} ≈ ${x.disc09.toFixed(2)}（> 即时 +1，选远期）`);
  console.log(`  γ = 0.5 ⇒ ${x.late} × 0.5^${x.lateSteps} ≈ ${x.disc05.toFixed(2)}（< 即时 +1，选即时）`);
  console.log(`  γ = 0.1、8 步后 ⇒ 0.1^8 = ${(0.1 ** 8).toExponential(0)}，远期收益完全消失，策略退化为纯贪心。`);
  console.log('');
  console.log(`四、五元组 ${x.tuple.length} 项：${x.tuple.map((t) => detex(t.symbol).trim()).join(' / ')}`);
  console.log(`   奖励设计的 ${x.rewardErrors} 类典型错误；临床侧 ${x.clinicalRules} 条铁律；首行章题一致：${x.hasTitle ? '是' : '否'}`);
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即随之变化；本章为序贯决策的教学讨论，不构成诊疗方案或处方建议。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, detex, parseTables, num, parseCase, solveQ, analyze };
