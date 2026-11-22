'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, GRADES, read, analyze, auditFailureTable, auditMetricTable, verify } = require('./main.js');

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
  assert.ok(DOC.endsWith(path.join('chapters', '05-z55', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
});

test('章号与标题取自本章正文', () => {
  assert.strictEqual(CHAPTER, 5);
  assert.strictEqual(TITLE, '传播的底线不是说得动人，是说得住回查');
  assert.match(BODY.split('\n')[0], new RegExp('^# 第 5 章 · ' + TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

test('正文统计可复算：汉字、节、表', () => {
  assert.ok(A.hanzi > 2200 && A.hanzi < 6000, String(A.hanzi));
  assert.strictEqual(A.sections.length, 6);
  assert.strictEqual(A.tableCount, 2);
  const sum = A.sections.reduce((s, x) => s + x.hanzi, 0);
  assert.ok(sum > 0 && sum <= A.hanzi, `${sum} vs ${A.hanzi}`);
});

test('三类失真表：3 行，每类都配齐检查问句与补救动作', () => {
  const f = auditFailureTable(A.tables);
  assert.strictEqual(f.rows, 3);
  assert.strictEqual(f.columns, 4);
  assert.deepStrictEqual(f.types, ['出处失真', '强度失真', '边界失真']);
  assert.strictEqual(f.complete, 3);
});

test('四项指标表：4 行，与正文指标名一致', () => {
  const m = auditMetricTable(A.tables);
  assert.strictEqual(m.rows, 4);
  assert.strictEqual(m.columns, 3);
  assert.deepStrictEqual(m.metrics, ['可核率', '复述准确率', '误读率', '行为指向']);
});

test('三级表述齐，且正文声明不给实测数字', () => {
  assert.deepStrictEqual(A.grades, GRADES);
  assert.ok(A.noNumbers, '正文缺「不给任何实测数字」');
  assert.doesNotThrow(() => verify(auditFailureTable(A.tables), auditMetricTable(A.tables), A));
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
  assert.match(r.stdout, /不给任何实测数字/);
  assert.match(r.stdout, /不构成诊疗意见/);
});
