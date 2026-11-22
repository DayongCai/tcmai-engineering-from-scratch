'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, analyze, odds, oddsRatio, laplace, priorsFromBody } = require('./main.js');

const TEXT = read();
const A = analyze(TEXT);
const MAIN = path.join(__dirname, 'main.js');

test('正文在本章目录下，章号与标题一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '02-m2', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 2);
  assert.ok(TEXT.startsWith('# 第 ' + CHAPTER + ' 章'), '正文首行不是本章章题');
  assert.ok(TEXT.includes(TITLE), '章题与正文标题不一致');
});

test('两个先验从正文读出：门诊 30%、社区 3%', () => {
  assert.deepStrictEqual(priorsFromBody(TEXT).slice(0, 2), [30, 3]);
  assert.deepStrictEqual(A.priors.slice(0, 2), [30, 3]);
});

test('几率比现算后与正文的约 13.9 倍一致', () => {
  assert.ok(Math.abs(A.ratio - 13.857) < 0.01, String(A.ratio));
  assert.strictEqual(A.ratio.toFixed(1), '13.9');
  assert.ok(TEXT.includes('13.9'), '正文应写出约 13.9 倍');
});

test('换到健康人群（不足 1%）时，比值更大而不是更小', () => {
  assert.ok(A.ratioHealth > A.ratio, `${A.ratioHealth} vs ${A.ratio}`);
  assert.ok(Math.abs(A.ratioHealth - 42.43) < 0.05, String(A.ratioHealth));
  assert.match(TEXT, /不足\s*1%/);
});

test('几率函数对边界先验报错，不静默返回 NaN', () => {
  assert.strictEqual(odds(50), 1);
  assert.throws(() => odds(0));
  assert.throws(() => odds(100));
  assert.strictEqual(oddsRatio(30, 30), 1);
});

test('零频在未平滑时归零，拉普拉斯后不为零', () => {
  assert.strictEqual(laplace(0, 20, 0, 2), 0);
  assert.ok(Math.abs(laplace(0, 20, 1, 2) - 1 / 22) < 1e-12);
  assert.ok(laplace(0, 20, 0.1, 2) < laplace(0, 20, 1, 2), 'α 越大，罕见证据被抹得越平');
  assert.match(TEXT, /拉普拉斯平滑/);
});

test('三项对照表 3 行、适用场合 3 条，都从正文数出来', () => {
  assert.strictEqual(A.rows, 3);
  assert.strictEqual(A.uses, 3);
  assert.strictEqual(A.sections.length, 6);
});

test('正文把示意与实测分开：30% 与 3% 明标为示意算式', () => {
  assert.match(TEXT, /示意算式/);
  assert.match(TEXT, /不给出任何证型的实际先验/);
  assert.ok(!/准确率\s*[0-9.]+%/.test(TEXT), '正文不应出现准确率数字');
});

test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /均从本章 docs\/zh\.md 现算/);
  assert.match(out, /不是真实患病率/);
  assert.ok(out.includes('≈ 13.9 倍'), '输出里的几率比与正文的 13.9 不一致');
  assert.ok(out.includes('门诊 30% · 社区 3%'), '输出里的先验与正文不一致');
});
