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
  facts,
  equalShare,
  qualifyingUnits,
  shortfallWan,
} = require('./main.js');

const TEXT = read();
const F = facts(TEXT);

test('正文就在本章目录下，章号与标题对得上', () => {
  assert.ok(fs.existsSync(DOC), DOC);
  assert.ok(DOC.endsWith(path.join('chapters', '06-m6', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 6);
  assert.strictEqual(TITLE, '战略不是决定做什么，是决定不做什么');
  assert.match(TEXT, /^# 第 6 章/);
});

test('经费、方向数、门槛都取自正文', () => {
  assert.strictEqual(F.totalWan, 6000);
  assert.strictEqual(F.units, 8);
  assert.strictEqual(F.equalShareWan, 750);
  assert.strictEqual(F.minScaleWan, 1800);
  assert.strictEqual(F.focusedUnits, 3);
  assert.strictEqual(F.focusedShareWan, 2000);
});

test('平均分配每家 750 万元，与正文一致', () => {
  assert.strictEqual(equalShare(F.totalWan, F.units), F.equalShareWan);
  assert.strictEqual(equalShare(6000, 8), 750);
});

test('摊薄达标 0、集中达标 3，都能由算术复算', () => {
  assert.strictEqual(qualifyingUnits(F.totalWan, F.minScaleWan), 3);
  assert.strictEqual(qualifyingUnits(F.equalShareWan, F.minScaleWan), 0);
  assert.strictEqual(F.equalQualified, 0);
  assert.strictEqual(F.focusedQualified, 3);
  assert.strictEqual(F.focusedShareWan * F.focusedUnits, F.totalWan);
});

test('摊薄缺口 1,050 万元，集中后无缺口', () => {
  assert.strictEqual(shortfallWan(F.equalShareWan, F.minScaleWan), 1050);
  assert.strictEqual(shortfallWan(F.focusedShareWan, F.minScaleWan), 0);
});

test('门槛为零时报错，不做除法', () => {
  assert.throws(() => qualifyingUnits(6000, 0), /门槛必须为正/);
  assert.throws(() => equalShare(6000, 0), /方向数必须为正/);
});

test('脚本可运行，输出摊薄与集中的对照与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /摊薄/);
  assert.match(out, /集中/);
  assert.match(out, /门槛/);
  assert.match(out, /现算/);
  assert.match(out, /不构成管理咨询意见、区域卫生规划建议或投资建议/);
});
