'use strict';
/**
 * 第 11 章 保健推拿不辨证，它判的是今天能不能做 —— 章节契约测试
 * 运行: node --test code/main.test.js
 *
 * 与 main.js 的内部实现解耦：跑真实进程核输出，再独立核对正文与习题的数据契约，
 * 断言全部落在「这一章是否真的自洽」上（题量、选项、解释长度、接地、无脚手架残留）。
 */

const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const HAN = /[\u4e00-\u9fff]/g;
const hz = (s) => (String(s || '').match(HAN) || []).length;

const doc = fs.readFileSync(path.join(__dirname, '..', 'docs', 'zh.md'), 'utf8');
const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));
const questions = Array.isArray(quiz) ? quiz : (quiz.questions || []);
const run = spawnSync(process.execPath, ['main.js'], { cwd: __dirname, encoding: 'utf8' });

test('main.js 退出码为 0', () => {
  assert.strictEqual(run.status, 0, `main.js 退出码 ${run.status}\n${run.stderr}`);
});

test('main.js 有实质输出（不是空跑）', () => {
  assert.ok((run.stdout || '').trim().length > 80, 'main.js 输出过短');
});

test('正文规模达契约（≥2500 汉字、≥4 个二级节）', () => {
  assert.ok(hz(doc) >= 2500, `正文只有 ${hz(doc)} 汉字`);
  const secs = (doc.match(/^## /gm) || []).length;
  assert.ok(secs >= 4, `二级节只有 ${secs} 个`);
});

test('习题题量与阶段齐备（6 题：pre1/check3/post2）', () => {
  assert.strictEqual(questions.length, 6, `题数 ${questions.length}`);
  const stage = (n) => questions.filter((q) => (q.stage || q.phase) === n).length;
  assert.strictEqual(stage('pre'), 1, 'pre 阶段不是 1 题');
  assert.strictEqual(stage('check'), 3, `check 阶段 ${stage('check')} 题`);
  assert.strictEqual(stage('post'), 2, `post 阶段 ${stage('post')} 题`);
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

test('每题解释 40–80 汉字', () => {
  for (const [i, q] of questions.entries()) {
    const ex = q.explain || q.explanation || '';
    assert.ok(hz(ex) >= 40 && hz(ex) <= 80, `第 ${i + 1} 题解释 ${hz(ex)} 汉字`);
  }
});

test('三道 check 题的判据都能在正文里找到（接地 3/3）', () => {
  const body = doc.replace(/[\s\p{P}]/gu, '');
  const checks = questions.filter((q) => (q.stage || q.phase) === 'check');
  const grounded = checks.filter((q) => {
    const opt = (q.options || q.choices || [])[q.correct ?? q.answer] || '';
    const key = String(opt).replace(/[\s\p{P}]/gu, '');
    for (let i = 0; i + 6 <= key.length; i += 1) {
      if (body.includes(key.slice(i, i + 6))) return true;
    }
    return false;
  });
  assert.strictEqual(grounded.length, 3, `只有 ${grounded.length} 道 check 题接地`);
});

test('没有旧脚手架指纹', () => {
  const raw = doc + '\n' + JSON.stringify(quiz);
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测', '见 code/main.js 输出']) {
    assert.ok(!raw.includes(bad), `残留旧脚手架词：${bad}`);
  }
});

test('导出契约：chapterKeys / chapterUnits / summarize / CHAPTER / SLUG', () => {
  const mod = require('./main.js');
  for (const k of ['chapterKeys', 'chapterUnits', 'summarize']) {
    assert.strictEqual(typeof mod[k], 'function', `缺少导出 ${k}`);
  }
  assert.strictEqual(mod.CHAPTER, '11');
  assert.strictEqual(mod.SLUG, '11-baojian-tuina');
  const units = mod.chapterUnits(doc);
  assert.ok(units.length >= 4, `二级节只有 ${units.length}`);
  assert.deepStrictEqual(mod.chapterKeys(doc), units.map((u) => u.key));
  const s = mod.summarize(units);
  assert.strictEqual(s.sections, units.length);
  assert.ok(s.hanzi > 2000, `汇总字数 ${s.hanzi}`);
});
