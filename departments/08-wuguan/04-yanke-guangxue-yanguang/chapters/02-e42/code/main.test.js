'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  DOC, CHAPTER, read, grab, axisToDiopter, netMismatch, aniseikoniaPercent, fusionLimitRange,
  compute, verify
} = require('./main.js');

const TEXT = read();
const R = compute(TEXT);
const MAIN = path.join(__dirname, 'main.js');

test('正文在本章目录下，章号与首行一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '02-e42', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 2);
  assert.ok(TEXT.startsWith('# 第 2 章'), '正文首行不是本章章题');
  assert.ok(fs.existsSync(DOC));
});

test('两组参数从正文读出：25.6/42 与 23.6/45，第二组 25.5/23.7', () => {
  assert.deepStrictEqual([R.axisA, R.axisB, R.corneaA, R.corneaB], [25.6, 23.6, 42, 45]);
  assert.deepStrictEqual([R.pair2.axisA, R.pair2.axisB], [25.5, 23.7]);
  assert.strictEqual(R.highAxis, 26.5);
  assert.throws(() => grab(TEXT, /正文没有这句([\d.]+)/, '故意缺失'), /故意缺失/);
});

test('轴长差折度数：两毫米约 4.6 D，与正文一致', () => {
  assert.ok(Math.abs(axisToDiopter(1) - 2.315) < 1e-3);
  assert.ok(Math.abs(R.pairAxisD - R.pairDiffDoc) < 0.1);
  assert.ok(Math.abs(R.pairAxisD - 4.63) < 0.05);
});

test('角膜差把轴性差抵掉大半：净值远小于分项', () => {
  assert.strictEqual(R.first.corneaPart, -3);
  assert.ok(Math.abs(R.first.net) < Math.abs(R.first.axisPart), '抵偿后净值必须小于轴性分项');
  assert.ok(Math.abs(R.first.net) < 2, `净值 ${R.first.net}`);
  // 第二组：1.8 毫米轴差被 5 D 角膜差抵掉，落在同一档
  assert.ok(Math.abs(R.second.net) < 1, `第二组净值 ${R.second.net}`);
});

test('不等像：每 D 1.5%–2%，撞 5% 上限需 2.5–3.3 D 参差', () => {
  assert.deepStrictEqual([R.anisoLow, R.anisoHigh, R.fusionLimit], [1.5, 2, 5]);
  assert.ok(Math.abs(aniseikoniaPercent(2, 1.5) - 3) < 1e-9);
  const [lo, hi] = R.limit;
  assert.ok(lo > 2.4 && lo < 2.6, `下限 ${lo}`);
  assert.ok(hi > 3.2 && hi < 3.4, `上限 ${hi}`);
  assert.deepStrictEqual(fusionLimitRange(5, [2, 1.5]), [2.5, 5 / 1.5]);
});

test('netMismatch 的方向：轴长增偏近视，角膜变陡也偏近视', () => {
  const longer = netMismatch({ axisA: 25, axisB: 24, corneaA: 43, corneaB: 43 }, 2.32);
  const steeper = netMismatch({ axisA: 24, axisB: 24, corneaA: 45, corneaB: 43 }, 2.32);
  assert.ok(longer.net > 0 && steeper.net > 0);
  assert.ok(Math.abs(longer.net - 2.32) < 1e-9);
  assert.ok(Math.abs(steeper.net - 2) < 1e-9);
});

test('verify 通过；篡改轴差即被拦下', () => {
  assert.strictEqual(verify(R), true);
  const forged = Object.assign({}, R, { pairAxisD: 9 });
  assert.throws(() => verify(forged), /不自洽/);
});

test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /左为现算/);
  assert.match(out, /均取自本章 docs\/zh\.md/);
  assert.match(out, /不构成对任何个体的诊断标准/);
  assert.ok(out.includes('4.63'), '输出里没有两毫米轴差折合度数');
});
