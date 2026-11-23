'use strict';
/**
 * 第 7 章 体质调理与治未病：以平为期 —— 正文与习题的对齐断言
 * 运行：node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：小节、表格、九质支撑面、动作分档、标题数目与表格行数、
 * 判据词命中、并列骨架、quiz 结构与答案分布。实测值由 analyze() 现算后写死在此。
 */

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const m = require('./main.js');

const r = m.analyze();
const rawQuiz = fs.readFileSync(m.QUIZ, 'utf8');
const quiz = JSON.parse(rawQuiz);

test('正文规模与结构：汉字、小节、表格、段落、引书', () => {
  assert.strictEqual(r.hanzi, 2874);
  assert.strictEqual(r.sections.length, 6);
  assert.deepStrictEqual(r.sections, [
    '一、「以平为期」的三层含义',
    '二、六类动作与各自的边界',
    '三、何时停：三类停用信号',
    '四、何时转：四类转诊信号【教学设定】',
    '五、记录字段、失效模式与本章考核',
    '代价与边界',
  ]);
  assert.strictEqual(r.table.tables, 5);
  assert.strictEqual(r.table.rows, 23);
  assert.strictEqual(r.paragraphs, 22);
  assert.deepStrictEqual(r.books, ['素问·至真要大论']);
});

test('九质支撑面由正文两个数现算：8 / 9 = 88.9%，缺 1 质', () => {
  const a = r.arithmetic.types;
  assert.deepStrictEqual(a, { whole: 9, supported: 8, silent: 1 });
  assert.strictEqual(r.arithmetic.supportedShare, 88.9);
  assert.strictEqual(r.arithmetic.silentShare, 11.1);
  assert.ok(r.doc.includes('平和质'), '正文应点名缺证候支撑的那一质');
});

test('六类动作按可改程度分档，三档之和等于动作表行数', () => {
  const a = r.arithmetic;
  assert.deepStrictEqual(a.highChange, ['饮食', '作息', '运动', '情志']);
  assert.deepStrictEqual(a.partialChange, ['避邪']);
  assert.strictEqual(a.actionRows, 6);
  assert.strictEqual(a.inClinic, 1);
  assert.strictEqual(a.partitions, true, '分档不闭合');
});

test('小节标题里的数目与该节表格行数一一对上', () => {
  assert.deepStrictEqual(
    r.arithmetic.enums.map((e) => [e.unit, e.stated, e.rows, e.ok]),
    [
      ['层', 3, 3, true],
      ['类', 6, 6, true],
      ['类', 3, 3, true],
      ['类', 4, 4, true],
    ]
  );
});

test('判据词逐个落在正文，命中数与实测一致', () => {
  assert.deepStrictEqual(
    r.terms.map((t) => [t.term, t.n]),
    [
      ['以平为期', 4],
      ['不偏', 4],
      ['能应对', 2],
      ['不误治', 2],
      ['回移一档', 4],
      ['复评间隔', 6],
      ['方向相冲', 4],
      ['目标已达', 1],
      ['危险征象', 2],
    ]
  );
});

test('并列骨架齐全：缺一项就是正文这一节没写完', () => {
  for (const g of r.groups) {
    assert.deepStrictEqual(g.missing, [], `${g.label} 缺：${g.missing.join('、')}`);
  }
  assert.strictEqual(r.groups.length, 5);
});

test('quiz 结构：题量、三段、四选项、解释长度、答案下标', () => {
  const q = r.quiz;
  assert.strictEqual(q.total, 6);
  assert.deepStrictEqual(q.stage, { pre: 1, check: 3, post: 2 });
  assert.strictEqual(q.allFourOptions, true, '有题不是 4 个选项');
  assert.strictEqual(q.badCorrect, 0, 'correct 下标非法');
  assert.strictEqual(q.minExplain, 59);
  assert.ok(q.minExplain >= 30, `最短解释只有 ${q.minExplain} 汉字`);
  for (const item of quiz.questions) {
    assert.ok(item.question && item.question.length > 6, '存在空题干');
    assert.strictEqual(new Set(item.options).size, 4, `选项有重复：${item.question}`);
  }
});

test('quiz 答案打散，且与实测一致', () => {
  assert.deepStrictEqual(r.quiz.answers, [3, 1, 0, 2, 1, 3]);
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
  const book = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', '..', '..', 'chapters.json'), 'utf8'));
  const ch = book.chapters.find((x) => x.n === m.CHAPTER);
  assert.ok(ch, `chapters.json 里没有第 ${m.CHAPTER} 章`);
  assert.strictEqual(ch.title, m.TITLE, '章题与正文标题不一致');
  assert.strictEqual(quiz.title, ch.title, 'quiz 标题与章节目录不一致');
  assert.strictEqual(quiz.lesson, m.SLUG);
});

test('脚本可运行，输出正文实测值并带临床边界声明', () => {
  const res = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], {
    encoding: 'utf8',
    timeout: 60000,
  });
  assert.strictEqual(res.status, 0, res.stderr);
  assert.match(res.stdout, /2,874 汉字/);
  assert.match(res.stdout, /支撑面 88\.9%/);
  assert.match(res.stdout, /分档闭合/);
  assert.match(res.stdout, /不构成临床判断依据/);
});
