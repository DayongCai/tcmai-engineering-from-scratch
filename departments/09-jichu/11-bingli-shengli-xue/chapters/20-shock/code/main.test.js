#!/usr/bin/env node
/**
 * 第 20 章 休克 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：正文规模、引证章号、节号前缀、数值命中、锚点落位、
 * quiz 契约（题数/三段/四选项/解释字数/选项接地/答案分散）。不锁正文措辞。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const {
  CHAPTER, TITLE, ANCHORS, BOUNDARY,
  readDoc, shape, citationAudit, valueAudit, anchorCoverage, main,
} = require('./main');

const doc = readDoc();
const EXPECT = {
  h2: 6,
  h3: 13,
  paras: 57,
  hanzi: 6971,
  chars: 9296,
  cites: 13,
  distinct: 12,
  values: 0,
  anchors: ["微循环","器官功能"],
};
const QUIZ = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));

const cjk = (s) => (String(s).match(/[\u4e00-\u9fff]/g) || []).length;

function grams(s) {
  const out = new Set();
  const t = String(s);
  for (let i = 0; i + 4 <= t.length; i += 1) {
    const g = t.slice(i, i + 4);
    if (/^[\u4e00-\u9fff]{4}$/.test(g)) out.add(g);
  }
  return out;
}

test('章号与标题来自正文 H1', () => {
  assert.strictEqual(CHAPTER, 20);
  const h1 = doc.split(/\r?\n/).find((l) => /^#\s+/.test(l)) || '';
  assert.ok(h1.includes(TITLE), `H1 不含标题：${h1}`);
  assert.ok(TITLE.length >= 2);
});

test('正文规模：节 / 小节 / 段 / 汉字 / 非空白字符与实测一致', () => {
  const s = shape(doc);
  assert.deepStrictEqual(
    { h2: s.h2, h3: s.h3, paras: s.paras, hanzi: s.hanzi, chars: s.chars },
    { h2: EXPECT.h2, h3: EXPECT.h3, paras: EXPECT.paras, hanzi: EXPECT.hanzi, chars: EXPECT.chars },
  );
});

test('引证章号与节号前缀全部等于本章，没有跨章复制', () => {
  const c = citationAudit(doc, CHAPTER);
  assert.strictEqual(c.total, EXPECT.cites);
  assert.deepStrictEqual(c.wrongChapter, []);
  assert.deepStrictEqual(c.prefixMismatch, []);
  assert.strictEqual(c.distinct.length, EXPECT.distinct);
});

test('数值型命中数与实测一致（正文只给类别与关系）', () => {
  const v = valueAudit(doc);
  assert.strictEqual(v.hits, EXPECT.values);
});

test('锚点从正文选出，且每个锚点至少落在一节', () => {
  assert.deepStrictEqual(ANCHORS, EXPECT.anchors);
  const cov = anchorCoverage(doc);
  const flat = doc.replace(/\s/g, '');
  for (const a of ANCHORS) {
    assert.ok(cov[a].length >= 1, `锚点「${a}」未落位`);
    assert.ok(flat.includes(a), `锚点在正文中找不到：${a}`);
  }
});

test('quiz：≥5 题，pre/check/post 三段齐，每题 4 个互异选项', () => {
  const qs = QUIZ.questions;
  assert.ok(qs.length >= 5, `题数 ${qs.length}`);
  for (const stage of ['pre', 'check', 'post']) {
    assert.ok(qs.some((q) => q.stage === stage), `缺 ${stage}`);
  }
  for (const [i, q] of qs.entries()) {
    assert.ok(q.question && q.question.length >= 6, `Q${i + 1} 题干过短`);
    assert.strictEqual(new Set(q.options).size, 4, `Q${i + 1} 选项不互异`);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct <= 3, `Q${i + 1} correct 越界`);
    assert.ok(cjk(q.explanation) >= 30, `Q${i + 1} 解释不足 30 汉字`);
  }
  assert.strictEqual(QUIZ.lesson, "20-shock");
  assert.strictEqual(QUIZ.subject, '11-bingli-shengli-xue');
});

test('quiz：每题的末条引证落在本章章号', () => {
  for (const [i, q] of QUIZ.questions.entries()) {
    const ms = [...q.explanation.matchAll(/第\s*(\d+)\s*章/g)];
    assert.ok(ms.length >= 1, `Q${i + 1} 无章号引证`);
    assert.strictEqual(Number(ms[ms.length - 1][1]), CHAPTER, `Q${i + 1} 末条引证不落本章`);
  }
});

test('quiz：check 题至少 2 道的正确项含当章正文 4 字词组', () => {
  const flat = doc.replace(/\s/g, '');
  const checks = QUIZ.questions.filter((q) => q.stage === 'check');
  const grounded = checks.filter((q) => [...grams(q.options[q.correct])].some((g) => flat.includes(g)));
  assert.ok(grounded.length >= 2, `接地 check 题 ${grounded.length}/${checks.length}`);
});

test('quiz：答案打散，正确项覆盖至少 3 个位置且单一位置不超过 3 题', () => {
  const idx = QUIZ.questions.map((q) => q.correct);
  const counts = [0, 0, 0, 0];
  for (const i of idx) counts[i] += 1;
  assert.ok(counts.filter((n) => n > 0).length >= 3, `分布 ${counts.join('/')}`);
  assert.ok(Math.max(...counts) <= 3, `分布 ${counts.join('/')}`);
});

test('main() 末行固定为教学边界句，且正文含边界声明', () => {
  const logs = [];
  const orig = console.log;
  console.log = (...a) => logs.push(a.join(' '));
  try { main(); } finally { console.log = orig; }
  assert.strictEqual(logs[logs.length - 1], BOUNDARY);
  assert.ok(doc.includes('教学边界：'));
});
