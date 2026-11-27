'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  DOC, CHAPTER, TITLE, read, analyze, sectionOf, phi, familyError, power, bonferroni, holm, benjaminiHochberg, pathFreedom, auditStructure, verify, P_VALUES,
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
  assert.ok(DOC.endsWith(path.join('chapters', '07-z137', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
});

test('章号与标题取自本章正文', () => {
  assert.strictEqual(CHAPTER, 7);
  assert.strictEqual(TITLE, '二十个指标里总有一个 p<0.05，这不是发现');
  assert.match(BODY.split('\n')[0], new RegExp('^# 第 7 章 · ' + TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

test('正文统计可复算：汉字、节、加粗判断、问句', () => {
  assert.strictEqual(A.hanzi, 2682);
  assert.strictEqual(A.sections.length, 6);
  assert.strictEqual(A.claims, 38);
  assert.strictEqual(A.questions, 12);
});

test('族错误率 1−0.95^k：0.05 / 0.23 / 0.40 / 0.64 / 0.92', () => {
  assert.deepStrictEqual([1, 5, 10, 20, 50].map((k) => familyError(k)), [0.05, 0.23, 0.4, 0.64, 0.92]);
  assert.match(BODY, /1−0\.95²⁰＝0\.642/);
});

test('三档校正复算：Bonferroni 1 个、Holm 2 个、BH 3 个', () => {
  assert.strictEqual(bonferroni(P_VALUES), 1);
  assert.strictEqual(holm(P_VALUES), 2);
  assert.strictEqual(benjaminiHochberg(P_VALUES), 3);
  assert.match(BODY, /\*\*1 个发现\*\*/);
  assert.match(BODY, /\*\*2 个发现\*\*/);
  assert.match(BODY, /\*\*3 个发现\*\*/);
});

test('正态近似可用：Φ(0)=0.5，Φ(1.96)≈0.975', () => {
  assert.ok(Math.abs(phi(0) - 0.5) < 1e-9);
  assert.ok(Math.abs(phi(1.959964) - 0.975) < 1e-4, phi(1.959964).toFixed(6));
});

test('把握度表复算：d=0.3/0.5/0.8 × n=40/64/100', () => {
  const got = [0.3, 0.5, 0.8].map((d) => [40, 64, 100].map((n) => power(d, n)));
  assert.deepStrictEqual(got, [[0.27, 0.4, 0.56], [0.61, 0.81, 0.94], [0.95, 0.99, 1]]);
  assert.match(BODY, /\| 0\.3 \| 0\.27 \| 0\.40 \| 0\.56 \|/);
});

test('八个岔口与结构三组齐：2 种错误控制、3 档校正、3 层复现', () => {
  const j = auditStructure(A.sections);
  const free = pathFreedom(A.sections);
  assert.doesNotThrow(() => verify(j, free, [0.3, 0.5, 0.8].map((d) => ({ d, powers: [40, 64, 100].map((n) => power(d, n)) }))));
  assert.strictEqual(free.items, 8);
  assert.strictEqual(free.min, 256);
  assert.strictEqual(j.targets.length, 2);
  assert.strictEqual(j.methods.length, 3);
  assert.strictEqual(j.levels.length, 3);
  assert.strictEqual(j.reportGroups, 6);
});

test('「先看数据再定主结局」被正文列为最不该做的一步', () => {
  const s3 = sectionOf(A.sections, '哪些「多重」必须校正');
  assert.match(s3.text, /先看数据，再决定哪个当主结局/);
  assert.match(s3.text, /最不该做的事/);
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

test('脚本可运行，输出含现算 FWER 与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /均从本章 docs\/zh\.md 现算/);
  assert.match(r.stdout, /k=20 → 0\.64/);
  assert.match(r.stdout, /Benjamini–Hochberg（控 FDR）→ 3 个发现/);
  assert.match(r.stdout, /不构成研究结论或临床建议/);
});
