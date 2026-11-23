'use strict';
/**
 * 第 8 章 可重复性与测量误差：四域各自计量，再谈结论 —— 正文与习题的对齐断言
 * 运行：node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：小节、表格、近线翻转、量程占比、一致率拆解、量级差、
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
  assert.strictEqual(r.hanzi, 2882);
  assert.strictEqual(r.sections.length, 6);
  assert.deepStrictEqual(r.sections, [
    '一、三种误差：同一个人、不同施测者、同一工具',
    '二、重测怎么做：条件比间隔更重要',
    '三、一致性怎么读：三个数各自有盲区',
    '四、判定线附近：给不确定留一个位置【教学设定】',
    '五、记录字段、失效模式与本章考核',
    '代价与边界',
  ]);
  assert.strictEqual(r.table.tables, 5);
  assert.strictEqual(r.table.rows, 23);
  assert.strictEqual(r.paragraphs, 21);
  assert.deepStrictEqual(r.books, ['素问·三部九候论']);
});

test('近线翻转：3.4 漂 0.2 到 3.6，跨过 3.5 的判定线', () => {
  const n = r.arithmetic.nearLine;
  assert.strictEqual(n.trueValue, 3.4);
  assert.strictEqual(n.drift, 0.2);
  assert.strictEqual(n.cut, 3.5);
  assert.deepStrictEqual([n.lo, n.hi, n.span], [1, 4, 3]);
  assert.strictEqual(n.after, 3.6);
  assert.strictEqual(n.flipped, true);
  assert.strictEqual(n.driftShare, 6.7);
  assert.strictEqual(n.domains, 4);
  assert.ok(r.doc.includes('6.7%'), '正文应写明 6.7%');
});

test('一致率拆解：0.9 的同判率扣掉机遇后 Kappa 约为 0.47', () => {
  const g = r.arithmetic.agreement;
  assert.deepStrictEqual([g.same, g.rest, g.others, g.total], [90, 10, 8, 100]);
  assert.strictEqual(g.agree, 90);
  assert.strictEqual(g.restShare, 0.0125);
  assert.strictEqual(g.chance, 81.1);
  assert.strictEqual(g.chanceMatchesDoc, true, '正文的机遇一致与现算不一致');
  assert.strictEqual(g.kappa, 0.47);
  assert.strictEqual(g.kappaMatchesDoc, true, '正文的 Kappa 与现算不一致');
});

test('量级差：37 证对 7 证，相差 5.3 倍（整倍 5）', () => {
  assert.deepStrictEqual(r.arithmetic.magnitude, { big: 37, small: 7, ratio: 5.3, times: 5 });
});

test('判据词逐个落在正文，命中数与实测一致', () => {
  assert.deepStrictEqual(
    r.terms.map((t) => [t.term, t.n]),
    [
      ['对象内变异', 2],
      ['施测者间变异', 4],
      ['工具变异', 1],
      ['一致率', 7],
      ['Kappa', 4],
      ['ICC', 2],
      ['待定', 16],
      ['近线', 9],
      ['判定线', 6],
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
  assert.strictEqual(q.minExplain, 52);
  assert.ok(q.minExplain >= 30, `最短解释只有 ${q.minExplain} 汉字`);
  for (const item of quiz.questions) {
    assert.ok(item.question && item.question.length > 6, '存在空题干');
    assert.strictEqual(new Set(item.options).size, 4, `选项有重复：${item.question}`);
  }
});

test('quiz 答案打散，且与实测一致', () => {
  assert.deepStrictEqual(r.quiz.answers, [1, 2, 1, 3, 0, 2]);
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
  assert.match(res.stdout, /2,882 汉字/);
  assert.match(res.stdout, /只占 6\.7%/);
  assert.match(res.stdout, /Kappa ≈ 0\.47（与正文一致）/);
  assert.match(res.stdout, /不构成临床判断依据/);
});
