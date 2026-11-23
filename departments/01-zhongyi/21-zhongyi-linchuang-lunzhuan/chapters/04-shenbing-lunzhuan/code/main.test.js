#!/usr/bin/env node
/**
 * 中医临床轮转 · 第 4 章 —— 确定性单元测试
 * 运行: node --test chapters/04-shenbing-lunzhuan/code/main.test.js
 *
 * 两组断言：
 *   1) 代码只读本章 docs/zh.md，现算出的规模、表行、词频与本次实测值一致；
 *   2) quiz.json 结构齐、答案下标合法且分散、解释够长、check 题的正确项能在正文找到原词。
 * 正文或题目一改，这里先响。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const { DOC, TITLE, summary, criteriaTable } = require('./main.js');

const text = fs.readFileSync(DOC, 'utf8');
const s = summary(text);
const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));

const hanzi = (v) => (String(v || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
function shingles(str, n = 4) {
  const clean = String(str || '').replace(/[^\u4e00-\u9fff]/g, ' ');
  const out = new Set();
  for (const seg of clean.split(/\s+/)) for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  return out;
}

test('本章正文规模与结构（只读本章 docs/zh.md 现算）', () => {
  assert.strictEqual(s.hanzi, 2820);
  assert.strictEqual(s.sections.length, 6);
  assert.strictEqual(s.tables, 6);
  assert.strictEqual(s.rows, 43);
  assert.strictEqual(TITLE.length > 0, true);
});

test('判据表行数与表头列数', () => {
  const ct = criteriaTable(text);
  assert.ok(ct.title.includes('判据'), `未找到判据一节：${ct.title}`);
  assert.strictEqual(ct.table.rows.length, 13);
  assert.strictEqual(ct.table.header.length, 4);
});

test('抓手词频与排序', () => {
  const counts = Object.fromEntries(s.terms.map((x) => [x.term, x.count]));
  assert.strictEqual(counts["水肿"], 29, '水肿');
  assert.strictEqual(counts["小便"], 19, '小便');
  assert.strictEqual(counts["淋证"], 16, '淋证');
  assert.strictEqual(counts["浮肿"], 13, '浮肿');
  assert.strictEqual(counts["出入量"], 7, '出入量');
  assert.strictEqual(counts["转诊"], 7, '转诊');
  assert.strictEqual(counts["阳水"], 6, '阳水');
  assert.strictEqual(counts["阴水"], 5, '阴水');
  assert.strictEqual(s.terms[0].term, "水肿");
  assert.strictEqual(s.terms[0].count, 29);
});

test('最长一节', () => {
  const d = s.sections.slice().sort((a, b) => b.hanzi - a.hanzi)[0];
  assert.strictEqual(d.hanzi, 661);
  assert.ok(d.title.startsWith("二、判据"), d.title);
});

test('quiz 结构：题量、阶段、四选项、下标合法、解释够长、下标分散', () => {
  const qs = quiz.questions;
  assert.ok(qs.length >= 5, `仅 ${qs.length} 题`);
  const stages = new Set(qs.map((q) => q.stage));
  for (const st of ['pre', 'check', 'post']) assert.ok(stages.has(st), `缺 ${st} 段`);
  const idx = new Set();
  for (const q of qs) {
    assert.strictEqual(q.options.length, 4, q.question);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4, q.question);
    idx.add(q.correct);
    assert.ok(hanzi(q.explain) >= 30, `解释过短：${q.question}`);
  }
  assert.ok(idx.size >= 3, `答案下标只有 ${idx.size} 种`);
});

test('quiz 接地：至少 2 道 check 题的正确项含正文原词', () => {
  const body = shingles(text);
  const hits = quiz.questions
    .filter((q) => q.stage === 'check')
    .filter((q) => [...shingles(q.options[q.correct])].some((g) => body.has(g)));
  assert.ok(hits.length >= 2, `接地 check 题仅 ${hits.length} 道`);
});
