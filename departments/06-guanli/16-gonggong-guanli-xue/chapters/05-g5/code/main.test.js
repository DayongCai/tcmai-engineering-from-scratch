'use strict';
/**
 * 第 5 章的习题与正文对齐：结构、判据、骨架、quiz，全部从正文现算后断言。
 * 正文改数、并列项缺项、习题跑题，这里都会红。
 */
const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const m = require('./main.js');

const r = m.analyze();
const rawQuiz = fs.readFileSync(m.QUIZ, 'utf8');
const quiz = JSON.parse(rawQuiz);

test('正文立得住：字数、小节、表格与引书都在', () => {
  assert.ok(r.hanzi >= 2500, `正文只有 ${r.hanzi} 汉字，不足以支撑本章的判断`);
  assert.ok(r.sections.length >= 5, `只有 ${r.sections.length} 节`);
  assert.strictEqual(r.table.rows, 3, `表格数据行 ${r.table.rows} ≠ 正文应有 3 行`);
  assert.ok(r.books.length >= 1, `正文没有引到任何书`);
});

test('每一组并列项都在正文里齐全', () => {
  for (const g of r.groups) assert.deepStrictEqual(g.missing, [], `${g.label} 缺：${g.missing.join('、')}`);
});

test('判据术语都在正文出现，且不是一笔带过', () => {
  for (const t of r.terms) assert.ok(t.n >= 1, `「${t.term}」在正文里没有出现`);
  assert.ok(r.terms.filter((t) => t.n >= 2).length >= 2, '多数判据只出现一两次，正文没有展开');
});

test('quiz 结构：题量、三段、四选项、解释长度、答案合法', () => {
  const q = r.quiz;
  assert.ok(q.total >= 5, `只有 ${q.total} 题`);
  for (const s of ['pre', 'check', 'post']) assert.ok(q.stage[s] >= 1, `缺 ${s} 段`);
  assert.strictEqual(q.allFourOptions, true, '有题不是 4 个选项');
  assert.strictEqual(q.badCorrect, 0, 'correct 下标非法');
  assert.ok(q.minExplain >= 30, `最短的解释只有 ${q.minExplain} 汉字`);
});

test('quiz 接地：至少两道 check 题的正确选项能回到正文原词', () => {
  assert.ok(r.quiz.checkGrounded >= 2, `只有 ${r.quiz.checkGrounded} 道 check 题接地`);
});

test('quiz 答案打散，且不重复设问', () => {
  assert.ok(r.quiz.distinctAnswers >= 3, `正确答案只用到了 ${r.quiz.distinctAnswers} 个位置`);
  const seen = new Set();
  for (const q of quiz.questions) {
    assert.ok(!seen.has(q.question), `重复设问：${q.question}`);
    seen.add(q.question);
    assert.strictEqual(new Set(q.options).size, 4, `选项有重复：${q.question}`);
  }
});

test('quiz 不出现正文之外的名目', () => {
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测', '本课第']) assert.ok(!rawQuiz.includes(bad), `quiz 仍含「${bad}」`);
});

test('quiz 的章题与 chapters.json 一致', () => {
  const book = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', '..', '..', 'chapters.json'), 'utf8'));
  const ch = book.chapters.find((x) => x.n === m.CHAPTER);
  assert.ok(ch, `chapters.json 里没有第 ${m.CHAPTER} 章`);
  assert.strictEqual(quiz.title, ch.title, 'quiz 标题与章节目录不一致');
  assert.strictEqual(quiz.chapter, m.CHAPTER);
  assert.strictEqual(quiz.slug, m.SLUG);
});
