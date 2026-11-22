#!/usr/bin/env node
/**
 * 第 4 章 模型说的每一句话，都是在一个概率分布上抽的一次签 —— 确定性测试
 * 运行: node --test（在本章目录下）
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  readDoc,
  parseCombinatorics,
  parseSentenceProb,
  parseTopOneClaim,
  parseFakeRate,
  reweight,
  solveBaseTop1,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const doc = readDoc();
const sum = (a) => a.reduce((x, y) => x + y, 0);

test('正文是补实稿，温度与结构化两节都在', () => {
  const hanzi = (doc.match(/[\u4e00-\u9fff]/g) || []).length;
  assert.ok(hanzi > 2500, `正文汉字过少：${hanzi}`);
  for (const k of ['解码策略', '温度在中医问答里的实际后果', '代价与边界']) assert.ok(doc.includes(k), `缺「${k}」`);
  assert.ok(!/TODO|待补|占位/.test(doc));
});

test('组合数 $3^{60}$ 复算到 4.2×10^28 同量级', () => {
  const c = parseCombinatorics(doc);
  assert.strictEqual(c.chars, 60);
  assert.strictEqual(c.candidates, 3);
  const combos = c.candidates ** c.chars;
  const quoted = c.mantissa * 10 ** c.exponent;
  assert.ok(Math.abs(Math.log10(combos) - Math.log10(quoted)) < 0.05, `${combos} 与 ${quoted} 不同量级`);
  assert.ok(combos > 1e28 && combos < 1e29);
});

test('整句概率复算到 8.7×10^-19，说明长句概率都极小', () => {
  const sp = parseSentenceProb(doc);
  assert.strictEqual(sp.stepProb, 0.5);
  assert.strictEqual(sp.steps, 60);
  const p = sp.stepProb ** sp.steps;
  const quoted = sp.mantissa * 10 ** sp.exponent;
  assert.ok(Math.abs(p / quoted - 1) < 0.01, `整句概率 ${p} 与正文 ${quoted} 偏差过大`);
  assert.ok(p < 1e-18 && p > 1e-20);
});

test('温度重加权保持归一，T=1 是恒等变换', () => {
  const demo = [0.5, 0.3, 0.2];
  for (const T of [0.1, 0.5, 1, 2]) {
    assert.ok(Math.abs(sum(reweight(demo, T)) - 1) < 1e-12, `T=${T} 归一化失败`);
  }
  reweight(demo, 1).forEach((p, i) => assert.ok(Math.abs(p - demo[i]) < 1e-12));
});

test('温度越低 top-1 越尖：单调性在所有温度上成立', () => {
  const demo = [0.5, 0.3, 0.2];
  const temps = [0.05, 0.1, 0.2, 0.5, 1, 1.5, 2, 5];
  const tops = temps.map((T) => reweight(demo, T)[0]);
  for (let i = 1; i < tops.length; i += 1) {
    assert.ok(tops[i] < tops[i - 1], `T=${temps[i]} 的 top-1 未低于前一档`);
  }
  assert.ok(reweight(demo, 0.05)[0] > 0.999, '极低温应接近贪心');
});

test('反解「0.2 温度下 top-1 到 0.95」所需的原始 top-1 只有 0.51 上下', () => {
  const claim = parseTopOneClaim(doc);
  assert.strictEqual(claim.temperature, 0.2);
  assert.strictEqual(claim.floor, 0.95);
  const need = solveBaseTop1(claim.floor, claim.temperature, 3);
  assert.ok(need > 0.45 && need < 0.55, `反解结果 ${need} 不在预期区间`);
  // 代回验证：该 p₀ 在 T=0.2 下确实被抬到 target
  const probs = [need, (1 - need) / 2, (1 - need) / 2];
  assert.ok(Math.abs(reweight(probs, 0.2)[0] - claim.floor) < 1e-6);
});

test('原始 top-1 与等概率同量级：尖的是分布，不是判断力', () => {
  const need = solveBaseTop1(0.95, 0.2, 3);
  assert.ok(need < 2 * (1 / 3), `${need} 应小于等概率的两倍`);
});

test('格式正确但内容虚构的比例读出 5%–10%，一千条即 50–100 条', () => {
  const f = parseFakeRate(doc);
  assert.strictEqual(f.low, 0.05);
  assert.strictEqual(f.high, 0.1);
  assert.strictEqual(Math.round(f.low * 1000), 50);
  assert.strictEqual(Math.round(f.high * 1000), 100);
});

test('脚本可运行，输出含反解结论与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /组合数 3\^60 = 4\.2×10\^28/);
  assert.match(out, /演示分布为自拟教学用例/);
  assert.match(out, /不构成诊疗或技术选型建议/);
});

test('脚本不写死组合数与整句概率', () => {
  const src = fs.readFileSync(MAIN, 'utf8');
  assert.ok(!/\b4\.2e28\b/.test(src) && !/\b8\.7e-19\b/.test(src), '源码写死了天文数字');
});
