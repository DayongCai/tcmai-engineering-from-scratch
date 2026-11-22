'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const MAIN = path.join(__dirname, 'main.js');
const { readDoc, settings, poisson, compute, checks, CHAPTER } = require('./main.js');

test('正文存在，读得出分箱、样本量与正文自己的近似结果', () => {
  const text = readDoc();
  assert.ok(text.length > 2500, '正文过短，是否指错了文件');
  const s = settings(text);
  assert.deepStrictEqual(s.bins, [10, 10, 10]);
  assert.strictEqual(s.n, 500);
  assert.strictEqual(s.p1Stated, 0.303);
  assert.strictEqual(s.shareStated, 61);
});

test('泊松分布是独立函数，可单测', () => {
  assert.ok(Math.abs(poisson(1, 0.5) - 0.30326533) < 1e-6);
  assert.ok(Math.abs(poisson(0, 0.5) - 0.60653066) < 1e-6);
});

test('λ 与独占比例按样本量和格子数现算', () => {
  const c = compute(readDoc());
  assert.strictEqual(c.cells, 1000);
  assert.strictEqual(c.lambda, 0.5);
  assert.ok(Math.abs(c.expected - 303.27) < 0.5);
  assert.strictEqual(Math.round(c.share), 61);
});

test('压紧身高档数，等价类变粗', () => {
  const c = compute(readDoc());
  assert.strictEqual(c.tightBins, 3);
  assert.strictEqual(c.tightCells, 300);
  assert.ok(c.tightLambda > c.lambda, '压紧后每格人数应上升');
});

test('五条对照全部通过', () => {
  const bad = checks(readDoc()).filter((k) => !k.ok);
  assert.deepStrictEqual(bad.map((k) => k.name), [], '有对照未通过：' + bad.map((k) => k.note).join('；'));
});

test('脚本可运行，输出含复算与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.length > 400, '输出过短');
  assert.match(out, /占 60\.7%/);
  assert.match(out, /教学样例：分箱与样本量按正文演算设定现算/);
  assert.match(out, /不构成合规结论或法律意见/);
  assert.doesNotMatch(out, /三辨|四位面|单元规模|本课第/);
});

test('章号与正文标题里的章号一致', () => {
  const first = readDoc().split('\n')[0];
  assert.ok(first.startsWith(`# 第 ${CHAPTER} 章`), '标题章号对不上：' + first);
});
