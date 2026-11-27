'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, analyze, sectionOf, auditDualTrack, verify, CULTURE, CONFLICTS, STEPS, SYNERGY } = require('./main.js');

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
  assert.ok(DOC.endsWith(path.join('chapters', '09-y9', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
});

test('章号与标题取自本章正文', () => {
  assert.strictEqual(CHAPTER, 9);
  assert.strictEqual(TITLE, '中医院的难题不是多挂一块牌子，是让两套疗效判据互相承认');
  assert.match(BODY.split('\n')[0], new RegExp('^# 第 9 章 · ' + TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

test('正文统计可复算：汉字、节、加粗判断、引文', () => {
  assert.strictEqual(A.hanzi, 3038);
  assert.strictEqual(A.sections.length, 7);
  assert.strictEqual(A.claims, 42);
  assert.strictEqual(A.quotes.length, 1);
});

test('双轨账：文化三层、三冲突、优势病种四步、协同四形态', () => {
  const d = auditDualTrack(A.sections);
  assert.doesNotThrow(() => verify(d));
  assert.deepStrictEqual(d.culture, CULTURE);
  assert.deepStrictEqual(d.conflicts, CONFLICTS);
  assert.deepStrictEqual(d.steps, STEPS);
  assert.deepStrictEqual(d.synergy, SYNERGY);
  assert.strictEqual(d.mainOwner, true);
  assert.strictEqual(d.window, true);
});

test('结构化记录与主责划分写在正文原句里', () => {
  const s4 = sectionOf(A.sections, '优势病种');
  assert.match(s4.text, /穴位名称、操作时长、疗程、疗效评价时点与工具/);
  const s3 = sectionOf(A.sections, '科室设置的双轨');
  assert.match(s3.text, /每一个重点病种明确一个主责科室/);
  assert.match(s3.text, /按结局数据调整，而不是按历史归属固化/);
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

test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /均从本章 docs\/zh\.md 现算/);
  assert.match(r.stdout, /协同形态 4\/4/);
  assert.match(r.stdout, /不构成诊疗意见或疗效评价结论/);
});
