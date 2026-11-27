'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  DOC, CHAPTER, TITLE, read, analyze, sectionOf, simpson, lossArithmetic, blindingShift, entryErrors, auditStructure, verify,
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
  assert.ok(DOC.endsWith(path.join('chapters', '04-z134', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
});

test('章号与标题取自本章正文', () => {
  assert.strictEqual(CHAPTER, 4);
  assert.strictEqual(TITLE, '偏倚不是做错了，是把每一步都做对也还在');
  assert.match(BODY.split('\n')[0], new RegExp('^# 第 4 章 · ' + TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

test('正文统计可复算：汉字、节、加粗判断', () => {
  assert.strictEqual(A.hanzi, 2722);
  assert.strictEqual(A.sections.length, 6);
  assert.strictEqual(A.claims, 34);
});

test('辛普森悖论复算：每层 +5 个百分点，合计 −31 个百分点', () => {
  const s = simpson();
  assert.strictEqual(s.light.diff, 5);
  assert.strictEqual(s.severe.diff, 5);
  assert.strictEqual(s.total.diff, -31);
  assert.strictEqual(s.total.newYes, 64);
  assert.strictEqual(s.total.stdYes, 126);
  assert.strictEqual(s.light.newRate, 80);
  assert.strictEqual(s.severe.newRate, 20);
});

test('构成相反是翻转的原因：新法 80% 重症、常规 20% 重症', () => {
  const s = simpson();
  assert.strictEqual(s.mix.newSevere, 80);
  assert.strictEqual(s.mix.stdSevere, 20);
  assert.match(BODY, /新法在每一层都更好，合计却更差/);
});

test('失访不平衡：5 → 12.3，分布反转后 → −3.8', () => {
  const l = lossArithmetic();
  assert.strictEqual(l.nominal, 5);
  assert.strictEqual(l.worstCase, 12.3);
  assert.strictEqual(l.reversed, -3.8);
  assert.strictEqual(l.filledNew, 55.2);
  assert.strictEqual(l.filledStd, 42.9);
});

test('盲法偏移 0.8 分占 33%，双录把 80 处压到 5 处', () => {
  const b = blindingShift();
  assert.strictEqual(b.diff, 0.8);
  assert.strictEqual(b.share, 33);
  const e = entryErrors();
  assert.strictEqual(e.single, 80);
  assert.strictEqual(e.double, 5);
});

test('结构四组齐：偏倚 3 类、盲法 3 层、混杂判据 3 条、质控 6 项', () => {
  const j = auditStructure(A.sections);
  assert.doesNotThrow(() => verify(j, simpson(), lossArithmetic(), blindingShift()));
  assert.deepStrictEqual(j.types, ['选择偏倚', '信息偏倚', '混杂']);
  assert.deepStrictEqual(j.levels, ['受试者盲', '实施者盲', '评价者盲']);
  assert.strictEqual(j.criteria, 3);
  assert.strictEqual(j.qcItems, 6);
});

test('混杂第三判据在正文里被写成「不在通路上」而不是「相关」', () => {
  const s4 = sectionOf(A.sections, '混杂');
  assert.match(s4.text, /它不在暴露与结局的因果通路上/);
  assert.match(s4.text, /是中介/);
  assert.match(s4.text, /「多调几个变量更保险」是错的/);
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

test('脚本可运行，输出含现算悖论与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /均从本章 docs\/zh\.md 现算/);
  assert.match(r.stdout, /合计：新法 32%（64\/200）· 常规 63%（126\/200）→ -31 个百分点/);
  assert.match(r.stdout, /差 0\.8 分，占 33%/);
  assert.match(r.stdout, /不构成研究结论或临床建议/);
});
