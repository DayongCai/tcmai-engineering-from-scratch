'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { DOC, CHAPTER, TITLE, read, facts, visibleDefects, ceilingRate, shrunkRate } = require('./main.js');

const TEXT = read();
const F = facts(TEXT);

test('正文就在本章目录下，章号与标题对得上', () => {
  assert.ok(fs.existsSync(DOC));
  assert.ok(DOC.endsWith(path.join('chapters', '05-z35', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 5);
  assert.ok(TEXT.startsWith('# 第 5 章'));
  assert.strictEqual(TITLE, '中医治疗率 92%，没有一张方是对证的');
});

test('抽查数据全部取自正文', () => {
  assert.strictEqual(F.reportedRate, 92);
  assert.strictEqual(F.requiredRate, 85);
  assert.strictEqual(F.sample, 100);
  assert.strictEqual(F.onlyPatent, 23);
  assert.strictEqual(F.mismatch, 7);
  assert.strictEqual(F.copied, 5);
});

test('三类缺陷互不包含，合计 35 份，上限 65%', () => {
  const d = visibleDefects(F);
  assert.strictEqual(d, 35);
  assert.strictEqual(ceilingRate(100, d), 0.65);
  assert.strictEqual(ceilingRate(100, 0), 1);
  assert.throws(() => ceilingRate(100, 101), /缺陷数不能超过/);
});

test('上限与报表差 27 个百分点', () => {
  const gap = F.reportedRate / 100 - ceilingRate(F.sample, visibleDefects(F));
  assert.ok(Math.abs(gap * 100 - 27) < 1e-9, String(gap));
});

test('改分母：减两成时比率越过 100%，说明这条路撞了天花板', () => {
  const a = shrunkRate(92, 100, 0.1);
  assert.strictEqual(a.denominator, 90);
  assert.ok(a.rate > 1 && a.rate < 1.03, String(a.rate));
  const b = shrunkRate(92, 100, 0.2);
  assert.strictEqual(b.denominator, 80);
  assert.strictEqual(b.overflow, true);
  assert.strictEqual(b.rate, 1.15);
});

test('脚本可运行，输出缺陷合计、上限与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /可见缺陷合计 35 份/);
  assert.match(out, /对得上证的上限 65%/);
  assert.match(out, /不构成医疗质量管理、绩效考核/);
});
