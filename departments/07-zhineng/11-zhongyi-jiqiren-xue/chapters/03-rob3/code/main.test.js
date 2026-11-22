'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, parseCase, solveQ, analyze } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const BODY = read();
const X = analyze(BODY);

test('正文就在本章目录下，首行章题与章节元数据一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '03-rob3', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 3);
  assert.ok(BODY.startsWith('# 第 3 章 · ' + TITLE), '正文首行与章题不一致');
  assert.strictEqual(X.hasTitle, true);
});

test('算例的四条转移从正文读出：S1 两条、S2/S3 各一条', () => {
  assert.strictEqual(X.edges.length, 4);
  assert.deepStrictEqual(
    X.edges.map((e) => `${e.from}-${e.action}->${e.to}:${e.reward}`),
    ['S1-A->S2:1', 'S1-B->S3:-1', 'S2-A->终止:3', 'S3-A->终止:0'],
  );
  assert.deepStrictEqual(parseCase(BODY), X.edges);
});

test('动作空间 3^5 = 243 与正文一致', () => {
  assert.strictEqual(X.steps, 5);
  assert.strictEqual(X.branches, 3);
  assert.strictEqual(X.paths, 243);
  assert.strictEqual(X.statedPaths, 243);
  assert.strictEqual(X.paths, X.statedPaths);
});

test('折扣累积：Q(S1,A) = 3.7，Q(S1,B) = −1，与正文两个数字都对上', () => {
  assert.strictEqual(X.gamma, 0.9);
  assert.strictEqual(X.alpha, 1);
  assert.ok(Math.abs(X.q['S1|A'] - 3.7) < 1e-9, `Q(S1,A)=${X.q['S1|A']}`);
  assert.ok(Math.abs(X.q['S1|B'] + 1) < 1e-9);
  assert.ok(Math.abs(X.q['S2|A'] - 3) < 1e-9);
  assert.ok(Math.abs(X.q['S3|A']) < 1e-9);
  assert.ok(BODY.includes('3.7'), '正文应给出 3.7');
});

test('自举的含义：Q(S1,A) 大于任何单步奖励', () => {
  const single = Math.max(...X.edges.map((e) => e.reward));
  assert.ok(X.q['S1|A'] > single, 'Q 值必须体现后续收益，而不是单步奖励');
  assert.ok(Math.abs(X.q['S1|A'] - (1 + 0.9 * X.q['S2|A'])) < 1e-9);
});

test('γ 改成 0.1 后差距从 4.7 缩到 2.3', () => {
  assert.strictEqual(X.gammaAlt, 0.1);
  assert.ok(Math.abs(X.altQ['S1|A'] - 1.3) < 1e-9, `Q=${X.altQ['S1|A']}`);
  assert.ok(Math.abs(X.altQ['S1|B'] + 1) < 1e-9);
  const gap = X.q['S1|A'] - X.q['S1|B'];
  const gapAlt = X.altQ['S1|A'] - X.altQ['S1|B'];
  assert.ok(Math.abs(gap - 4.7) < 1e-9);
  assert.ok(Math.abs(gapAlt - 2.3) < 1e-9);
  assert.ok(gapAlt < gap, '折现率降低后远期优势必须被压缩');
});

test('5 步后 +3 的折现：γ=0.9 得 1.77，γ=0.5 得 0.09，结论相反', () => {
  assert.strictEqual(X.lateSteps, 5);
  assert.strictEqual(X.late, 3);
  assert.ok(Math.abs(X.disc09 - 1.77) < 0.01, `disc=${X.disc09}`);
  assert.ok(Math.abs(X.disc05 - 0.09) < 0.01);
  assert.ok(X.disc09 > 1, 'γ=0.9 时远期应胜出');
  assert.ok(X.disc05 < 1, 'γ=0.5 时即时应胜出');
  assert.ok(Math.abs(0.1 ** 8 - 1e-8) < 1e-12);
});

test('五元组表 5 行，奖励三类错误与临床三件事都在正文里', () => {
  assert.strictEqual(X.tuple.length, 5);
  assert.ok(X.tuple.map((t) => t.math).join('').length > 0);
  assert.strictEqual(X.rewardErrors, 3);
  assert.strictEqual(X.clinicalRules, 3);
});

test('求解器可复用于别的 γ：单调性成立', () => {
  const low = solveQ(X.edges, 0.1).q['S1|A'];
  const high = solveQ(X.edges, 0.99).q['S1|A'];
  assert.ok(high > low, 'γ 越大，远期收益权重越高，Q(S1,A) 应更大');
  assert.ok(Math.abs(solveQ(X.edges, 0).q['S1|A'] - 1) < 1e-9, 'γ=0 时只剩即时奖励');
});

test('脚本可运行，输出带现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /均从本章 docs\/zh\.md 现算/);
  assert.match(out, /不构成诊疗方案或处方建议/);
  assert.ok(out.includes('Q(S1,A) = 3.70'));
  assert.ok(out.includes('243'));
});
