'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  DOC, CHAPTER, TITLE, read, params, controls, compute, append, verifyChain, buildChain, verify, sha256, hashOf,
} = require('./main.js');

const BODY = read();
const P = params(BODY);
const C = compute(P);
const CTRL = controls(BODY);
const CHAIN = buildChain(P);

function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('正文就在本章目录下且标题与章号一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '04-i4', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
  assert.strictEqual(CHAPTER, 4);
  assert.match(BODY.split('\n')[0], new RegExp('^# 第 4 章 · ' + TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

test('抽查参数读自正文，不是手打常量', () => {
  assert.strictEqual(P.accounts, 200);
  assert.strictEqual(P.stale, 43);
  assert.strictEqual(P.activeStale, 9);
  assert.strictEqual(P.exportWindowDays, 30);
  assert.strictEqual(P.exporting, 6);
  assert.strictEqual(P.maxRows, 1800);
  assert.strictEqual(P.threshold, 500);
});

test('账号陈旧率 21.5%，其中两成仍在登录', () => {
  assert.strictEqual(C.staleRate.toFixed(1), '21.5');
  assert.strictEqual(C.activeStaleRate.toFixed(1), '20.9');
});

test('单次 1,800 条是阈值的 3.6 倍，规则本应告警', () => {
  assert.strictEqual(C.overThreshold.toFixed(1), '3.6');
  assert.ok(C.wouldAlert);
});

test('控制项在正文里齐：四判据、五要素、三法、四步、四级', () => {
  assert.deepStrictEqual(CTRL, { 判据: 4, 日志要素: 5, 脱敏法: 3, 响应四步: 4, 分级四级: 4 });
});

test('哈希链可自检，回改一条即断链', () => {
  assert.strictEqual(CHAIN.length, 5);
  assert.ok(verifyChain(CHAIN));
  assert.strictEqual(CHAIN[1].prevHash, CHAIN[0].hash);
  const tampered = CHAIN.map((e, i) => (i === 2 ? { ...e, result: 'ok' } : e));
  assert.strictEqual(verifyChain(tampered), false);
  const dropped = CHAIN.slice(0, 3);
  assert.ok(verifyChain(dropped), '只保留前缀仍应通过，长度不是完整性判据');
});

test('单条日志的 hash 覆盖上一条 hash 与自己内容', () => {
  const g = { hash: 'GENESIS' };
  const e = append(g, { who: 'u1', at: 't', from: 'ip', action: 'query', result: 'ok' });
  assert.strictEqual(e.hash, hashOf(e, 'GENESIS'));
  assert.notStrictEqual(e.hash, hashOf({ ...e, action: 'export' }, 'GENESIS'));
  assert.notStrictEqual(e.hash, hashOf(e, 'OTHER'));
});

test('正文与复算对得上（verify 不抛错）', () => {
  assert.doesNotThrow(() => verify(C, CTRL, CHAIN, BODY));
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
  assert.match(r.stdout, /断链，回改被抓住/);
  assert.match(r.stdout, /不构成安全建设方案或合规意见/);
});
