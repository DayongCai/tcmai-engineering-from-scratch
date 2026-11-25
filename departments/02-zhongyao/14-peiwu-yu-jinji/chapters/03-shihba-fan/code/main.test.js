'use strict';
/**
 * code/main.test.js — 第 3 章契约测试
 *
 * 只核对「这一章是否真的自洽」：正文规模与结构的实测值被钉死（改字数即报），
 * 习题的阶段、选项与接地逐条核对，且 quiz 与 main.js 都不得残留旧脚手架词。
 * 与 main.js 的内部实现解耦：断言落在数据契约与真实进程输出上。
 */

const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const HAN = /[\u4e00-\u9fff]/g;
const hz = (s) => (String(s || '').match(HAN) || []).length;

const doc = fs.readFileSync(path.join(__dirname, '..', 'docs', 'zh.md'), 'utf8');
const quizRaw = fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8');
const quiz = JSON.parse(quizRaw);
const questions = Array.isArray(quiz) ? quiz : quiz.questions || [];
const run = spawnSync(process.execPath, ['main.js'], { cwd: __dirname, encoding: 'utf8' });

const stageOf = (q) => q.stage || q.phase;
const why = (q) => q.explain || q.explanation || '';

test('main.js 退出码为 0 且有实质输出', () => {
  assert.strictEqual(run.status, 0, `main.js 退出码 ${run.status}\n${run.stderr}`);
  const out = String(run.stdout || '');
  assert.ok(out.length > 80, `输出只有 ${out.length} 字符`);
  assert.match(out, /不构成临床判断依据/);
});

test('正文规模与结构（实测值钉死）', () => {
  assert.strictEqual(hz(doc), 3396, `正文字数 ${hz(doc)}`);
  assert.strictEqual((doc.match(/^## /gm) || []).length, 7, '二级节数');
  assert.strictEqual((doc.match(/^\|[-\s|:]+\|$/gm) || []).length, 2, '表格数');
});

test('名目在正文里各自成立', () => {
  const want = {"十八反":16,"十九畏":21,"相反":8,"相畏":9};
  for (const [name, n] of Object.entries(want)) {
    const got = (doc.match(new RegExp(name, 'g')) || []).length;
    assert.strictEqual(got, n, `「${name}」出现 ${got} 次，正文改写后应重算`);
  }
});

test('习题题量与阶段齐备', () => {
  assert.strictEqual(questions.length, 7, `题量 ${questions.length}`);
  const stage = (n) => questions.filter((q) => stageOf(q) === n).length;
  assert.strictEqual(stage('pre'), 1);
  assert.strictEqual(stage('check'), 4);
  assert.strictEqual(stage('post'), 2);
});

test('每题 4 个互异选项且答案下标合法、答案不集中在同一位置', () => {
  for (const [i, q] of questions.entries()) {
    const opts = q.options || [];
    assert.strictEqual(opts.length, 4, `第 ${i + 1} 题选项数不是 4`);
    assert.strictEqual(new Set(opts.map(String)).size, 4, `第 ${i + 1} 题选项重复`);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4, `第 ${i + 1} 题答案下标非法`);
  }
  const positions = new Set(questions.map((q) => q.correct));
  assert.ok(positions.size >= 3, `正确答案只落在 ${positions.size} 个位置`);
});

test('每题解释 ≥30 汉字', () => {
  for (const [i, q] of questions.entries()) {
    assert.ok(hz(why(q)) >= 30, `第 ${i + 1} 题解释只有 ${hz(why(q))} 汉字`);
  }
});

test('check 题判据能在正文里找到（接地 ≥2 且实测为 4）', () => {
  const body = doc.replace(/[^\u4e00-\u9fff]/g, '');
  const grounded = questions.filter((q) => {
    if (stageOf(q) !== 'check') return false;
    const key = String((q.options || [])[q.correct] || '').replace(/[^\u4e00-\u9fff]/g, '');
    for (let i = 0; i + 4 <= key.length; i += 1) if (body.includes(key.slice(i, i + 4))) return true;
    return false;
  });
  assert.strictEqual(grounded.length, 4, `接地 check 题 ${grounded.length} 道`);
});

test('没有旧脚手架指纹', () => {
  const raw = `${doc}\n${quizRaw}`;
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测', '见 code/main.js 输出']) {
    assert.ok(!raw.includes(bad), `残留旧脚手架词：${bad}`);
  }
});
