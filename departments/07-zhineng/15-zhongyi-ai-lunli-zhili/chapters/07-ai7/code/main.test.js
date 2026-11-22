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

test('分节结构与正文一致（六 节，含代价与边界）', () => {
  const doc = parseDoc();
  assert.deepStrictEqual(doc.sections.map((s) => s.heading), [
      '一、三种追溯，三种材料',
      '二、变更管理：版本号之外的「变更理由」',
      '三、解释的层次与对象',
      '四、审计的抽样与定性',
      '五、模型卡：一份能被外部读懂的说明',
      '六、代价与边界',
    ]);
  for (const s of doc.sections) assert.ok(s.hanzi > 100, `${s.heading} 过短：${s.hanzi}`);
  assert.ok(doc.hanzi > 2400);
  assert.strictEqual(doc.sections[doc.sections.length - 1].heading, '六、代价与边界');
});

test('本章判据都能在正文里逐字找到', () => {
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
  assert.ok(count(body, '追溯') >= 3, `追溯 出现 ${count(body, '追溯')} 次`);
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
  const body = grams(fs.readFileSync(DOC, 'utf8'));
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const checks = quiz.questions.filter((q) => q.stage === 'check');
  assert.ok(checks.length >= 2, 'check 题不足 2 道');
  let grounded = 0;
  for (const q of checks) {
    if ([...grams(q.options[q.correct])].some((g) => body.has(g))) grounded += 1;
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
  const marks = ['三' + '辨', '四位' + '面', '单元' + '规模', '本章' + '实测', '本课第'];
  for (const t of texts) for (const m of marks) assert.ok(!t.includes(m), `仍含 ${m}`);
  assert.ok(!/见\s*code\/main\.js\s*输出/.test(texts.join('')));
});

test('脚本可运行，输出含章名、判据表与免责', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, new RegExp(`第 ${CHAPTER} 章`));
  assert.match(out, /判据在正文里的出现次数/);
  assert.match(out, /不构成/);
  assert.match(out, /教学材料/);
});

test('代码头部指向本章目录与章号', () => {
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes('chapters/07-ai7/docs/zh.md'));
  assert.strictEqual(SLUG, '07-ai7');
  assert.ok(hanzi(TITLE) >= 10);
});
