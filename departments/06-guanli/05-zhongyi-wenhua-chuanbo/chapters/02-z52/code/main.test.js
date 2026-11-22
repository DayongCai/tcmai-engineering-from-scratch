'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, analyze, auditGranuleTable, verify } = require('./main.js');

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
  assert.ok(DOC.endsWith(path.join('chapters', '02-z52', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
});

test('章号与标题取自本章正文', () => {
  assert.strictEqual(CHAPTER, 2);
  assert.strictEqual(TITLE, '能传走的是判据，不是神医');
  assert.match(BODY.split('\n')[0], new RegExp('^# 第 2 章 · ' + TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

test('正文统计可复算：汉字、节、表', () => {
  assert.ok(A.hanzi > 2500 && A.hanzi < 6000, String(A.hanzi));
  assert.strictEqual(A.sections.length, 7);
  assert.strictEqual(A.tableCount, 1);
  const sum = A.sections.reduce((s, x) => s + x.hanzi, 0);
  assert.ok(sum > 0 && sum <= A.hanzi, `${sum} vs ${A.hanzi}`);
});

test('四类颗粒表：4 行，方是半径最大且留存最长的那一类', () => {
  const g = auditGranuleTable(A.tables);
  assert.strictEqual(g.rows, 4);
  assert.strictEqual(g.columns, 5);
  assert.deepStrictEqual(g.list.map((x) => x.name), ['病名', '判据', '方', '案']);
  assert.strictEqual(g.widest.name, '方');
  assert.strictEqual(g.longest.name, '方');
});

test('判据的传播半径是中，与正文「最该传却最难传」一致', () => {
  const g = auditGranuleTable(A.tables);
  assert.ok(g.criteria);
  assert.strictEqual(g.criteria.radius, '中');
  assert.doesNotThrow(() => verify(g));
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
  assert.match(r.stdout, /最容易被讲坏/);
  assert.match(r.stdout, /不构成诊疗意见/);
});
