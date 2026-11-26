'use strict';
/**
 * code/main.test.js — 第 7 章契约测试
 *
 * 与 main.js 的内部实现解耦：跑真实进程核对输出，再独立核对正文与习题的数据契约。
 * 断言全部落在「这一章是否真的自洽」上：正文规模、题量与阶段、选项互异、解释长度、check 接地。
 */

const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const HAN = /[\u4e00-\u9fff]/g;
const hz = (s) => (String(s || '').match(HAN) || []).length;

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const doc = fs.readFileSync(DOC, 'utf8');
const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));
const questions = Array.isArray(quiz) ? quiz : (quiz.questions || []);
const run = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { cwd: __dirname, encoding: 'utf8' });

function grams(text, n) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

const body = grams(doc, 6);
const grounded = (opt) => {
  const clean = String(opt || '').replace(/[^\u4e00-\u9fff]/g, '');
  for (let i = 0; i + 6 <= clean.length; i += 1) if (body.has(clean.slice(i, i + 6))) return true;
  return false;
};

test('main.js 退出码为 0', () => {
  assert.strictEqual(run.status, 0, `main.js 退出码 ${run.status}\n${run.stderr}`);
});

test('main.js 有实质输出并带边界声明', () => {
  const out = String(run.stdout || '');
  assert.ok(out.trim().length > 80, 'main.js 输出过短');
  assert.match(out, /不构成法规解读与合规结论/);
});

test('正文规模达契约（≥2500 汉字、≥4 个二级节）', () => {
  assert.ok(hz(doc) >= 2500, `正文只有 ${hz(doc)} 汉字`);
  const secs = (doc.match(/^## /gm) || []).length;
  assert.ok(secs >= 4, `二级节只有 ${secs} 个`);
});

test('习题 6 题且阶段为 pre 1 / check 3 / post 2', () => {
  assert.strictEqual(questions.length, 6, `只有 ${questions.length} 题`);
  const stage = (k) => questions.filter((q) => q.stage === k).length;
  assert.strictEqual(stage('pre'), 1);
  assert.strictEqual(stage('check'), 3);
  assert.strictEqual(stage('post'), 2);
});

test('每题 4 个互异选项且答案下标合法', () => {
  for (const [i, q] of questions.entries()) {
    const opts = q.options || [];
    assert.strictEqual(opts.length, 4, `第 ${i + 1} 题选项数不是 4`);
    assert.strictEqual(new Set(opts.map(String)).size, 4, `第 ${i + 1} 题选项重复`);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4, `第 ${i + 1} 题答案下标非法`);
  }
});

test('每题解释在 40–80 汉字之间', () => {
  for (const [i, q] of questions.entries()) {
    const ex = q.explain || q.explanation || '';
    assert.ok(hz(ex) >= 40 && hz(ex) <= 80, `第 ${i + 1} 题解释 ${hz(ex)} 汉字`);
  }
});

test('3 道 check 题的正确选项都逐字引正文（6 字片段）', () => {
  const checks = questions.filter((q) => q.stage === 'check');
  const hit = checks.filter((q) => grounded((q.options || [])[q.correct]));
  assert.strictEqual(hit.length, 3, `只有 ${hit.length} 道 check 题接地`);
});

test('导出的章映射与章号一致', () => {
  const { chapterKeys, chapterUnits, summarize, CHAPTER, SLUG } = require('./main.js');
  assert.strictEqual(String(CHAPTER), '7');
  assert.strictEqual(SLUG, '07-hecha-jianyan');
  const keys = chapterKeys();
  assert.ok(keys.length > 0, 'chapter-map 里本章没有单元');
  const units = chapterUnits();
  assert.strictEqual(units.length, keys.length);
  const s = summarize(units);
  assert.strictEqual(s.hanzi, units.reduce((a, b) => a + b.hanzi, 0));
  assert.ok(s.hanzi > 500, `单元层汉字过少：${s.hanzi}`);
});

test('没有旧脚手架指纹', () => {
  const raw = `${doc}\n${JSON.stringify(quiz)}\n${fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8')}`;
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测', '见 code/main.js 输出']) {
    assert.ok(!raw.includes(bad), `残留旧脚手架词：${bad}`);
  }
});
