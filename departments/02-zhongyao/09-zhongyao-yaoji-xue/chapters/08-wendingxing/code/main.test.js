'use strict';
/**
 * code/main.test.js — 第 8 章契约测试
 *
 * 两半都验：一半钉住实测值（单元数、汉字、词频、正文规模、习题结构），改了就红；
 * 一半跑真实进程（node main.js）核对退出码与边界声明，与内部实现解耦。
 */

const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const main = require('./main.js');

const HAN = /[\u4e00-\u9fff]/g;
const hz = (s) => (String(s || '').match(HAN) || []).length;
const doc = fs.readFileSync(path.join(__dirname, '..', 'docs', 'zh.md'), 'utf8');
const quizRaw = fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8');
const quiz = JSON.parse(quizRaw);
const questions = quiz.questions || [];
const run = spawnSync(process.execPath, ['main.js'], { cwd: __dirname, encoding: 'utf8' });

test('node main.js 退出码为 0，输出带边界声明', () => {
  assert.strictEqual(run.status, 0, '退出码 ' + run.status + '\n' + run.stderr);
  const out = String(run.stdout || '');
  assert.ok(out.length > 80, '输出过短：' + out.length);
  assert.ok(/不构成|教学|样例|非临床/.test(out), '输出缺少边界声明');
});

test('本章单元数与 KEYS 一致，且全部来自教材单元层', () => {
  const list = main.chapterUnits(main.load());
  assert.strictEqual(list.length, 2);
  assert.deepStrictEqual(list.map((u) => u.sub), ["12.1.1","12.1.2"]);
  for (const u of list) assert.match(u.locator, /^教材·第\d+章·\d+\.\d+\.\d+$/);
});

test('规模与单元层统计钉住：7524 汉字 · 平均 3762 字/单元 · 引书 ≥6 部', () => {
  const list = main.chapterUnits(main.load());
  const s = main.shape(list);
  assert.strictEqual(s.hanzi, 7524);
  assert.strictEqual(s.mean, 3762);
  assert.strictEqual(s.digits, 60);
  assert.strictEqual(s.valueLike, 0);
  const views = main.rank(main.merge(list, 'views'));
  assert.ok(views.length >= 2, '侧重项少于 2');
  assert.strictEqual(views.reduce((a, v) => a + v.count, 0), 447);
  for (const v of views) assert.ok(v.share >= 0 && v.share <= 1, '占比越界：' + v.key);
  const levels = main.rank(main.merge(list, 'levels'));
  assert.ok(levels.length >= 2, '标注项少于 2');
  assert.strictEqual(levels.reduce((a, v) => a + v.count, 0), 27);
  const c = main.citations(list);
  assert.ok(c.books >= 6, '引书只有 ' + c.books + ' 部');
  const ops = main.hands(list);
  assert.ok(Array.isArray(ops), 'hands 未返回数组');
  for (const [w, n] of ops) assert.ok(n > 0 && typeof w === 'string', '操作词统计异常');
});

test('教材单元侧重重心与分散体系标注分布可复算', () => {
  const list = main.chapterUnits(main.load());
  const views = main.rank(main.merge(list, 'views'));
  assert.ok(views.length >= 2, '侧重项少于 2');
  assert.strictEqual(views.reduce((a, v) => a + v.count, 0), 447);
  for (const v of views) assert.ok(v.share >= 0 && v.share <= 1, '占比越界：' + v.key);
  const levels = main.rank(main.merge(list, 'levels'));
  assert.ok(levels.length >= 2, '标注项少于 2');
  assert.strictEqual(levels.reduce((a, v) => a + v.count, 0), 27);
});

test('正文规模与习题合同（≥2500 汉字、≥4 节；6 题 · pre 1／check 3／post 2）', () => {
  assert.ok(hz(doc) >= 2500, '正文只有 ' + hz(doc) + ' 汉字');
  assert.ok((doc.match(/^## /gm) || []).length >= 4, '二级节不足 4 个');
  assert.strictEqual(questions.length, 6, '题量 ' + questions.length);
  const stage = (n) => questions.filter((q) => q.stage === n).length;
  assert.strictEqual(stage('pre'), 1);
  assert.strictEqual(stage('check'), 3);
  assert.strictEqual(stage('post'), 2);
});

test('每题 4 个互异选项、解释 40–80 汉字、check 3 道全接地', () => {
  for (const [i, q] of questions.entries()) {
    const opts = q.options || [];
    assert.strictEqual(opts.length, 4, '第 ' + (i + 1) + ' 题选项数不是 4');
    assert.strictEqual(new Set(opts.map(String)).size, 4, '第 ' + (i + 1) + ' 题选项重复');
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4, '第 ' + (i + 1) + ' 题答案下标非法');
    const n = hz(q.explain || q.explanation || '');
    assert.ok(n >= 40 && n <= 80, '第 ' + (i + 1) + ' 题解释 ' + n + ' 汉字');
  }
  const positions = new Set(questions.map((q) => q.correct));
  assert.ok(positions.size >= 3, '正确答案只落在 ' + positions.size + ' 个位置');
  const body = new Set();
  const clean = doc.replace(/[^\u4e00-\u9fff]/g, ' ');
  for (const seg of clean.split(/\s+/)) for (let i = 0; i + 4 <= seg.length; i += 1) body.add(seg.slice(i, i + 4));
  const hit = questions.filter((q) => {
    if (q.stage !== 'check') return false;
    const opt = String((q.options || [])[q.correct] || '').replace(/[^\u4e00-\u9fff]/g, '');
    for (let i = 0; i + 4 <= opt.length; i += 1) if (body.has(opt.slice(i, i + 4))) return true;
    return false;
  });
  assert.strictEqual(hit.length, 3, '接地 check 题 ' + hit.length + ' 道');
});

test('正文、习题与代码都没有旧脚手架指纹', () => {
  const raw = doc + '\n' + quizRaw + '\n' + fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测', '见 code/main.js 输出']) {
    assert.ok(!raw.includes(bad), '残留旧脚手架词：' + bad);
  }
  assert.ok(!/本课第\s*\d+\s*章[（(]/.test(raw), '残留「本课第 N 章（」式引用');
});
