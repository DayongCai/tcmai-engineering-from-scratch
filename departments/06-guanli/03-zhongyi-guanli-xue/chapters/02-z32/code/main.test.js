'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { DOC, CHAPTER, TITLE, read, facts, supplyChain, breakeven, concentration } = require('./main.js');

const TEXT = read();
const F = facts(TEXT);
const C = supplyChain(F);

test('正文就在本章目录下，章号与标题对得上', () => {
  assert.ok(fs.existsSync(DOC));
  assert.ok(DOC.endsWith(path.join('chapters', '02-z32', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 2);
  assert.ok(TEXT.startsWith('# 第 2 章'));
  assert.strictEqual(TITLE, '规划一家中医机构，真正要决定的是关掉哪些科室');
});

test('链条上的设定值全部取自正文', () => {
  assert.strictEqual(F.dailyVisits, 1000);
  assert.strictEqual(F.rxShare, 55);
  assert.strictEqual(F.dosesPerRx, 14);
  assert.strictEqual(F.dosesPerHour, 40);
  assert.strictEqual(F.decoctShare, 30);
  assert.strictEqual(F.dosesPerPot, 10);
  assert.strictEqual(F.minutesPerPot, 40);
  assert.match(TEXT, /需要 24 人/);
  assert.match(TEXT, /每工作日 66 人次/);
});

test('调剂链逐环可复算：550 方、7,700 剂、24 名调剂员', () => {
  assert.strictEqual(C.rx, 550);
  assert.strictEqual(C.doses, 7700);
  assert.strictEqual(C.perDispenser, 320);
  assert.strictEqual(C.dispensers, 24);
  assert.strictEqual(C.doses / C.perDispenser >= 24, true);
});

test('代煎部分：2,310 剂、231 锅、154 机时', () => {
  assert.strictEqual(C.decoctDoses, 2310);
  assert.strictEqual(C.pots, 231);
  assert.strictEqual(C.machineMinutes, 9240);
  assert.strictEqual(C.machineHours, 154);
});

test('保本诊次与每工作日人次', () => {
  const be = breakeven(900000, 60, 15, 300);
  assert.strictEqual(be.margin, 45);
  assert.strictEqual(be.visits, 20000);
  assert.strictEqual(be.perWorkday, 66);
  assert.throws(() => breakeven(900000, 15, 15, 300), /保本诊次无解/);
});

test('头部与尾部的单科门诊量差距约 27 倍', () => {
  const c = concentration(68, 5, 6, 12);
  assert.strictEqual(c.topAvg, 13.6);
  assert.ok(Math.abs(c.ratio - 27.2) < 1e-9, String(c.ratio));
  assert.ok(c.ratio > 20, '差距应大于 20 倍');
});

test('脚本可运行，输出两条链与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /调剂产能/);
  assert.match(out, /保本门诊量/);
  assert.match(out, /现算/);
  assert.match(out, /不构成机构设置审批/);
});
