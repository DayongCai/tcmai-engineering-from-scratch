#!/usr/bin/env node
/**
 * 第 6 章 泛化不是模型的本事，是假设与问题凑巧对上了 —— 确定性测试
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
  parseShiftStory,
  parseGeneralizationBound,
  parseStandardError,
  parseResolution,
  parseMinorityCase,
  seBinom,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const doc = readDoc();
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

test('正文是补实稿，四种偏移与五种泄漏都在', () => {
  const hanzi = (doc.match(/[\u4e00-\u9fff]/g) || []).length;
  assert.ok(hanzi > 2500, `正文汉字过少：${hanzi}`);
  for (const k of ['医师偏移', '年代偏移', '评测集泄漏', '代价与边界']) assert.ok(doc.includes(k), `缺「${k}」`);
  assert.ok(!/TODO|待补|占位/.test(doc));
});

test('同源 0.91 与换人 0.72 的落差读得出，是 19 个百分点', () => {
  const s = parseShiftStory(doc);
  assert.strictEqual(s.sameSource, 0.91);
  assert.strictEqual(s.shifted, 0.72);
  assert.strictEqual(s.newDoctor, 4);
  assert.strictEqual(s.newCases, 200);
  assert.strictEqual(s.doctors, 3);
  near((s.sameSource - s.shifted) * 100, 19, 1e-9, '落差');
});

test('泛化界 √(C/n) 复算为 1.12，且大于一即无约束力', () => {
  const b = parseGeneralizationBound(doc);
  assert.strictEqual(b.capacity, 1000);
  assert.strictEqual(b.samples, 800);
  near(Math.sqrt(b.capacity / b.samples), b.quoted, 5e-3, '界');
  assert.ok(Math.sqrt(b.capacity / b.samples) > 1, '这个规模上的界应当大于一');
});

test('标准误复算 0.0212，95% 区间与正文 0.859–0.941 一致到千分位', () => {
  const s = parseStandardError(doc);
  assert.strictEqual(s.n, 200);
  assert.strictEqual(s.p, 0.9);
  near(seBinom(s.p, s.n), s.seQuoted, 5e-4, '标准误');
  near(s.p - 1.96 * seBinom(s.p, s.n), s.ciLow, 5e-3, '区间下界');
  near(s.p + 1.96 * seBinom(s.p, s.n), s.ciHigh, 5e-3, '区间上界');
  assert.ok(doc.includes('0.859–0.941'), '正文缺区间原文');
});

test('SE≈0.01 反推样本量得 900，与正文一致', () => {
  const res = parseResolution(doc);
  const s = parseStandardError(doc);
  assert.strictEqual(res.deltaPoints, 2);
  assert.strictEqual(res.needed, 900);
  assert.strictEqual(Math.round((s.p * (1 - s.p)) / 0.01 ** 2), res.needed);
});

test('标准误随样本量下降：n 翻四倍，SE 减半', () => {
  near(seBinom(0.9, 800), seBinom(0.9, 200) / 2, 1e-12, '开方关系');
});

test('小类 12 例错 2 例，比率 0.833；再多错两例即跌到 0.667', () => {
  const m = parseMinorityCase(doc);
  assert.strictEqual(m.cases, 12);
  assert.strictEqual(m.errors, 2);
  near((m.cases - m.errors) / m.cases, m.quotedLo, 5e-3, '比率');
  near((m.cases - m.errors - 2) / m.cases, 0.667, 1e-3, '再错两例');
  assert.strictEqual(m.quotedHi, 1.0);
});

test('脚本可运行，输出含四块现算与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /落差 0\.19 = 19 个百分点/);
  assert.match(out, /界 1\.12 > 1/);
  assert.match(out, /不构成诊疗或系统验收建议/);
});

test('脚本不写死落差点数与样本量', () => {
  const src = fs.readFileSync(MAIN, 'utf8');
  assert.ok(!/\b0\.19\b/.test(src), '源码写死了落差');
  assert.ok(!/\b900\b/.test(src), '源码写死了所需样本量');
});
