'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, hanzi, sections, splitTop, audit } = require('./main.js');

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
  assert.ok(DOC.endsWith(path.join('chapters', '07-z87', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 7);
  assert.match(BODY.split('\n')[0], new RegExp('^# 第 7 章 · ' + TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

test('规模可复算：汉字、节、引文', () => {
  assert.ok(hanzi(BODY) > 2500, String(hanzi(BODY)));
  assert.strictEqual(sections(BODY).length, 5);
  assert.ok([...BODY.matchAll(/《([^》\n]+)》/g)].length >= 1);
});

test('splitTop 不切括号内的顿号', () => {
  assert.deepStrictEqual(splitTop('甲（一、二）、乙'), ['甲（一、二）', '乙']);
});

test('六类工具从带括号的列举里数出来', () => {
  assert.strictEqual(A.counts.tools, 6);
  assert.strictEqual(A.tools[0], '规划（机构设置与布局）');
  assert.match(A.tools[4], /人事薪酬（编制、职称、绩效工资）/);
  assert.strictEqual(A.tools[5], '监管（许可、广告、质控、执法）');
});

test('减少失真四条、四条红线、预付费三环节都对账', () => {
  assert.strictEqual(A.counts.reduceLoss, 4);
  assert.strictEqual(A.redLines, 4);
  assert.deepStrictEqual(A.prepaidParts, ['资金被挪用', '服务难兑现', '退费没有通道']);
  assert.deepStrictEqual(A.mismatched, []);
});

test('卷首预付费复算：12 万元三年，月均 3333 元', () => {
  const { raw, derived } = A;
  assert.strictEqual(raw.prepaidWan, 12);
  assert.strictEqual(raw.years, 3);
  assert.strictEqual(derived.months, 36);
  assert.strictEqual(derived.prepaidYuan, 120000);
  assert.ok(Math.abs(derived.perMonth - 120000 / 36) < 1e-9);
  assert.strictEqual(raw.upsellRate, 70);
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
  assert.match(r.stdout, /不构成法律或投资意见/);
});
