'use strict';
/**
 * 第 6 章 体质与疾病易感性：横向数据只能看共现 —— 正文与习题的对齐断言
 * 运行：node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：小节、表格、共现表逐行复算、兼夹占比、判据词命中、
 * 并列骨架、quiz 结构与答案分布。实测值由 analyze() 现算后写死在此；正文一改，这里会先响。
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
  assert.strictEqual(r.hanzi, 2949);
  assert.strictEqual(r.sections.length, 6);
  assert.deepStrictEqual(r.sections, [
    '一、三种设计能回答什么，不能回答什么',
    '二、本库能给什么：共现的形状',
    '三、把共现读成因果的四个坑',
    '四、把「易感」翻译成可做的动作【教学设定】',
    '五、记录字段、失效模式与本章考核',
    '代价与边界',
  ]);
  assert.strictEqual(r.table.tables, 4);
  assert.strictEqual(r.table.rows, 23);
  assert.strictEqual(r.paragraphs, 25);
  assert.deepStrictEqual(r.books, ['灵枢·百病始生']);
});

test('共现表逐行复算：每证覆盖与外科占比的分母都对得上', () => {
  const rows = m.coverageRows(r.doc);
  assert.strictEqual(rows.length, 9);
  assert.deepStrictEqual(
    r.arithmetic.cells.map((c) => [c.type, c.computed, c.stated, c.ok, c.surgeryDenomOk]),
    [
      ['湿热质', 1.1, 1.1, true, true],
      ['阴虚质', 1.6, 1.6, true, true],
      ['气虚质', 1.1, 1.1, true, true],
      ['血瘀质', 1.8, 1.8, true, true],
      ['特禀质', 0.9, 0.9, true, true],
      ['痰湿质', 1.3, 1.3, true, true],
      ['阳虚质', 1.1, 1.1, true, true],
      ['气郁质', 2.0, 2.0, true, true],
      ['未归类', 1.0, 1.0, true, true],
    ]
  );
  assert.deepStrictEqual(r.arithmetic.bad, [], '有行的比值与正文对不上');
  assert.deepStrictEqual(
    rows.map((x) => [x.zheng, x.diseases, x.surgeryN, x.surgeryD]),
    [
      [37, 41, 34, 37],
      [18, 29, 10, 18],
      [17, 19, 11, 17],
      [16, 29, 11, 16],
      [10, 9, 9, 10],
      [9, 12, 6, 9],
      [7, 8, 6, 7],
      [7, 14, 3, 7],
      [11, 11, 4, 11],
    ]
  );
});

test('合计与两个端点：证候 132、病名相加 172、最高最低各一名', () => {
  const a = r.arithmetic;
  assert.strictEqual(a.zhengTotal, 132);
  assert.strictEqual(a.diseaseTotal, 172);
  assert.strictEqual(a.top.type, '气郁质');
  assert.strictEqual(a.top.computed, 2.0);
  assert.strictEqual(a.bottom.type, '特禀质');
  assert.strictEqual(a.bottom.computed, 0.9);
  // 病名跨质重复计：各质相加必然不少于不重复的病名数，也不超过病证配对总数
  assert.ok(a.diseaseTotal > 82, '各质相加应大于不重复的病名数');
});

test('兼夹占比由正文两个数现算，并与正文写的百分比一致', () => {
  const x = r.arithmetic.mixed;
  assert.ok(x, '正文里找不到兼夹句');
  assert.strictEqual(x.part, 38);
  assert.strictEqual(x.whole, 132);
  assert.strictEqual(x.share, 28.8);
  assert.strictEqual(r.arithmetic.mixedShareMatchesDoc, true);
});

test('判据词逐个落在正文，命中数与实测一致', () => {
  assert.deepStrictEqual(
    r.terms.map((t) => [t.term, t.n]),
    [
      ['横断面', 2],
      ['队列', 1],
      ['病例对照', 1],
      ['干预试验', 2],
      ['共现', 8],
      ['分母', 8],
      ['转诊偏倚', 2],
      ['教材偏倚', 2],
      ['可推翻', 1],
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
  assert.deepStrictEqual(q.stage, { pre: 1, check: 3, post: 2 });
  assert.strictEqual(q.allFourOptions, true, '有题不是 4 个选项');
  assert.strictEqual(q.badCorrect, 0, 'correct 下标非法');
  assert.strictEqual(q.minExplain, 38);
  assert.ok(q.minExplain >= 30, `最短解释只有 ${q.minExplain} 汉字`);
  for (const item of quiz.questions) {
    assert.ok(item.question && item.question.length > 6, '存在空题干');
    assert.strictEqual(new Set(item.options).size, 4, `选项有重复：${item.question}`);
  }
});

test('quiz 答案打散，且与实测一致', () => {
  assert.deepStrictEqual(r.quiz.answers, [0, 2, 1, 3, 0, 2]);
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
  assert.match(res.stdout, /2,949 汉字/);
  assert.match(res.stdout, /兼夹：38 \/ 132 = 28\.8%/);
  assert.match(res.stdout, /不构成临床判断依据/);
});
