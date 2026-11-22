'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, parseTables, params, structure, compute, verify, cnNum } = require('./main.js');

const BODY = read();
const P = params(BODY);
const S = structure(BODY, parseTables(BODY));
const C = compute(P, S);

function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^一-鿿]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('正文就在本章目录下，标题与章号一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '01-z111', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
  assert.strictEqual(CHAPTER, 1);
  assert.strictEqual(BODY.split('\n')[0], '# 第 1 章 · ' + TITLE);
});

test('参数读自正文，不是手打常量', () => {
  assert.strictEqual(P.hisRate, 96.4);
  assert.strictEqual(P.mobileRate, 71.2);
  assert.strictEqual(P.systems, 8);
  assert.strictEqual(P.uptimePct, 99.5);
  assert.strictEqual(P.syncMinutes, 10);
  assert.strictEqual(P.skewSeconds, 60);
  assert.strictEqual(P.pdaBeds, 30);
});

test('中文数字解析支持个位与十位组合', () => {
  assert.strictEqual(cnNum('八'), 8);
  assert.strictEqual(cnNum('十'), 10);
  assert.strictEqual(cnNum('十二'), 12);
  assert.strictEqual(cnNum('三十'), 30);
});

test('执行率缺口 25.2 个百分点，正文取整为 25', () => {
  assert.ok(Math.abs(C.gap - 25.2) < 1e-9, String(C.gap));
  assert.strictEqual(C.gapInt, 25);
  assert.ok(BODY.includes('25 个百分点'));
});

test('八套串起来 0.995^8 约 96.1%，与正文一致', () => {
  assert.ok(Math.abs(C.chainRate - Math.pow(0.995, 8)) < 1e-12);
  assert.strictEqual(C.chainPct, '96.1');
  assert.ok(BODY.includes('96.1%'));
});

test('六处落点、五个断点、五环闭环，清点与正文一致', () => {
  assert.strictEqual(S.hops, 6);
  assert.strictEqual(S.breakpoints, 5);
  assert.strictEqual(S.chain, 5);
  assert.deepStrictEqual(S.hopNames, ['开立', '审核', '执行', '计费', '记录', '摘要']);
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

test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /均从本章 docs\/zh\.md 现算/);
  assert.match(r.stdout, /缺口 25\.2 个百分点/);
  assert.match(r.stdout, /理论可用率 96\.1%/);
  assert.match(r.stdout, /不构成系统选型或接口设计意见/);
});
