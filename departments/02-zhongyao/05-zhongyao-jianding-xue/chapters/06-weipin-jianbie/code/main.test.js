'use strict';
/**
 * code/main.test.js — 章节契约测试
 *
 * 与 main.js 的内部实现解耦：跑真实进程核对输出，再独立核对正文与习题的数据契约。
 * 这样 main.js 换成新写法时（不再导出旧脚手架符号）测试不会假红，但也不是空壳——
 * 断言全部落在「这一章是否真的自洽」上。
 */

const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const HAN = /[\u4e00-\u9fff]/g;
const hz = (s) => (s.match(HAN) || []).length;

const doc = fs.readFileSync(path.join(__dirname, '..', 'docs', 'zh.md'), 'utf8');
const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));
const questions = Array.isArray(quiz) ? quiz : (quiz.questions || []);
const run = spawnSync(process.execPath, ['main.js'], { cwd: __dirname, encoding: 'utf8' });

test('main.js 退出码为 0', () => {
  assert.strictEqual(run.status, 0, `main.js 退出码 ${run.status}\n${run.stderr}`);
});

test('main.js 有实质输出（不是空跑）', () => {
  assert.ok((run.stdout || '').trim().length > 0, 'main.js 没有打印任何内容');
});

test('正文规模达契约（≥2500 汉字、≥4 个二级节）', () => {
  assert.ok(hz(doc) >= 2500, `正文只有 ${hz(doc)} 汉字`);
  const secs = (doc.match(/^## /gm) || []).length;
  assert.ok(secs >= 4, `二级节只有 ${secs} 个`);
});

test('习题题量与阶段齐备', () => {
  assert.ok(questions.length >= 5, `只有 ${questions.length} 题`);
  const stage = (n) => questions.filter((q) => (q.stage || q.phase) === n).length;
  assert.ok(stage('pre') >= 1, 'pre 阶段缺题');
  assert.ok(stage('check') >= 3, `check 阶段只有 ${stage('check')} 题`);
  assert.ok(stage('post') >= 2, `post 阶段只有 ${stage('post')} 题`);
});

test('每题 4 个互异选项且答案下标合法', () => {
  for (const [i, q] of questions.entries()) {
    const opts = q.options || q.choices || [];
    assert.strictEqual(opts.length, 4, `第 ${i + 1} 题选项数不是 4`);
    assert.strictEqual(new Set(opts.map(String)).size, 4, `第 ${i + 1} 题选项重复`);
    const idx = q.correct ?? q.answer;
    assert.ok(Number.isInteger(idx) && idx >= 0 && idx < 4, `第 ${i + 1} 题答案下标非法`);
  }
});

test('每题解释足够长（≥30 汉字）', () => {
  for (const [i, q] of questions.entries()) {
    const ex = q.explain || q.explanation || '';
    assert.ok(hz(ex) >= 30, `第 ${i + 1} 题解释只有 ${hz(ex)} 汉字`);
  }
});

test('check 题判据能在正文里找到（接地）', () => {
  const body = doc.replace(/[\s\p{P}]/gu, '');
  const grounded = questions.filter((q) => {
    if ((q.stage || q.phase) !== 'check') return false;
    const opt = (q.options || q.choices || [])[q.correct ?? q.answer] || '';
    const key = String(opt).replace(/[\s\p{P}]/gu, '');
    for (let i = 0; i + 4 <= key.length; i += 1) {
      if (body.includes(key.slice(i, i + 4))) return true;
    }
    return false;
  });
  assert.ok(grounded.length >= 2, `只有 ${grounded.length} 道 check 题的判据能在正文找到`);
});

test('没有旧脚手架指纹', () => {
  const raw = `${doc}\n${JSON.stringify(quiz)}`;
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测', '见 code/main.js 输出']) {
    assert.ok(!raw.includes(bad), `残留旧脚手架词：${bad}`);
  }
});
