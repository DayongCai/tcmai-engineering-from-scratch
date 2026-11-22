'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, parseTables, params, structure, compute, verify } = require('./main.js');

const BODY = read();
const P = params(BODY);
const S = structure(BODY, parseTables(BODY));
const C = compute(P);

function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^一-鿿]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('正文就在本章目录下，标题与章号一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '06-z116', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
  assert.strictEqual(CHAPTER, 6);
  assert.strictEqual(BODY.split('\n')[0], '# 第 6 章 · ' + TITLE);
});

test('账号参数读自正文：1,900 / 214 / 37 / 六人', () => {
  assert.strictEqual(P.accounts, 1900);
  assert.strictEqual(P.shared, 214);
  assert.strictEqual(P.sharedWithEdit, 37);
  assert.strictEqual(P.passwordHolders, 6);
  assert.strictEqual(P.roleCeiling, 50);
});

test('共用账号占 11.3%，其中 17.3% 带病历修改权限', () => {
  assert.strictEqual(C.sharedPctFixed, '11.3');
  assert.strictEqual(C.editShareFixed, '17.3');
  assert.strictEqual(C.exclusiveAccounts, 1686);
});

test('五类日志、三个签名前提、两个工程条件，清点与正文一致', () => {
  assert.strictEqual(S.logTypes, 5);
  assert.deepStrictEqual(S.logNames, ['登录日志', '访问日志', '修改日志', '导出日志', '授权日志']);
  assert.strictEqual(S.premises, 3);
  assert.strictEqual(S.engineering, 2);
  assert.strictEqual(S.levels, 3);
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

test('脚本可运行，输出含共用占比与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /均从本章 docs\/zh\.md 现算/);
  assert.match(r.stdout, /共用 214 个 → 11\.3%/);
  assert.match(r.stdout, /不构成安全方案设计、等保测评意见或法律意见/);
});
