'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const main = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const doc = fs.readFileSync(DOC, 'utf8');
const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
const hanzi = (s) => (String(s).match(/[\u4e00-\u9fff]/g) || []).length;

function shingles(text, n = 4) {
  const clean = String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ');
  const out = new Set();
  for (const seg of clean.split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('规模：汉字数与正文独立复算一致，且不少于两千五', () => {
  const r = main.report();
  assert.strictEqual(r.size.hanzi, hanzi(doc));
  assert.deepStrictEqual(r.size, { hanzi: 2924, sections: 6, subsections: 1, tables: 2, rows: 11 });
  assert.ok(r.size.hanzi >= 2500, `正文汉字过少：${r.size.hanzi}`);
});

test('结构：五条监测线、六条失效模式都从正文读出', () => {
  const r = main.report();
  assert.strictEqual(r.linesMonitored, 5);
  assert.strictEqual(r.modes, 6);
});

test('演算：采样总数、覆盖率与相邻差值现算', () => {
  assert.strictEqual(main.samplesPerShift(480), 480);
  assert.strictEqual(main.coverage(6, 480), 0.0125);
  assert.strictEqual(main.coverage(4, 480), 0.008333333333333333);
  const r = main.report();
  assert.strictEqual(r.perShift, 480);
  assert.strictEqual(r.coverage, 0.0125);
  assert.deepStrictEqual(r.deltas.map((d) => d.sbp), [-7, -8]);
  assert.deepStrictEqual(r.deltas.map((d) => d.hr), [6, 7]);
});

test('趋势：数值未越线但方向变坏时能判出来', () => {
  assert.strictEqual(main.report().drift.drift, true);
  const flat = [{ t: 'A', sbp: 120, hr: 90 }, { t: 'B', sbp: 120, hr: 90 }];
  assert.strictEqual(main.silentDrift(flat).drift, false);
});

test('样例记录：带差值、结论式、单点式逐条钉住', () => {
  const r = main.report();
  assert.deepStrictEqual(r.samples.map((s) => s.kind), ['带差值', '结论式', '单点式', '带差值', '结论式']);
  assert.strictEqual(r.ok, 2);
  assert.strictEqual(main.classify('已通知医师'), '单点式');
  assert.strictEqual(main.classify('血压一百一，正常'), '结论式');
});

test('脚本可运行，输出含章名、教学样例与边界声明', () => {
  const out = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(out.status, 0, out.stderr);
  const text = String(out.stdout || '');
  assert.ok(text.includes(main.CHAPTER), '输出缺章号');
  assert.match(text, /教学样例/);
  assert.match(text, /不构成临床判断依据/);
  assert.ok(text.length > 200);
});

test('代码头部指向本章正文，SLUG 与章目录一致', () => {
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes('/chapters/07-jiance-jishu/docs/zh.md'), '头部注释未指向本章');
  assert.strictEqual(main.SLUG, '07-jiance-jishu');
});

test('quiz：题量、三段齐、四选项、解释够长', () => {
  assert.ok(quiz.questions.length >= 5, '题目少于五道');
  const stages = new Set(quiz.questions.map((q) => q.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), `缺 ${s} 段`);
  for (const q of quiz.questions) {
    assert.strictEqual(q.options.length, 4, q.question);
    assert.strictEqual(new Set(q.options).size, 4, `选项重复：${q.question}`);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4, q.question);
    assert.ok(hanzi(q.explain) >= 30, `解释不足三十字：${q.question}`);
  }
});

test('quiz：答案打散，check 不少于两道且正确项能在正文找到原词', () => {
  const answers = quiz.questions.map((q) => q.correct);
  assert.ok(new Set(answers).size >= 3, `答案分布过于集中：${answers.join(',')}`);
  const body = shingles(doc);
  const checks = quiz.questions.filter((q) => q.stage === 'check');
  assert.ok(checks.length >= 2, 'check 题少于两道');
  const grounded = checks.filter((q) => [...shingles(q.options[q.correct])].some((g) => body.has(g)));
  assert.ok(grounded.length >= 2, `接地正文的 check 题只有 ${grounded.length} 道`);
});

test('quiz：无越界表述与占位痕迹', () => {
  const body = fs.readFileSync(QUIZ, 'utf8');
  const banned = ['剂' + '量', '疗' + '程', '发生' + '率', '成功' + '率', '页' + '码'];
  const stub = ['T' + 'ODO', '待' + '补', '占' + '位', '脚' + '手' + '架', '示' + '例' + '题'];
  for (const w of banned) assert.ok(!body.includes(w), `quiz 出现越界表述：${w}`);
  for (const w of stub) assert.ok(!body.includes(w), `quiz 留有占位痕迹：${w}`);
  assert.ok(!new RegExp('第\\s*\\d+\\s*页').test(body), 'quiz 出现页码式引用');
});
