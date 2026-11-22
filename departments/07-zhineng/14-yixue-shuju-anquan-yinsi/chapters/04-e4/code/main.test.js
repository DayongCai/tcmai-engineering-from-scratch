'use strict';

/**
 * 第 4 章自检：逐人同意的可行性演算与用途矩阵都从正文现算。
 * 运行：node --test chapters/04-e4/code/main.test.js
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

test('可行性参数取自正文：8 万份、接通 40%、应答 60%', () => {
  const p = main.params(RAW());
  assert.strictEqual(p.total, 80000);
  assert.strictEqual(p.reach, 40);
  assert.strictEqual(p.consent, 60);
  assert.strictEqual(p.finalStated, 19200);
  assert.strictEqual(p.shareStated, 24);
});

test('逐人同意的漏斗复算：32,000 接通、19,200 同意、24% 覆盖', () => {
  const m = main.model(RAW());
  assert.strictEqual(m.reached, 32000);
  assert.strictEqual(m.consented, 19200);
  assert.ok(Math.abs(m.share - 24) < 1e-9);
  assert.ok(m.shareMatches && m.finalMatches, '复算与正文不一致');
  assert.strictEqual(m.lost, 60800);
});

test('用途矩阵从正文表数出：6 行用途 × 3 种形态 = 18 格', () => {
  const mx = main.matrix(RAW());
  assert.strictEqual(mx.uses, 6);
  assert.strictEqual(mx.forms, 3);
  assert.strictEqual(mx.cells, 18);
  assert.ok(mx.usesList.includes('多中心协作'), '缺「多中心协作」一行');
  assert.ok(mx.usesList.includes('对外商业合作'), '缺「对外商业合作」一行');
  assert.ok(mx.formsList.some((f) => f.includes('聚合')), '缺聚合统计一列');
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
  assert.ok(out.includes('19,200'), '输出未打印同意人数');
  assert.ok(out.includes('18 格'), '输出未打印矩阵格数');
  assert.ok(out.includes('现算'), '输出未声明数字来源');
  assert.ok(out.includes('演算设定'), '输出未提示数值为演算设定');
});
