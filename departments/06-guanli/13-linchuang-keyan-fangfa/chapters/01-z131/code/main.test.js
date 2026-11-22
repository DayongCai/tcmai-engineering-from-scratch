'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  DOC, CHAPTER, TITLE, read, analyze, sectionOf, funnel, perArmNeeded, deltaRatio, auditStructure, verify,
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
  assert.ok(DOC.endsWith(path.join('chapters', '01-z131', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
});

test('章号与标题取自本章正文', () => {
  assert.strictEqual(CHAPTER, 1);
  assert.strictEqual(TITLE, '好问题不是「某方有效吗」，而是能说出什么结果会让你认输');
  assert.match(BODY.split('\n')[0], new RegExp('^# 第 1 章 · ' + TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

test('正文统计可复算：汉字、节、加粗判断、引文', () => {
  assert.strictEqual(A.hanzi, 2876);
  assert.strictEqual(A.sections.length, 6);
  assert.strictEqual(A.claims, 26);
  assert.strictEqual(A.quotes.length, 1);
  const sum = A.sections.reduce((s, x) => s + x.hanzi, 0);
  assert.ok(sum > 0 && sum <= A.hanzi, `${sum} vs ${A.hanzi}`);
});

test('可行性漏斗逐年打折：620 → 279 → 167 → 142', () => {
  const rows = funnel();
  assert.deepStrictEqual(rows.map((r) => r.n), [620, 279, 167, 142]);
  assert.deepStrictEqual(rows.map((r) => r.rate), [null, 0.45, 0.6, 0.85]);
});

test('每组 60 例、15% 失访 → 71 例/组，两组正好 142 例', () => {
  assert.strictEqual(perArmNeeded(), 71);
  assert.strictEqual(perArmNeeded(), Math.ceil(60 / 0.85));
  assert.strictEqual(perArmNeeded() * 2, funnel()[3].n);
});

test('放宽纳入把年可入组抬到 221 例，但 δ 缩一档就是 2.25 倍样本', () => {
  const relaxed = funnel(0.7);
  assert.strictEqual(relaxed[3].n, 221);
  assert.strictEqual(deltaRatio(), 2.25);
  assert.ok(relaxed[3].n > funnel()[3].n, '放宽后例数应当变多');
  assert.ok(deltaRatio() > 2 && deltaRatio() < 3, '正文说的是翻一倍多');
});

test('结构五组齐：PICO 4 槽、假假设 3 种、主结局 3 问、写坏 4 种、边界 4 条', () => {
  const j = auditStructure(A.sections);
  assert.doesNotThrow(() => verify(j, funnel(), funnel(0.7)));
  assert.strictEqual(j.pico.length, 4);
  assert.strictEqual(j.fakeHypotheses, 3);
  assert.strictEqual(j.mainQuestions, 3);
  assert.strictEqual(j.badWritings, 4);
  assert.strictEqual(j.boundaries, 4);
});

test('漏斗终点与正文写的 142 例、71 例、221 例对得上', () => {
  assert.match(BODY, /142 例/);
  assert.match(BODY, /71 例\/组/);
  assert.match(BODY, /221 例/);
  assert.strictEqual(funnel()[3].n, 142);
});

test('四种写坏方式确实在第五节，且都以「其一二三四」起句', () => {
  const s5 = sectionOf(A.sections, '问题写坏的四种方式');
  for (const k of ['其一', '其二', '其三', '其四']) assert.ok(s5.text.includes(`**${k}，`), k);
  assert.match(s5.text, /什么结果会让我放弃这个假设/);
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

test('脚本可运行，输出含现算漏斗与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /均从本章 docs\/zh\.md 现算/);
  assert.match(r.stdout, /142 例/);
  assert.match(r.stdout, /2\.25 倍/);
  assert.match(r.stdout, /不构成研究结论或临床建议/);
});
