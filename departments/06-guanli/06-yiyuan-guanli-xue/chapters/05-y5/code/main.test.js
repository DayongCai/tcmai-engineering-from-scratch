'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, analyze, sectionOf, auditQuality, verify, LAYERS, CORE_RULES, REPORT_LEVELS, VARIANCES } = require('./main.js');

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
  assert.ok(DOC.endsWith(path.join('chapters', '05-y5', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
});

test('章号与标题取自本章正文', () => {
  assert.strictEqual(CHAPTER, 5);
  assert.strictEqual(TITLE, '质量指标可以修饰，质量成本修饰不了');
  assert.match(BODY.split('\n')[0], new RegExp('^# 第 5 章 · ' + TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

test('正文统计可复算：汉字、节、加粗判断、引文', () => {
  assert.strictEqual(A.hanzi, 2684);
  assert.strictEqual(A.sections.length, 6);
  assert.strictEqual(A.claims, 37);
  assert.strictEqual(A.quotes.length, 1);
});

test('指标结构：三层、四项制度、五档分级、三类变异、四级成本', () => {
  const q = auditQuality(A.sections);
  assert.doesNotThrow(() => verify(q));
  assert.deepStrictEqual(q.layers, LAYERS);
  assert.deepStrictEqual(q.coreRules, CORE_RULES);
  assert.deepStrictEqual(q.levels, REPORT_LEVELS);
  assert.deepStrictEqual(q.variances, VARIANCES);
  assert.strictEqual(q.costLevels, 4);
});

test('上报悖论与可干预判断写在正文里', () => {
  const s3 = sectionOf(A.sections, '上报率悖论');
  assert.match(s3.text, /报告越多，数据越难看；报告越少，系统越危险/);
  assert.match(s3.text, /一旦把上报量与科室绩效负向挂钩，数据会在一个季度内消失/);
  const s1 = sectionOf(A.sections, '三层结构');
  assert.match(s1.text, /过程指标不直观，但\*\*可干预\*\*/);
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
  assert.match(r.stdout, /质量三层 3\/3/);
  assert.match(r.stdout, /不构成审计意见或质量认证结论/);
});
