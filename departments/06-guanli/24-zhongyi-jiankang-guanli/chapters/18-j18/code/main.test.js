'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  DOC, CHAPTER, TITLE, read, hanzi, sections,
  unifyItems, layers, dataKinds, gateRules, teachUses, deliverables, evalTraps, consistencyMath, audit,
} = require('./main.js');

const BODY = read();
const A = audit(BODY);

function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('正文就在本章目录下，章号与标题对得上', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '18-j18', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 18);
  assert.strictEqual(BODY.split('\n')[0], `# 第 18 章 · ${TITLE}`);
});

test('规模可复算：汉字、节、引文', () => {
  assert.ok(hanzi(BODY) > 2500, String(hanzi(BODY)));
  assert.strictEqual(sections(BODY).filter((s) => s.title).length, 6);
  assert.ok(new Set([...BODY.matchAll(/《([^》]+)》/g)].map((m) => m[1])).size >= 1);
});

test('先统一三样：术语、单位与量纲、分层规则', () => {
  assert.deepStrictEqual(A.unify, ['术语', '单位与量纲', '分层规则']);
  assert.match(BODY, /多版本并存是分歧的主要来源/);
});

test('两层结构与三类数据', () => {
  assert.deepStrictEqual(A.ls, ['单元层', '注释层']);
  assert.deepStrictEqual(A.kinds, ['服务数据', '学习与教学数据', '内容与知识数据']);
  assert.match(BODY, /解释不得扩张原文的适用范围/);
});

test('门禁三条与教学三用', () => {
  assert.deepStrictEqual(A.gates, ['最小必要', '目的限定', '留痕可溯']);
  assert.deepStrictEqual(A.teach, ['给反馈', '做陪练', '做检索']);
  assert.match(BODY, /演示数据与真实数据必须物理隔离/);
});

test('双交付物与能力评价三陷阱', () => {
  assert.deepStrictEqual(A.deliv, ['一份能跑的', '一份能说清的']);
  assert.deepStrictEqual(A.traps, ['用完成度代替能力', '用单次成绩代替稳定表现', '用排名代替标准']);
  assert.match(BODY, /系统负责不漏，人负责判断/);
});

test('口径复算：3 套体系 3 组比对，39% 不一致', () => {
  assert.deepStrictEqual(A.math, { teams: 3, agree: 61, disagree: 39, pairs: 3 });
  assert.strictEqual(A.math.disagree, 100 - A.math.agree);
});

test('清单条数与句中的中文数字对账一致', () => {
  assert.deepStrictEqual(A.mismatched, []);
  assert.strictEqual(A.claims.length, 7);
});

test('quiz：check 题正确选项落在正文里（≥2 道），答案下标打散', () => {
  const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));
  const body = shingles(BODY);
  const checks = quiz.questions.filter((q) => q.stage === 'check');
  const grounded = checks.filter((q) =>
    [...shingles(q.options[q.correct])].some((g) => body.has(g)));
  assert.ok(checks.length >= 2);
  assert.ok(grounded.length >= 2, `只有 ${grounded.length} 道接地`);
  const used = new Set(quiz.questions.map((q) => q.correct));
  assert.ok(used.size >= 3, '正确答案过于集中在一个下标');
  for (const q of quiz.questions) {
    assert.strictEqual(q.options.length, 4, q.question);
    assert.ok(hanzi(q.explain) >= 30, q.question);
  }
});

test('脚本可运行，输出含复算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /均从本章 docs\/zh\.md 现算/);
  assert.match(r.stdout, /即 39% 的归类在不同体系里不是同一个结论/);
  assert.match(r.stdout, /对账：一致/);
  assert.match(r.stdout, /不构成技术方案或诊疗意见/);
});
