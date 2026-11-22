'use strict';
/**
 * 第 2 章：正文规模、单元层复算、判据词、quiz 结构全部现算后断言。
 * 正文改数、quiz 跑题、答案挤在同一位置，这里都会红。
 */
const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const main = require('./main.js');
const { analyze, docClaim, shingles, hanzi } = main;

const r = analyze();
const doc = fs.readFileSync(main.DOC, 'utf8');
const quizRaw = fs.readFileSync(main.QUIZ, 'utf8');

test('章节身份：章号、slug、标题与小节结构一致', () => {
  assert.strictEqual(r.CHAPTER, 2);
  assert.strictEqual(r.SLUG, '02-jinshang-lunzhuan');
  assert.match(r.TITLE, /禁忌筛查/);
  assert.ok(r.headings.length >= 5, `小节太少：${r.headings.length}`);
  for (const key of main.REQUIRED_HEADINGS) {
    assert.ok(r.headings.some((h) => h.includes(key)), `缺小节主题「${key}」`);
  }
  assert.ok(r.docHanzi > 2500, `正文汉字过少：${r.docHanzi}`);
  assert.ok(r.tableRows >= 18, `表格行太少：${r.tableRows}`);
  assert.ok(r.quotes.length >= 5, `引号术语太少：${r.quotes.length}`);
});

test('正文自称的单元规模与单元层复算一致', () => {
  assert.deepStrictEqual(docClaim(doc), r.claim);
  assert.strictEqual(r.claim.units, r.facts.units, `单元数 ${r.claim.units} ≠ 复算 ${r.facts.units}`);
  assert.strictEqual(r.claim.hanzi, r.facts.hanzi, `单元汉字 ${r.claim.hanzi} ≠ 复算 ${r.facts.hanzi}`);
  assert.strictEqual(r.facts.units, 6);
});

test('本章核心判据词都在正文里出现', () => {
  for (const t of r.terms) assert.ok(t.count > 0, `正文没有讲到「${t.term}」`);
});

test('正文确实给出了三档筛查与可执行判据', () => {
  for (const phrase of ['红：不做', '黄：慎做', '绿：可做', '手法四要素', '三次无改善', '留观']) {
    assert.ok(doc.includes(phrase), `正文缺判据「${phrase}」`);
  }
  // 四问必须落成表格里的四个问法
  assert.ok(/什么时候疼/.test(doc) && /什么动作疼/.test(doc), '正文四问不完整');
  // 不可按的那一问必须点明
  assert.ok(/有没有人告诉过你不能按/.test(doc), '正文缺「不能按」这一问');
});

test('quiz 结构：题量、三段、四选项、解释长度、下标合法', () => {
  const q = r.quiz;
  assert.ok(q.total >= 5, `只有 ${q.total} 题`);
  for (const s of ['pre', 'check', 'post']) assert.ok(q.stage[s] >= 1, `缺 ${s} 段`);
  assert.strictEqual(q.allFourOptions, true, '有题不是 4 个选项');
  assert.strictEqual(q.badCorrect, 0, 'correct 下标非法');
  assert.ok(q.minExplain >= 30, `最短的解释只有 ${q.minExplain} 汉字`);
});

test('quiz 接地：check 题正确选项能在正文找到原词，答案打散', () => {
  assert.ok(r.quiz.checkGrounded >= 2, `只有 ${r.quiz.checkGrounded} 道 check 题接地`);
  assert.ok(r.quiz.stage.check >= 3, `check 题只有 ${r.quiz.stage.check} 道`);
  assert.ok(r.quiz.distinctAnswers >= 3, `正确答案只用到 ${r.quiz.distinctAnswers} 个位置`);
});

test('quiz 问的是正文的判断，不是脚手架名目', () => {
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测']) {
    assert.ok(!quizRaw.includes(bad), `quiz 仍含「${bad}」`);
  }
  assert.ok(!/本课第\s*\d+\s*章/.test(quizRaw), 'quiz 仍含章号脚手架');
  const asks = (JSON.parse(quizRaw).questions || []).filter((q) => /什么|哪一|为什么|怎么/.test(q.question));
  assert.ok(asks.length >= 4, `判断类题目只有 ${asks.length} 道`);
});

test('接地判据本身可复现', () => {
  const body = shingles(doc);
  for (const term of ['禁忌筛查', '观察判据', '手法四要', '重新评估']) {
    assert.ok(body.has(term), `正文片段「${term}」没有被 shingles 收进`);
  }
  assert.strictEqual(hanzi('抓一把草'), 4);
  assert.strictEqual(hanzi('abc12'), 0);
});
