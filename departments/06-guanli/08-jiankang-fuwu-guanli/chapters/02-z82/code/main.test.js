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
  assert.ok(DOC.endsWith(path.join('chapters', '02-z82', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 2);
  assert.match(BODY.split('\n')[0], new RegExp('^# 第 2 章 · ' + TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

test('规模可复算：汉字、节、引文', () => {
  assert.ok(hanzi(BODY) > 2500, String(hanzi(BODY)));
  assert.strictEqual(sections(BODY).length, 5);
  assert.ok([...BODY.matchAll(/《([^》\n]+)》/g)].length >= 1);
});

test('四个接口就是正文那句四句话', () => {
  assert.deepStrictEqual(A.interfaces, ['基层首诊', '双向转诊', '急慢分治', '上下联动']);
  assert.strictEqual(A.counts.interfaces, 4);
});

test('三个判断、四个条件、三处破解都数得出来且与数字对账', () => {
  assert.strictEqual(A.counts.decisions, 3);
  assert.match(A.decisions.join(''), /基层能不能安全处理/);
  assert.strictEqual(A.counts.chain, 4);
  assert.deepStrictEqual(A.fixes, ['支付方式上', '考核指标上', '责任安排上']);
  assert.deepStrictEqual(A.mismatched, []);
});

test('卷首四个百分比与复算', () => {
  const m = A.m;
  assert.strictEqual(m.countyBed, 98);
  assert.strictEqual(m.townBed, 41);
  assert.strictEqual(m.bedGap, 57);
  assert.strictEqual(m.downShare, 3);
  assert.ok(Math.abs(m.upDownRatio - 100 / 3) < 1e-9);
  assert.strictEqual(m.signRate, 62);
  assert.strictEqual(m.renewRate, 48);
  assert.ok(m.renewOfSigned > 77 && m.renewOfSigned < 78, String(m.renewOfSigned));
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
  assert.match(r.stdout, /不构成政策解读意见/);
});
