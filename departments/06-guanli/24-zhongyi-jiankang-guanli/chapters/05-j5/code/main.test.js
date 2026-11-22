'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  DOC, CHAPTER, TITLE, read, hanzi, sections, splitTop,
  constraints, personFactors, tiers, tierRule, planElements, adherence, followupSteps, referralLines, loadMath, audit,
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
  assert.ok(DOC.endsWith(path.join('chapters', '05-j5', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 5);
  assert.strictEqual(BODY.split('\n')[0], `# 第 5 章 · ${TITLE}`);
});

test('规模可复算：汉字、节、引文', () => {
  assert.ok(hanzi(BODY) > 2500, String(hanzi(BODY)));
  assert.strictEqual(sections(BODY).filter((s) => s.title).length, 6);
  assert.ok(new Set([...BODY.matchAll(/《([^》]+)》/g)].map((m) => m[1])).size >= 1);
});

test('三因是三条硬约束，因人还要再拆三条', () => {
  assert.deepStrictEqual(A.cons, ['因时', '因地', '因人']);
  assert.strictEqual(A.person.length, 3);
  assert.match(A.person[0], /^体力条件/);
  assert.match(A.person[1], /^经济条件/);
  assert.match(A.person[2], /^社会条件/);
  assert.deepStrictEqual(splitTop('甲（乙、丙）、丁'), ['甲（乙、丙）', '丁']);
});

test('三档强度表读全，档位与条目数反向', () => {
  assert.deepStrictEqual(A.ts.map((t) => t.tier), ['一档', '二档', '三档']);
  assert.match(A.ts[0].focus, /一到两个可改变项/);
  assert.match(A.ts[1].focus, /三到四个可改变项/);
  assert.match(A.ts[2].focus, /少量高优先级项/);
  assert.match(A.rule, /档位越高，方案条目应当越少/);
});

test('方案五要素与依从四方向都在正文里', () => {
  assert.deepStrictEqual(A.elems, ['目标', '动作', '触发条件', '频次与总量', '失败预案']);
  assert.deepStrictEqual(A.adh, ['用替换代替增加', '减少决策点', '一次只改一项，改稳了再加', '把支持者拉进来，但不要外包']);
});

test('随访三步顺序固定：安全 → 执行 → 调方案', () => {
  assert.deepStrictEqual(A.steps, ['先看安全', '再看执行', '最后调方案']);
  assert.strictEqual(A.referral.length, 4);
  assert.match(A.referral[2], /不明原因消瘦/);
});

test('负荷复算：8 条剩 1.4 条，留存率与落空条数算得出来', () => {
  assert.deepStrictEqual(A.load, { written: 8, kept: 1.4, dropped: 6.6, share: 17.5 });
  assert.ok(A.load.share < 20);
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
  assert.match(r.stdout, /留存 17\.5%/);
  assert.match(r.stdout, /对账：一致/);
  assert.match(r.stdout, /不构成诊疗意见/);
});
