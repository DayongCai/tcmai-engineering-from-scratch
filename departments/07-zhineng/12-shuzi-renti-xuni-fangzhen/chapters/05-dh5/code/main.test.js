'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const MAIN = path.join(__dirname, 'main.js');
const { readDoc, tiers, settings, compute, checks, CHAPTER } = require('./main.js');

test('正文存在，覆盖率表读得出五行', () => {
  const text = readDoc();
  assert.ok(text.length > 2500, '正文过短，是否指错了文件');
  const T = tiers(text);
  assert.strictEqual(T.length, 5);
  assert.deepStrictEqual(T.map((r) => r.k), [2, 3, 4, 5, 6]);
  assert.deepStrictEqual(T.map((r) => r.coverage), [70, 82, 89, 93, 95]);
});

test('稳定性指标读得出两档 k', () => {
  const s = settings(readDoc());
  assert.deepStrictEqual(s.k3, { median: 0.58, q5: 0.41 });
  assert.deepStrictEqual(s.k2, { median: 0.81, q5: 0.72 });
});

test('边际收益由相邻覆盖率相减得到，且递减', () => {
  const c = compute(readDoc());
  assert.deepStrictEqual(c.tiers.slice(1).map((r) => r.gain), [12, 7, 4, 2]);
  assert.strictEqual(c.medianGap.toFixed(2), '0.23');
});

test('每档比例约等于覆盖率除以档数', () => {
  const c = compute(readDoc());
  for (const r of c.tiers) assert.strictEqual(r.share, r.perTier, `${r.k} 档比例对不上`);
});

test('维数比按样本数现算', () => {
  const c = compute(readDoc());
  assert.ok(Math.abs(c.lowDims.n / c.lowDims.dims - 17) < 1);
  assert.ok(Math.abs(c.highDims.n / c.highDims.dims - 4) < 0.2);
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
  assert.match(out, /中位数差 0\.23/);
  assert.match(out, /教学样例：ARI 与覆盖率曲线按正文演算设定现算/);
  assert.match(out, /不主张人可以分为几型/);
  assert.doesNotMatch(out, /三辨|四位面|单元规模|本课第/);
});

test('章号与正文标题里的章号一致', () => {
  const first = readDoc().split('\n')[0];
  assert.ok(first.startsWith(`# 第 ${CHAPTER} 章`), '标题章号对不上：' + first);
});
