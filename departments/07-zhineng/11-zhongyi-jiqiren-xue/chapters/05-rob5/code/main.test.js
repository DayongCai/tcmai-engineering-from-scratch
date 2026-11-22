'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  DOC, CHAPTER, TITLE, read, overshoot, zetaForOvershoot, riseTime, phaseLag, analyze,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const X = analyze(read());

test('正文就在本章目录下，首行章题与章节元数据一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '05-rob5', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 5);
  assert.ok(read().startsWith('# 第 5 章 · ' + TITLE), '正文首行与章题不一致');
  assert.strictEqual(X.hasTitle, true);
});

test('指令 20 N、安全限幅 25 N 取自正文', () => {
  assert.strictEqual(X.cmd, 20);
  assert.strictEqual(X.limit, 25);
  assert.strictEqual(X.allowed, 1.25);
  assert.strictEqual(X.mpAllowed, 0.25);
});

test('阻尼比表的超调与峰值逐行现算，与正文一格不差', () => {
  assert.deepStrictEqual(X.rows.map((r) => r.zeta), [0.2, 0.3, 0.5, 0.7, 1]);
  assert.deepStrictEqual(X.rows.map((r) => r.doc.mp), [52.7, 37.2, 16.3, 4.6, 0]);
  assert.deepStrictEqual(X.rows.map((r) => r.doc.peak), [30.5, 27.4, 23.3, 20.9, 20]);
  for (const r of X.rows) {
    assert.ok(r.mpResidual < 0.06, `ζ=${r.zeta} 超调偏差 ${r.mpResidual}`);
    assert.ok(r.peakResidual < 0.06, `ζ=${r.zeta} 峰值偏差 ${r.peakResidual}`);
  }
});

test('Mp 的闭式解与既定值一致：ζ=0.5 得 16.3%，ζ=1 得 0', () => {
  assert.ok(Math.abs(overshoot(0.5) * 100 - 16.3) < 0.05);
  assert.ok(Math.abs(overshoot(0.2) * 100 - 52.7) < 0.05);
  assert.strictEqual(overshoot(1), 0);
  assert.strictEqual(overshoot(1.2), 0);
  assert.ok(Math.abs(20 * (1 + overshoot(0.3)) - 27.4) < 0.06);
});

test('从 25 N 反解 ζ 下界：闭式解 0.404，正文取保守的 0.41', () => {
  assert.ok(Math.abs(X.zMin - 0.4038) < 0.001, `ζ_min=${X.zMin}`);
  assert.strictEqual(X.zDoc, 0.41);
  assert.ok(X.zDoc >= X.zMin, '正文取值必须不松于闭式解');
  // 0.41 处峰值确实不超过 25 N
  const peak = X.cmd * (1 + overshoot(X.zDoc));
  assert.ok(peak <= X.limit, `峰值 ${peak}`);
  assert.ok(peak > 24.5, '但也不该松到无意义');
  // 反向：zetaForOvershoot 与 Mp 互为反函数
  assert.ok(Math.abs(overshoot(zetaForOvershoot(0.25)) - 0.25) < 1e-9);
});

test('上升时间 t_r = 1.8/20 = 0.09 s', () => {
  assert.strictEqual(X.wn, 20);
  assert.ok(Math.abs(X.tr - 0.09) < 1e-9);
  assert.strictEqual(riseTime(20), 0.09);
});

test('延迟 20 ms 由 5+3+2+10 构成，三项相位滞后与正文一致', () => {
  assert.strictEqual(X.tDelay, 20);
  assert.deepStrictEqual(X.segments, [5, 3, 2, 10]);
  assert.strictEqual(X.segSum, X.tDelay);
  assert.deepStrictEqual(X.phases.map((p) => p.f), [1, 5, 10]);
  assert.ok(Math.abs(X.phases[0].lag - 7.2) < 0.05, `1 Hz 滞后 ${X.phases[0].lag}`);
  assert.ok(Math.abs(X.phases[1].lag - 36.0) < 0.05);
  assert.ok(Math.abs(X.phases[2].lag - 72.0) < 0.05);
  // 同样延迟在低频可忽略、高频直接失稳
  assert.ok(X.phases[0].remaining > 30);
  assert.ok(X.phases[1].remaining < 10 && X.phases[1].remaining > 0);
  assert.ok(X.phases[2].remaining < 0, '10 Hz 应该没有余量');
  assert.ok(Math.abs(phaseLag(5, 20, 45).remaining - 9) < 0.05);
});

test('四种控制模式都在正文里，阻抗控制是医疗主力', () => {
  assert.strictEqual(X.modes.length, 4);
  assert.deepStrictEqual(X.modes.map((m) => m.name), ['位置控制', '力控制', '阻抗控制', '导纳控制']);
  assert.match(X.modes[2].failure, /刚度选错/);
});

test('脚本可运行，输出带现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /均从本章 docs\/zh\.md 现算/);
  assert.match(out, /不构成设备调试规范或安全标准/);
  assert.ok(out.includes('0.404'), '输出应给出反解出的 ζ 下界');
  assert.ok(out.includes('27.4'), '输出应把超调翻成牛');
});
