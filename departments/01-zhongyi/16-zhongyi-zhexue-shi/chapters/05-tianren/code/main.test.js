'use strict';
/**
 * 第 5 章 天人相应：人与环境的关系模型 —— 正文与习题的对齐断言
 * 运行：node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：小节号、表格行、判据词命中、并列骨架、quiz 结构与答案分布。
 * 实测值由 analyze() 现算后写死在此；正文一改，这里会先响。
 */

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const m = require('./main.js');

const r = m.analyze();
const rawQuiz = fs.readFileSync(m.QUIZ, 'utf8');
const quiz = JSON.parse(rawQuiz);

test('正文规模与结构：汉字、小节、表格、引书', () => {
  assert.strictEqual(r.hanzi, 2842);
  assert.strictEqual(r.sections.length, 6);
  assert.deepStrictEqual(r.sections, [
    "一、三个参数：时、地、人",
    "二、参数怎样进入诊断与治法",
    "三、模型的边界：能解释季节，不能解释个体",
    "四、被误用时的表现与可判断的标志",
    "五、把模型读成参数，而不是命运",
    "代价与边界",
  ]);
  assert.strictEqual(r.table.tables, 1);
  assert.strictEqual(r.table.rows, 3);
  assert.strictEqual(r.books.length, 2);
});

test('判据词逐个落在正文，命中数与实测一致', () => {
  assert.deepStrictEqual(
    r.terms.map((t) => [t.term, t.n]),
    [
      ["参数", 37],
      ["四时", 12],
      ["昼夜", 4],
      ["五方", 2],
      ["决定论", 3],
      ["事后归因", 2],
      ["可检验", 2],
    ]
  );
});

test('并列骨架齐全：缺一项就是正文这一节没写完', () => {
  for (const g of r.groups) {
    assert.deepStrictEqual(g.missing, [], `${g.label} 缺：${g.missing.join('、')}`);
  }
  assert.strictEqual(r.groups.length, 3);
});

test('quiz 结构：题量、三段、四选项、解释长度、答案下标', () => {
  const q = r.quiz;
  assert.strictEqual(q.total, 6);
  assert.deepStrictEqual(q.stage, {"pre":1,"check":4,"post":1});
  assert.strictEqual(q.allFourOptions, true, '有题不是 4 个选项');
  assert.strictEqual(q.badCorrect, 0, 'correct 下标非法');
  assert.strictEqual(q.minExplain, 90);
  assert.ok(q.minExplain >= 30, `最短解释只有 ${q.minExplain} 汉字`);
  for (const item of quiz.questions) {
    assert.ok(item.question && item.question.length > 6, '存在空题干');
    assert.strictEqual(new Set(item.options).size, 4, `选项有重复：${item.question}`);
  }
});

test('quiz 答案打散，且与实测一致', () => {
  assert.deepStrictEqual(r.quiz.answers, [0,1,2,3,1,2]);
  assert.ok(r.quiz.distinctAnswers >= 3, `正确答案只用到 ${r.quiz.distinctAnswers} 个位置`);
  assert.strictEqual(r.quiz.distinctAnswers, 4);
  const seen = new Set();
  for (const q of quiz.questions) {
    assert.ok(!seen.has(q.question), `重复设问：${q.question}`);
    seen.add(q.question);
  }
});

test('quiz 接地：至少两道 check 题的正确选项能回到正文原词', () => {
  assert.ok(r.quiz.checkGrounded >= 2, `只有 ${r.quiz.checkGrounded} 道 check 题接地`);
  assert.strictEqual(r.quiz.checkGrounded, 4);
});

test('quiz 不出现正文之外的名目', () => {
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测', '本课第', '见 code/main.js 输出']) {
    assert.ok(!rawQuiz.includes(bad), `quiz 仍含「${bad}」`);
  }
});

test('quiz 的章题与 chapters.json 一致', () => {
  const book = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '..', '..', '..', 'chapters.json'), 'utf8')
  );
  const ch = book.chapters.find((x) => x.n === m.CHAPTER);
  assert.ok(ch, `chapters.json 里没有第 ${m.CHAPTER} 章`);
  assert.strictEqual(quiz.title, ch.title, 'quiz 标题与章节目录不一致');
  assert.strictEqual(quiz.chapter, m.CHAPTER);
  assert.strictEqual(quiz.slug, m.SLUG);
  assert.strictEqual(quiz.source, `chapters/${m.SLUG}/docs/zh.md`);
});
