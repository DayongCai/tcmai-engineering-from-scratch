'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, parseTables, params, ruleSpec, structure, compute, verify } = require('./main.js');

const BODY = read();
const P = params(BODY);
const S = structure(BODY, parseTables(BODY));
const RULE = ruleSpec(BODY);
const C = compute(P);

function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('正文就在本章目录下且标题与章号一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '07-i7', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
  assert.strictEqual(CHAPTER, 7);
  assert.match(BODY.split('\n')[0], new RegExp('^# 第 7 章 · ' + TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

test('参数读自正文，不是手打常量', () => {
  assert.deepStrictEqual(P, { rules: 47, ignoredPct: 92, warnOnly: 31, badThreshold: 9, withAlt: 4 });
});

test('复盘只解释了 44 条，剩 3 条没被归因', () => {
  assert.strictEqual(C.accounted, 44);
  assert.strictEqual(C.unaccounted, 3);
  assert.strictEqual(C.coverage.toFixed(0), '94');
  assert.ok(C.accounted < P.rules);
});

test('真正给替代的只有 4 条，占 8.5%；被忽略约 43 条', () => {
  assert.strictEqual(C.altShare.toFixed(1), '8.5');
  assert.strictEqual(C.ignoredCount, 43);
});

test('接入点五个、合同五条、迁移四步、工程原则三条、严重度三级', () => {
  assert.strictEqual(S.接入点, 5);
  assert.deepStrictEqual(S.接入点名, ['开立（CPOE）', '审核（药师）', '结果回报', '病历书写', '出院']);
  assert.strictEqual(S.合同条款, 5);
  assert.strictEqual(S.迁移步骤, 4);
  assert.strictEqual(S.工程原则, 3);
  assert.strictEqual(S.分级数, 3);
});

test('规则 JSON 读自正文，带 evidence、owner 与可执行动作', () => {
  assert.strictEqual(RULE.id, 'cds-aki-001');
  assert.strictEqual(RULE.trigger, 'medication-order');
  assert.strictEqual(RULE.severity, 'hard-stop');
  assert.strictEqual(RULE.owner, '药学部');
  assert.strictEqual(RULE.actions.length, 2);
  assert.ok(RULE.evidence.version);
});

test('正文与复算对得上（verify 不抛错）', () => {
  assert.doesNotThrow(() => verify(C, P, S, RULE, BODY));
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
  assert.match(r.stdout, /还有 3 条没被解释/);
  assert.match(r.stdout, /不构成用药、诊疗或采购建议/);
});
