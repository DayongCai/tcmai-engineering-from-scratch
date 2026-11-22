'use strict';

/**
 * 第 5 章 代码自检：效应量、提升度（频次比）与 Fisher 区间都要从正文原始数独立复算，quiz 与正文同源。
 * 运行：node --test chapters/05-s5/code/main.test.js
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

test('rank-biserial 效应量由 U 与 n 独立复算', () => {
  const c = main.compute(RAW());
  const rrb = 1 - (2 * 420) / (35 * 35);
  assert.ok(Math.abs(c.rank.rrb - rrb) < 1e-12);
  assert.strictEqual(rrb.toFixed(2), '0.31');
});

test('三条规则的提升度等于置信度除以后件边际频率', () => {
  const c = main.compute(RAW());
  const expect = [61 / 47, 58 / 31, 32 / 31];
  c.rules.forEach((r, i) => {
    assert.ok(Math.abs(r.lift - expect[i]) < 1e-9, `第 ${i + 1} 行 lift 复算不一致`);
    assert.ok(Math.abs(r.lift - r.stated) < 0.006, `第 ${i + 1} 行与表内写法不符`);
  });
  assert.ok(c.rules[2].lift < 1.1, '无信息规则的 lift 应接近 1');
  assert.ok(c.rules[1].lift > c.rules[0].lift, '药对规则应比单药规则信息量更大');
});

test('Fisher z 变换与反变换区间独立复算', () => {
  const c = main.compute(RAW());
  const z = Math.atanh(0.62);
  const se = 1 / Math.sqrt(117);
  assert.ok(Math.abs(c.corr.z - z) < 1e-12);
  assert.ok(Math.abs(c.corr.se - se) < 1e-12);
  assert.strictEqual(z.toFixed(3), '0.725');
  assert.strictEqual(se.toFixed(4), '0.0925');
  assert.ok(Math.abs(Math.tanh(z - 1.96 * se) - c.corr.lo) < 1e-12);
  assert.ok(c.corr.lo < 0.62 && c.corr.hi > 0.62, '区间应包住点估计');
  assert.ok(c.corr.hi - c.corr.lo > 0.2, '区间宽度应体现 ±0.11 的精度');
});

test('回归系数与解释力度取自正文', () => {
  const c = main.compute(RAW());
  assert.strictEqual(c.reg.b, 0.35);
  assert.strictEqual(c.reg.r2, 0.18);
  assert.ok(c.reg.r2 < 0.3, 'R² 低，个体预测不可靠');
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

test('脚本可运行，输出含提升度与边界声明', () => {
  const c = main.verify(RAW());
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(c.rules[1].lift.toFixed(2)), '输出未打印第二条规则的提升度');
  assert.ok(out.includes('现算'), '输出未声明数字来源');
  assert.ok(out.includes('演算设定'), '输出未提示数值为演算设定');
});
