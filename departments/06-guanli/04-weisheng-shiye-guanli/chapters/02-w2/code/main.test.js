'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, analyze, auditMethods } = require('./main.js');

const BODY = read();
const A = analyze(BODY);

function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('正文文件就在本章目录下', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '02-w2', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
});

test('章号与标题取自本章正文', () => {
  assert.strictEqual(CHAPTER, 2);
  assert.strictEqual(TITLE, '规划不能只写在纸上：资源配置是按规则分，不是按需要给');
  assert.match(BODY.split('\n')[0], /^# 第 2 章 · /);
  assert.ok(BODY.split('\n')[0].includes(TITLE));
});

test('正文统计可复算：汉字、节、表、引文', () => {
  assert.ok(A.hanzi > 2500 && A.hanzi < 5000, String(A.hanzi));
  assert.strictEqual(A.sections.length, 6);
  assert.strictEqual(A.tableCount, 3);
  assert.strictEqual(A.cites.length, 1);
  const sum = A.sections.reduce((s, x) => s + x.hanzi, 0);
  assert.ok(sum > 0 && sum <= A.hanzi, `${sum} vs ${A.hanzi}`);
});

test('三种算法复算：3.2 / 1.2 / 2.24 万人 → 16 / 6 / 11 名医生', () => {
  const m = auditMethods(A.tables);
  assert.strictEqual(m.population, 40);
  assert.strictEqual(m.capacity, 2000);
  assert.deepStrictEqual(m.derivedCounts, [3.2, 1.2, 2.24]);
  assert.deepStrictEqual(m.doctors, [16, 6, 11]);
  assert.ok(m.countOk, '目标人数与复算不一致');
  assert.ok(m.doctorOk, '医生数与复算不一致');
});

test('最大与最小口径相差 2 倍以上，且正文确实写着 16、6、11', () => {
  const m = auditMethods(A.tables);
  assert.ok(m.spread > 2 && m.spread < 3, String(m.spread));
  assert.match(BODY, /16 人、6 人、11 人/);
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
  assert.match(r.stdout, /不构成行政决策建议/);
  assert.match(r.stdout, /相差 2\.67 倍/);
});
