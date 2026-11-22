'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, analyze, sectionOf, auditReferral, verify, REFERRAL, UNIFIED } = require('./main.js');

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
  assert.ok(DOC.endsWith(path.join('chapters', '10-y10', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
});

test('章号与标题取自本章正文', () => {
  assert.strictEqual(CHAPTER, 10);
  assert.strictEqual(TITLE, '分级诊疗的堵点不在基层能力，在向上转诊的那张纸');
  assert.match(BODY.split('\n')[0], new RegExp('^# 第 10 章 · ' + TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

test('正文统计可复算：汉字、节、加粗判断、引文', () => {
  assert.strictEqual(A.hanzi, 3022);
  assert.strictEqual(A.sections.length, 7);
  assert.strictEqual(A.claims, 34);
  assert.strictEqual(A.quotes.length, 1);
});

test('转诊账：六位一体、三件事、三统一、三层数字化', () => {
  const r = auditReferral(A.sections);
  assert.doesNotThrow(() => verify(r));
  assert.deepStrictEqual(r.six, ['预防', '保健', '医疗', '康复', '健康教育', '计划生育技术指导']);
  assert.deepStrictEqual(r.referral, REFERRAL);
  assert.deepStrictEqual(r.unified, UNIFIED);
  assert.strictEqual(r.layers.length, 3);
  assert.strictEqual(r.settlement, true);
  assert.strictEqual(r.samePrice, true);
});

test('转诊三要件与结余判据写在正文原句里', () => {
  const s3 = sectionOf(A.sections, '转诊');
  assert.match(s3.text, /下转后患者仍计入转出科室的成本与绩效口径不清/);
  assert.match(s3.text, /医保对下转患者连续计算起付线/);
  const s4 = sectionOf(A.sections, '医联体');
  assert.match(s4.text, /只有结余留用，牵头医院才有动力去做预防/);
  assert.match(s4.text, /归各机构，是松散型加了个名字/);
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
  assert.match(r.stdout, /转诊三件事 3\/3/);
  assert.match(r.stdout, /不构成政策解读或支付方式建议/);
});
