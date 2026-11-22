'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  DOC, CHAPTER, read, grab, meridionalPower, transpose, transpositionError,
  effectivePower, powerShift, prismDeviation, compute, verify
} = require('./main.js');

const TEXT = read();
const R = compute(TEXT);
const MAIN = path.join(__dirname, 'main.js');

test('正文在本章目录下，章号与首行一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '05-e45', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 5);
  assert.ok(TEXT.startsWith('# 第 5 章'));
  assert.ok(fs.existsSync(DOC));
});

test('球镜是焦距的倒数：一米 +1.00，半米 +2.00，负一米 −1.00', () => {
  assert.deepStrictEqual(R.focalDocs, [1, 2, 1]);
  assert.strictEqual(1 / 1, 1);
  assert.strictEqual(1 / 0.5, 2);
  assert.strictEqual(1 / -1, -1);
});

test('球柱镜转换：球加柱、柱变号、轴 ±90', () => {
  assert.deepStrictEqual(transpose(-2, -1, 180), { S: -3, C: 1, axis: 90 });
  assert.deepStrictEqual(transpose(1.75, -2.5, 95), { S: -0.75, C: 2.5, axis: 5 });
  assert.deepStrictEqual(transpose(0, -1.5, 0), { S: -1.5, C: 1.5, axis: 90 });
  // 轴始终落在 0–180
  for (const a of [0, 45, 90, 135, 179]) {
    const t = transpose(-1, 1, a);
    assert.ok(t.axis > 0 && t.axis <= 180, `${a} → ${t.axis}`);
  }
});

test('转换是记账不是处方调整：每条子午线屈光力逐度相等', () => {
  for (const [S, C, A] of [[-2, -1, 180], [-3.5, 1.25, 20], [1.75, -2.5, 95], [0, -1.5, 0], [-6, -2.75, 172]]) {
    assert.ok(transpositionError(S, C, A) < 1e-9, `${S}/${C}×${A} 不守恒`);
    const t = transpose(S, C, A);
    assert.ok(transpositionError(t.S, t.C, t.axis) < 1e-9, '转回去也必须相等');
  }
  // 两个主子午线上的功率就是球镜与球加柱
  assert.ok(Math.abs(meridionalPower(-2, -1, 180, 180) + 2) < 1e-9);
  assert.ok(Math.abs(meridionalPower(-2, -1, 180, 90) + 3) < 1e-9);
});

test('镜眼距：−15.00 D 从 12 挪到 14 毫米，差 0.3 D', () => {
  assert.ok(Math.abs(powerShift(-15, 12, 14) - 0.315) < 0.005);
  assert.ok(Math.abs(R.shift - R.shiftDoc) < 0.03);
  assert.ok(Math.abs(effectivePower(-15, 14)) < Math.abs(effectivePower(-15, 12)));
  assert.ok(effectivePower(10, 14) > effectivePower(10, 12));
});

test('棱镜只改方向：1Δ 在百米处偏一米', () => {
  assert.strictEqual(prismDeviation(1, 100), 1);
  assert.strictEqual(prismDeviation(1, 1), 0.01);
  assert.strictEqual(prismDeviation(2, 100), 2);
  assert.strictEqual(R.prismMetersDoc, 1);
});

test('渐进四项参数从正文解析出来，恰好四项', () => {
  assert.strictEqual(R.params.length, 4);
  for (const p of ['单眼瞳距', '瞳高', '前倾角', '镜眼距']) {
    assert.ok(R.params.some((x) => x.includes(p)), `缺 ${p}：${R.params.join('、')}`);
  }
});

test('verify 通过；把镜眼距那笔账改错即被拦下', () => {
  assert.strictEqual(verify(R), true);
  const forged = Object.assign({}, R, { shift: 2 });
  assert.throws(() => verify(forged), /不自洽/);
});

test('脚本可运行，输出含转换前后的子午线比对与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /左为现算/);
  assert.match(out, /均取自本章 docs\/zh\.md/);
  assert.match(out, /不给成品处方模板/);
  assert.ok(out.includes('逐度最大偏差'), '输出里没有子午线比对');
  assert.ok(out.includes('1.00 米'), '输出里没有棱镜百米偏移');
});
