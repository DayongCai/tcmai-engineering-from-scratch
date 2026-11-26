'use strict';
/**
 * code/main.test.js —— 本章契约测试
 *
 * 不看 main.js 的内部写法，只核对「这一章是否真的自洽」：
 * 进程能跑通并给出结论、正文规模达标、习题结构合法、解释长度落在 40—80 汉字、
 * check 题的判据能在正文里找到原词。正文或习题改坏了，这里先红。
 */

const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const MAIN = path.join(__dirname, 'main.js');
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const hanzi = (s) => (String(s || '').match(/[\u4e00-\u9fff]/g) || []).length;
const doc = fs.readFileSync(DOC, 'utf8');
const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
const run = spawnSync(process.execPath, [MAIN], { cwd: __dirname, encoding: 'utf8', timeout: 60000 });
const api = require('./main.js');

test('main.js 退出码为 0 且有实质输出', () => {
  assert.strictEqual(run.status, 0, 'exit ' + run.status + '\n' + run.stderr);
  assert.ok(String(run.stdout || '').trim().length > 80, '输出过短');
  assert.match(String(run.stdout), /不构成/);
});

test('正文规模达契约（≥2500 汉字、≥4 个二级节）', () => {
  assert.ok(hanzi(doc) >= 2500, '正文只有 ' + hanzi(doc) + ' 汉字');
  assert.ok((doc.match(/^## /gm) || []).length >= 4, '二级节不足 4 个');
});

test('章节号与标题同正文一级标题一致', () => {
  const h1 = ((doc.match(/^# .*/m) || [''])[0] || '').replace(/^# /, '').trim();
  assert.ok(h1.includes('第 ' + api.CHAPTER + ' 章'), '正文一级标题与章序号不一致：' + h1);
  assert.ok(h1.includes(api.TITLE), '正文标题与 main.js TITLE 不一致');
});

test('习题题量与阶段齐备（pre 1 / check 3 / post 2）', () => {
  assert.strictEqual(questions.length, 6, '题量为 ' + questions.length + '，应为 6');
  const n = (s) => questions.filter((q) => (q.stage || q.phase) === s).length;
  assert.strictEqual(n('pre'), 1, 'pre 题数不是 1');
  assert.strictEqual(n('check'), 3, 'check 题数不是 3');
  assert.strictEqual(n('post'), 2, 'post 题数不是 2');
});

test('每题 4 个互异选项且答案下标合法', () => {
  for (const [i, q] of questions.entries()) {
    const opts = q.options || [];
    assert.strictEqual(opts.length, 4, '第 ' + (i + 1) + ' 题选项数不是 4');
    assert.strictEqual(new Set(opts.map(String)).size, 4, '第 ' + (i + 1) + ' 题选项重复');
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4, '第 ' + (i + 1) + ' 题答案下标非法');
  }
});

test('每题解释 40—80 汉字', () => {
  for (const [i, q] of questions.entries()) {
    const h = hanzi(q.explain || q.explanation || '');
    assert.ok(h >= 40 && h <= 80, '第 ' + (i + 1) + ' 题解释 ' + h + ' 汉字，不在 40—80');
  }
});

test('check 题判据能在正文里逐字找到（≥2 道）', () => {
  const q = api.quizCheck(quiz, doc);
  assert.ok(q.grounded >= 2, '只有 ' + q.grounded + ' 道 check 题接地');
  assert.deepStrictEqual(q.issues, [], '体检不过：' + q.issues.join('；'));
});

test('未残留旧脚手架词与手打规模声明', () => {
  const raw = doc + '\n' + JSON.stringify(quiz) + '\n' + fs.readFileSync(MAIN, 'utf8');
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测', '见 code/main.js 输出']) {
    assert.ok(!raw.includes(bad), '残留旧脚手架词：' + bad);
  }
  assert.ok(!/本课第\s*\d+\s*章[（(]/.test(raw), '残留本课第 N 章（…）句式');
});
