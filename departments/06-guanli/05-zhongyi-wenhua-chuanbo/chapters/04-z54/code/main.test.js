'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, ERRORS, read, analyze, auditReadability, auditQinghao, verify } = require('./main.js');

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
  assert.ok(DOC.endsWith(path.join('chapters', '04-z54', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
});

test('章号与标题取自本章正文', () => {
  assert.strictEqual(CHAPTER, 4);
  assert.strictEqual(TITLE, '典籍变不成资源，除非先被切成一格一格');
  assert.match(BODY.split('\n')[0], new RegExp('^# 第 4 章 · ' + TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

test('正文统计可复算：汉字、节、表', () => {
  assert.ok(A.hanzi > 2500 && A.hanzi < 6000, String(A.hanzi));
  assert.strictEqual(A.sections.length, 6);
  assert.strictEqual(A.tableCount, 1);
  const sum = A.sections.reduce((s, x) => s + x.hanzi, 0);
  assert.ok(sum > 0 && sum <= A.hanzi, `${sum} vs ${A.hanzi}`);
});

test('三种「可查」层级表：3 行，顶层是「可算」', () => {
  const r = auditReadability(A.tables);
  assert.strictEqual(r.rows, 3);
  assert.strictEqual(r.columns, 4);
  assert.deepStrictEqual(r.levels, ['可翻', '可检', '可算']);
  assert.strictEqual(r.abilitiesFilled, 3);
  assert.strictEqual(r.top, '可算');
});

test('青蒿记载不到二十个字，与正文说法一致', () => {
  const q = auditQinghao(BODY);
  assert.ok(q.hanzi >= 10 && q.hanzi < 20, `${q.hanzi}: ${q.text}`);
  assert.ok(q.text.includes('青蒿'));
  assert.doesNotThrow(() => verify(auditReadability(A.tables), q));
});

test('四类检索失真都出现在正文里', () => {
  assert.deepStrictEqual(A.errorKinds, ERRORS);
  assert.strictEqual(A.errorKinds.length, 4);
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
  assert.match(r.stdout, /不报错/);
  assert.match(r.stdout, /不构成诊疗意见/);
});
