'use strict';

/**
 * 第 8 章自检：三档粗化的孤格数、单人占比与噪声尺度都从正文现算。
 * 运行：node --test chapters/08-e8/code/main.test.js
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

test('章首设定取自正文：5 万条、四列 2×17×900×12', () => {
  const p = main.params(RAW());
  assert.strictEqual(p.N, 50000);
  assert.deepStrictEqual(p.dims, [2, 17, 900, 12]);
  assert.strictEqual(p.statedCells, 367200);
  assert.strictEqual(p.shareStated, 87);
});

test('组合数与正文写的 367,200 一致', () => {
  const m = main.model(RAW());
  assert.strictEqual(m.cellsMatch, true);
  assert.strictEqual(m.dims.reduce((a, b) => a * b, 1), 367200);
});

test('单人占比复算为约 87%，与正文一致', () => {
  const m = main.model(RAW());
  assert.ok(Math.abs(m.aloneShare - 87) < 0.5, `单人占比 ${m.aloneShare}`);
});

test('三档粗化的 λ 与孤格数都复算出来，并与正文对账', () => {
  const m = main.model(RAW());
  assert.deepStrictEqual(m.rows.map((r) => r.cells), [367200, 6480, 576]);
  assert.deepStrictEqual(m.rows.map((r) => Math.round(r.singles)), [43635, 22, 0]);
  for (const r of m.rows) {
    assert.ok(r.lambdaMatch, `${r.name} 的 λ 与正文不符：${r.lambda}`);
    assert.ok(r.singlesMatch, `${r.name} 的孤格数与正文不符：${r.singles}`);
  }
  assert.ok(m.rows[2].lambda > 80, '最粗一档的 λ 应在 86 量级');
});

test('平均每格 7.7 人仍有孤格：k 看最小值不看平均值', () => {
  const m = main.model(RAW());
  assert.ok(Math.abs(m.rows[1].lambda - 7.72) < 0.02);
  assert.ok(Math.round(m.rows[1].singles) > 0 && Math.round(m.rows[1].singles) < 50);
});

test('隐私预算表：b = 1/ε，95% 半宽约 3b', () => {
  const eps = main.laplace(RAW());
  assert.deepStrictEqual(eps.map((e) => e.eps), [0.1, 0.5, 1, 2, 8]);
  for (const e of eps) {
    assert.ok(Math.abs(1 / e.eps - e.b) < 1e-9, `ε=${e.eps} 的 b 不符`);
    assert.ok(Math.abs(3 * e.b - e.half) < 0.011, `ε=${e.eps} 的半宽不符：${e.half}`);
  }
  const b = 1 / 0.5;
  assert.ok(Math.abs(Math.SQRT2 * b - 2.83) < 0.01, 'ε=0.5 时标准差应约 2.83');
});

test('差分反解复算：11×101 − 10×100 = 111', () => {
  assert.strictEqual(11 * 101 - 10 * 100, 111);
  assert.ok(RAW().includes('111'), '正文未给出反解结果');
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

test('quiz 不含脚手架名目，也不引法规全称', () => {
  const raw = fs.readFileSync(QUIZ, 'utf8');
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测', '个人信息保护法', '数据安全法']) {
    assert.ok(!raw.includes(bad), `quiz 仍含「${bad}」`);
  }
});

test('脚本可运行，输出与现算数字一致', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes('367,200'), '输出未打印组合数');
  assert.ok(out.includes('87%'), '输出未打印单人占比');
  assert.ok(out.includes('现算'), '输出未声明数字来源');
  assert.ok(out.includes('演算设定'), '输出未提示数值为演算设定');
});
