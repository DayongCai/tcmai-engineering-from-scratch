'use strict';

/**
 * 第 5 章自检：三张风险单的影响与期望损失都从正文现算，并与正文写的数字对账。
 * 运行：node --test chapters/05-e5/code/main.test.js
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const main = require('./main.js');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const RAW = () => fs.readFileSync(DOC, 'utf8');
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const hanzi = (s) => (String(s).match(HANZI) || []).length;

test('正文存在，汉字数达到补实门槛', () => {
  const s = main.stats(RAW());
  assert.ok(s.hanzi >= 2000, `本章汉字只有 ${s.hanzi}`);
  assert.strictEqual(s.hanzi, hanzi(RAW()));
});

test('三张风险单的参数取自正文', () => {
  const p = main.params(RAW());
  assert.deepStrictEqual(p.count, [500, 50000, 80000]);
  assert.deepStrictEqual(p.unit, [300, 300, 800]);
  assert.deepStrictEqual(p.prob, [0.05, 0.3, 0.2]);
  assert.deepStrictEqual(p.statedWan, [0.75, 450, 1280]);
});

test('影响复算：15 万、1,500 万、6,400 万', () => {
  const m = main.model(RAW());
  assert.deepStrictEqual(m.rows.map((r) => r.impact), [150000, 15000000, 64000000]);
});

test('期望损失复算并与正文逐格对账', () => {
  const m = main.model(RAW());
  assert.deepStrictEqual(m.rows.map((r) => Math.round(r.expected)), [7500, 4500000, 12800000]);
  for (const r of m.rows) assert.ok(r.match, `第 ${r.n} 条的期望损失与正文不符`);
  assert.deepStrictEqual(m.rows.map((r) => r.stated), [0.75, 450, 1280]);
});

test('两种排序都指向模型泄漏，且量级跨四个数量级', () => {
  const m = main.model(RAW());
  assert.strictEqual(m.byExpected[0].i, 2);
  assert.strictEqual(m.byImpact[0].i, 2);
  assert.ok(m.sameOrder, '影响与期望的排序不一致');
  const span = m.rows[2].expected / m.rows[0].expected;
  assert.ok(span > 1000, `量级跨度只有 ${span}`);
});

test('正文的边界声明齐备', () => {
  const s = main.stats(RAW());
  assert.ok(s.drills >= 1, '正文没有「演算设定」标注');
  assert.ok(s.disclaimer, '正文缺免责声明');
  assert.ok(s.tables >= 3, `本章只有 ${s.tables} 张表`);
});

test('quiz：≥5 题，覆盖 pre／check／post，每题 4 选项且 correct 合法', () => {
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const qs = quiz.questions;
  assert.ok(Array.isArray(qs) && qs.length >= 5, `只有 ${qs.length} 题`);
  const stages = new Set(qs.map((q) => q.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), `缺 ${s} 段`);
  for (const q of qs) {
    assert.strictEqual(q.options.length, 4, `选项不是 4 个：${q.question}`);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4, `correct 非法：${q.question}`);
    assert.ok(hanzi(q.explain) >= 30, `explain 只有 ${hanzi(q.explain)} 汉字：${q.question}`);
  }
  const used = new Set(qs.map((q) => q.correct));
  assert.ok(used.size >= 3, `答案只落在 ${used.size} 个位置，未打散`);
});

test('quiz：check 题里至少 2 道，正确选项含正文原词（≥4 汉字）', () => {
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const body = new Set();
  for (const seg of RAW().replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + 4 <= seg.length; i += 1) body.add(seg.slice(i, i + 4));
  }
  let grounded = 0;
  for (const q of quiz.questions.filter((x) => x.stage === 'check')) {
    const right = String(q.options[q.correct]).replace(/[^\u4e00-\u9fff]/g, ' ');
    const hit = right.split(/\s+/).some((seg) => {
      for (let i = 0; i + 4 <= seg.length; i += 1) if (body.has(seg.slice(i, i + 4))) return true;
      return false;
    });
    if (hit) grounded += 1;
  }
  assert.ok(grounded >= 2, `只有 ${grounded} 道 check 题的正确选项能在正文找到原词`);
});

test('quiz 不含脚手架名目', () => {
  const raw = fs.readFileSync(QUIZ, 'utf8');
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测']) assert.ok(!raw.includes(bad), `quiz 仍含「${bad}」`);
});

test('脚本可运行，输出与现算数字一致', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes('64,000,000'), '输出未打印最大影响');
  assert.ok(out.includes('1280.00 万'), '输出未打印最大期望损失');
  assert.ok(out.includes('现算'), '输出未声明数字来源');
  assert.ok(out.includes('演算设定'), '输出未提示数值为演算设定');
});
