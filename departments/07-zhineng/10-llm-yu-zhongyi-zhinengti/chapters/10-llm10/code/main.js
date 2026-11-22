#!/usr/bin/env node
/**
 * 大模型与中医智能体 · 第 10 章 智能体不是一个更会说话的模型，是一个会被工具纠正的循环
 * 课程: departments/07-zhineng/10-llm-yu-zhongyi-zhinengti/chapters/10-llm10/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文现读并复算三件事：
 *   ① 成功率连乘：八步 0.95 与 0.98 的差距，以及「单步 vs 步数」哪个更值钱；
 *   ② 反解：目标整体成功率下，允许的最大步数、八步所需的最低单步成功率；
 *   ③ 上下文预算：每轮约束 token × 轮数，折合成多少次完整问答。
 * 七种失败模式与校验清单按正文表原样读出。不报任何系统实测成功率。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const readDoc = () => fs.readFileSync(DOC, 'utf8');

/** 「若每步单独成功率 0.95，八步串起来的成功率是 $0.95^8\approx0.66$」 */
function parseChainCase(text) {
  const a = text.match(/每步单独成功率\s*([\d.]+)，[^，]*串起来的成功率是\s*\$[\d.]+\^\{?(\d+)\}?\\approx([\d.]+)\$/);
  const b = text.match(/单步提到\s*([\d.]+)，整体是\s*([\d.]+)/);
  const steps = text.match(/任务需要[\u4e00-\u9fff\d]+步/);
  if (!a || !b) throw new Error('正文里没找到成功率连乘的算例');
  return {
    p: Number(a[1]),
    steps: Number(a[2]),
    quoted: Number(a[3]),
    pBetter: Number(b[1]),
    quotedBetter: Number(b[2]),
    stepsWord: steps ? steps[0] : '',
  };
}

/** 「每轮注入的约束约 150–250 token，十轮下来累计多付两次完整问答的量」 */
function parseTokenBudget(text) {
  const m = text.match(/每轮注入的约束约\s*(\d+)–(\d+)\s*token，十轮下来/);
  const r = text.match(/最近\s*(\d+)–(\d+)\s*轮/);
  if (!m || !r) throw new Error('正文里没找到上下文 token 预算或滚动窗口');
  return {
    perRound: [Number(m[1]), Number(m[2])],
    rounds: 10,
    window: [Number(r[1]), Number(r[2])],
  };
}

/** 读一张三列以上的表：以 header 里出现的第一个列名为锚 */
function readTable(text, firstHeader) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => l.startsWith('|') && l.includes(firstHeader));
  if (start < 0) throw new Error(`正文里没找到表头含「${firstHeader}」的表`);
  const rows = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    if (!lines[i].startsWith('|')) break;
    const cells = lines[i].split('|').map((c) => c.trim());
    cells.shift();
    cells.pop();
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;
    if (cells.length >= 3) rows.push(cells);
  }
  return rows;
}

const chain = (p, n) => p ** n;
const maxSteps = (target, p) => Math.floor(Math.log(target) / Math.log(p));
const requiredStep = (target, n) => target ** (1 / n);

function main() {
  const doc = readDoc();
  const c = parseChainCase(doc);
  const bud = parseTokenBudget(doc);
  const checks = readTable(doc, '检查项');
  const fails = readTable(doc, '失败模式');

  console.log('═══ 智能体不是一个更会说话的模型，是一个会被工具纠正的循环 ═══');
  console.log('');
  console.log(`一、成功率连乘（${c.steps} 步）`);
  console.log(`  ${c.p}^${c.steps} = ${chain(c.p, c.steps).toFixed(3)}（正文 ${c.quoted}）`);
  console.log(`  ${c.pBetter}^${c.steps} = ${chain(c.pBetter, c.steps).toFixed(3)}（正文 ${c.quotedBetter}）`);
  console.log('  步数 ↑ 时的整体成功率：');
  for (let n = 2; n <= 10; n += 2) {
    console.log(`    ${n} 步：${c.p} → ${chain(c.p, n).toFixed(3)} ｜ ${c.pBetter} → ${chain(c.pBetter, n).toFixed(3)}`);
  }
  console.log('');

  const target = 0.9;
  console.log(`二、同样的目标（整体 ≥ ${target}），两条路各自能做到什么`);
  console.log(`  单步 ${c.p}：最多撑到 ${maxSteps(target, c.p)} 步`);
  console.log(`  单步 ${c.pBetter}：最多撑到 ${maxSteps(target, c.pBetter)} 步 —— 单步提升两成，容纳步数并没有翻倍。`);
  console.log(`  反过来，要在 ${c.steps} 步里保住 ${target}，单步需要 ${requiredStep(target, c.steps).toFixed(4)}。`);
  console.log(`  而把 ${c.steps} 步砍到 4 步，单步 ${c.p} 就有 ${chain(c.p, 4).toFixed(3)}。`);
  console.log('  → 优化单步是线性的，减少步数是指数的：先问能不能合并步，再问每步能不能更准。');
  console.log('');

  console.log('三、上下文预算（状态外置的代价）');
  console.log(`  每轮注入约束 ${bud.perRound[0]}–${bud.perRound[1]} token × ${bud.rounds} 轮 = ${bud.perRound[0] * bud.rounds}–${bud.perRound[1] * bud.rounds} token`);
  console.log(`  按正文口径相当于多付两次完整问答 ⇒ 一次问答约 ${bud.perRound[0] * bud.rounds / 2}–${bud.perRound[1] * bud.rounds / 2} token。`);
  console.log(`  滚动窗口保留最近 ${bud.window[0]}–${bud.window[1]} 轮，更早的压成「事实清单」而不是对话摘要。`);
  console.log('');

  console.log(`四、校验清单（${checks.length} 项，每步都该过）`);
  for (const [item, pass, fail] of checks) console.log(`  ${item}：${pass}；不通过 → ${fail}`);
  console.log('');
  console.log(`五、七种失败模式（表内有 ${fails.length} 种）`);
  for (const [name, symptom, signal, fix] of fails) console.log(`  ${name}：表现「${symptom}」｜检测信号「${signal}」→ 对策：${fix}`);
  console.log('');
  console.log('※ 本章数字均从 docs/zh.md 现读现算；正文为演算设定，不对应任何实测系统；输出仅用于教学演示，不构成诊疗或系统实施建议。');
}

if (require.main === module) main();

module.exports = {
  DOC,
  readDoc,
  parseChainCase,
  parseTokenBudget,
  readTable,
  chain,
  maxSteps,
  requiredStep,
  main,
};
