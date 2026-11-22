'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  readDoc, parseCounts, parseWeights, weightedSum, weightedMean, scaleRows, compute, DOC_PATH,
} = require('./main.js');

test('正文可读，且脚本头部指向本章正文', () => {
  assert.ok(fs.existsSync(DOC_PATH));
  const body = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
  assert.ok(body.includes('/chapters/01-juese-shujuleixing/docs/zh.md'));
});

test('频数从正文抓取，且合计等于正文的 20 例', () => {
  const doc = readDoc();
  const counts = parseCounts(doc);
  assert.deepStrictEqual(counts, [4, 6, 7, 3]);
  assert.strictEqual(compute(doc).n, 20);
});

test('两套赋值长度与频数匹配，且按频数顺序取权重', () => {
  const weights = parseWeights(readDoc());
  assert.deepStrictEqual(weights.equal, [3, 2, 1, 0]);
  assert.deepStrictEqual(weights.clinical, [5, 3, 1, 0]);
  assert.deepStrictEqual(weights.label, [0, 1, 3, 5]);
  assert.strictEqual(weights.equal.length, parseCounts(readDoc()).length);
});

test('加权和与均值可复算', () => {
  const { counts, weights } = compute(readDoc());
  assert.strictEqual(weightedSum(counts, weights.equal), 31);
  assert.strictEqual(weightedSum(counts, weights.clinical), 45);
  assert.ok(Math.abs(weightedMean(counts, weights.equal) - 1.55) < 1e-12);
  assert.ok(Math.abs(weightedMean(counts, weights.clinical) - 2.25) < 1e-12);
});

test('均值上浮幅度与正文 45% 一致', () => {
  const r = compute(readDoc());
  assert.ok(r.rise > 44.9 && r.rise < 45.3, `实际上浮 ${r.rise}`);
});

test('尺度表四行、变量清单四问都在正文里', () => {
  const doc = readDoc();
  assert.deepStrictEqual(scaleRows(doc), ['定类', '定序', '定距', '定比']);
  assert.strictEqual((doc.match(/^\*\*第[一二三四]问/gm) || []).length, 4);
});

test('脚本可运行，输出含对账结果与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /等距赋值 3\/2\/1\/0：加权和 31，均值 1\.55/);
  assert.match(out, /临床权重（标签 0\/1\/3\/5，按治愈→无效取 5\/3\/1\/0）：加权和 45，均值 2\.25/);
  assert.match(out, /不构成研究方案/);
});
