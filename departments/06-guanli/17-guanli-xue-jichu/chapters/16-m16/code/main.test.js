'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  DOC,
  CHAPTER,
  TITLE,
  read,
  cnInt,
  facts,
  switchesPerSystem,
  pointToPointLinks,
  platformLinks,
  linkRatio,
} = require('./main.js');

const TEXT = read();
const F = facts(TEXT);

test('正文就在本章目录下，章号与标题对得上', () => {
  assert.ok(fs.existsSync(DOC), DOC);
  assert.ok(DOC.endsWith(path.join('chapters', '16-m16', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 16);
  assert.strictEqual(TITLE, '信息化不是把纸搬到屏幕上，是让决策在数据到达的地方发生');
  assert.match(TEXT, /^# 第 16 章/);
});

test('汉字整数换算：四千一百、二十七', () => {
  assert.strictEqual(cnInt('四千一百'), 4100);
  assert.strictEqual(cnInt('二十七'), 27);
});

test('投入、系统数、登录切换与差额都取自正文', () => {
  assert.strictEqual(F.investmentWan, 4100);
  assert.strictEqual(F.systems, 27);
  assert.strictEqual(F.loginsPerDay, 6.2);
  assert.strictEqual(F.switchesPerDay, 41);
  assert.strictEqual(F.findMinutesPerShift, 52);
  assert.strictEqual(F.reportGapDays, 1.8);
});

test('每个系统约 6.6 次切换，一天被切成几十段', () => {
  const per = switchesPerSystem(F.switchesPerDay, F.loginsPerDay);
  assert.ok(Math.abs(per - 6.6) < 0.1, String(per));
  assert.ok(per > 6);
});

test('点对点接口 351 条，比集成平台多 13 倍', () => {
  assert.strictEqual(pointToPointLinks(27), 351);
  assert.strictEqual(platformLinks(27), 27);
  assert.strictEqual(linkRatio(27), 13);
  assert.ok(pointToPointLinks(27) > platformLinks(27) * 10);
});

test('接口数按 n² 增长，系统数翻倍接口数约翻四倍', () => {
  assert.ok(pointToPointLinks(54) > pointToPointLinks(27) * 3.5);
  assert.strictEqual(pointToPointLinks(2), 1);
  assert.throws(() => pointToPointLinks(1), /至少为 2/);
  assert.throws(() => switchesPerSystem(41, 0), /系统数必须为正/);
});

test('脚本可运行，输出切换次数与接口对照', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /点对点/);
  assert.match(out, /数据/);
  assert.match(out, /现算/);
  assert.match(out, /不构成技术方案、采购建议或合规意见/);
});
