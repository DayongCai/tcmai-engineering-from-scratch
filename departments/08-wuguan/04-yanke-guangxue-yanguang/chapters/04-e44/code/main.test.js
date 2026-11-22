'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  DOC, CHAPTER, read, grab, effectivePower, powerShift, workingDistancePower, shiftForStep,
  compute, verify
} = require('./main.js');

const TEXT = read();
const R = compute(TEXT);
const MAIN = path.join(__dirname, 'main.js');

test('正文在本章目录下，章号与首行一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '04-e44', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 4);
  assert.ok(TEXT.startsWith('# 第 4 章'));
  assert.ok(fs.existsSync(DOC));
});

test('工作距离：50 厘米折 +2.00 D，67 厘米折 1.50 D', () => {
  assert.strictEqual(workingDistancePower(0.5), 2);
  assert.ok(Math.abs(workingDistancePower(0.67) - 1.4925) < 1e-3);
  assert.ok(Math.abs(R.wd1 - R.refPowerDoc) < 0.02);
  assert.ok(Math.abs(R.wd2 - R.refPower2Doc) < 0.02);
  assert.throws(() => workingDistancePower(0), /必须为正/);
});

test('顶点距离换算：−15.00 D 从 12 挪到 14 毫米，差约 0.3 D', () => {
  assert.ok(Math.abs(effectivePower(-15, 12) + 12.7119) < 1e-3);
  assert.ok(Math.abs(effectivePower(-15, 14) + 12.3967) < 1e-3);
  assert.ok(Math.abs(R.shift - 0.315) < 0.005);
  assert.ok(Math.abs(R.shift - R.shiftDoc) < 0.03);
});

test('近视为负、远视为正：镜片离眼越远，近视有效度数越低', () => {
  assert.ok(Math.abs(effectivePower(-15, 14)) < Math.abs(effectivePower(-15, 12)));
  assert.ok(effectivePower(10, 14) > effectivePower(10, 12));
  // 1/F′ = 1/F − d 的等价写法，用来验证换算自洽
  const inv = 1 / effectivePower(-15, 12) + 0.012;
  assert.ok(Math.abs(1 / -15 - inv) < 1e-9);
});

test('度数越低，2 毫米距离差越可忽略（正文 ±4 D / ±10 D 的量化版）', () => {
  assert.ok(R.shiftAt(4) < 0.05, `±4 D 时 2 毫米差 ${R.shiftAt(4).toFixed(3)} D`);
  assert.ok(R.shiftAt(10) > R.shiftAt(4));
  assert.ok(R.shiftAt(15) > R.shiftAt(10));
  assert.ok(R.steps.at4 > 10, `±4 D 需挪 ${R.steps.at4.toFixed(1)} 毫米才够一格`);
  assert.ok(R.steps.at15 < R.steps.at10 && R.steps.at10 < R.steps.at4);
  assert.ok(shiftForStep(-15) < 2.5, `−15 D 只需挪 ${shiftForStep(-15).toFixed(2)} 毫米`);
});

test('verify 通过；把 0.3 改成 1.5 即被拦下', () => {
  assert.strictEqual(verify(R), true);
  const forged = Object.assign({}, R, { shift: 1.5 });
  assert.throws(() => verify(forged), /不自洽/);
});

test('脚本可运行，输出含顶点距离与工作距离两笔账', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /左为现算/);
  assert.match(out, /均取自本章 docs\/zh\.md/);
  assert.match(out, /不给剂量与处方模板/);
  assert.ok(out.includes('+2.00 D'), '输出里没有工作距离屈光度');
  assert.ok(out.includes('−12.71'), '输出里没有 −15 D 的有效度数');
});
