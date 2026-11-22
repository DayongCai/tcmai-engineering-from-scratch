#!/usr/bin/env node
/**
 * 第 3 章 证候要能被检索，先得能被放进一个能算距离的空间 —— 确定性测试
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
  readTable,
  parseCloseness,
  parseAlignmentSteps,
  parseReviewCost,
  parseAcceptance,
  parseReembedTriggers,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const doc = readDoc();

test('正文是补实稿，含三节核心与边界', () => {
  const hanzi = (doc.match(/[\u4e00-\u9fff]/g) || []).length;
  assert.ok(hanzi > 2500, `正文汉字过少：${hanzi}`);
  for (const k of ['三种「近」', '术语对齐', '代价与边界']) assert.ok(doc.includes(k), `缺「${k}」`);
  assert.ok(!/TODO|待补|占位/.test(doc));
});

test('三种「近」读得出，且恰好一类不能靠嵌入', () => {
  const rows = parseCloseness(doc);
  assert.strictEqual(rows.length, 3);
  assert.deepStrictEqual(rows.map((r) => r.relation), ['字面近', '语义近', '临床等价']);
  const noEmbed = rows.filter((r) => /不能/.test(r.byEmbedding));
  assert.strictEqual(noEmbed.length, 1, '应当只有一类标「不能」');
  assert.strictEqual(noEmbed[0].relation, '临床等价');
  assert.match(noEmbed[0].byEmbedding, /术语表/);
});

test('字面近与语义近的「能」有强弱之别，不被压成同一档', () => {
  const rows = parseCloseness(doc);
  const literal = rows.find((r) => r.relation === '字面近');
  const semantic = rows.find((r) => r.relation === '语义近');
  assert.match(literal.byEmbedding, /过度/);
  assert.match(semantic.byEmbedding, /部分/);
});

test('对齐四步表读得出，四个步骤名一个不缺', () => {
  const steps = parseAlignmentSteps(doc);
  assert.strictEqual(steps.length, 4);
  assert.deepStrictEqual(steps.map((s) => s.step), ['抽取候选', '自动预分类', '专家裁定', '落库与回归']);
  for (const s of steps) {
    assert.ok(s.output && s.output.length > 2, `${s.step} 缺产出`);
    assert.ok(s.effort && s.effort.length > 1, `${s.step} 缺工作量`);
  }
});

test('专家裁定工作量复算为 25 小时，与正文口径一致', () => {
  const c = parseReviewCost(doc);
  assert.strictEqual(c.clusters, 1000);
  assert.strictEqual(c.minutesPerCluster, 1.5);
  assert.strictEqual((c.clusters * c.minutesPerCluster) / 60, c.quotedHours);
  assert.strictEqual(c.quotedHours, 25);
});

test('同一正文的两种折算口径都能算出来，且差 5 小时', () => {
  const c = parseReviewCost(doc);
  const byMinute = (c.clusters * c.minutesPerCluster) / 60;
  const byHundred = (c.clusters / c.per100) * c.hoursPer100;
  assert.strictEqual(byHundred, 20);
  assert.strictEqual(Math.abs(byMinute - byHundred), 5);
  assert.ok(doc.includes('每 100 簇约 2 小时'), '正文缺「每 100 簇约 2 小时」');
});

test('验收三项的阈值都能读出：30–50 查询、Top-10、三成、100 对', () => {
  const a = parseAcceptance(doc);
  assert.deepStrictEqual(a.queries, [30, 50]);
  assert.strictEqual(a.topK, 10);
  assert.strictEqual(a.badShare, 0.3);
  assert.strictEqual(a.synonymPairs, 100);
  assert.strictEqual(a.regressCases, 50);
  assert.ok(doc.includes('超过三成'), '正文缺「超过三成」这道门槛');
});

test('重嵌入是触发条件，不是日历：20% 语料与 5 个百分点', () => {
  const t = parseReembedTriggers(doc);
  assert.strictEqual(t.corpusGrowth, 0.2);
  assert.strictEqual(t.metricDrop, 0.05);
  assert.ok(doc.includes('版本号'), '正文缺版本号要求');
});

test('表格读取器只吃表体，不把表头与分隔行算成数据', () => {
  const rows = readTable(doc, '关系');
  assert.ok(rows.every((r) => !r.some((c) => /^:?-{2,}:?$/.test(c))), '分隔行混进了数据');
  assert.ok(rows.every((r) => r[0] !== '关系'), '表头混进了数据');
});

test('脚本可运行，输出含三种近、四步、三项验收与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /嵌入能覆盖 2 类，术语表负责 1 类：临床等价/);
  assert.match(out, /专家裁定按 1,000 簇 × 1\.5 分钟 = 25 小时/);
  assert.match(out, /不构成诊疗或术语规范解释/);
});

test('脚本不写死结论：25 小时只能由簇数 × 分钟数算出', () => {
  const src = fs.readFileSync(MAIN, 'utf8');
  assert.ok(!/=\s*25\s*小时/.test(src), '源码写死了 25 小时');
});
