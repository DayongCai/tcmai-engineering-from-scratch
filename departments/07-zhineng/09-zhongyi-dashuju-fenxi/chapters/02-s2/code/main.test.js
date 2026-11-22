'use strict';

/**
 * 第 2 章 代码自检：描述统计量的每个数都要从正文原始数据独立复算，quiz 必须与正文同源。
 * 运行：node --test chapters/02-s2/code/main.test.js
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

test('正文存在，汉字数达到补实门槛（≥2,500）', () => {
  assert.ok(main.stats(RAW()).hanzi >= 2500, `本章汉字只有 ${main.stats(RAW()).hanzi}`);
});

test('汉字数、节数、表数独立复算一致', () => {
  const text = RAW();
  const s = main.stats(text);
  assert.strictEqual(s.hanzi, (text.match(HANZI) || []).length);
  const heads = text.split(/\r?\n/).filter((l) => /^##\s+/.test(l));
  assert.strictEqual(s.sections, heads.length);
  assert.ok(heads.some((h) => h.includes('代价与边界')), '缺「代价与边界」节');
  const tbl = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => /^\|[\s:|-]*---[\s:|-]*\|$/.test(l));
  assert.strictEqual(s.tables, tbl.length);
  assert.ok(s.tables >= 1);
});

test('变异系数由正文均数与标准差独立复算', () => {
  const c = main.compute(RAW());
  assert.ok(Math.abs(c.cv - 5.8 / 15.2) < 1e-12);
  assert.strictEqual(Math.round(c.cv * 100), 38);
  assert.ok(RAW().includes('38\\%'));
});

test('加权病程由病例数独立复算，且与直接平均不同', () => {
  const c = main.compute(RAW());
  const rates = [1.8, 4.1, 5.0];
  const ns = [800, 150, 50];
  const w = rates.reduce((a, r, i) => a + r * ns[i], 0) / 1000;
  const s = rates.reduce((a, b) => a + b, 0) / 3;
  assert.ok(Math.abs(c.course.weighted - w) < 1e-12);
  assert.ok(Math.abs(c.course.simple - s) < 1e-12);
  assert.strictEqual(w.toFixed(2), '2.31');
  assert.strictEqual(s.toFixed(2), '3.63');
});

test('两月合计率由例数独立复算，简单平均高估', () => {
  const c = main.compute(RAW());
  assert.ok(Math.abs(c.months.pooled - 152 / 240) < 1e-12);
  assert.strictEqual((c.months.pooled * 100).toFixed(1), '63.3');
  assert.ok(c.months.meanOfRates > c.months.pooled, '逐月平均应高于合计率');
});

test('正态法参考区间下界为负，与正文一致', () => {
  const c = main.compute(RAW());
  assert.ok(Math.abs(c.visits.lo - (4.8 - 1.96 * 6.1)) < 1e-12);
  assert.strictEqual(c.visits.lo.toFixed(1), '-7.2');
  assert.strictEqual(c.visits.hi.toFixed(1), '16.8');
  assert.ok(RAW().includes('-7.2'), '正文未写出负下界');
});

test('几何均数由对数均值独立复算，落在中位数附近', () => {
  const c = main.compute(RAW());
  assert.ok(Math.abs(c.geo.geo - Math.exp(2.65)) < 1e-12);
  assert.ok(Math.abs(c.geo.geo - 14.1) < 0.06, `几何均数 ${c.geo.geo.toFixed(2)} 与正文 14.1 不符`);
  assert.ok(Math.abs(c.geo.geo - c.median.median) < 2, '几何均数应接近中位数');
  assert.doesNotThrow(() => main.verify(RAW()));
});

test('正文边界声明齐备：演算设定与免责声明', () => {
  const s = main.stats(RAW());
  assert.ok(s.drills >= 1);
  assert.ok(s.disclaimer);
});

test('quiz：≥5 题，覆盖 pre／check／post，4 选项，explain ≥30 汉字', () => {
  const qs = JSON.parse(fs.readFileSync(QUIZ, 'utf8')).questions;
  assert.ok(qs.length >= 5, `只有 ${qs.length} 题`);
  const stages = new Set(qs.map((q) => q.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), `缺 ${s} 段`);
  for (const q of qs) {
    assert.strictEqual(q.options.length, 4, `选项不是 4 个：${q.question}`);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4, `correct 非法：${q.question}`);
    assert.ok((String(q.explain).match(HANZI) || []).length >= 30, `explain 过短：${q.question}`);
  }
});

test('quiz：答案打散，正确选项不集中在一处', () => {
  const qs = JSON.parse(fs.readFileSync(QUIZ, 'utf8')).questions;
  assert.ok(new Set(qs.map((q) => q.correct)).size >= 3, '正确项位置过于集中');
});

test('quiz：至少 2 道 check 题的正确选项含正文原词（≥4 汉字）', () => {
  const qs = JSON.parse(fs.readFileSync(QUIZ, 'utf8')).questions;
  const body = new Set();
  for (const seg of RAW().replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + 4 <= seg.length; i += 1) body.add(seg.slice(i, i + 4));
  }
  const hit = (s) =>
    String(s)
      .replace(/[^\u4e00-\u9fff]/g, ' ')
      .split(/\s+/)
      .some((seg) => {
        for (let i = 0; i + 4 <= seg.length; i += 1) if (body.has(seg.slice(i, i + 4))) return true;
        return false;
      });
  const grounded = qs.filter((q) => q.stage === 'check' && hit(q.options[q.correct])).length;
  assert.ok(grounded >= 2, `只有 ${grounded} 道 check 题接地`);
});

test('quiz 与 code 都不含脚手架指纹', () => {
  const bad = [/三辨/, /四位面/, /单元规模/, /本章实测/, /本课第\s*\d+\s*章/, /见\s*code\/main\.js\s*输出/];
  for (const p of bad) {
    assert.ok(!p.test(fs.readFileSync(QUIZ, 'utf8')), `quiz 含 ${p}`);
    assert.ok(!p.test(fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8')), `code 含 ${p}`);
  }
});

test('脚本可运行，输出含现算数字与边界声明', () => {
  const c = main.verify(RAW());
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(c.course.weighted.toFixed(2)), '输出未打印加权病程');
  assert.ok(out.includes('现算'), '输出未声明数字来源');
  assert.ok(out.includes('演算设定'), '输出未提示数值为演算设定');
});
