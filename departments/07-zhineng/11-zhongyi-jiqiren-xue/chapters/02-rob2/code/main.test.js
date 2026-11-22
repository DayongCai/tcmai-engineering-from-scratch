'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, quantStep, enob, analyze } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const BODY = read();
const X = analyze(BODY);

test('正文就在本章目录下，首行章题与章节元数据一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '02-rob2', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 2);
  assert.ok(BODY.startsWith('# 第 2 章 · ' + TITLE), '正文首行与章题不一致');
  assert.strictEqual(X.hasTitle, true);
});

test('采样：f_max=10 Hz、定理下限 20 Hz、实取 200 Hz 为 f_max 的 20 倍', () => {
  assert.strictEqual(X.fmax, 10);
  assert.strictEqual(X.fsMin, 20);
  assert.strictEqual(X.fs, 200);
  assert.strictEqual(X.fsRatio, 20);
  assert.ok(X.fs > X.fsMin, '实取采样率必须高于定理下限');
  assert.strictEqual(X.fs / X.fsMin, 10);
});

test('量化台阶 1.22 mN，与正文写的 1.22 mV 对得上', () => {
  assert.strictEqual(X.bits, 12);
  assert.strictEqual(X.vfs, 5);
  assert.strictEqual(X.mvPerMn, 1);
  assert.ok(Math.abs(X.deltaMv - 1.2210) < 0.001, `Δ=${X.deltaMv}`);
  assert.strictEqual(X.deltaMv.toFixed(2), '1.22');
  assert.ok(Math.abs(X.deltaMn - 1.22) < 0.01);
  assert.ok(BODY.includes('1.22'), '正文应给出 1.22 这个数');
});

test('ENOB = 12 − log₂(3/1.22) ≈ 10.7，噪声把标称位数打掉 1.3 位', () => {
  assert.strictEqual(X.noiseMn, 3);
  const q = quantStep(X.vfs, X.bits, X.mvPerMn);
  assert.strictEqual(enob(X.bits, X.noiseMn, q.deltaMn), X.enob);
  assert.ok(Math.abs(X.enob - 10.70) < 0.02, `ENOB=${X.enob}`);
  assert.ok(Math.abs((X.bits - X.enob) - 1.30) < 0.02);
  assert.ok(BODY.includes('10.7'), '正文应给出 10.7');
  // 噪声翻倍则 ENOB 恰好掉 1 位
  assert.ok(Math.abs(enob(X.bits, X.noiseMn * 2, q.deltaMn) - (X.enob - 1)) < 1e-9);
});

test('六条通道都是「想知道 ≠ 实测」的代理关系', () => {
  assert.strictEqual(X.channels.length, 6);
  assert.deepStrictEqual(X.channels.map((c) => c.name), ['触压', '位移', '温度', '光学', '电', '声']);
  for (const c of X.channels) {
    assert.ok(c.want.length > 0 && c.measure.length > 0);
    assert.notStrictEqual(c.want, c.measure, `${c.name} 通道的代理量不能等于目标量`);
  }
  assert.ok(X.channels[0].measure.includes('应变片'));
});

test('特征层 4 层，其中 3 层不可逆 —— 所以只能存最底层', () => {
  assert.strictEqual(X.layers.length, 4);
  assert.strictEqual(X.irreversible, 3);
  assert.deepStrictEqual(X.layers.map((l) => l.layer), ['原始波形', '形态特征', '节律特征', '语义标签']);
  assert.strictEqual(X.layers[0].recoverable, '—');
  assert.ok(X.layers.slice(1).every((l) => l.recoverable === '不能'));
});

test('失效模式表 6 条，采集后判据写进了正文', () => {
  assert.strictEqual(X.failures.length, 6);
  assert.ok(X.failures.includes('混叠'));
  assert.ok(X.failures.includes('饱和削顶'));
  assert.strictEqual(X.gate, true);
});

test('脚本可运行，输出带现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /均从本章 docs\/zh\.md 现算/);
  assert.match(out, /不构成诊断标准或设备校准规范/);
  assert.ok(out.includes('10.70 位'), '输出应给出 ENOB');
  assert.ok(out.includes('1.22 mN/级'), '输出应给出量化台阶');
});
