'use strict';

/**
 * 第 4 章 代码自检：辛普森分层表的合并率与 MH 合并 OR 必须能从正文表格手算复现，quiz 与正文同源。
 * 运行：node --test chapters/04-s4/code/main.test.js
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
  const s = main.stats(RAW());
  assert.ok(s.hanzi >= 2500, `本章汉字只有 ${s.hanzi}`);
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
  assert.ok(s.tables >= 2);
});

test('辛普森分层表的每层率与合计率独立复算', () => {
  const c = main.compute(RAW());
  const [l1, l2] = c.simpson.rows;
  assert.deepStrictEqual([l1.a, l1.nA, l1.c, l1.nB], [270, 300, 46, 50]);
  assert.deepStrictEqual([l2.a, l2.nA, l2.c, l2.nB], [4, 20, 44, 200]);
  assert.strictEqual(((274 / 320) * 100).toFixed(1), '85.6');
  assert.strictEqual(((90 / 250) * 100).toFixed(1), '36.0');
  assert.ok(Math.abs(c.simpson.pooledA - 274 / 320) < 1e-12);
  assert.ok(Math.abs(c.simpson.pooledB - 90 / 250) < 1e-12);
});

test('方向翻转是真的：每层乙更高，合计甲更高', () => {
  const c = main.compute(RAW());
  for (const r of c.simpson.rows) assert.ok(r.rateB > r.rateA, `${r.layer}层乙应更高`);
  assert.ok(c.simpson.pooledA > c.simpson.pooledB, '合计应甲更高');
});

test('MH 合并 OR 手算复现：5.93/7.14≈0.83', () => {
  const text = RAW();
  const num = (270 * 4) / 350 + (4 * 156) / 220;
  const den = (30 * 46) / 350 + (16 * 44) / 220;
  const c = main.compute(text);
  assert.ok(Math.abs(c.mh.num - num) < 1e-12);
  assert.ok(Math.abs(c.mh.den - den) < 1e-12);
  assert.ok(Math.abs(num / den - 0.829) < 0.001);
  assert.strictEqual((num / den).toFixed(2), '0.83');
  assert.ok(c.mh.or < 1, 'MH 方向应与合并率相反');
  assert.doesNotThrow(() => main.verify(text));
});

test('t、χ²、V、效应量独立复算', () => {
  const c = main.compute(RAW());
  const t = 2.1 / (4 * Math.sqrt(2 / 40));
  assert.ok(Math.abs(c.t.t - t) < 1e-12);
  assert.strictEqual(t.toFixed(2), '2.35');
  const e11 = (40 * 51) / 80;
  const e12 = (40 * 29) / 80;
  const chi2 = 2 * ((29 - e11) ** 2 / e11 + (11 - e12) ** 2 / e12);
  assert.ok(Math.abs(c.chi.chi2 - chi2) < 1e-12);
  assert.strictEqual(chi2.toFixed(2), '2.65');
  assert.strictEqual(Math.sqrt(chi2 / 80).toFixed(2), '0.18');
  assert.ok(Math.abs(c.t.d - t * Math.sqrt(2 / 40)) < 1e-12);
});

test('族错误率表的比较次数与公式独立复算', () => {
  const c = main.compute(RAW());
  assert.ok(c.fwer.length >= 4);
  for (const row of c.fwer) {
    assert.strictEqual(row.k, (row.groups * (row.groups - 1)) / 2);
    assert.ok(Math.abs(row.calc * 100 - row.stated) < 0.15, `${row.groups} 组不一致`);
  }
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

test('脚本可运行，输出含 MH 合并 OR 与边界声明', () => {
  const c = main.verify(RAW());
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(c.mh.or.toFixed(3)), '输出未打印 MH 合并 OR');
  assert.ok(out.includes('现算'), '输出未声明数字来源');
  assert.ok(out.includes('演算设定'), '输出未提示数值为演算设定');
});
