'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  DOC, CHAPTER, TITLE, read, analyze, sectionOf, driftArithmetic, singleCaseScale, auditStructure, verify,
  DESIGNS, CONTROL_FORMS, RANDOM_STEPS,
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
  assert.ok(DOC.endsWith(path.join('chapters', '02-z132', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
});

test('章号与标题取自本章正文', () => {
  assert.strictEqual(CHAPTER, 2);
  assert.strictEqual(TITLE, '设计不是越严格越好，是能答你那个问题的那个');
  assert.match(BODY.split('\n')[0], new RegExp('^# 第 2 章 · ' + TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

test('正文统计可复算：汉字、节、加粗判断、问句', () => {
  assert.strictEqual(A.hanzi, 2772);
  assert.strictEqual(A.sections.length, 6);
  assert.strictEqual(A.claims, 31);
  assert.strictEqual(A.questions, 7);
});

test('三组清单齐全：三种设计、四种对照、随机三环节、六问', () => {
  const j = auditStructure(A.sections);
  assert.doesNotThrow(() => verify(j, driftArithmetic(), singleCaseScale()));
  assert.deepStrictEqual(j.designs, DESIGNS);
  assert.deepStrictEqual(j.forms, CONTROL_FORMS);
  assert.deepStrictEqual(j.steps, RANDOM_STEPS);
  assert.strictEqual(j.designQuestions, 6);
});

test('历史对照的 8 个百分点全部来自时间漂移', () => {
  const d = driftArithmetic();
  assert.deepStrictEqual(d, { vsHistory: 13, vsConcurrent: 21, drift: 8, driftInHistory: 8 });
  assert.match(BODY, /差 13 个百分点/);
  assert.match(BODY, /差 21 个百分点/);
  assert.match(BODY, /与疗法无关/);
});

test('单病例规模：12×2×4×4 = 384 患者周，每人 32 治疗周', () => {
  const s = singleCaseScale();
  assert.strictEqual(s.patientWeeks, 384);
  assert.strictEqual(s.weeksPerPatient, 32);
  assert.strictEqual(s.patientWeeks, 12 * 2 * 4 * 4);
  assert.match(BODY, /384 患者周/);
});

test('分配隐藏与盲法在正文里被明确分开', () => {
  const s3 = sectionOf(A.sections, '随机化怎么做');
  assert.match(s3.text, /分配隐藏与盲法是两件事/);
  assert.match(s3.text, /防止入组时挑选患者/);
  assert.match(s3.text, /防止干预后测量偏倚/);
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

test('脚本可运行，输出含现算漂移与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /均从本章 docs\/zh\.md 现算/);
  assert.match(r.stdout, /时间漂移 8 个百分点/);
  assert.match(r.stdout, /384 患者周/);
  assert.match(r.stdout, /不构成研究结论或临床建议/);
});
