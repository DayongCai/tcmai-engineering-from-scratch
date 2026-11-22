'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const MAIN = path.join(__dirname, 'main.js');
const { readDoc, settings, sphereArea, triArea, compute, checks, CHAPTER } = require('./main.js');

test('正文存在，读得出半径、两档面数与样本数', () => {
  const text = readDoc();
  assert.ok(text.length > 2500, '正文过短，是否指错了文件');
  const s = settings(text);
  assert.strictEqual(s.radiusMm, 60);
  assert.deepStrictEqual([s.edgeCoarse, s.edgeFine], [2, 1]);
  assert.strictEqual(s.samples, 30);
  assert.strictEqual(s.dims, 15000);
});

test('球面面积与三角面覆盖率是独立函数，可单测', () => {
  assert.ok(Math.abs(sphereArea(60) - 45238.93) < 0.5);
  assert.ok(Math.abs(triArea(2) - 1.7320508) < 1e-6);
});

test('两档面数与正文一致，倍数恰为四', () => {
  const c = compute(readDoc());
  assert.ok(Math.abs(c.triCoarse / 1e4 - 2.6) < 0.1);
  assert.ok(Math.abs(c.triFine / 1e4 - 10.4) < 0.15);
  assert.strictEqual(c.triRatio, 4);
});

test('秩上限为 N−1，与正文一致', () => {
  const c = compute(readDoc());
  assert.strictEqual(c.rank, 29);
  assert.ok(c.dimsOverRank > 500, '维度与秩的悬殊应体现出来');
});

test('四面体化区间由表面面数乘倍数得到', () => {
  const c = compute(readDoc());
  assert.deepStrictEqual(c.tetraRange.map((x) => Math.round(x / 1e4)), [52, 73]);
});

test('六条对照全部通过', () => {
  const bad = checks(readDoc()).filter((k) => !k.ok);
  assert.deepStrictEqual(bad.map((k) => k.name), [], '有对照未通过：' + bad.map((k) => k.note).join('；'));
});

test('脚本可运行，输出含复算与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.length > 400, '输出过短');
  assert.match(out, /面数比 4/);
  assert.match(out, /教学样例：半径、边长与样本数按正文演算设定现算/);
  assert.match(out, /不构成器械设计建议/);
  assert.doesNotMatch(out, /三辨|四位面|单元规模|本课第/);
});

test('章号与正文标题里的章号一致', () => {
  const first = readDoc().split('\n')[0];
  assert.ok(first.startsWith(`# 第 ${CHAPTER} 章`), '标题章号对不上：' + first);
});
