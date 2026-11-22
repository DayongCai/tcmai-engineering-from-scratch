'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  DOC, CHAPTER, read, grab, diopterPerMm, growthPerYear, maskingMargin, compute, verify
} = require('./main.js');

const TEXT = read();
const R = compute(TEXT);
const MAIN = path.join(__dirname, 'main.js');

test('正文在本章目录下，章号与首行一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '06-e46', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 6);
  assert.ok(TEXT.startsWith('# 第 6 章'));
  assert.ok(fs.existsSync(DOC));
});

test('端点从正文读出：16.5–17.0 与 23.5–24.0', () => {
  assert.deepStrictEqual([R.nbLow, R.nbHigh, R.adultLow, R.adultHigh], [16.5, 17.0, 23.5, 24.0]);
  assert.deepStrictEqual(R.growth, [6.5, 7.5]);
  assert.throws(() => grab(TEXT, /正文没有这句([\d.]+)/, '故意缺失'), /故意缺失/);
});

test('年增长：中位组合不到 0.5 毫米，折合约 1 D', () => {
  assert.ok(Math.abs(growthPerYear(7, 15) - 0.4667) < 1e-3);
  assert.ok(R.rateMid < 0.5, `中位 ${R.rateMid}`);
  assert.ok(R.rateSlow < 0.5, `下限组合 ${R.rateSlow}`);
  assert.ok(R.rateFast > 0.5, '上限组合必然超过 0.5——所以正文说的是「平均」');
  assert.ok(Math.abs(R.rateMid * diopterPerMm() - 1.08) < 0.02);
});

test('调节余量：14 D 幅度对 +3.00 D 远视绰绰有余', () => {
  assert.strictEqual(maskingMargin(14, 3), 11);
  assert.strictEqual(R.marginChild, 11);
  assert.strictEqual(R.exhaustsAmp, 14);
  assert.throws(() => growthPerYear(7, 0), /必须为正/);
});

test('正文实列六条红线、散瞳记录三项', () => {
  assert.strictEqual(R.redLines, 6);
  assert.strictEqual(R.records.length, 3);
  assert.ok(R.records.some((x) => x.includes('什么时候点')), R.records.join('、'));
  assert.ok(R.records.some((x) => x.includes('多久')), R.records.join('、'));
});

test('verify 通过；把年增长改大即被拦下', () => {
  assert.strictEqual(verify(R), true);
  const forged = Object.assign({}, R, { rateMid: 0.9 });
  assert.throws(() => verify(forged), /不自洽/);
});

test('脚本可运行，输出含增长换算与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /左为现算/);
  assert.match(out, /均取自本章 docs\/zh\.md/);
  assert.match(out, /不给处方模板、治疗剂量与随访数值/);
  assert.ok(out.includes('0.467'), '输出里没有中位年增长');
  assert.ok(out.includes('六条红线'), '输出里没有红线条数核对');
});
