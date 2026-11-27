'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, analyze, sectionOf, auditAsset, verify, LIFECYCLE, BENEFIT, BUILDING, DISCIPLINE } = require('./main.js');

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
  assert.ok(DOC.endsWith(path.join('chapters', '07-y7', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
});

test('章号与标题取自本章正文', () => {
  assert.strictEqual(CHAPTER, 7);
  assert.strictEqual(TITLE, '设备的账不在买贵了，在用坏了没人认');
  assert.match(BODY.split('\n')[0], new RegExp('^# 第 7 章 · ' + TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

test('正文统计可复算：汉字、节、加粗判断、引文', () => {
  assert.strictEqual(A.hanzi, 2791);
  assert.strictEqual(A.sections.length, 7);
  assert.strictEqual(A.claims, 45);
  assert.strictEqual(A.quotes.length, 1);
});

test('生命周期账：六段、效益四数、建筑三原则、学科四件事', () => {
  const s = auditAsset(A.sections);
  assert.doesNotThrow(() => verify(s));
  assert.deepStrictEqual(s.lifecycle, LIFECYCLE);
  assert.deepStrictEqual(s.benefit, BENEFIT);
  assert.deepStrictEqual(s.building, BUILDING);
  assert.deepStrictEqual(s.discipline, DISCIPLINE);
  assert.strictEqual(s.downtime, true);
});

test('验收与维保的失效点写在正文原句里', () => {
  const s1 = sectionOf(A.sections, '六段生命周期');
  assert.match(s1.text, /唯一能把厂家承诺变成书面责任/);
  assert.match(s1.text, /响应条款没有罚则/);
  assert.match(s1.text, /需求不足（论证错了）、操作不会（培训不到位）、故障频繁（维保不力）/);
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
  assert.match(r.stdout, /生命周期 6\/6/);
  assert.match(r.stdout, /不构成设备采购或工程管理意见/);
});
