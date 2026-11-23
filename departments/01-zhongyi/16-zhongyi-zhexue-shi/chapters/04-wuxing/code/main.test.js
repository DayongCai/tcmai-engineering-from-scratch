'use strict';
/**
 * 第 4 章 五行：分类还是生成 —— 正文与习题的对齐断言
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
  assert.strictEqual(r.hanzi, 2800);
  assert.strictEqual(r.sections.length, 6);
  assert.deepStrictEqual(r.sections, [
    "一、两种读法：分类与生成",
    "二、五行是一张有方向的关系网",
    "三、传变落成「先安未受邪之地」",
    "四、被误用时的表现与可判断的标志",
    "五、坐标系的用法：定位与推演，不是定义",
    "代价与边界",
  ]);
  assert.strictEqual(r.table.tables, 1);
  assert.strictEqual(r.table.rows, 2);
  assert.strictEqual(r.books.length, 3);
});

test('判据词逐个落在正文，命中数与实测一致', () => {
  assert.deepStrictEqual(
    r.terms.map((t) => [t.term, t.n]),
    [
      ["归类", 9],
      ["生成", 9],
      ["相生", 3],
      ["相克", 4],
      ["相乘", 5],
      ["相侮", 3],
      ["先安未受邪之地", 3],
      ["虚实", 5],
    ]
  );
});

test('并列骨架齐全：缺一项就是正文这一节没写完', () => {
  for (const g of r.groups) {
    assert.deepStrictEqual(g.missing, [], `${g.label} 缺：${g.missing.join('、')}`);
  }
  assert.strictEqual(r.groups.length, 4);
});

test('quiz 结构：题量、三段、四选项、解释长度、答案下标', () => {
  const q = r.quiz;
  assert.strictEqual(q.total, 6);
  assert.deepStrictEqual(q.stage, {"pre":1,"check":4,"post":1});
  assert.strictEqual(q.allFourOptions, true, '有题不是 4 个选项');
  assert.strictEqual(q.badCorrect, 0, 'correct 下标非法');
  assert.strictEqual(q.minExplain, 80);
  assert.ok(q.minExplain >= 30, `最短解释只有 ${q.minExplain} 汉字`);
  for (const item of quiz.questions) {
    assert.ok(item.question && item.question.length > 6, '存在空题干');
    assert.strictEqual(new Set(item.options).size, 4, `选项有重复：${item.question}`);
  }
});

test('quiz 答案打散，且与实测一致', () => {
  assert.deepStrictEqual(r.quiz.answers, [1,0,2,1,3,0]);
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
  assert.strictEqual(r.quiz.checkGrounded, 3);
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
