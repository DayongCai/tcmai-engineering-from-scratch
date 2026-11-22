'use strict';

/**
 * 第 8 章 代码自检：轮廓系数、稳定性判读、κ 分级、AUC 落差与 t-SNE 簇数都要独立复算，quiz 与正文同源。
 * 运行：node --test chapters/08-s8/code/main.test.js
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
  assert.ok(s.tables >= 3);
});

test('轮廓系数由 a、b 独立复算', () => {
  const c = main.compute(RAW());
  const s = (4.0 - 2.1) / Math.max(2.1, 4.0);
  assert.ok(Math.abs(c.sil.s - s) < 1e-12);
  assert.strictEqual(s.toFixed(3), '0.475');
  assert.ok(c.sil.s < 0.5, '应属「有一定结构但不强」');
});

test('稳定性表：第三类被判为不可复现，其余不是', () => {
  const c = main.compute(RAW());
  const [r1, r2, r3] = c.stab.rows;
  assert.deepStrictEqual([r1.jaccard, r2.jaccard, r3.jaccard], [0.61, 0.58, 0.34]);
  assert.strictEqual(c.stab.grade(r3.jaccard), '不可复现');
  assert.notStrictEqual(c.stab.grade(r1.jaccard), '不可复现');
  assert.notStrictEqual(c.stab.grade(r2.jaccard), '不可复现');
  assert.strictEqual(c.stab.hi, 0.75);
  assert.strictEqual(c.stab.lo, 0.6);
});

test('κ 分级与实际值一致：0.35 属「差」', () => {
  const c = main.compute(RAW());
  assert.strictEqual(c.kap.k, 0.35);
  assert.strictEqual(c.kap.grade, '差');
});

test('三档 AUC 与落差独立复算', () => {
  const c = main.compute(RAW());
  assert.deepStrictEqual([c.auc.internal, c.auc.temporal, c.auc.external], [0.88, 0.74, 0.68]);
  assert.ok(Math.abs(c.auc.drop - (0.88 - 0.68)) < 1e-12);
  assert.strictEqual(c.auc.drop.toFixed(2), '0.20');
  assert.ok(c.auc.internal > c.auc.temporal && c.auc.temporal > c.auc.external, '外部验证应逐档下降');
});

test('t-SNE 两档参数给出不同簇数，组合数可复算', () => {
  const c = main.compute(RAW());
  assert.strictEqual(c.tsne.p1, 5);
  assert.strictEqual(c.tsne.k1, 6);
  assert.strictEqual(c.tsne.p2, 50);
  assert.strictEqual(c.tsne.k2, 3);
  assert.notStrictEqual(c.tsne.k1, c.tsne.k2);
  assert.strictEqual(c.space.combos, 12 * 4 * 3);
  assert.strictEqual(c.space.combos, 144);
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

test('脚本可运行，输出含稳定性判读与边界声明', () => {
  const c = main.verify(RAW());
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes('不可复现'), '输出未给出稳定性判读');
  assert.ok(out.includes(c.auc.drop.toFixed(2)), '输出未打印 AUC 落差');
  assert.ok(out.includes('现算'), '输出未声明数字来源');
  assert.ok(out.includes('演算设定'), '输出未提示数值为演算设定');
});
