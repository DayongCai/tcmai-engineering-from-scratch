'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, analyze, boldTerms, sectionOf, auditJudgement, verify, CRITERIA, PUBLIC, DUTIES } = require('./main.js');

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
  assert.ok(DOC.endsWith(path.join('chapters', '01-y1', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
});

test('章号与标题取自本章正文', () => {
  assert.strictEqual(CHAPTER, 1);
  assert.strictEqual(TITLE, '医院管理的第一道分界，是住院能力而不是招牌');
  assert.match(BODY.split('\n')[0], new RegExp('^# 第 1 章 · ' + TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

test('正文统计可复算：汉字、节、加粗判断、引文', () => {
  assert.strictEqual(A.hanzi, 2748);
  assert.strictEqual(A.sections.length, 5);
  assert.strictEqual(A.claims, 25);
  assert.strictEqual(A.quotes.length, 1);
  const sum = A.sections.reduce((s, x) => s + x.hanzi, 0);
  assert.ok(sum > 0 && sum <= A.hanzi, `${sum} vs ${A.hanzi}`);
});

test('三组判据齐全：准入 3 条、公益 4 项、职能 4 改', () => {
  const j = auditJudgement(A.sections);
  assert.doesNotThrow(() => verify(j));
  assert.deepStrictEqual(j.criteria, CRITERIA);
  assert.deepStrictEqual(j.publicWelfare, PUBLIC);
  assert.deepStrictEqual(j.duties, DUTIES);
  assert.strictEqual(j.gaugeQuestions, 3);
});

test('判据取自正文原词，不是脚本里手写的结论', () => {
  const s1 = sectionOf(A.sections, '医院之所以是医院');
  for (const c of CRITERIA) assert.ok(s1.text.includes(c), c);
  assert.ok(s1.text.includes('可分配的责任单位'));
});

test('加床的收益与代价分列，正文没有把它写成纯收益', () => {
  const s1 = sectionOf(A.sections, '医院之所以是医院');
  assert.match(s1.text, /收益记在收治量上，代价记在别处/);
  assert.match(s1.text, /护理半径拉长/);
  assert.match(s1.text, /加床永远比减床容易决定/);
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
  assert.match(r.stdout, /准入判据 3\/3/);
  assert.match(r.stdout, /不构成管理咨询或医疗意见/);
});
