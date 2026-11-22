#!/usr/bin/env node
/**
 * 大模型与中医智能体 · 第 4 章 模型说的每一句话，都是在一个概率分布上抽的一次签
 * 课程: departments/07-zhineng/10-llm-yu-zhongyi-zhinengti/chapters/04-llm4/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文现读三组量并复算：
 *   ① 链式分解：每步候选数 ^ 句长（组合数）、每步概率 ^ 步数（整句概率）
 *   ② 温度重加权：p_i^(1/T) 归一化；并由「0.2 温度下 top-1 可推到 0.95 以上」反解
 *      需要多高的原始 top-1 —— 这一步恰好说明「稳定」不等于「正确」
 *   ③ 只做提示层结构化时会漏过的虚构比例
 * 不引入任何模型的实测分数，也不点名任何模型。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

const readDoc = () => fs.readFileSync(DOC, 'utf8');

/** 「一句 60 字…每步有 3 个…组合是 $3^{60}$，约 $4.2\times10^{28}$ 条」 */
function parseCombinatorics(text) {
  const len = text.match(/一句\s*(\d+)\s*字的中医问答/);
  const cand = text.match(/每一步有\s*(\d+)\s*个看似都通顺的候选/);
  const total = text.match(/\$(\d+)\^\{(\d+)\}\$，约\s*\$([\d.]+)\\times10\^\{(\d+)\}\$/);
  if (!len || !cand || !total) throw new Error('正文里没找到「句长 / 候选数 / 组合数」这一句');
  return {
    chars: Number(len[1]),
    candidates: Number(cand[1]),
    mantissa: Number(total[3]),
    exponent: Number(total[4]),
  };
}

/** 「每步 0.5 的概率，60 步之后是 $0.5^{60}\approx8.7\times10^{-19}$」 */
function parseSentenceProb(text) {
  const m = text.match(/\$([\d.]+)\^\{(\d+)\}\\approx([\d.]+)\\times10\^\{(-?\d+)\}/);
  if (!m) throw new Error('正文里没找到「每步概率 ^ 步数 ≈ 整句概率」这一句');
  return { stepProb: Number(m[1]), steps: Number(m[2]), mantissa: Number(m[3]), exponent: Number(m[4]) };
}

/** 「温度 0.2 时 top-1 概率可被推到 0.95 以上」 */
function parseTopOneClaim(text) {
  const m = text.match(/温度\s*([\d.]+)\s*时 top-1 概率可被推到\s*([\d.]+)\s*以上/);
  if (!m) throw new Error('正文里没找到「温度 / top-1 被推到」这一句');
  return { temperature: Number(m[1]), floor: Number(m[2]) };
}

/** 「在 5%–10% 的样本上返回格式正确、内容虚构的结果」 */
function parseFakeRate(text) {
  const m = text.match(/(\d+)%–(\d+)%\s*的样本上返回格式正确、内容虚构/);
  if (!m) throw new Error('正文里没找到「格式正确、内容虚构」的比例');
  return { low: Number(m[1]) / 100, high: Number(m[2]) / 100 };
}

/** 温度重加权：p_i^(1/T) 归一化；T→0 时取 argmax（用极小温度近似） */
function reweight(probs, T) {
  const t = Math.max(T, 1e-9);
  const w = probs.map((p) => Math.pow(p, 1 / t));
  const z = w.reduce((a, b) => a + b, 0);
  return w.map((x) => x / z);
}

/** 取 k 个候选、top-1 为 p₀、其余均分，求「T 温度下 top-1 达到 target」所需的 p₀ */
function solveBaseTop1(target, T, k = 3) {
  const top1 = (p0) => {
    const probs = [p0, ...new Array(k - 1).fill((1 - p0) / (k - 1))];
    return reweight(probs, T)[0];
  };
  let lo = 1 / k;
  let hi = 0.999999;
  for (let i = 0; i < 200; i += 1) {
    const mid = (lo + hi) / 2;
    if (top1(mid) < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

const sci = (x) => {
  const e = Math.floor(Math.log10(Math.abs(x)));
  return `${(x / 10 ** e).toFixed(1)}×10^${e}`;
};

function main() {
  const doc = readDoc();
  const c = parseCombinatorics(doc);
  const sp = parseSentenceProb(doc);
  const claim = parseTopOneClaim(doc);
  const fake = parseFakeRate(doc);

  const combos = c.candidates ** c.chars;
  const sentenceP = sp.stepProb ** sp.steps;

  console.log('═══ 模型说的每一句话，都是在一个概率分布上抽的一次签 ═══');
  console.log('');

  console.log(`一、链式分解（正文：${c.chars} 字 × 每步 ${c.candidates} 个候选）`);
  console.log(`  组合数 ${c.candidates}^${c.chars} = ${sci(combos)}（正文约 ${c.mantissa}×10^${c.exponent}）`);
  console.log(`  同量级判断：${Math.abs(Math.log10(combos) - (Math.log10(c.mantissa) + c.exponent)) < 0.05 ? '一致' : '不一致'}`);
  console.log(`  整句概率 ${sp.stepProb}^${sp.steps} = ${sci(sentenceP)}（正文约 ${sp.mantissa}×10^${sp.exponent}）`);
  console.log(`  每步 ${sp.stepProb} 的概率，${sp.steps} 步就跌到 ${sci(sentenceP)} —— 所有长句概率都极小，比它们等于比噪声。`);
  console.log('');

  console.log('二、温度只改形状，不改对错');
  const demo = [0.5, 0.3, 0.2];
  console.log(`  演示分布（自拟，非正文数据）：[${demo.join(', ')}]`);
  for (const T of [0.1, 0.2, 0.7, 1.0, 1.5]) {
    const p = reweight(demo, T);
    console.log(`  T=${T.toFixed(1)} → [${p.map((x) => x.toFixed(3)).join(', ')}]  top-1 ${(p[0] * 100).toFixed(1)}%`);
  }
  console.log(`  T 越小 top-1 越尖；T=1 时与原分布相同；归一化后概率和为 ${reweight(demo, 1).reduce((a, b) => a + b, 0).toFixed(12)}。`);
  console.log('');

  const need = solveBaseTop1(claim.floor, claim.temperature, c.candidates);
  console.log(`三、正文说「温度 ${claim.temperature} 时 top-1 可被推到 ${claim.floor} 以上」`);
  console.log(`  按 ${c.candidates} 个候选、其余均分反解：原始 top-1 只需 ${need.toFixed(3)} 即可被抬到 ${claim.floor}`);
  console.log(`  ${need.toFixed(2)} 与等概率（${(1 / c.candidates).toFixed(3)}）处在同一量级 —— 尖的是分布，不是判断力。`);
  console.log(`  所以「同一问题每次答案一样」只说明它稳定；稳定与正确来自两个不同的来源。`);
  console.log('');

  console.log('四、只做提示层结构化的漏网率（同一句现读）：');
  console.log(`  ${(fake.low * 100).toFixed(0)}%–${(fake.high * 100).toFixed(0)}% 的样本格式正确、内容虚构`);
  console.log(`  一千条抽样即 ${Math.round(fake.low * 1000)}–${Math.round(fake.high * 1000)} 条；它们最难被发现，因为长得像正常输出。`);
  console.log('  对策顺序：提示给模式 → 受限解码 → 输出后校验（不过就拒收，不「尽力修正」）。');
  console.log('');
  console.log('※ 本章数字均从 docs/zh.md 现读现算；演示分布为自拟教学用例；输出仅用于教学演示，不构成诊疗或技术选型建议。');
}

if (require.main === module) main();

module.exports = {
  DOC,
  readDoc,
  parseCombinatorics,
  parseSentenceProb,
  parseTopOneClaim,
  parseFakeRate,
  reweight,
  solveBaseTop1,
  main,
};
