'use strict';

/**
 * 第 6 章 代码自检：E-value、EPV、过拟合落差、匹配损失都要从正文原始数独立复算，quiz 与正文同源。
 * 运行：node --test chapters/06-s6/code/main.test.js
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
});

test('E-value 由 HR 独立复算：RR + √(RR×(RR−1))', () => {
  const c = main.compute(RAW());
  const rr = 1 / 0.72;
  const e = rr + Math.sqrt(rr * (rr - 1));
  assert.ok(Math.abs(c.ev.e - e) < 1e-12);
  assert.strictEqual(e.toFixed(2), '2.12');
  assert.ok(c.ev.e > 1, 'E-value 应大于 1');
});

test('EPV 由事件数与变量数独立复算', () => {
  const c = main.compute(RAW());
  assert.strictEqual(c.epv.events, 210);
  const map = Object.fromEntries(c.epv.epv.map((x) => [x.vars, x.epv]));
  assert.strictEqual(map[12].toFixed(1), '17.5');
  assert.strictEqual(map[20].toFixed(1), '10.5');
  assert.strictEqual(map[30].toFixed(1), '7.0');
});

test('过拟合落差与效应消失的方向都被复现', () => {
  const c = main.compute(RAW());
  assert.ok(Math.abs(c.over.drop - (0.82 - 0.71)) < 1e-12);
  assert.strictEqual(c.over.drop.toFixed(2), '0.11');
  assert.strictEqual(c.hr.hr, 0.94);
  assert.ok(c.hr.crossesOne, '调整后区间应跨过 1');
  assert.doesNotThrow(() => main.verify(RAW()));
});

test('倾向评分匹配：样本损失 36%，SMD 全部小于 0.1', () => {
  const c = main.compute(RAW());
  assert.ok(Math.abs(c.match.loss - (1 - 512 / 800)) < 1e-12);
  assert.strictEqual((c.match.loss * 100).toFixed(0), '36');
  assert.deepStrictEqual(c.match.after, [0.06, 0.08]);
  assert.ok(c.match.balanced);
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

test('脚本可运行，输出含 E-value 与边界声明', () => {
  const c = main.verify(RAW());
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(c.ev.e.toFixed(2)), '输出未打印 E-value');
  assert.ok(out.includes('现算'), '输出未声明数字来源');
  assert.ok(out.includes('演算设定'), '输出未提示数值为演算设定');
});
