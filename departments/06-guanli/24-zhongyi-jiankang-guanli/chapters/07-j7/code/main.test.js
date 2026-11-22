'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  DOC, CHAPTER, TITLE, read, hanzi, sections, splitTop,
  variables, daoYinLayers, legalMoves, cautions, stopSignals, conditionTable, screenQuestions, evalItems, loadMath, audit,
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
  assert.ok(DOC.endsWith(path.join('chapters', '07-j7', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 7);
  assert.strictEqual(BODY.split('\n')[0], `# 第 7 章 · ${TITLE}`);
});

test('规模可复算：汉字、节、引文', () => {
  assert.ok(hanzi(BODY) > 2500, String(hanzi(BODY)));
  assert.strictEqual(sections(BODY).filter((s) => s.title).length, 6);
  assert.ok(new Set([...BODY.matchAll(/《([^》]+)》/g)].map((m) => m[1])).size >= 1);
});

test('三个变量齐：类型、总量、进阶速度', () => {
  assert.deepStrictEqual(A.vars, ['类型', '总量', '进阶速度']);
  assert.match(BODY, /进阶速度\*\*是最常被省略的变量/);
});

test('导引三层与不破皮的合法动作', () => {
  assert.deepStrictEqual(A.dy, ['调身', '调息', '调心']);
  assert.deepStrictEqual(A.moves, ['按', '揉', '摩', '擦', '轻叩']);
  assert.match(BODY, /针刺、电针、穴位注射、放血、火针、瘢痕灸/);
});

test('禁忌七类、停止信号八条、选法六种条件都数得出来', () => {
  assert.strictEqual(A.caut.length, 7);
  assert.match(A.caut.map((c) => c.case).join('/'), /使用抗凝药物/);
  assert.strictEqual(A.stops.length, 8);
  assert.match(A.stops.join('/'), /关节锐痛/);
  assert.strictEqual(A.conds.length, 6);
  assert.match(A.conds[1].alt, /水中活动/);
});

test('筛查五问与评价三件事', () => {
  assert.strictEqual(A.screen.length, 5);
  assert.match(A.screen[0], /心血管事件史/);
  assert.deepStrictEqual(A.evals.map((e) => e.split('：')[0]), ['耐受性', '持续性', '功能性变化']);
});

test('负荷复算：182 遍计划走到第三周只剩 42 遍', () => {
  assert.strictEqual(A.load.planned, 182);
  assert.strictEqual(A.load.done, 42);
  assert.strictEqual(A.load.shortfallPct, 76.9);
});

test('清单条数与句中的中文数字对账一致', () => {
  assert.deepStrictEqual(A.mismatched, []);
  assert.strictEqual(A.claims.length, 8);
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
  assert.match(r.stdout, /= 182 遍计划/);
  assert.match(r.stdout, /落空 76\.9%/);
  assert.match(r.stdout, /对账：一致/);
  assert.match(r.stdout, /不构成运动处方/);
});
