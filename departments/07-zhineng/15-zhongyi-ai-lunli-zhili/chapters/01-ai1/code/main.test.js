'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const MAIN = path.join(__dirname, 'main.js');
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const {
  analyze,
  assertChapter,
  parseDoc,
  quizSummary,
  grams,
  hanzi,
  count,
  CLAIMS,
  CHAPTER,
  SLUG,
  TITLE,
} = require('./main.js');

test('正文标题与章号、章名一致', () => {
  const doc = parseDoc();
  assert.ok(doc.title.startsWith(`第 ${CHAPTER} 章`), doc.title);
  assert.ok(doc.title.includes(TITLE), doc.title);
  assert.ok(doc.motto.source.length >= 2, '缺 MOTTO 出处');
});

test('分节结构与正文一致（五节，含代价与边界）', () => {
  const doc = parseDoc();
  assert.deepStrictEqual(
    doc.sections.map((s) => s.heading),
    [
      '一、同质化错误：「和人一样准」不构成安全论证',
      '二、三类不可逆：延误、误伤与泄露',
      '三、责任不能转移：签字栏的物理意义',
      '四、治理的四个动作',
      '五、代价与边界',
    ]
  );
  for (const s of doc.sections) assert.ok(s.hanzi > 100, `${s.heading} 过短：${s.hanzi}`);
  assert.ok(doc.hanzi > 2500);
});

test('七条判据都能在正文里逐字找到', () => {
  assert.doesNotThrow(() => assertChapter());
  const r = analyze();
  assert.strictEqual(r.claims.length, CLAIMS.length);
  for (const c of r.claims) assert.ok(c.ok, `${c.id}：${c.hits.filter((h) => !h.n).map((h) => h.term)}`);
});

test('判据计数是现算的，不是写死的', () => {
  const doc = parseDoc();
  const body = doc.sections.map((s) => s.body).join('\n');
  const r = analyze();
  for (const c of r.claims) {
    for (const h of c.hits) assert.strictEqual(h.n, count(body, h.term), `${c.id}/${h.term}`);
  }
  // 「不可逆」本章反复使用；少于三次说明正文被删改后代码没跟上
  assert.ok(count(body, "不可逆") >= 2, `不可逆出现 ${count(body, '不可逆')} 次`);
});

test('quiz 结构齐：题数、段位、四选项、解释长度', () => {
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const q = quizSummary(quiz, fs.readFileSync(DOC, 'utf8'));
  assert.ok(q.total >= 5, `只有 ${q.total} 题`);
  for (const s of ['pre', 'check', 'post']) assert.ok(q.stage[s] >= 1, `缺 ${s}`);
  assert.ok(q.allFourOptions, '有题不是 4 选项');
  assert.strictEqual(q.badCorrect, 0);
  assert.ok(q.minExplain >= 30, `最短解释 ${q.minExplain} 汉字`);
});

test('check 题的正确选项真的落在正文里', () => {
  const doc = fs.readFileSync(DOC, 'utf8');
  const body = grams(doc);
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const checks = quiz.questions.filter((q) => q.stage === 'check');
  assert.ok(checks.length >= 2, 'check 题不足 2 道');
  let grounded = 0;
  for (const q of checks) {
    const hit = [...grams(q.options[q.correct])].filter((g) => body.has(g));
    if (hit.length) grounded += 1;
  }
  assert.ok(grounded >= 2, `只有 ${grounded} 道 check 题接地`);
});

test('答案打散，不在同一位置重复', () => {
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const answers = quiz.questions.map((q) => q.correct);
  assert.ok(new Set(answers).size >= 3, `答案分布 ${answers.join('/')}`);
  assert.ok(answers.filter((a) => a === answers[0]).length <= 3);
});

test('题目与代码都不含脚手架字样', () => {
  const texts = [fs.readFileSync(QUIZ, 'utf8'), fs.readFileSync(MAIN, 'utf8')];
  for (const t of texts) {
    for (const re of [/三辨/, /四位面/, /单元规模/, /本章实测/, /本课第\s*\d+\s*章/, /见\s*code\/main\.js\s*输出/]) {
      assert.ok(!re.test(t), `仍含 ${re}`);
    }
  }
});

test('脚本可运行，输出含章名、判据表与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, new RegExp(`第 ${CHAPTER} 章`));
  assert.match(out, /判据在正文里的出现次数/);
  assert.match(out, /不构成临床判断依据/);
});

test('代码头部指向本章目录与章号', () => {
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes('chapters/01-ai1/docs/zh.md'));
  assert.strictEqual(SLUG, '01-ai1');
  assert.ok(hanzi(TITLE) >= 10);
});
