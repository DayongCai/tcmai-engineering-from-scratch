'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  DOC, CHAPTER, TITLE, read, hanzi, sections, sectionText,
  collectConditions, fieldRules, ceilings, stratGrid, useRules, privacyLines, kappaStudy, riskFactors, audit,
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
  assert.ok(DOC.endsWith(path.join('chapters', '03-j3', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 3);
  assert.strictEqual(BODY.split('\n')[0], `# 第 3 章 · ${TITLE}`);
});

test('规模可复算：汉字、节、引文', () => {
  assert.ok(hanzi(BODY) > 2500, String(hanzi(BODY)));
  assert.strictEqual(sections(BODY).filter((s) => s.title).length, 6);
  assert.ok(new Set([...BODY.matchAll(/《([^》]+)》/g)].map((m) => m[1])).size >= 2);
});

test('条件控制就是四件事，每件都带「不固定会怎样」', () => {
  assert.deepStrictEqual(A.conds.map((c) => c.name), ['时间', '近期活动', '环境', '告知']);
  assert.ok(A.conds.every((c) => hanzi(c.risk) >= 8), '某一条没有说清后果');
});

test('落字段三条规则与三层天花板都对得上', () => {
  assert.deepStrictEqual(A.rules, ['有无比程度优先', '描述词表要封闭', '每条结论都要能追到依据']);
  assert.deepStrictEqual(A.caps.map((c) => c.what), ['工具本身的', '阈值的人为性', '解释的越界']);
});

test('分层表是状态两档 × 风险两档，共四格，两条使用规则齐', () => {
  assert.deepStrictEqual(A.grid.cols, ['风险低', '风险高']);
  assert.deepStrictEqual(A.grid.rows.map((r) => r.state), ['状态偏离小', '状态偏离大']);
  assert.strictEqual(A.grid.rows.length * A.grid.cols.length, 4);
  assert.ok(A.grid.rows.every((r) => r.cells.length === 2), '有格子缺失');
  assert.deepStrictEqual(A.use.map((u) => u.rule), ['风险优先于状态', '风险轴必须用实测值，不用印象']);
});

test('隐私三条底线与八项风险因素数得出来', () => {
  assert.strictEqual(A.privacy.length, 3);
  assert.match(A.privacy[1], /取得同意/);
  assert.strictEqual(A.factors.length, 8);
  assert.match(A.factors.join('、'), /既往事件/);
});

test('一致人数除以样本量落回文中百分比，κ 确实上升', () => {
  assert.strictEqual(A.study.total, 40);
  assert.strictEqual(A.study.before.n, 22);
  assert.strictEqual(A.study.after.n, 33);
  assert.deepStrictEqual(A.pctBad, []);
  assert.deepStrictEqual(A.study.kappas, [0.38, 0.71]);
  assert.ok(A.study.lift >= 0.3, String(A.study.lift));
  assert.ok(A.study.kappas[0] < 0.4 && A.study.kappas[1] >= 0.6);
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
  assert.match(r.stdout, /22\/40 = 55%/);
  assert.match(r.stdout, /33\/40 = 83%/);
  assert.match(r.stdout, /对账：一致/);
  assert.match(r.stdout, /不构成诊疗意见/);
});
