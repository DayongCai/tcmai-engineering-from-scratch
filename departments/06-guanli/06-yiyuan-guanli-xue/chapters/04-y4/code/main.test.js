'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, analyze, sectionOf, auditChain, verify } = require('./main.js');

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
  assert.ok(DOC.endsWith(path.join('chapters', '04-y4', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
});

test('章号与标题取自本章正文', () => {
  assert.strictEqual(CHAPTER, 4);
  assert.strictEqual(TITLE, '药事管理管的是处方权的边界，不是药房的库存');
  assert.match(BODY.split('\n')[0], new RegExp('^# 第 4 章 · ' + TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

test('正文统计可复算：汉字、节、加粗判断、引文', () => {
  assert.strictEqual(A.hanzi, 2902);
  assert.strictEqual(A.sections.length, 6);
  assert.strictEqual(A.claims, 31);
  assert.strictEqual(A.quotes.length, 1);
});

test('用药决定链：三项支撑、五专、四个环节、质控双轨', () => {
  const c = auditChain(A.sections);
  assert.doesNotThrow(() => verify(c));
  assert.deepStrictEqual(c.supports, ['用药目录的动态调整机制', '基于数据的触发条件', '决议的留痕与执行追踪']);
  assert.deepStrictEqual(c.fiveSpecial, ['专人负责', '专柜加锁', '专用账册', '专用处方', '专册登记']);
  assert.deepStrictEqual(c.herbal, ['饮片质量', '调剂准确', '煎煮方法', '服用指导']);
  assert.deepStrictEqual(c.dualTrack, ['室内质控', '室间质评']);
  assert.strictEqual(c.grantByCategory, true);
});

test('处方权的授予与点评失效写在本章第二节', () => {
  const s2 = sectionOf(A.sections, '处方权');
  assert.match(s2.text, /按类别逐项授予/);
  assert.match(s2.text, /没有后果的点评，第二年点评的还是同一批处方/);
  const s4 = sectionOf(A.sections, '医技');
  assert.match(s4.text, /TAT 的管理要害不在平均时间，在\*\*尾部\*\*/);
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
  assert.match(r.stdout, /五专 5\/5/);
  assert.match(r.stdout, /不构成用药、检验或感控指令/);
});
