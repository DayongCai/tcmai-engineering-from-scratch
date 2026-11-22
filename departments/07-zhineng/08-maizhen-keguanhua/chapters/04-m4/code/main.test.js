'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, analyze, normCdf, cutStats, ciHalfWidth, inv2, lda } = require('./main.js');

const TEXT = read();
const A = analyze(TEXT);
const MAIN = path.join(__dirname, 'main.js');

test('正文在本章目录下，章号与标题一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '04-m4', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 4);
  assert.ok(TEXT.startsWith('# 第 ' + CHAPTER + ' 章'));
  assert.ok(TEXT.includes(TITLE));
});

test('Φ 的表值与常用点一致', () => {
  assert.ok(Math.abs(normCdf(0) - 0.5) < 1e-9);
  assert.ok(Math.abs(normCdf(1.96) - 0.975) < 1e-4, String(normCdf(1.96)));
  assert.ok(Math.abs(normCdf(-1) - 0.1587) < 1e-4);
  assert.ok(Math.abs(normCdf(1.8) - 0.9641) < 1e-4);
});

test('呼吸锚换算：一息五动 × 16 至 20 次/分 ＝ 80 至 100 次/分', () => {
  assert.deepStrictEqual(A.breath, [16, 20]);
  assert.strictEqual(A.breath[0] * 5, 80);
  assert.strictEqual(A.breath[1] * 5, 100);
  assert.match(TEXT, /12 次\/分的人，五动一息只有 60 次\/分/);
});

test('切点表用正文的两个正态分布重算，与表里印的数逐格一致', () => {
  assert.deepStrictEqual(A.dist, [{ mu: 96, sd: 10 }, { mu: 78, sd: 10 }]);
  assert.deepStrictEqual(A.stated.map((s) => s.cut), [78, 84, 90, 96]);
  for (let i = 0; i < A.stated.length; i += 1) {
    const s = A.stated[i];
    const c = A.computed[i];
    assert.strictEqual(c.cut, s.cut);
    assert.ok(Math.abs(c.sens - s.sens) < 0.006, `切点 ${s.cut} 敏感度 ${c.sens} vs ${s.sens}`);
    assert.ok(Math.abs(c.spec - s.spec) < 0.006, `切点 ${s.cut} 特异度 ${c.spec} vs ${s.spec}`);
    assert.ok(Math.abs(c.youden - s.youden) < 0.006, `切点 ${s.cut} 约登 ${c.youden} vs ${s.youden}`);
  }
});

test('84 与 90 的约登指数相同 —— 正文那张表的核心事实', () => {
  const y = (cut) => A.computed.find((c) => c.cut === cut).youden;
  assert.ok(Math.abs(y(84) - y(90)) < 1e-6, `${y(84)} vs ${y(90)}`);
  assert.strictEqual(y(84).toFixed(2), '0.61');
  assert.ok(y(84) > y(78) && y(84) > y(96), '中间两档应高于两端');
});

test('60 例上敏感度 0.73 的 95% 区间半宽约 0.11', () => {
  const h = ciHalfWidth(0.73, 60);
  assert.ok(Math.abs(h - 0.112) < 0.002, String(h));
  assert.strictEqual(h.toFixed(2), '0.11');
  assert.strictEqual(A.ci.n, 60);
  assert.throws(() => ciHalfWidth(0, 60));
});

test('LDA：w ＝ Σ⁻¹d ＝ (0.9375, −0.0625)，夹角 32.9°，可分性 1.06 → 0.8125', () => {
  assert.deepStrictEqual(inv2(0.6), [[1.5625, -0.9375], [-0.9375, 1.5625]]);
  assert.deepStrictEqual(A.lda.w, [0.9375, -0.0625]);
  assert.strictEqual(A.lda.angle.toFixed(1), '32.9');
  assert.ok(Math.abs(A.lda.independent - 1.06) < 1e-12);
  assert.ok(Math.abs(A.lda.correlated - 0.8125) < 1e-12);
  assert.ok(A.lda.correlated < A.lda.independent, '相关应削掉一部分可分性');
  assert.match(TEXT, /32\.9°/);
  assert.match(TEXT, /0\.812/);
  assert.throws(() => inv2(1));
});

test('14 个特征共同协方差 105 个自由参数；50 例 / 6 类算不动', () => {
  assert.strictEqual(A.covParams, 105);
  assert.match(TEXT, /14 × 15 \/ 2 = 105/);
  assert.match(TEXT, /50 例估 105 个协方差参数/);
});

test('正文把演算设定与实测分开：不报模型性能', () => {
  assert.match(TEXT, /全部是\*\*演算设定\*\*|演算设定/);
  assert.match(TEXT, /不给出任何模型的准确率、敏感性或样本量/);
  assert.ok(!/AUC\s*[=＝]\s*0?\.\d+/.test(TEXT), '正文不应给 AUC 数值');
});

test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /均从本章 docs\/zh\.md 现算/);
  assert.match(out, /演算设定/);
  assert.ok(out.includes('夹角 32.9°'), '输出里的夹角与正文的 32.9° 不一致');
  assert.ok(out.includes('105 个自由参数'), '输出里的参数个数与正文的 105 不一致');
  assert.match(out, /两者敏感度差 0\.15/);
});
