#!/usr/bin/env node
/**
 * 管理心理学 · 第 8 章 激励失效，几乎总是三处之一断了：不信、不值、不公平
 * 课程: departments/06-guanli/18-guanli-xinli-xue/chapters/08-p8/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章把「激励不动」当作可定位的故障。脚本实现四件可算的东西：
 *   1. M = 期望 × 工具性 × 效价，并指出哪一项最弱；
 *   2. 「只加奖金」的边际效果：总量 +12% 只改效价，看乘积变多少；
 *   3. 公平比值（自身产投比 / 参照对象）与五种恢复策略；
 *   4. 绩效 = 能力 × 动机 × 机会：任一项为零则整体为零，先排查再归因。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 8;
const TITLE = '激励失效，几乎总是三处之一断了：不信、不值、不公平';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function sections(text) {
  return String(text || '')
    .split('\n')
    .filter((l) => /^##\s+/.test(l))
    .map((l) => l.replace(/^##\s+/, '').trim());
}

const CONTENT = ['马斯洛', '赫茨伯格', '麦克利兰', '奥尔德弗'];
const PROCESS = ['期望理论', '公平理论', '目标设置理论', '自我决定理论'];
const HYGIENE = ['公司政策与管理方式', '监督', '工作条件', '人际关系', '薪酬', '地位', '工作保障'];
const MOTIVATORS = ['成就', '认可', '工作本身的挑战与意义', '责任', '晋升与成长'];
const RESTORE = ['降低投入', '提高产出', '换参照对象', '扭曲认知', '离开组织'];

function concepts(text) {
  const t = String(text || '');
  return {
    content: CONTENT.filter((x) => t.includes(x)),
    process: PROCESS.filter((x) => t.includes(x)),
    hygiene: HYGIENE.filter((x) => t.includes(x)),
    motivators: MOTIVATORS.filter((x) => t.includes(x)),
    restore: RESTORE.filter((x) => t.includes(x)),
  };
}

/**
 * 期望理论：M = E × I × V。三项都按 0—1 计。
 * 任何一项接近零，乘积就趋近零——这就是「加钱没用」的算理。
 */
function motivation({ expectancy, instrumentality, valence }) {
  const E = expectancy;
  const I = instrumentality;
  const V = valence;
  const parts = [
    { k: '期望', v: E, q: '我努力了能不能做到' },
    { k: '工具性', v: I, q: '做到了能不能得到' },
    { k: '效价', v: V, q: '得到的东西对我重不重要' },
  ].sort((a, b) => a.v - b.v);
  return {
    m: Number((E * I * V).toFixed(4)),
    weakest: parts[0].k,
    weakestQ: parts[0].q,
    parts,
    verdict: E * I * V < 0.1 ? '乘积很小：先修最弱的一环，加钱无效' : E * I * V < 0.3 ? '中等：仍有明显短板' : '激励链条基本通畅',
  };
}

/**
 * 只加奖金：效价按比例提高，期望与工具性不动。
 * 用于验证「+12% 总量」为什么带不动离职率。
 */
function raiseOnly(base, raise = 0.12) {
  const now = motivation({ ...base, valence: Math.min(1, base.valence * (1 + raise)) });
  const before = motivation(base);
  return {
    before: before.m,
    after: now.m,
    delta: Number((now.m - before.m).toFixed(4)),
    note: '效价提高，期望与工具性未动；乘法结构下边际收益被短板压住',
  };
}

/** 公平比值：自身产投比相对参照对象 */
function equity(ownOut, ownIn, refOut, refIn) {
  const own = ownOut / ownIn;
  const ref = refOut / refIn;
  const ratio = Number((own / ref).toFixed(4));
  return {
    own: Number(own.toFixed(4)),
    ref: Number(ref.toFixed(4)),
    ratio,
    state: ratio < 0.95 ? '欠酬不公平' : ratio > 1.05 ? '过酬不公平' : '公平',
    strategies: ratio < 0.95 ? RESTORE.slice() : [],
  };
}

/** 绩效的乘法结构：任一项为零则整体为零 */
function performance({ ability, motivation: m, opportunity }) {
  const p = ability * m * opportunity;
  const zeros = [
    ['能力', ability],
    ['动机', m],
    ['机会', opportunity],
  ].filter(([, v]) => v <= 0).map(([k]) => k);
  return {
    value: Number(p.toFixed(4)),
    zeros,
    verdict: zeros.length ? `先查${zeros.join('、')}，不要先归因于不够努力` : '三项均不为零，可按短板排序改进',
  };
}

/** 耶克斯—多德森：倒 U 型，峰值随任务复杂度左移 */
function arousal(level, complexity = 0.5) {
  const peak = 0.7 - 0.4 * complexity;
  const perf = 1 - Math.pow((level - peak) / 0.6, 2);
  return { level, peak: Number(peak.toFixed(2)), performance: Number(Math.max(0, perf).toFixed(3)) };
}

function main() {
  const text = read();
  const c = concepts(text);
  const hanzi = (text.match(HANZI) || []).length;
  const base = { expectancy: 0.35, instrumentality: 0.4, valence: 0.9 };
  const m = motivation(base);
  const r = raiseOnly(base);

  console.log(`管理心理学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${hanzi} 字 · 节 ${sections(text).length} 节`);
  console.log(`内容型 ${c.content.length}/4：${c.content.join(' · ')}`);
  console.log(`过程型 ${c.process.length}/4：${c.process.join(' · ')}`);
  console.log(`保健因素 ${c.hygiene.length}/7｜激励因素 ${c.motivators.length}/5`);
  console.log('');
  console.log(`期望理论：M = ${base.expectancy} × ${base.instrumentality} × ${base.valence} = ${m.m}`);
  console.log(`  最弱一环：${m.weakest}（${m.weakestQ}）→ ${m.verdict}`);
  console.log(`  只加奖金 12%：${r.before} → ${r.after}（+${r.delta}）——${r.note}`);
  console.log('');
  const eq = equity(100, 10, 120, 10);
  console.log(`公平比值：自身 ${eq.own} ÷ 参照 ${eq.ref} = ${eq.ratio} → ${eq.state}`);
  console.log(`  恢复策略 ${eq.strategies.length} 种：${eq.strategies.join(' · ')}`);
  console.log('');
  console.log(`绩效（能力 0.9 × 动机 0.8 × 机会 0）= ${performance({ ability: 0.9, motivation: 0.8, opportunity: 0 }).value}`);
  console.log(`  → ${performance({ ability: 0.9, motivation: 0.8, opportunity: 0 }).verdict}`);
  console.log('');
  console.log(`倒 U 型：简单任务峰值 ${arousal(0.5, 0.1).peak}，复杂任务峰值 ${arousal(0.5, 0.9).peak}`);
  console.log('  → 复杂精细的劳动，加压反而出错；简单熟练的任务，适度加压有效。');
  console.log('');
  console.log('边界：本章不给薪酬方案；理论是概率命题，用它给人贴标签是这类知识最常见的滥用。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, sections, concepts, motivation, raiseOnly, equity, performance, arousal, CONTENT, PROCESS, HYGIENE, MOTIVATORS, RESTORE };

// 教学边界：口径只在正文维护一份，这里直接摘正文里含「不构成」的那一行。
try {
  const _zh = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'docs', 'zh.md'), 'utf8');
  const _bound = (_zh.match(/[^\n]*不构成[^\n]*/) || [])[0];
  if (_bound) {
    console.log(`\n教学边界：${_bound.replace(/^[>\s*#-]+/, '').trim().slice(0, 120)}`);
  }
} catch { /* 读不到正文就不打，不编一句 */ }
