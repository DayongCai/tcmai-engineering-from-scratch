'use strict';

/**
 * 第 3 章 代码自检：推断量从正文原始数独立复算，quiz 与正文同源。
 * 运行：node --test chapters/03-s3/code/main.test.js
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

test('率差、标准误、z 由例数独立复算', () => {
  const c = main.compute(RAW());
  const p1 = 29 / 40;
  const p2 = 22 / 40;
  const se = Math.sqrt((p1 * (1 - p1)) / 40 + (p2 * (1 - p2)) / 40);
  assert.ok(Math.abs(c.rates.diff - (p1 - p2)) < 1e-12);
  assert.ok(Math.abs(c.rates.se - se) < 1e-12);
  assert.strictEqual((se * 100).toFixed(1), '10.6');
  assert.strictEqual(c.rates.z.toFixed(2), '1.66');
});

test('Wald 与 Wilson 区间独立复算，Wilson 更靠内', () => {
  const c = main.compute(RAW());
  const se = Math.sqrt((0.3 * 0.7) / 100);
  assert.ok(Math.abs(c.intervals.wald[0] - (0.3 - 1.96 * se)) < 1e-12);
  assert.ok(Math.abs(c.intervals.wald[1] - (0.3 + 1.96 * se)) < 1e-12);
  assert.strictEqual(c.intervals.wald[0].toFixed(3), '0.210');
  assert.strictEqual(c.intervals.wilson[0].toFixed(3), '0.219');
  assert.strictEqual(c.intervals.wilson[1].toFixed(3), '0.396');
  assert.ok(c.intervals.wilson[0] > c.intervals.wald[0], 'Wilson 下界应更靠内');
});

test('设计效应与有效样本量独立复算', () => {
  const c = main.compute(RAW());
  assert.ok(Math.abs(c.cluster.deff - (1 + 29 * 0.05)) < 1e-12);
  assert.strictEqual(c.cluster.deff.toFixed(2), '2.45');
  assert.strictEqual(Math.round(c.cluster.neff), 245);
});

test('样本量公式独立复算并向上取整', () => {
  const c = main.compute(RAW());
  const n = (2 * (1.96 + 0.84) ** 2) / 0.25;
  assert.ok(Math.abs(c.sample.n - n) < 1e-12);
  assert.strictEqual(n.toFixed(1), '62.7');
  assert.strictEqual(c.sample.perGroup, 63);
});

test('亚组族错误率独立复算，与正文一致', () => {
  const c = main.compute(RAW());
  assert.ok(Math.abs(c.subgroup.fwer - (1 - 0.95 ** 12)) < 1e-12);
  assert.strictEqual(Math.round(c.subgroup.fwer * 100), 46);
});

test('非劣效结论随界值变化：3 不成立、4 成立', () => {
  const c = main.compute(RAW());
  assert.deepStrictEqual(c.nonInf.deltas, [
    { delta: 3, holds: false },
    { delta: 4, holds: true },
  ]);
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
  assert.ok(out.includes(c.rates.z.toFixed(2)), '输出未打印 z 值');
  assert.ok(out.includes('现算'), '输出未声明数字来源');
  assert.ok(out.includes('演算设定'), '输出未提示数值为演算设定');
});
