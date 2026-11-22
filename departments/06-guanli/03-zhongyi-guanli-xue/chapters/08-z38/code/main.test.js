'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { DOC, CHAPTER, TITLE, read, facts, residentHomes, coverage, pooledDoses, priceGap } = require('./main.js');

const TEXT = read();
const F = facts(TEXT);

test('正文就在本章目录下，章号与标题对得上', () => {
  assert.ok(fs.existsSync(DOC));
  assert.ok(DOC.endsWith(path.join('chapters', '08-z38', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 8);
  assert.ok(TEXT.startsWith('# 第 8 章'));
  assert.strictEqual(TITLE, '医共体的牌子挂上了，中医馆里没有人会开方');
});

test('家数、下派人数与剂数全部取自正文', () => {
  assert.strictEqual(F.homes, 12);
  assert.strictEqual(F.withDoctor, 9);
  assert.strictEqual(F.dispatched, 6);
  assert.strictEqual(F.shortageHomes, 3);
  assert.strictEqual(F.shortagePct, 40);
  assert.strictEqual(F.dosesPerHome, 30);
  assert.strictEqual(F.priceGapLow, 1);
  assert.strictEqual(F.priceGapHigh, 2);
});

test('常驻能独立开方 3 家，能力覆盖率 25%，与建成率 100% 并列', () => {
  assert.strictEqual(residentHomes(9, 6), 3);
  assert.strictEqual(coverage(3, 12), 0.25);
  assert.strictEqual(coverage(12, 12), 1);
  assert.ok(Math.abs(coverage(12, 12) - coverage(3, 12) - 0.75) < 1e-9);
  assert.throws(() => residentHomes(3, 6), /不能多于/);
});

test('集中采购日剂数 360 剂，价差区间为一至两成', () => {
  const pooled = pooledDoses(12, 30);
  assert.strictEqual(pooled, 360);
  const gap = priceGap(pooled, 1, 2);
  assert.strictEqual(gap.low, 396);
  assert.strictEqual(gap.high, 432);
});

test('脚本可运行，输出两个覆盖率与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /建成中医馆：12 家 → 100%/);
  assert.match(out, /常驻能独立开方：3 家 → 25%/);
  assert.match(out, /不构成政策解读、合规或投资意见/);
});
