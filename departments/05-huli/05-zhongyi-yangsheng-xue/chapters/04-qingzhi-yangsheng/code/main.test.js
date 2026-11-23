'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { analyze, CHAPTER } = require('./main.js');

const QUIZ = path.join(__dirname, '..', 'quiz.json');
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const MAIN = path.join(__dirname, 'main.js');
const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
const doc = fs.readFileSync(DOC, 'utf8');

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
function shingles(text, n = 4) {
  const clean = String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ');
  const out = new Set();
  for (const seg of clean.split(/\s+/)) for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  return out;
}
const body = shingles(doc);
const grounded = quiz.questions.filter(
  (q) => q.stage === 'check' && [...shingles(q.options[q.correct])].some((g) => body.has(g)),
);
const FINGERPRINTS = [/三辨/, /四位面/, /单元规模/, /本章实测/, /本课第\s*\d+\s*章/, /见\s*code\/main\.js\s*输出/, /逐单元读/, /课程信息/];

test('正文规模已钉住', () => {
  const s = analyze();
  assert.strictEqual(s.hanzi, 2814);
  assert.strictEqual(s.sections, 6);
  assert.strictEqual(s.tables, 3);
});

test('六气方向按正文顺序齐全', () => {
  const s = analyze();
  assert.deepStrictEqual(s.qi.map((x) => x.w), ['怒则气上', '喜则气缓', '悲则气消', '恐则气下', '惊则气乱', '思则气结']);
  assert.strictEqual(s.qiMissing.length, 0);
});

test('疏泄四步顺序与三档现算', () => {
  const s = analyze();
  assert.deepStrictEqual(s.stepOrder, ['觉察', '接纳', '表达', '调节']);
  assert.deepStrictEqual(s.tiers, ['调畅档', '郁结档', '失序档']);
  assert.strictEqual(s.tiersWithBoundary, 3);
});

test('关键词计数现算', () => {
  assert.deepStrictEqual(analyze().mention, { 疏泄: 6, 转介: 5, 自伤: 4 });
});

test('quiz 结构：题量与三段齐', () => {
  assert.ok(quiz.questions.length >= 5, '题量不足');
  const stages = new Set(quiz.questions.map((q) => q.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), '缺 ' + s + ' 段');
});

test('quiz 每题 4 选项且答案下标合法', () => {
  for (const q of quiz.questions) {
    assert.strictEqual(q.options.length, 4);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4);
  }
});

test('每段解释不少于 30 汉字', () => {
  for (const q of quiz.questions) assert.ok(hanzi(q.explain) >= 30, '解释过短：' + q.question);
});

test('至少 2 道 check 题正确项能在正文找到原词', () => {
  assert.ok(grounded.length >= 2, '接地题只有 ' + grounded.length + ' 道');
});

test('答案打散：四个下标都出现过', () => {
  assert.deepStrictEqual([...new Set(quiz.questions.map((q) => q.correct))].sort(), [0, 1, 2, 3]);
});

test('quiz 与代码都不含脚手架指纹', () => {
  for (const re of FINGERPRINTS) {
    assert.ok(!re.test(JSON.stringify(quiz)), 'quiz 命中 ' + re);
    assert.ok(!re.test(fs.readFileSync(MAIN, 'utf8')), '代码命中 ' + re);
  }
  assert.strictEqual(quiz.chapter, CHAPTER);
  assert.strictEqual(quiz.title, '情志养生与疏泄');
});

test('脚本可运行且输出教学声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /本输出仅用于教学演示/);
  assert.match(out, /不构成临床判断依据/);
  assert.ok(out.includes('疏泄四步'));
});
