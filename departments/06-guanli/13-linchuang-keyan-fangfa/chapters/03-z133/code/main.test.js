'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  DOC, CHAPTER, TITLE, read, analyze, sectionOf, nMean, nRate, deltaTable, inflate, kappa, designEffect, auditStructure, verify,
} = require('./main.js');

const BODY = read();
const A = analyze(BODY);

function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

test('正文文件就在本章目录下', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '03-z133', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
});

test('章号与标题取自本章正文', () => {
  assert.strictEqual(CHAPTER, 3);
  assert.strictEqual(TITLE, '样本量不是越多越好，是够看清你要看的那点差');
  assert.match(BODY.split('\n')[0], new RegExp('^# 第 3 章 · ' + TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

test('正文统计可复算：汉字、节、加粗判断', () => {
  assert.strictEqual(A.hanzi, 2663);
  assert.strictEqual(A.sections.length, 6);
  assert.strictEqual(A.claims, 26);
});

test('均数设计复算：σ=2.2、δ=1.5 → 33.77 → 34 例/组', () => {
  assert.ok(Math.abs(nMean(1.5) - 33.77) < 0.05, nMean(1.5).toFixed(2));
  assert.strictEqual(Math.ceil(nMean(1.5)), 34);
  assert.match(BODY, /≈ 33\.8 → 每组 34 例|33\.8 → 每组 34 例/);
});

test('δ 表四行复算：34 / 53 / 76 / 119，倍数 1.00 / 1.56 / 2.24 / 3.50', () => {
  const t = deltaTable();
  assert.deepStrictEqual(t.map((r) => r.n), [34, 53, 76, 119]);
  assert.deepStrictEqual(t.map((r) => r.multiple), [1, 1.56, 2.24, 3.5]);
});

test('率设计复算：35%→55% 得 96 例/组，比均数设计多出近两倍', () => {
  assert.strictEqual(Math.ceil(nRate()), 96);
  assert.ok(nRate() > 2 * nMean(1.5), '同样的 20 个百分点，率设计例数应远多于均数设计');
  assert.ok(Math.abs(nRate() - 95.94) < 0.1);
});

test('失访膨胀：34 → 40（15%）/ 43（20%）；96 → 113（15%）', () => {
  assert.strictEqual(inflate(34, 0.15), 40);
  assert.strictEqual(inflate(34, 0.2), 43);
  assert.strictEqual(inflate(96, 0.15), 113);
});

test('κ 与设计效应复算：κ=0.56、设计效应 2.2、有效样本 ≈45', () => {
  assert.strictEqual(kappa().toFixed(2), '0.56');
  assert.strictEqual(designEffect(), 2.2);
  assert.strictEqual(Math.round(100 / designEffect()), 45);
  assert.match(BODY, /κ=0\.56/);
});

test('结构三组齐：四条抽样路径、三个输入、三条提高一致性的路', () => {
  const j = auditStructure(A.sections);
  assert.doesNotThrow(() => verify(j, deltaTable(), Math.ceil(nRate()), [inflate(34, 0.15), inflate(34, 0.2)]));
  assert.strictEqual(j.paths.length, 4);
  assert.strictEqual(j.inputs.length, 3);
  assert.strictEqual(j.improvePaths, 3);
});

test('quiz：≥5 题、三段齐、四选项、解释够长、答案打散', () => {
  const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));
  const qs = quiz.questions;
  assert.ok(qs.length >= 5, `只有 ${qs.length} 题`);
  for (const s of ['pre', 'check', 'post']) assert.ok(qs.some((q) => q.stage === s), `缺 ${s} 段`);
  for (const q of qs) {
    assert.strictEqual(q.options.length, 4);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4);
    assert.ok(hanzi(q.explain) >= 30, `explain 只有 ${hanzi(q.explain)} 汉字`);
  }
  assert.ok(new Set(qs.map((q) => q.correct)).size >= 3, '正确答案过于集中');
});

test('quiz 的 check 题正确选项落在本章正文里（≥2 道）', () => {
  const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));
  const body = shingles(BODY);
  const checks = quiz.questions.filter((q) => q.stage === 'check');
  const grounded = checks.filter((q) => [...shingles(q.options[q.correct])].some((s) => body.has(s)));
  assert.ok(checks.length >= 3);
  assert.ok(grounded.length >= 2, `只有 ${grounded.length} 道接地`);
});

test('脚本可运行，输出含现算 n 与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /均从本章 docs\/zh\.md 现算/);
  assert.match(r.stdout, /33\.77 → 每组 34 例/);
  assert.match(r.stdout, /δ=0\.8 分 → 119 例\/组（×3\.50）/);
  assert.match(r.stdout, /不构成研究结论或临床建议/);
});
