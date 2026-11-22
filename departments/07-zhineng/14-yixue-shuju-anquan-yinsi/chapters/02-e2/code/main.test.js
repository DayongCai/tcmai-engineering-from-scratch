'use strict';

/**
 * 第 2 章自检：落地断点的四个参数与数据元属性个数都从正文现算。
 * 运行：node --test chapters/02-e2/code/main.test.js
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

test('数据元属性从枚举句数出 9 项，末项是标识类型', () => {
  const a = main.attributes(RAW());
  assert.strictEqual(a.count, 9, `属性个数 ${a.count}`);
  assert.strictEqual(a.names[0], '名称');
  assert.strictEqual(a.names[a.names.length - 1], '标识类型');
  assert.strictEqual(new Set(a.names).size, 9, '属性名有重复');
});

test('落地断点参数取自正文：9 个系统、4 套标识、2 对可对齐', () => {
  const p = main.params(RAW());
  assert.strictEqual(p.systems, 9);
  assert.deepStrictEqual(p.ids, ['病历号', '住院号', '医保号', '院内一卡通']);
  assert.strictEqual(p.aligned, 2);
  assert.strictEqual(p.N, 50000);
  assert.strictEqual(p.pct, 12);
});

test('配对空间与对齐覆盖率复算', () => {
  const m = main.model(RAW());
  assert.strictEqual(m.pairs, 6);
  assert.ok(Math.abs(m.alignedShare - 2 / 6) < 1e-9);
  assert.ok(Math.abs(m.alignedShare - 0.3333) < 0.001);
});

test('无法唯一对齐的记录数与正文写的 6,000 条一致', () => {
  const m = main.model(RAW());
  assert.strictEqual(m.unaligned, 6000);
  assert.strictEqual(m.stated, 6000);
  assert.strictEqual(m.unaligned, m.stated);
});

test('正文的边界声明齐备', () => {
  const s = main.stats(RAW());
  assert.ok(s.drills >= 1, '正文没有「演算设定」标注');
  assert.ok(s.disclaimer, '正文缺免责声明');
  assert.ok(s.tables >= 2, `本章只有 ${s.tables} 张表`);
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
  assert.ok(out.includes('6,000'), '输出未打印无法对齐的记录数');
  assert.ok(out.includes('9 项'), '输出未打印数据元属性个数');
  assert.ok(out.includes('现算'), '输出未声明数字来源');
  assert.ok(out.includes('演算设定'), '输出未提示数值为演算设定');
});
