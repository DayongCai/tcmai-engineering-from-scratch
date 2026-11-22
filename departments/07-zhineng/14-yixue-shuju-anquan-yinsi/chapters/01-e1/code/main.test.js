'use strict';

/**
 * 第 1 章自检：组合枚举与习题结构都从文件现算、逐项对账。
 * 运行：node --test chapters/01-e1/code/main.test.js
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

test('正文存在，且汉字数达到补实门槛', () => {
  const s = main.stats(RAW());
  assert.ok(s.hanzi >= 2000, `本章汉字只有 ${s.hanzi}`);
  assert.strictEqual(s.hanzi, hanzi(RAW()));
});

test('演算参数取自正文：5,000 条记录与四个准标识', () => {
  const p = main.params(RAW());
  assert.strictEqual(p.N, 5000);
  assert.deepStrictEqual(p.dims.map((d) => d.values), [2, 9, 87, 30]);
  assert.deepStrictEqual(p.dims.map((d) => d.name), ['性别', '年龄段', '证候名', '就诊科室']);
});

test('组合空间复算为 46,980，与正文写的数字一致', () => {
  const m = main.model(RAW());
  assert.strictEqual(m.cells, 2 * 9 * 87 * 30);
  assert.strictEqual(m.cells, 46980);
  assert.ok(RAW().includes('46{,}980'), '正文没有写出 46,980');
});

test('平均密度与两人数概率落在正文给的数量级上', () => {
  const m = main.model(RAW());
  assert.ok(Math.abs(m.lambda - 0.106) < 0.001, `λ=${m.lambda}`);
  assert.ok(Math.abs(m.p1 - 0.0957) < 0.0005, `P1=${m.p1}`);
  assert.ok(m.p0 > 0.85 && m.p0 < 0.95, `P0=${m.p0}`);
});

test('两种写法分别复算出 478 与 4,495，比值等于 λ', () => {
  const m = main.model(RAW());
  assert.strictEqual(Math.round(m.uniqueAsWritten), 478);
  assert.strictEqual(Math.round(m.uniquePoisson), 4495);
  assert.strictEqual(Math.round(m.atMostOne), 4495);
  const ratio = m.uniquePoisson / m.uniqueAsWritten;
  assert.ok(Math.abs(ratio - 1 / m.lambda) < 0.01, `比值 ${ratio} 不等于 1/λ`);
  assert.ok(m.uniquePoisson / m.N > 0.85, '九成记录可被指认这一结论未复现');
});

test('正文的边界声明齐备', () => {
  const s = main.stats(RAW());
  assert.ok(s.drills >= 1, '正文没有「演算设定」标注');
  assert.ok(s.disclaimer, '正文缺免责声明');
  assert.ok(s.tables >= 1, '正文没有表格');
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
  assert.ok(used.size >= 3, `正确答案只落在 ${used.size} 个位置上，未打散`);
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
  const m = main.model(RAW());
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes('46,980'), '输出未打印组合空间');
  assert.ok(out.includes(String(Math.round(m.uniquePoisson).toLocaleString('en-US'))), '输出未打印孤格记录数');
  assert.ok(out.includes('现算'), '输出未声明数字来源');
  assert.ok(out.includes('演算设定'), '输出未提示数值为演算设定');
});
