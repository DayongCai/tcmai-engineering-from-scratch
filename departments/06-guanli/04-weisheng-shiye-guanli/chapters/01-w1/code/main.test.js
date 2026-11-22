'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, analyze, auditSharedTask, auditAccountability } = require('./main.js');

const BODY = read();
const A = analyze(BODY);

/** 正文与习题共用的 4 字切片，用来判断选项是否真的落在正文里。 */
function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('正文文件就在本章目录下', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '01-w1', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
});

test('章号与标题取自本章正文', () => {
  assert.strictEqual(CHAPTER, 1);
  assert.strictEqual(TITLE, '谁都能管，等于谁都不管：卫生管理体制的责任链');
  assert.match(BODY.split('\n')[0], new RegExp('^# 第 1 章 · ' + TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

test('正文统计可复算：汉字、节、表、引文', () => {
  assert.ok(A.hanzi > 2500 && A.hanzi < 5000, String(A.hanzi));
  assert.strictEqual(A.sections.length, 6);
  assert.strictEqual(A.tableCount, 2);
  assert.strictEqual(A.cites.length, 1);
  const sum = A.sections.reduce((s, x) => s + x.hanzi, 0);
  assert.ok(sum > 0 && sum <= A.hanzi, `${sum} vs ${A.hanzi}`);
});

test('三列对应表：4 行事项，问责落在政府名下 3 行', () => {
  const acc = auditAccountability(A.tables);
  assert.strictEqual(acc.rows, 4);
  assert.strictEqual(acc.columns, 4);
  assert.strictEqual(acc.toGovernment, 3);
});

test('共同事权算术与正文自洽：4000 / 2400 / 1600 万元', () => {
  const r = auditSharedTask(A.tables);
  assert.strictEqual(r.population, 40);
  assert.strictEqual(r.perCapita, 100);
  assert.strictEqual(r.centralShare, 60);
  assert.strictEqual(r.total, 4000);
  assert.strictEqual(r.central, 2400);
  assert.strictEqual(r.county, 1600);
  assert.ok(r.ok, '表里的结果与复算不一致');
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
  assert.match(r.stdout, /表算一致/);
});
