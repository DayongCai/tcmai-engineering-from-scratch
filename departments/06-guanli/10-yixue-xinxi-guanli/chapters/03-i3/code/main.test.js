'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  DOC, CHAPTER, TITLE, read, parseTables, params, authority, mesh, mpiConfig,
  editDistance, makeScorer, classify, compute, verify,
} = require('./main.js');

const BODY = read();
const P = params(BODY);
const A = authority(parseTables(BODY));
const CFG = mpiConfig(BODY);
const C = compute(P, CFG);
const score = makeScorer(CFG);

function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('正文就在本章目录下且标题与章号一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '03-i3', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
  assert.strictEqual(CHAPTER, 3);
  assert.match(BODY.split('\n')[0], new RegExp('^# 第 3 章 · ' + TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

test('抽查参数读自正文，不是手打常量', () => {
  assert.strictEqual(P.results, 3000);
  assert.strictEqual(P.noOrder, 37);
  assert.strictEqual(P.noSpecimen, 11);
  assert.strictEqual(C.gap, 48);
});

test('两条链各缺一点，合计 1.6%：单看任一方都「完整」', () => {
  assert.strictEqual(C.orderRate.toFixed(2), '1.23');
  assert.strictEqual(C.specimenRate.toFixed(2), '0.37');
  assert.strictEqual(C.gapRate.toFixed(1), '1.6');
});

test('权威系统表 7 项，覆盖身份、医嘱、检验、影像、文书、手术、药品', () => {
  assert.strictEqual(A.rows, 7);
  assert.ok(A.data.includes('患者身份、就诊、费用'));
  assert.ok(A.data.includes('检验申请、标本、结果'));
});

test('点对点链路 n(n−1)/2：20 家 190 条，与正文一致', () => {
  assert.strictEqual(mesh(10), 45);
  assert.strictEqual(mesh(20), 190);
  assert.ok(BODY.includes('190 条链路'));
});

test('MPI 权重合计为 1，打分与三档判定可用', () => {
  assert.ok(Math.abs(C.weightSum - 1) < 1e-9);
  assert.strictEqual(CFG.auto, 0.9);
  assert.strictEqual(CFG.reviewLow, 0.75);
  const base = { name: '张三', birth: '19700412', sex: 'M', idLast4: '1234', phone: '13800001234' };
  assert.strictEqual(score(base, base), 1);
  assert.strictEqual(classify(score(base, base), CFG), 'merge');
  const weak = { ...base, idLast4: '', phone: '' };
  assert.strictEqual(score(base, weak).toFixed(2), '0.75');
  assert.strictEqual(classify(score(base, weak), CFG), 'review');
  assert.strictEqual(classify(0.5, CFG), 'reject');
});

test('形近字按 0.6 折计入，不是全额', () => {
  assert.strictEqual(editDistance('张三', '张叁'), 1);
  const a = { name: '张三', birth: '19700412', sex: 'M', idLast4: '', phone: '' };
  const b = { ...a, name: '张叁' };
  assert.strictEqual(score(a, b).toFixed(2), '0.61');
});

test('正文与复算对得上（verify 不抛错）', () => {
  assert.doesNotThrow(() => verify(C, A, CFG, BODY));
});

test('quiz 的 check 题正确选项落在本章正文里（≥2 道）', () => {
  const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));
  const body = shingles(BODY);
  const checks = quiz.questions.filter((q) => q.stage === 'check');
  const grounded = checks.filter((q) => {
    const right = String(q.options[q.correct] || '');
    return [...shingles(right)].some((s) => body.has(s));
  });
  assert.ok(checks.length >= 2);
  assert.ok(grounded.length >= 2, `只有 ${grounded.length} 道接地`);
});

test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /均从本章 docs\/zh\.md 现算/);
  assert.match(r.stdout, /合计缺口 48 条 = 1\.6%/);
  assert.match(r.stdout, /不构成系统选型或集成方案/);
});
