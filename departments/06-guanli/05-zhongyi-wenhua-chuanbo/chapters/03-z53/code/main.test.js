'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, YEARS, read, analyze, auditCarrierTable, verify } = require('./main.js');

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
  assert.ok(DOC.endsWith(path.join('chapters', '03-z53', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
});

test('章号与标题取自本章正文', () => {
  assert.strictEqual(CHAPTER, 3);
  assert.strictEqual(TITLE, '制度化救下的是编制与课表，不是可传播性');
  assert.match(BODY.split('\n')[0], new RegExp('^# 第 3 章 · ' + TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

test('正文统计可复算：汉字、节、表', () => {
  assert.ok(A.hanzi > 2500 && A.hanzi < 6000, String(A.hanzi));
  assert.strictEqual(A.sections.length, 6);
  assert.strictEqual(A.tableCount, 1);
  const sum = A.sections.reduce((s, x) => s + x.hanzi, 0);
  assert.ok(sum > 0 && sum <= A.hanzi, `${sum} vs ${A.hanzi}`);
});

test('四期载体表：4 行，传播单位期期不同，每期都写了被筛掉的东西', () => {
  const g = auditCarrierTable(A.tables);
  assert.strictEqual(g.rows, 4);
  assert.strictEqual(g.columns, 4);
  assert.deepStrictEqual(g.periods, ['清以前', '清末至民国', '1950 年代后', '1990 年代后']);
  assert.strictEqual(g.distinctUnits, 4);
  assert.strictEqual(g.filtered, 4);
  assert.doesNotThrow(() => verify(g));
});

test('四个可核年份都在正文里', () => {
  assert.deepStrictEqual(A.years, YEARS);
  assert.strictEqual(A.years.length, 4);
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
  assert.match(r.stdout, /传播单位期期不同：4\/4/);
  assert.match(r.stdout, /不构成合规或诊疗意见/);
});
