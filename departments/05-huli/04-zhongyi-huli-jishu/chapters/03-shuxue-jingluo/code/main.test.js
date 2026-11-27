'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, analyze } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const QUIZ = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));
const A = analyze(read());
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const hanzi = (s) => (String(s || '').match(HANZI) || []).length;

function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('正文在本章目录下，章号与标题与正文首行一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '03-shuxue-jingluo', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC), '正文文件不存在');
  assert.strictEqual(CHAPTER, 3);
  const first = read().split('\n')[0];
  assert.ok(first.startsWith('# 第 3 章'), '正文首行不是本章章题: ' + first);
  assert.ok(first.endsWith(TITLE), 'TITLE 与正文章题不一致: ' + first);
});

test('规模与正文快照一致', () => {
  assert.strictEqual(A.hanzi, 2889);
  assert.strictEqual(A.sections.length, 6);
  assert.strictEqual(A.tables, 2);
});

test('各组判据都在正文落地', () => {
  assert.deepStrictEqual(A.ledger.map((g) => g.items.filter((i) => i.n > 0).length), [4,4,3,6]);
});

test('顺序判据与正文写法一致', () => {
  assert.ok(A.sequences.every((s) => s.ok), A.sequences.filter((s) => !s.ok).map((s) => s.label).join('、'));
  assert.ok(A.orders.every((o) => o.ok), A.orders.filter((o) => !o.ok).map((o) => o.label).join('、'));
});

test('quiz 结构：不少于 5 题、pre/check/post 齐、4 选项、解析够长', () => {
  const qs = QUIZ.questions;
  assert.ok(qs.length >= 5, `只有 ${qs.length} 题`);
  assert.deepStrictEqual([...new Set(qs.map((q) => q.stage))].sort(), ['check', 'post', 'pre']);
  for (const q of qs) {
    assert.strictEqual(q.options.length, 4);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4);
    assert.ok(hanzi(q.explain) >= 30, `解析过短：${hanzi(q.explain)} 字`);
  }
  assert.ok(qs.filter((q) => q.stage === 'check').length >= 2);
});

test('quiz 答案打散，不集中在同一个下标', () => {
  assert.ok(new Set(QUIZ.questions.map((q) => q.correct)).size >= 3);
});

test('quiz 与 code 都不含旧脚手架字样', () => {
  const raw = fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8');
  const code = fs.readFileSync(MAIN, 'utf8');
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测', '见 code/main.js 输出']) {
    assert.ok(!raw.includes(bad), 'quiz 含 ' + bad);
    assert.ok(!code.includes(bad), 'code 含 ' + bad);
  }
  assert.ok(!/本课第\s*\d+\s*章/.test(raw));
});

test('至少两道 check 题的正确项能在正文找到原词', () => {
  const body = shingles(read());
  const hit = QUIZ.questions.filter(
    (q) => q.stage === 'check' && [...shingles(q.options[q.correct])].some((g) => body.has(g)),
  ).length;
  assert.ok(hit >= 2, `只有 ${hit} 道`);
});

test('脚本可运行并声明边界', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes('汉字 ' + 2844 + ' 字'), '输出与快照不一致');
  assert.match(out, /不构成操作指导/);
});
