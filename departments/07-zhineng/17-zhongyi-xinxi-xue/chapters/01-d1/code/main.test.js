'use strict';
/**
 * 第 1 章的习题与正文对齐：正文规模、术语、单元层复算、quiz 结构，全部现算后断言。
 * 正文改数、quiz 跑题、答案全挤在同一位置，这里都会红。
 */
const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const main = require('./main.js');
const { analyze, docClaim, shingles, hanzi } = main;

const r = analyze();

test('章节身份与章号一致', () => {
  assert.strictEqual(r.CHAPTER, 1);
  assert.strictEqual(r.SLUG, '01-d1');
  assert.ok(r.headings.length >= 5, `小节太少：${r.headings.length}`);
  assert.ok(r.docHanzi > 2000, `正文汉字过少：${r.docHanzi}`);
  assert.ok(r.tableRows > 0, '正文没有任何表格行');
  assert.ok(r.quotes.length > 0, '正文没有引号术语');
});

test('正文自称的单元规模与单元层一致', () => {
  assert.deepStrictEqual(docClaim(fs.readFileSync(require('./main.js').DOC, 'utf8')), r.claim);
  assert.strictEqual(r.claim.units, r.facts.units, `单元数 ${r.claim.units} ≠ 复算 ${r.facts.units}`);
  assert.strictEqual(r.claim.hanzi, r.facts.hanzi, `单元汉字 ${r.claim.hanzi} ≠ 复算 ${r.facts.hanzi}`);
  assert.ok(r.facts.avg > 0 && r.facts.avg < 500, `单元均字数异常：${r.facts.avg}`);
});

test('本章核心术语都在正文里出现', () => {
  for (const t of r.terms) assert.ok(t.count > 0, `正文没有讲到「${t.term}」`);
});

test('quiz 结构：题量、三段、四选项、解释长度、答案合法', () => {
  const q = r.quiz;
  assert.ok(q.total >= 5, `只有 ${q.total} 题`);
  for (const s of ['pre', 'check', 'post']) assert.ok(q.stage[s] >= 1, `缺 ${s} 段`);
  assert.strictEqual(q.allFourOptions, true, '有题不是 4 个选项');
  assert.strictEqual(q.badCorrect, 0, 'correct 下标非法');
  assert.ok(q.minExplain >= 30, `最短的解释只有 ${q.minExplain} 汉字`);
});

test('quiz 接地：check 题正确选项能在正文找到原词，且答案打散', () => {
  assert.ok(r.quiz.checkGrounded >= 2, `只有 ${r.quiz.checkGrounded} 道 check 题接地`);
  assert.ok(r.quiz.distinctAnswers >= 3, `正确答案只用到 ${r.quiz.distinctAnswers} 个位置`);
});

test('quiz 不出现正文之外的脚手架名目', () => {
  const raw = fs.readFileSync(require('./main.js').QUIZ, 'utf8');
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测', '见 code/main.js 输出']) {
    assert.ok(!raw.includes(bad), `quiz 仍含「${bad}」`);
  }
});

test('chapter-map 的单元清单与本章一致', () => {
  const cm = JSON.parse(fs.readFileSync(require('./main.js').MAP, 'utf8')).chapters[r.SLUG];
  assert.ok(Array.isArray(cm.units) && cm.units.length === r.facts.units, '章映射的单元数对不上');
  assert.strictEqual(String(cm.n), String(r.CHAPTER));
  assert.ok(/\S/.test(require('./main.js').TITLE));
});

test('接地判据本身可复现：正文里的四字片段能被 shingles 找到', () => {
  const body = shingles(fs.readFileSync(require('./main.js').DOC, 'utf8'));
  for (const term of ['受控词表', '参照系统']) {
    assert.ok(body.has(term), `正文片段「${term}」没有被 shingles 收进`);
  }
  assert.ok(hanzi('语义') === 2);
});
