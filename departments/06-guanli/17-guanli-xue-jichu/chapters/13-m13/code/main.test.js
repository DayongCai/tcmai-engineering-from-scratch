'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { DOC, CHAPTER, TITLE, read, cnInt, facts, defectRate, caliberGap } = require('./main.js');

const TEXT = read();
const F = facts(TEXT);

test('正文就在本章目录下，章号与标题对得上', () => {
  assert.ok(fs.existsSync(DOC), DOC);
  assert.ok(DOC.endsWith(path.join('chapters', '13-m13', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 13);
  assert.strictEqual(TITLE, '控制不是抓住谁的错，是让偏差在还来得及的时候出现');
  assert.match(TEXT, /^# 第 13 章/);
});

test('汉字整数换算：四百一十二、三十七、两百、六十一', () => {
  assert.strictEqual(cnInt('四百一十二'), 412);
  assert.strictEqual(cnInt('三十七'), 37);
  assert.strictEqual(cnInt('两百'), 200);
  assert.strictEqual(cnInt('六十一'), 61);
});

test('上报数、甲级率与抽查数都取自正文', () => {
  assert.strictEqual(F.reports, 412);
  assert.strictEqual(F.severe, 37);
  assert.strictEqual(F.gradeAPct, 96.8);
  assert.strictEqual(F.sampled, 200);
  assert.strictEqual(F.defective, 61);
  assert.ok(Math.abs(F.defectivePct - 30.5) < 1e-9);
});

test('运行病历问题率 30.5%，与正文一致', () => {
  const rate = defectRate(F.defective, F.sampled);
  assert.ok(Math.abs(rate - F.defectivePct) < 1e-9, String(rate));
  assert.strictEqual(rate, 30.5);
});

test('甲级率与运行病历质量率相差 27.3 个百分点，两个口径不是一回事', () => {
  const gap = caliberGap(F.gradeAPct, defectRate(F.defective, F.sampled));
  assert.ok(Math.abs(gap - 27.3) < 1e-9, String(gap));
  assert.ok(gap > 25, '两个口径的落差应超过二十五点');
  assert.strictEqual(caliberGap(69.5, 30.5), 0, '口径自洽时落差应为零');
  assert.strictEqual(gap, F.gradeAPct - (100 - F.defectivePct));
});

test('Ⅲ级及以上占上报总量约 9%', () => {
  const share = (F.severe / F.reports) * 100;
  assert.ok(Math.abs(share - 8.98) < 0.01, String(share));
  assert.ok(share < 10);
});

test('非法参数报错，不返回负值', () => {
  assert.throws(() => defectRate(61, 0), /抽查份数必须为正/);
  assert.throws(() => defectRate(201, 200), /不能多于/);
});

test('脚本可运行，输出两个口径与三段控制', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /两个口径/);
  assert.match(out, /前馈/);
  assert.match(out, /现算/);
  assert.match(out, /不构成质量管理评价、责任认定意见或管理咨询意见/);
});
