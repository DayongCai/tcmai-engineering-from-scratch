'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, hanzi, sections, audit } = require('./main.js');

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
  assert.ok(DOC.endsWith(path.join('chapters', '06-z86', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 6);
  assert.match(BODY.split('\n')[0], new RegExp('^# 第 6 章 · ' + TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

test('规模可复算：汉字、节、引文', () => {
  assert.ok(hanzi(BODY) > 2500, String(hanzi(BODY)));
  assert.strictEqual(sections(BODY).length, 5);
  assert.ok([...BODY.matchAll(/《([^》\n]+)》/g)].length >= 1);
});

test('五种付费单元按正文段落首词数出', () => {
  assert.deepStrictEqual(A.units, ['按项目付费', '按床日付费', '按病种付费', '按人头付费', '总额预付']);
  assert.strictEqual(A.counts.units, 5);
  assert.strictEqual(A.counts.variants, 2);
});

test('三前提、三难题、三路径都数得出来且对账', () => {
  assert.deepStrictEqual(A.effectPremises, ['结果能定义', '能测量', '能归因']);
  assert.strictEqual(A.mgmtProblems, 3);
  assert.strictEqual(A.paths, 3);
  assert.deepStrictEqual(A.mismatched, []);
});

test('卷首数字复算：0.968 万元、1.9 天、2.6 个百分点', () => {
  const { raw, derived } = A;
  assert.strictEqual(raw.avgCost, 1.1);
  assert.strictEqual(raw.costDrop, 12);
  assert.ok(Math.abs(derived.avgCostAfter - 0.968) < 1e-9);
  assert.strictEqual(raw.losBefore, 9.8);
  assert.strictEqual(raw.losAfter, 7.9);
  assert.ok(Math.abs(derived.losDrop - 1.9) < 1e-9);
  assert.strictEqual(raw.readmitBefore, 4.1);
  assert.strictEqual(raw.readmitAfter, 6.7);
  assert.ok(Math.abs(derived.readmitUp - 2.6) < 1e-9);
  assert.ok(Math.abs(derived.readmitRelPct - (2.6 / 4.1) * 100) < 1e-9);
});

test('quiz 的 check 题正确选项落在本章正文里（≥2 道），答案下标打散', () => {
  const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));
  const body = shingles(BODY);
  const checks = quiz.questions.filter((q) => q.stage === 'check');
  const grounded = checks.filter((q) => {
    const right = String(q.options[q.correct] || '');
    return [...shingles(right)].some((g) => body.has(g));
  });
  assert.ok(checks.length >= 2);
  assert.ok(grounded.length >= 2, `只有 ${grounded.length} 道接地`);
  const used = new Set(quiz.questions.map((q) => q.correct));
  assert.ok(used.size >= 3, '正确答案过于集中在一个下标');
  for (const q of quiz.questions) {
    assert.strictEqual(q.options.length, 4);
    assert.ok(hanzi(q.explain) >= 30, q.question);
  }
});

test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /均从本章 docs\/zh\.md 现算/);
  assert.match(r.stdout, /对账一致/);
  assert.match(r.stdout, /不构成保险或政策意见/);
});
