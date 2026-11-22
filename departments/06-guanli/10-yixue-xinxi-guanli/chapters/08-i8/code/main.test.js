'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, HOURS_PER_YEAR, read, parseTables, params, structure, mesh, compute, verify } = require('./main.js');

const BODY = read();
const P = params(BODY);
const S = structure(BODY, parseTables(BODY));
const C = compute(P);

function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('正文就在本章目录下且标题与章号一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '08-i8', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
  assert.strictEqual(CHAPTER, 8);
  assert.match(BODY.split('\n')[0], new RegExp('^# 第 8 章 · ' + TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

test('参数读自正文，不是手打常量', () => {
  assert.strictEqual(P.systems, 11);
  assert.strictEqual(P.years, 3);
  assert.strictEqual(P.interfaces, 60);
  assert.strictEqual(P.vendors, 9);
  assert.strictEqual(P.months, 2);
  assert.strictEqual(P.availability, 99.5);
  assert.strictEqual(P.downtimeHours, 43);
});

test('可用性与年宕机自洽：43 小时/8760 = 99.51%', () => {
  assert.strictEqual(HOURS_PER_YEAR, 8760);
  assert.strictEqual(C.uptimePct.toFixed(2), '99.51');
  assert.strictEqual(C.uptimePct.toFixed(1), '99.5');
});

test('11 套系统全互联 55 条，实际 60 条已越过全互联', () => {
  assert.strictEqual(mesh(11), 55);
  assert.strictEqual(mesh(4), 6);
  assert.strictEqual(C.meshMax, 55);
  assert.strictEqual(C.excess, 5);
  assert.ok(C.excess > 0);
});

test('结构清点：四步、三层、四级、四诊、四层、三线', () => {
  assert.strictEqual(S.规划四步, 4);
  assert.strictEqual(S.治理三层, 3);
  assert.strictEqual(S.互联互通级数, 4);
  assert.strictEqual(S.四诊类数, 4);
  assert.strictEqual(S.评价四层, 4);
  assert.strictEqual(S.智慧三线, 3);
});

test('正文与复算对得上（verify 不抛错）', () => {
  assert.doesNotThrow(() => verify(C, P, S, BODY));
});

test('quiz 的 check 题正确选项落在本章正文里（≥2 道）', () => {
  const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));
  const body = shingles(BODY);
  const checks = quiz.questions.filter((q) => q.stage === 'check');
  const grounded = checks.filter((q) => {
    const right = String(q.options[q.correct] || '');
    return [...shingles(right)].some((s) => body.has(s));
  });
  assert.ok(checks.length >= 2);
  assert.ok(grounded.length >= 2, `只有 ${grounded.length} 道接地`);
});

test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /均从本章 docs\/zh\.md 现算/);
  assert.match(r.stdout, /超出 5 条/);
  assert.match(r.stdout, /不构成建设规划或评审辅导建议/);
});
