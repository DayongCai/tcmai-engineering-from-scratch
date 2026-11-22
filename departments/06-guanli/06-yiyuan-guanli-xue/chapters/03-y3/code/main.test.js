'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, analyze, sectionOf, auditFlow, verify } = require('./main.js');

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
  assert.ok(DOC.endsWith(path.join('chapters', '03-y3', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
});

test('章号与标题取自本章正文', () => {
  assert.strictEqual(CHAPTER, 3);
  assert.strictEqual(TITLE, '门诊的瓶颈不在医生手速，在患者动线的乘法');
  assert.match(BODY.split('\n')[0], new RegExp('^# 第 3 章 · ' + TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

test('正文统计可复算：汉字、节、加粗判断、引文', () => {
  assert.strictEqual(A.hanzi, 2899);
  assert.strictEqual(A.sections.length, 6);
  assert.strictEqual(A.claims, 33);
  assert.strictEqual(A.quotes.length, 1);
});

test('流程账：串联七段、三种手法、五个“等”字', () => {
  const f = auditFlow(A.sections);
  assert.doesNotThrow(() => verify(f));
  assert.deepStrictEqual(f.chain, ['挂号', '候诊', '就诊', '检查', '再诊', '缴费', '取药']);
  assert.deepStrictEqual(f.tactics, ['削峰。', '并联。', '分流。']);
  assert.deepStrictEqual(f.waits, ['等检查', '等会诊', '等手术', '等病理', '等结算']);
  assert.strictEqual(f.reversible, true);
  assert.strictEqual(f.indicatorRule, true);
});

test('瓶颈判断写进正文：总时长是各段之和，吞吐量由最慢一段决定', () => {
  const s1 = sectionOf(A.sections, '门诊：把动线');
  assert.match(s1.text, /总时长是各段之和，吞吐量是最慢一段决定的/);
  assert.match(s1.text, /把串行环节改成并行/);
  const s3 = sectionOf(A.sections, '住院与手术');
  assert.match(s3.text, /平均住院日与床位使用率不是同向指标/);
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
  assert.match(r.stdout, /门诊串联链 7 段/);
  assert.match(r.stdout, /不构成诊疗意见或流程改造方案/);
});
