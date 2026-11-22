#!/usr/bin/env node
/**
 * 第 5 章 标注不够时，最贵的不是算法，是判断哪些样本值得标 —— 确定性测试
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
  parseLabelBudget,
  parseSelfTraining,
  parseActiveLearning,
  parseMix,
  parseAudit,
  detectAtLeastOne,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const doc = readDoc();
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

test('正文是补实稿，三种「没有标签」与确认偏误都在', () => {
  const hanzi = (doc.match(/[\u4e00-\u9fff]/g) || []).length;
  assert.ok(hanzi > 2500, `正文汉字过少：${hanzi}`);
  for (const k of ['纯未标注', '弱标注', '部分标注', '确认偏误', '代价与边界']) {
    assert.ok(doc.includes(k), `缺「${k}」`);
  }
  assert.ok(!/TODO|待补|占位/.test(doc));
});

test('全标工时 = 12,000 份 × 25 分钟 = 5,000 小时，与正文一致', () => {
  const b = parseLabelBudget(doc);
  assert.strictEqual(b.cases, 12000);
  assert.strictEqual(b.minutesPerCase, 25);
  assert.strictEqual((b.cases * b.minutesPerCase) / 60, b.fullHours);
  assert.strictEqual(b.fullHours, 5000);
});

test('只标 5% 是 250 小时，且折算六周左右', () => {
  const b = parseLabelBudget(doc);
  assert.strictEqual(b.partCases, 600);
  assert.strictEqual(b.partPct, 0.05);
  assert.strictEqual((b.partCases * b.minutesPerCase) / 60, b.partHours);
  assert.strictEqual(b.partHours, 250);
  assert.strictEqual(b.partCases / b.cases, 0.05);
  const weeks = b.partHours / 40;
  assert.ok(weeks > 6 && weeks < 6.5, `折算 ${weeks} 周，正文说一个人六周`);
});

test('自训练：每轮 10%、五轮，累计落在正文「40% 左右」', () => {
  const st = parseSelfTraining(doc);
  assert.strictEqual(st.perRound, 0.1);
  assert.strictEqual(st.rounds, 5);
  const added = 1 - (1 - st.perRound) ** st.rounds;
  near(added, st.quotedTotal, 0.02, '累计覆盖');
  assert.ok(added < 0.5, '累计不应过半，余量才是可撤的余地');
});

test('主动学习池子与配额读得出：600 + 11,400、每轮 50', () => {
  const al = parseActiveLearning(doc);
  assert.strictEqual(al.labelled, 600);
  assert.strictEqual(al.unlabelled, 11400);
  assert.strictEqual(al.batch, 50);
  assert.strictEqual(al.labelled + al.unlabelled, 12000);
  assert.strictEqual(300 / al.batch, 6);
});

test('70/30 配比在每轮 50 份上拆成 35 与 15', () => {
  const mix = parseMix(doc);
  assert.strictEqual(mix.uncertain, 0.7);
  assert.strictEqual(mix.random, 0.3);
  const al = parseActiveLearning(doc);
  assert.strictEqual(al.batch * mix.uncertain, 35);
  assert.strictEqual(al.batch * mix.random, 15);
  assert.strictEqual(mix.uncertain + mix.random, 1);
});

test('抽检条数与门槛读出：50 条、低于 90% 停', () => {
  const au = parseAudit(doc);
  assert.strictEqual(au.sample, 50);
  assert.strictEqual(au.floor, 0.9);
  assert.strictEqual(au.injectedError, 0.03);
});

test('抽 50 条在 3% 错误率下至少发现一条的概率约 78%', () => {
  near(detectAtLeastOne(0.03, 50), 0.782, 0.005, '检出力');
  assert.ok(detectAtLeastOne(0.1, 50) > 0.99, '10% 错误率几乎必被发现');
  assert.ok(detectAtLeastOne(0, 50) === 0, '无错误时检出力为 0');
  // 单调：错误率越高越容易发现
  const seq = [0.01, 0.03, 0.1, 0.3].map((p) => detectAtLeastOne(p, 50));
  for (let i = 1; i < seq.length; i += 1) assert.ok(seq[i] > seq[i - 1]);
});

test('脚本可运行，输出含四笔账与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /全标 5,000 小时/);
  assert.match(out, /每轮拆分：不确定性 35 条 \+ 随机 15 条/);
  assert.match(out, /不构成诊疗或数据治理建议/);
});

test('脚本不写死工时：5,000 与 250 只能由份数 × 分钟算出', () => {
  const src = fs.readFileSync(MAIN, 'utf8');
  assert.ok(!/=\s*5,?000\b/.test(src), '源码写死了全标工时');
  assert.ok(!/\b250\s*小时/.test(src), '源码写死了部分标工时');
});
