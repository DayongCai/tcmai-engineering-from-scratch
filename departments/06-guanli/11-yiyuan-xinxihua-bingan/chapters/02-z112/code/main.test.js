'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, parseTables, params, structure, compute, verify, canMatch, tiers } = require('./main.js');

const BODY = read();
const TABLES = parseTables(BODY);
const P = params(BODY, TABLES);
const S = structure(BODY);
const C = compute(P);

function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^一-鿿]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('正文就在本章目录下，标题与章号一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '02-z112', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
  assert.strictEqual(CHAPTER, 2);
  assert.strictEqual(BODY.split('\n')[0], '# 第 2 章 · ' + TITLE);
});

test('层级表的位数读自正文，不是手打', () => {
  assert.deepStrictEqual(P.tiers.map((x) => x.name), ['类目', '亚目', '扩展']);
  assert.deepStrictEqual(P.tiers.map((x) => x.bits), [3, 4, 6]);
  assert.strictEqual(P.requiredBits, 4);
  assert.strictEqual(P.categoryCode, '47.0');
  assert.strictEqual(P.subCode, '47.01');
});

test('匹配判据按位数算：类目码够不上四位键，亚目码够得上', () => {
  assert.strictEqual(canMatch('47.0', 4), false);
  assert.strictEqual(canMatch('47.01', 4), true);
  assert.strictEqual(canMatch('47.0', 3), true);
  assert.strictEqual(C.byCategory, false);
  assert.strictEqual(C.bySub, true);
  assert.strictEqual(C.lostBits, 1);
  assert.strictEqual(C.tiersMatching, 2);
});

test('四层标准、三种映射、四层互操作、三个验收场景，清点与正文一致', () => {
  assert.strictEqual(S.layers, 4);
  assert.strictEqual(S.mappings, 3);
  assert.strictEqual(S.interop, 4);
  assert.strictEqual(S.scenes, 3);
  assert.strictEqual(S.groupSteps, 3);
});

test('口径与技术的七三开读自正文', () => {
  assert.strictEqual(C.caliber, 70);
  assert.strictEqual(C.tech, 30);
});

test('正文与复算对得上（verify 不抛错）', () => {
  assert.doesNotThrow(() => verify(C, S, P, BODY));
});

test('quiz 的 check 题正确选项落在本章正文里（≥2 道）', () => {
  const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));
  const body = shingles(BODY);
  const checks = quiz.questions.filter((q) => q.stage === 'check');
  const grounded = checks.filter((q) => {
    const right = String(q.options[q.correct] || '');
    return [...shingles(right)].some((g) => body.has(g));
  });
  assert.ok(checks.length >= 2);
  assert.ok(grounded.length >= 2, `只有 ${grounded.length} 道接地`);
});

test('脚本可运行，输出含匹配判据与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /均从本章 docs\/zh\.md 现算/);
  assert.match(r.stdout, /类目码 47\.0（3 位）→ 不入组/);
  assert.match(r.stdout, /亚目码 47\.01（4 位）→ 可入组/);
  assert.match(r.stdout, /不构成编码指导或分组规则解释/);
});
