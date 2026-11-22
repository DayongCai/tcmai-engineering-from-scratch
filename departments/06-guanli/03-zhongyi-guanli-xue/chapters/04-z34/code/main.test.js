'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { DOC, CHAPTER, TITLE, read, facts, marginalScore, rxMargin } = require('./main.js');

const TEXT = read();
const F = facts(TEXT);

test('正文就在本章目录下，章号与标题对得上', () => {
  assert.ok(fs.existsSync(DOC));
  assert.ok(DOC.endsWith(path.join('chapters', '04-z34', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 4);
  assert.ok(TEXT.startsWith('# 第 4 章'));
  assert.strictEqual(TITLE, '科主任的两套权威，一套来自疗效，一套来自表格');
});

test('方案权重与行为数据全部取自正文', () => {
  assert.strictEqual(F.wIncome, 60);
  assert.strictEqual(F.wVisits, 25);
  assert.strictEqual(F.wResearch, 15);
  assert.strictEqual(F.wIncome + F.wVisits + F.wResearch, 100);
  assert.strictEqual(F.rxYear1, 41);
  assert.strictEqual(F.rxPeak, 58);
  assert.strictEqual(F.rxFall, 44);
  assert.strictEqual(F.minutesBefore, 8);
  assert.strictEqual(F.minutesAfter, 5);
});

test('零加成下饮片的边际得分为零，检查组为正——方案自己选出了行为', () => {
  const base = { income: 675000, visits: 7500, research: 100 };
  const sRx = marginalScore(F, base, { income: 0, visitDelta: 0 });
  const sCheck = marginalScore(F, base, { income: 200, visitDelta: 0 });
  assert.strictEqual(sRx, 0);
  assert.ok(sCheck > 0, String(sCheck));
  assert.ok(sCheck > sRx * 1 + 1e-12);
});

test('饮片按帖数给固定劳务补贴后，边际得分由零转正', () => {
  assert.strictEqual(rxMargin(14, 1.5), 21);
  const base = { income: 675000, visits: 7500, research: 100 };
  const sRx = marginalScore(F, base, { income: 21, visitDelta: 0 });
  assert.ok(sRx > 0, String(sRx));
});

test('饮片使用率回退幅度接近提升幅度的八成', () => {
  const gain = F.rxPeak - F.rxYear1;
  const fall = F.rxPeak - F.rxFall;
  assert.strictEqual(gain, 17);
  assert.strictEqual(fall, 14);
  assert.ok(fall / gain > 0.8 && fall / gain < 0.85, String(fall / gain));
  assert.strictEqual(F.rxFall - F.rxYear1, 3);
});

test('8 分钟压到 5 分钟，人次放大 1.6 倍', () => {
  assert.strictEqual(F.minutesBefore / F.minutesAfter, 1.6);
});

test('脚本可运行，输出权重、边际得分与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /边际得分/);
  assert.match(out, /饮片使用率的回退/);
  assert.match(out, /现算/);
  assert.match(out, /不构成人事管理、绩效分配/);
});
