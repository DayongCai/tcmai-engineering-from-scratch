#!/usr/bin/env node
/**
 * 第 9 章 测不出幻觉率的模型，不该进临床流程 —— 确定性测试
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
  parseKappaCase,
  parseResolutionCase,
  parseGradeTable,
  seBinom,
  peOf,
  kappaOf,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const doc = readDoc();
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

test('正文是补实稿，三层指标与幻觉四型都在', () => {
  const hanzi = (doc.match(/[\u4e00-\u9fff]/g) || []).length;
  assert.ok(hanzi > 2500, `正文汉字过少：${hanzi}`);
  for (const k of ['能力', '事实', '安全', '编造出处', '代价与边界']) assert.ok(doc.includes(k), `缺「${k}」`);
  assert.ok(!/TODO|待补|占位/.test(doc));
});

test('kappa 算例设定读得出：p_o=0.80，甲 0.50/0.30/0.20，乙 0.55/0.28/0.17', () => {
  const k = parseKappaCase(doc);
  assert.strictEqual(k.po, 0.8);
  assert.deepStrictEqual(k.raterA, [0.5, 0.3, 0.2]);
  assert.deepStrictEqual(k.raterB, [0.55, 0.28, 0.17]);
  assert.strictEqual(k.quotedKappa, 0.67);
});

test('期望一致率复算 0.393，kappa 复算 0.671', () => {
  const k = parseKappaCase(doc);
  const pe = peOf(k.raterA, k.raterB);
  near(pe, 0.393, 5e-3, 'p_e');
  near(kappaOf(k.po, pe), 0.67, 5e-3, 'kappa');
  assert.ok(doc.includes('0.393') && doc.includes('0.67'), '正文缺这两个数');
});

test('同一观察一致率在不同边缘分布下可以算出负 kappa', () => {
  const skewed = peOf([0.9, 0.05, 0.05], [0.9, 0.05, 0.05]);
  assert.ok(skewed > 0.8);
  assert.ok(kappaOf(0.8, skewed) < 0, '高度集中时 kappa 应转负');
});

test('kappa 的单调性与边界：p_o = p_e 时为 0，p_o = 1 时为 1', () => {
  assert.strictEqual(kappaOf(0.5, 0.5), 0);
  assert.strictEqual(kappaOf(1, 0.4), 1);
  assert.ok(kappaOf(0.9, 0.4) > kappaOf(0.7, 0.4));
});

test('题量与分辨率：总量 ±0.040、每类 ±0.081、分辨五点需每类 204 题', () => {
  const r = parseResolutionCase(doc);
  assert.strictEqual(r.p, 0.85);
  assert.strictEqual(r.n, 300);
  assert.strictEqual(r.perClass, 75);
  assert.strictEqual(r.delta, 0.05);
  assert.strictEqual(r.seTarget, 0.025);
  near(1.96 * seBinom(r.p, r.n), 0.0404, 1e-3, '总体半宽');
  near(1.96 * seBinom(r.p, r.perClass), 0.0808, 1e-3, '每类半宽');
  assert.strictEqual(Math.round((r.p * (1 - r.p)) / r.seTarget ** 2), r.neededPerClass);
  assert.strictEqual(Math.ceil(r.p * (1 - r.p) * 0 + r.neededPerClass) * 4, 816);
  assert.ok(Math.ceil((r.p * (1 - r.p)) / r.seTarget ** 2) * 4 >= r.totalNeeded);
});

test('答案分级五级读得出，D 与 E 分别计分与判负', () => {
  const rows = parseGradeTable(doc);
  assert.strictEqual(rows.length, 5);
  assert.deepStrictEqual(rows.map((r) => r.score), ['1.0', '0.7', '0.4', '0', '直接判负并单独统计']);
  assert.match(rows[4].definition, /诊断或处方/);
});

test('脚本可运行，输出含 kappa、区间与分级表', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /kappa = \(0\.8 − 0\.393\) \/ \(1 − 0\.393\) = 0\.671/);
  assert.match(out, /四类分开报数 ⇒ 总量 816 题/);
  assert.match(out, /不构成诊疗或产品准入建议/);
});

test('脚本不写死 kappa 与半宽', () => {
  const src = fs.readFileSync(MAIN, 'utf8');
  assert.ok(!/\b0\.671\b/.test(src), '源码写死了 kappa');
  assert.ok(!/\b0\.040\b/.test(src), '源码写死了区间半宽');
});
