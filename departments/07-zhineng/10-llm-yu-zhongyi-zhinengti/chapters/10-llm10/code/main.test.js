#!/usr/bin/env node
/**
 * 第 10 章 智能体不是一个更会说话的模型，是一个会被工具纠正的循环 —— 确定性测试
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
  parseChainCase,
  parseTokenBudget,
  readTable,
  chain,
  maxSteps,
  requiredStep,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const doc = readDoc();
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

test('正文是补实稿，四拍循环与七种失败模式都在', () => {
  const hanzi = (doc.match(/[\u4e00-\u9fff]/g) || []).length;
  assert.ok(hanzi > 2500, `正文汉字过少：${hanzi}`);
  for (const k of ['校验', '静默降级', '状态外置', '代价与边界']) assert.ok(doc.includes(k), `缺「${k}」`);
  assert.ok(!/TODO|待补|占位稿/.test(doc));
});

test('八步连乘复算：0.95^8≈0.66、0.98^8≈0.85', () => {
  const c = parseChainCase(doc);
  assert.strictEqual(c.p, 0.95);
  assert.strictEqual(c.pBetter, 0.98);
  assert.strictEqual(c.steps, 8);
  near(chain(c.p, c.steps), c.quoted, 5e-3, '0.95 的八步');
  near(chain(c.pBetter, c.steps), c.quotedBetter, 5e-3, '0.98 的八步');
  assert.ok(chain(c.p, c.steps) < 0.7 && chain(c.p, c.steps) > 0.6);
});

test('连乘随步数单调下降，且每加一步的损失递减', () => {
  const seq = [2, 4, 6, 8, 10].map((n) => chain(0.95, n));
  for (let i = 1; i < seq.length; i += 1) assert.ok(seq[i] < seq[i - 1]);
  const drop1 = seq[0] - seq[1];
  const drop2 = seq[1] - seq[2];
  assert.ok(drop1 > drop2, '边际损失应递减（指数衰减）');
});

test('整体目标 0.9 下：0.95 撑两步、0.98 撑五步', () => {
  assert.strictEqual(maxSteps(0.9, 0.95), 2);
  assert.strictEqual(maxSteps(0.9, 0.98), 5);
  assert.ok(maxSteps(0.9, 0.98) <= 2 * maxSteps(0.9, 0.95) + 1, '容纳步数并未随单步提升而翻倍');
});

test('八步保住 0.9 需单步 0.9869；砍到四步只需 0.95', () => {
  near(requiredStep(0.9, 8), 0.9869, 5e-4, '八步所需单步');
  assert.ok(chain(0.95, 4) > 0.8, '四步时 0.95 已足够');
  assert.ok(requiredStep(0.9, 8) > 0.98, '八步所需单步高于正文的第二档');
});

test('上下文预算：150–250 token × 10 轮 = 1500–2500', () => {
  const b = parseTokenBudget(doc);
  assert.deepStrictEqual(b.perRound, [150, 250]);
  assert.strictEqual(b.rounds, 10);
  assert.deepStrictEqual(b.window, [4, 6]);
  assert.strictEqual(b.perRound[0] * b.rounds, 1500);
  assert.strictEqual(b.perRound[1] * b.rounds, 2500);
});

test('校验清单五项与失败模式七种都读得出', () => {
  const checks = readTable(doc, '检查项');
  const fails = readTable(doc, '失败模式');
  assert.strictEqual(checks.length, 5);
  assert.strictEqual(fails.length, 7);
  assert.deepStrictEqual(checks.map((r) => r[0]), ['返回非空', '格式合法', '关键字段在', '与已知矛盾', '引用可核']);
  assert.deepStrictEqual(fails.map((r) => r[0]), ['步数耗尽', '工具误用', '目标漂移', '循环依赖', '过早收敛', '依据虚置', '静默降级']);
  for (const r of fails) assert.strictEqual(r.length, 4, `${r[0]} 应有四列`);
});

test('脚本可运行，输出含连乘、反解与七种模式', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /0\.95\^8 = 0\.663（正文 0\.66）/);
  assert.match(out, /单步 0\.98：最多撑到 5 步/);
  assert.match(out, /表内有 7 种/);
  assert.match(out, /不构成诊疗或系统实施建议/);
});

test('脚本不写死连乘结果', () => {
  const src = fs.readFileSync(MAIN, 'utf8');
  assert.ok(!/0\.663/.test(src), '源码写死了 0.95^8');
  assert.ok(!/0\.851/.test(src), '源码写死了 0.98^8');
});
