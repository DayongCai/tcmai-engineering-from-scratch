'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, analyze, normCdf, normInv, errorFloor, gammaScale, simRadius } = require('./main.js');

const TEXT = read();
const A = analyze(TEXT);
const MAIN = path.join(__dirname, 'main.js');

test('正文在本章目录下，章号与标题一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '07-m7', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 7);
  assert.ok(TEXT.startsWith('# 第 ' + CHAPTER + ' 章'));
  assert.ok(TEXT.includes(TITLE));
});

test('Φ 与其反函数互逆', () => {
  assert.ok(Math.abs(normInv(0.95) - 1.6449) < 1e-3, String(normInv(0.95)));
  for (const p of [0.05, 0.3, 0.5, 0.8]) assert.ok(Math.abs(normCdf(normInv(p)) - p) < 1e-6);
  assert.throws(() => normInv(1));
});

test('间隔宽度就是均值差 d，最近样本在两侧 ±d/2（与表内四行一致）', () => {
  assert.deepStrictEqual(A.widths.map((w) => w.d), [0.8, 1.2, 2, 3]);
  for (const w of A.widths) {
    assert.ok(Math.abs(w.d - w.width) < 0.01, `宽度 ${w.d}`);
    assert.ok(Math.abs(w.d / 2 - Math.abs(w.edge)) < 0.01, `边界 ${w.d}`);
  }
});

test('贝叶斯错误率下限 Φ(−d/2) 与表内四行逐格一致', () => {
  for (const f of A.floors) {
    assert.ok(Math.abs(errorFloor(f.d) - f.floor) < 0.002, `d=${f.d} 下限`);
    assert.ok(Math.abs(1 - errorFloor(f.d) - f.acc) < 0.002, `d=${f.d} 上限`);
  }
  assert.strictEqual(errorFloor(0.8).toFixed(3), '0.345');
  assert.strictEqual(errorFloor(3).toFixed(3), '0.067');
  assert.ok(errorFloor(0.8) > errorFloor(3), 'd 越大下限越低');
});

test('gamma=scale 的折算半径与表内三行一致', () => {
  assert.ok(Math.abs(gammaScale(14, 1) - 0.0714) < 0.0002);
  assert.strictEqual(simRadius(gammaScale(14, 1)).toFixed(2), '3.74');
  assert.strictEqual(gammaScale(14, 0.3).toFixed(3), '0.238');
  assert.strictEqual(simRadius(gammaScale(3, 1)).toFixed(2), '1.73');
  for (const g of A.gammas) {
    assert.ok(Math.abs(simRadius(g.gamma) - g.radius) < 0.03, `半径 ${g.gamma} vs ${g.radius}`);
  }
});

test('准确率 95% 反解出 d ≈ 3.29 σ，正文按 3.3 σ 讲', () => {
  assert.strictEqual(A.dFor95.toFixed(2), '3.29');
  assert.match(TEXT, /d ≈ 3\.3σ/);
});

test('正文不给实测性能与核参数最优值，只给演算设定', () => {
  assert.match(TEXT, /演算设定/);
  assert.match(TEXT, /不给出任何实测的准确率、敏感度、样本量或核参数最优值/);
  assert.match(TEXT, /60 例样本（浮脉 30 例、非浮 30 例），14 个标准化特征/);
});

test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /均从本章 docs\/zh\.md 现算/);
  assert.match(out, /不对应任何真实数据集/);
  assert.ok(out.includes('准确率上限 0.933'), '输出里的下限表与正文的 0.933 不一致');
  assert.ok(out.includes('≈ 3.29 σ'), '输出里的反解 d 与正文的 3.3σ 不一致');
  assert.match(out, /（表内 0\.345 \/ 0\.655，一致）/);
});
