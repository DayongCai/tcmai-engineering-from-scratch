'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, analyze, span, pipeline, gapTable, breakpoints } = require('./main.js');

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
  assert.ok(DOC.endsWith(path.join('chapters', '05-w5', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
});

test('章号与标题取自本章正文', () => {
  assert.strictEqual(CHAPTER, 5);
  assert.strictEqual(TITLE, '卫生人力不是缺人，是缺在错的地方');
  assert.match(BODY.split('\n')[0], /^# 第 5 章 · /);
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

test('年限区间读法：单值与区间都能解析', () => {
  assert.deepStrictEqual(span('5 年'), [5, 5]);
  assert.deepStrictEqual(span('3—5 年'), [3, 5]);
});

test('培养管道：四阶段，从入学到独立值班 11—13 年，占有效执业 30 年的三成以上', () => {
  const p = pipeline(A.tables, BODY);
  assert.strictEqual(p.stages.length, 4);
  assert.deepStrictEqual(p.stages.map((s) => s.stage), ['院校教育', '毕业后教育', '独立执业初期', '成熟期']);
  assert.strictEqual(p.min, 11);
  assert.strictEqual(p.max, 13);
  assert.strictEqual(p.effective, 30);
  assert.ok(p.min >= 10, '「十年以上」应成立');
  assert.ok(p.shareMin > 30 && p.shareMax < 50, `${p.shareMin}—${p.shareMax}`);
});

test('三种缺口与腾笼换鸟三段都能从表里数出来', () => {
  assert.deepStrictEqual(gapTable(A.tables), ['数量', '结构', '分布']);
  assert.deepStrictEqual(breakpoints(A.tables), ['降价', '调价', '薪酬']);
  assert.match(BODY, /第三处最容易被忽略/);
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
  assert.match(r.stdout, /不构成劳动人事建议/);
  assert.match(r.stdout, /11—13 年/);
});
