'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, hanzi, sections, audit } = require('./main.js');

const BODY = read();
const A = audit(BODY);

function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('正文就在本章目录下，章号与标题对得上', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '05-z85', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 5);
  assert.match(BODY.split('\n')[0], new RegExp('^# 第 5 章 · ' + TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

test('规模可复算：汉字、节、引文', () => {
  assert.ok(hanzi(BODY) > 2500, String(hanzi(BODY)));
  assert.strictEqual(sections(BODY).length, 5);
  assert.ok([...BODY.matchAll(/《([^》\n]+)》/g)].length >= 1);
});

test('三层质量、口径三问、可比三条件', () => {
  assert.deepStrictEqual(A.layers, ['结构', '过程', '结果']);
  assert.deepStrictEqual(A.questions, ['分子分母是谁', '时间窗多长', '归谁负责']);
  assert.deepStrictEqual(A.comparables, ['同一病例组合', '同一时间窗', '同一数据来源']);
});

test('压方差手段 7 条、加盟合同 3 件、绩效 3 原则、配对 4 对', () => {
  assert.strictEqual(A.counts.varianceMeans, 7);
  assert.match(A.varianceMeans.join(''), /盲样测试/);
  assert.match(A.varianceMeans.join(''), /不良事件的免责上报/);
  assert.strictEqual(A.counts.franchise, 3);
  assert.deepStrictEqual(A.performance, ['多指标', '有门槛', '能延迟']);
  assert.strictEqual(A.counts.pairs, 4);
  assert.deepStrictEqual(A.mismatched, []);
});

test('卷首检出率复算：极差 19 点、约 3.4 倍，「差三倍」站得住', () => {
  const { raw, derived } = A;
  assert.strictEqual(raw.stores, 14);
  assert.strictEqual(raw.satisfaction, 92);
  assert.strictEqual(raw.low, 8);
  assert.strictEqual(raw.high, 27);
  assert.strictEqual(derived.spread, 19);
  assert.ok(Math.abs(derived.ratio - 3.375) < 1e-9);
  assert.ok(derived.threefoldClaim);
  assert.strictEqual(raw.uplift, 34);
});

test('quiz 的 check 题正确选项落在本章正文里（≥2 道），答案下标打散', () => {
  const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));
  const body = shingles(BODY);
  const checks = quiz.questions.filter((q) => q.stage === 'check');
  const grounded = checks.filter((q) => {
    const right = String(q.options[q.correct] || '');
    return [...shingles(right)].some((g) => body.has(g));
  });
  assert.ok(checks.length >= 2);
  assert.ok(grounded.length >= 2, `只有 ${grounded.length} 道接地`);
  const used = new Set(quiz.questions.map((q) => q.correct));
  assert.ok(used.size >= 3, '正确答案过于集中在一个下标');
  for (const q of quiz.questions) {
    assert.strictEqual(q.options.length, 4);
    assert.ok(hanzi(q.explain) >= 30, q.question);
  }
});

test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /均从本章 docs\/zh\.md 现算/);
  assert.match(r.stdout, /对账一致/);
  assert.match(r.stdout, /倍数成立/);
  assert.match(r.stdout, /不构成统计意见/);
});
