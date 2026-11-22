'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const MAIN = path.join(__dirname, 'main.js');
const { readDoc, settings, table, hoopStressMpa, compute, checks, CHAPTER } = require('./main.js');

test('正文存在，读得出压力、半径、壁厚与壁厚不确定度', () => {
  const text = readDoc();
  assert.ok(text.length > 2500, '正文过短，是否指错了文件');
  const s = settings(text);
  assert.strictEqual(s.pKpa, 13.33);
  assert.strictEqual(s.rMm, 15);
  assert.strictEqual(s.tMm, 1.5);
  assert.strictEqual(s.dtMm, 0.15);
  assert.strictEqual(s.discretePct, 0.8);
});

test('环向应力是 p r / t 的函数，单位换算到 MPa', () => {
  assert.ok(Math.abs(hoopStressMpa(13.33, 15, 1.5) - 0.1333) < 0.001);
  assert.ok(Math.abs(hoopStressMpa(13.33, 15, 1.35) - 0.1481) < 0.001);
});

test('壁厚敏感性表三行能读出并复算', () => {
  const T = table(readDoc());
  assert.deepStrictEqual(T.map((r) => r.tMm), [1.35, 1.5, 1.65]);
  const c = compute(readDoc());
  for (const r of c.rows) assert.ok(Math.abs(r.computed - r.stressMpa) < 0.002, `${r.tMm} 行对不上`);
});

test('偏差方向正确：壁薄应力高', () => {
  const c = compute(readDoc());
  assert.ok(c.rows[0].deltaPct > 10 && c.rows[0].deltaPct < 12);
  assert.ok(c.rows[2].deltaPct < -8 && c.rows[2].deltaPct > -10);
  assert.strictEqual(c.rows[1].deltaPct, 0);
});

test('不确定度对比看得出谁是决定项', () => {
  const c = compute(readDoc());
  assert.ok(Math.abs(c.dtPct - 10) < 0.5, '壁厚相对不确定度应约一成');
  assert.ok(c.ratioToDiscrete > 8, '壁厚不确定度带来的应力变化应远大于离散误差');
  assert.ok(c.spreadRatio > 20, '个体变异应远大于离散误差');
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
  assert.match(out, /σ = pr\/t = 0\.1333 MPa/);
  assert.match(out, /教学样例：压力、半径与壁厚按正文演算设定现算/);
  assert.match(out, /不给通用确认容差/);
  assert.doesNotMatch(out, /三辨|四位面|单元规模|本课第/);
});

test('章号与正文标题里的章号一致', () => {
  const first = readDoc().split('\n')[0];
  assert.ok(first.startsWith(`# 第 ${CHAPTER} 章`), '标题章号对不上：' + first);
});
