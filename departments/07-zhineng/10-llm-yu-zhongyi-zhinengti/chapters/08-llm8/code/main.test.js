#!/usr/bin/env node
/**
 * 第 8 章 对齐不是让模型更聪明，是让它在该停的地方停 —— 确定性测试
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
  parseOverreach,
  parseAlignmentTax,
  parsePreferenceAgreement,
  parseAuditSize,
  parseRefusalTable,
  seBinom,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const doc = readDoc();
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

test('正文是补实稿，三种信号与拒答分级都在', () => {
  const hanzi = (doc.match(/[\u4e00-\u9fff]/g) || []).length;
  assert.ok(hanzi > 2500, `正文汉字过少：${hanzi}`);
  for (const k of ['监督微调', '偏好优化', '拒答的边界', '代价与边界']) assert.ok(doc.includes(k), `缺「${k}」`);
  assert.ok(!/TODO|待补|占位/.test(doc));
});

test('越权率 7/100，与其抽样区间可复算', () => {
  const o = parseOverreach(doc);
  assert.strictEqual(o.dialogues, 100);
  assert.strictEqual(o.overreach, 7);
  const p = o.overreach / o.dialogues;
  near(p, 0.07, 1e-12, '越权率');
  const se = seBinom(p, o.dialogues);
  assert.ok(p - 1.96 * se > 0 && p + 1.96 * se < 0.2, '区间应落在 0–20% 之间');
  near(1.96 * se, 0.05, 5e-3, '半宽约五个点');
});

test('对齐税与抽检量读得出：3 个点、100 条', () => {
  assert.strictEqual(parseAlignmentTax(doc), 3);
  assert.strictEqual(parseAuditSize(doc), 100);
});

test('偏好一致性 200 对 × 0.65 = 一致 130 对、分歧 70 对', () => {
  const p = parsePreferenceAgreement(doc);
  assert.strictEqual(p.pairs, 200);
  near(p.agreement, 0.65, 1e-9, '一致率');
  assert.strictEqual(Math.round(p.pairs * p.agreement), 130);
  assert.strictEqual(p.pairs - 130, 70);
});

test('拒答分级表读得出五档，个体化建议与剂量是硬边界', () => {
  const rows = parseRefusalTable(doc);
  assert.strictEqual(rows.length, 5);
  assert.deepStrictEqual(rows.map((r) => r.should), ['直接答', '答＋给出处', '给候选＋标注不确定＋提示面诊', '拒答＋转人工', '拒答']);
  assert.match(rows[3].note, /处方权/);
  assert.match(rows[4].note, /安全/);
  assert.match(rows[0].note, /教学性质/);
});

test('分层拒答率的落差：有区分能力 100 点，一律保守 0 点', () => {
  const counts = [40, 30, 20, 8, 2];
  const good = [0, 0, 4, 8, 2];
  const rate = good.map((x, i) => x / counts[i]);
  assert.strictEqual(rate[0], 0);
  assert.strictEqual(rate[3], 1);
  assert.strictEqual(rate[3] - rate[0], 1);
  assert.strictEqual(good.reduce((a, b) => a + b, 0), 14);
});

test('标准误随 n 增大而减小，样本一百时半宽约五个点', () => {
  assert.ok(seBinom(0.07, 400) < seBinom(0.07, 100));
  near(seBinom(0.07, 100), 0.0255, 1e-3, 'SE');
});

test('脚本可运行，输出含越权率、分级表与区分能力对比', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /100 次对话中 7 次越界 ⇒ 7%/);
  assert.match(out, /分层落差（个体化建议 − 概念解释）：有区分能力 100 点，一律保守 0 点/);
  assert.match(out, /不构成诊疗、用药或产品合规建议/);
});

test('脚本不写死越权率与一致对数', () => {
  const src = fs.readFileSync(MAIN, 'utf8');
  assert.ok(!/\b130\b/.test(src), '源码写死了一致对数');
  assert.ok(!/\b7\s*%/.test(src), '源码写死了越权率');
});
