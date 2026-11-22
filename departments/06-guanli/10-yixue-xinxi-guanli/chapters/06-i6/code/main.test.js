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
const C = compute(P, S);

function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('正文就在本章目录下且标题与章号一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '06-i6', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
  assert.strictEqual(CHAPTER, 6);
  assert.match(BODY.split('\n')[0], new RegExp('^# 第 6 章 · ' + TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

test('参数读自正文，不是手打常量', () => {
  assert.deepStrictEqual(P, { los: 12, weightDiff: 0.4, diffMin: 0.3, diffMax: 0.8, samplePct: 5 });
});

test('口径差占住院日 2.5%–6.7%，足以让排名换位', () => {
  assert.strictEqual(C.spreadMinPct.toFixed(1), '2.5');
  assert.strictEqual(C.spreadMaxPct.toFixed(1), '6.7');
  assert.strictEqual(C.losLow, 11.2);
  assert.strictEqual(C.losHigh, 12.8);
  assert.strictEqual(C.weightPct.toFixed(0), '40');
});

test('五个指标各两种分母 = 10 种取值，字典八项', () => {
  assert.strictEqual(S.指标数, 5);
  assert.strictEqual(S.两种分母, 5);
  assert.strictEqual(C.valueOptions, 10);
  assert.strictEqual(S.字典项, 8);
  assert.deepStrictEqual(S.dictNames, ['指标名', '定义', '公式', '分子', '分母', '排除', '数据源', '责任人']);
});

test('首页三组读法、三条规则、三个反例、四类入组失败', () => {
  assert.strictEqual(S.首页三组, 3);
  assert.strictEqual(S.规则条数, 3);
  assert.strictEqual(S.反例条数, 3);
  assert.strictEqual(S.入组失败, 4);
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
  assert.match(r.stdout, /占本例 2\.5%–6\.7%/);
  assert.match(r.stdout, /不构成医保结算或绩效分配建议/);
});
