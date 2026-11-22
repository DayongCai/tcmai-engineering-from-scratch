#!/usr/bin/env node
/**
 * 第 12 章 模型可以生成建议，但不能承担责任——所以它不能给建议 —— 确定性测试
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
  parseAdoption,
  parseReviewPolicy,
  readTable,
  RULES,
  checkHardRules,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const doc = readDoc();
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

test('正文是补实稿，三条硬规则与十二项清单都在', () => {
  const hanzi = (doc.match(/[\u4e00-\u9fff]/g) || []).length;
  assert.ok(hanzi > 2500, `正文汉字过少：${hanzi}`);
  for (const k of ['不做诊断', '不开处方', '不承诺疗效', '责任链', '代价与边界']) assert.ok(doc.includes(k), `缺「${k}」`);
  assert.ok(!/TODO|待补|占位稿/.test(doc));
});

test('留痕量级：800 次 × 1% 采纳 = 8 条/日，1% 错误一年约 20 条（250 工作日）', () => {
  const a = parseAdoption(doc);
  assert.strictEqual(a.callsPerDay, 800);
  assert.strictEqual(a.adoptRate, 0.01);
  assert.strictEqual(a.adoptedPerDay, 8);
  assert.strictEqual(a.errorRate, 0.01);
  near(a.adoptedPerDay * a.errorRate * 250, a.annualQuoted, 1, '年条数');
  near(a.callsPerDay * a.adoptRate, a.adoptedPerDay, 1e-9, '采纳条数');
});

test('按自然日计会更多，正文口径隐含工作日假设', () => {
  const a = parseAdoption(doc);
  const byYear = a.adoptedPerDay * a.errorRate * 365;
  assert.ok(byYear > a.annualQuoted, '自然日口径应更大');
  assert.strictEqual(Math.round(byYear), 29);
});

test('复核比例与运维日志期限读得出：100%/20%、30 天', () => {
  const p = parseReviewPolicy(doc);
  assert.strictEqual(p.firstMonth, 1);
  assert.strictEqual(p.later, 0.2);
  assert.strictEqual(p.opsLogDays, 30);
});

test('责任链四环、复核四检查点、清单十二项', () => {
  const chain = readTable(doc, '环节');
  const review = readTable(doc, '检查点');
  const list = readTable(doc, '项');
  assert.deepStrictEqual(chain.map((r) => r[0]), ['知识来源', '系统生成', '人工复核', '归档使用']);
  assert.strictEqual(review.length, 4);
  assert.strictEqual(list.length, 12);
  assert.strictEqual(list[0][0], '1');
  assert.strictEqual(list[11][0], '12');
  assert.match(list[5][1] + list[5][2], /candidates/);
});

test('三不做检测器：合规输出放行', () => {
  const v = checkHardRules('可参考的条目：太阳中风见恶风、汗出、脉浮缓；本条仅基于文字描述，未含舌脉。');
  assert.strictEqual(v.ok, true);
  assert.deepStrictEqual(v.violations, []);
});

test('三不做检测器：下诊断被拦', () => {
  const v = checkHardRules('您这是脾气虚证。');
  assert.strictEqual(v.ok, false);
  assert.deepStrictEqual(v.violations, ['不做诊断']);
});

test('三不做检测器：方名＋剂量被拦', () => {
  const v = checkHardRules('可服补中益气汤，黄芪 15 克。');
  assert.strictEqual(v.ok, false);
  assert.ok(v.violations.includes('不开处方'));
  // 只提方名、不给剂量，不触发处方规则
  assert.strictEqual(checkHardRules('补中益气汤见于教材，可自行查阅其组成。').ok, true);
});

test('三不做检测器：疗效承诺被拦', () => {
  const v = checkHardRules('此方可根治，且无副作用。');
  assert.strictEqual(v.ok, false);
  assert.ok(v.violations.includes('不承诺疗效'));
});

test('三条规则都可程序化检测：正则非空且能各自命中', () => {
  assert.strictEqual(RULES.length, 3);
  for (const r of RULES) {
    assert.ok(r.re instanceof RegExp && r.re.source.length > 4, `${r.id} 的正则过弱`);
    assert.ok(r.re.test(['您患有某病', '某汤 9 克', '包治百病'][RULES.indexOf(r)]), `${r.id} 未命中自己的示例`);
  }
});

test('脚本可运行，输出含留痕量级、拦截结果与清单', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /800 次\/日 × 采纳率 1% = 8 条\/日进入病历/);
  assert.match(out, /✗ 越界：开处方：拦截 → 不开处方/);
  assert.match(out, /工程落地清单（12 项/);
  assert.match(out, /不构成法律意见、诊疗建议或合规认证/);
});

test('脚本不写死年条数', () => {
  const src = fs.readFileSync(MAIN, 'utf8');
  assert.ok(!/\b20 条（正文/.test(src), '源码写死了年条数比较');
});
