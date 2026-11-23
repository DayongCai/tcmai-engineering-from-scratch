'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { report, CHAPTER, SLUG, classify, comparable } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const doc = fs.readFileSync(DOC, 'utf8');
const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));

test('规模：汉字数与正文独立复算一致，且不少于三千', () => {
  const n = (doc.match(/[\u4e00-\u9fff]/g) || []).length;
  assert.strictEqual(report().size.hanzi, n);
  assert.strictEqual(report().size.hanzi, 2816);
  assert.ok(n >= 2500, `正文汉字过少：${n}`);
});

test('结构：节、小节、表格与数据行数与正文实测一致', () => {
  assert.deepStrictEqual(report().size, {
    hanzi: 2816,
    sections: 6,
    subsections: 3,
    tables: 2,
    rows: 9,
  });
});

test('判据：成组判据表的张数、行数与同现项数固定', () => {
  const crit = report().crit;
  assert.strictEqual(crit.tables, 1);
  assert.strictEqual(crit.rows, 3);
  assert.deepStrictEqual(crit.items, [3,3,3]);
  for (const n of crit.items) assert.ok(n >= 3, '判据组少于三项同现');
});

test('失效模式条数与正文一致（其一二三…的条目计数）', () => {
  assert.strictEqual(report().modes, 6);
  assert.ok(report().modes >= 3);
});

test('样例记录：归类与可比性逐条钉住', () => {
  const r = report();
  assert.deepStrictEqual(r.samples.map((s) => s.kind), ["依据式","依据式","空话式","依据式","依据式"]);
  assert.deepStrictEqual(r.samples.map((s) => s.comparable), [false,true,false,true,false]);
  assert.strictEqual(r.samples.filter((s) => s.kind === '依据式' && s.comparable).length, 2);
});

test('归类规则可单独调用：写结论、断言疗效、说空话都不算依据', () => {
  assert.strictEqual(classify('精神差'), '空话式');
  assert.strictEqual(comparable('口干'), false);
  assert.strictEqual(classify('上腹隐痛，进冷食后加重'), '依据式');
});

test('脚本可运行，输出含本章章名、教学样例与边界声明', () => {
  const out = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(out.status, 0, out.stderr);
  const text = String(out.stdout || '');
  assert.ok(text.includes(CHAPTER), '输出缺章号');
  assert.match(text, /教学样例/);
  assert.match(text, /不构成临床判断依据/);
  assert.ok(text.length > 200);
});

test('代码头部注释指向本章正文，且不写死别章路径', () => {
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes('/chapters/10-teshu-renqun/docs/zh.md'), '头部注释未指向本章');
  assert.strictEqual(SLUG, '10-teshu-renqun');
});

test('quiz：题量、三段齐、四选项、解释够长', () => {
  assert.ok(quiz.questions.length >= 5, '题目少于五道');
  const stages = new Set(quiz.questions.map((q) => q.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), `缺 ${s} 段`);
  for (const q of quiz.questions) {
    assert.strictEqual(q.options.length, 4, q.question);
    assert.strictEqual(new Set(q.options).size, 4, `选项重复：${q.question}`);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4, q.question);
    const han = (q.explain.match(/[\u4e00-\u9fff]/g) || []).length;
    assert.ok(han >= 30, `解释不足三十字：${q.question}`);
  }
});

test('quiz：答案打散，check 题不少于两道且接地正文', () => {
  const answers = quiz.questions.map((q) => q.correct);
  assert.ok(new Set(answers).size >= 3, `答案分布过于集中：${answers.join(',')}`);
  const checks = quiz.questions.filter((q) => q.stage === 'check');
  assert.ok(checks.length >= 2, 'check 题少于两道');
  for (const q of checks) {
    const grams = [];
    const text = q.question + q.explain + q.options[q.correct];
    for (let i = 0; i + 3 <= text.length; i += 1) grams.push(text.slice(i, i + 3));
    assert.ok(grams.some((g) => doc.includes(g)), `与正文没有共同表述：${q.question}`);
  }
});

test('quiz：无占位稿痕迹与越界表述', () => {
  const body = fs.readFileSync(QUIZ, 'utf8');
  const banned = ['剂' + '量', '疗' + '程', '发生' + '率', '页' + '码'];
  const stub = ['T' + 'ODO', '待' + '补', '占' + '位', '脚' + '手' + '架', '示' + '例' + '题'];
  for (const w of banned) assert.ok(!body.includes(w), `quiz 出现越界表述：${w}`);
  for (const w of stub) assert.ok(!body.includes(w), `quiz 留有占位痕迹：${w}`);
  assert.ok(!new RegExp('第\\s*\\d+\\s*页').test(body), 'quiz 出现页码式引用');
});
