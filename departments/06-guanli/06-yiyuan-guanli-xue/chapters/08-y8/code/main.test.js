'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, analyze, sectionOf, auditRisk, verify, ROUTES, RISKS, PLANS, DRILLS } = require('./main.js');

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
  assert.ok(DOC.endsWith(path.join('chapters', '08-y8', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
});

test('章号与标题取自本章正文', () => {
  assert.strictEqual(CHAPTER, 8);
  assert.strictEqual(TITLE, '风险管理的成败，在于第一个发现异常的人有没有权限喊停');
  assert.match(BODY.split('\n')[0], new RegExp('^# 第 8 章 · ' + TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

test('正文统计可复算：汉字、节、加粗判断、引文', () => {
  assert.strictEqual(A.hanzi, 2755);
  assert.strictEqual(A.sections.length, 6);
  assert.strictEqual(A.claims, 38);
  assert.strictEqual(A.quotes.length, 1);
});

test('风险链：三条路线、四类风险、七步事件链、三层预案、三类演练', () => {
  const r = auditRisk(A.sections);
  assert.doesNotThrow(() => verify(r));
  assert.deepStrictEqual(r.routes, ROUTES);
  assert.deepStrictEqual(r.risks, RISKS);
  assert.deepStrictEqual(r.chain, ['发现', '上报', '分级', '调查', '分析', '改进', '复核']);
  assert.deepStrictEqual(r.plans, PLANS);
  assert.deepStrictEqual(r.drills, DRILLS);
  assert.strictEqual(r.noTransfer, true);
});

test('授权缺口与 RCA 判据写在正文原句里', () => {
  const s3 = sectionOf(A.sections, '不良事件');
  assert.match(s3.text, /改进措施里有没有一条改变了流程或结构/);
  const s5 = sectionOf(A.sections, '应急与危重转运');
  assert.match(s5.text, /没有超时记录的演练，等于没演练/);
  assert.match(BODY, /紧急情况下，护士有权先行处置、事后报告/);
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
  assert.match(r.stdout, /事件链 7\/7/);
  assert.match(r.stdout, /不构成法律意见或应急预案文本/);
});
