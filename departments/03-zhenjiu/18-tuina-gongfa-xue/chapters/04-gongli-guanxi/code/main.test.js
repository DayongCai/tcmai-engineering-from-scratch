#!/usr/bin/env node
/**
 * 推拿功法学 · 本章正文与习题自检 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const M = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const SLUG = path.basename(path.resolve(__dirname, '..'));

test('章号与 slug 与目录一致，章题可解析', () => {
  assert.strictEqual(M.SLUG, SLUG);
  assert.strictEqual(M.CHAPTER, String(Number(SLUG.slice(0, 2))));
  assert.ok(M.TITLE.length > 4, '章题未解析：' + M.TITLE);
});

test('正文规模达标：汉字 >=2500，二级节 >=4', () => {
  const a = M.audit();
  assert.ok(a.hanzi >= 2500, '汉字 ' + a.hanzi);
  assert.ok(a.secs >= 4, '二级节 ' + a.secs);
  assert.strictEqual(a.hanzi, M.hz(M.doc));
});

test('chapterUnits 与 chapterKeys 一致，每单元都有题与字数', () => {
  const units = M.chapterUnits();
  assert.deepStrictEqual(units.map((u) => u.key), M.chapterKeys());
  assert.ok(units.length >= 4, '单元 ' + units.length);
  assert.ok(units.every((u) => u.title.length > 0 && u.hanzi > 0));
});

test('习题 6 题，pre 1 / check 3 / post 2，每题 4 选项', () => {
  const s = M.summarize();
  assert.strictEqual(s.total, 6);
  assert.deepStrictEqual(s.stages, { pre: 1, check: 3, post: 2 });
  assert.ok(s.four, '有题不是 4 选项');
  assert.ok(s.idx, 'correct 下标非法');
});

test('每条解释 40-80 汉字', () => {
  for (const q of M.quiz.questions) {
    const n = M.hz(M.why(q));
    assert.ok(n >= 40 && n <= 80, n + ' 汉字：' + q.question);
  }
});

test('三道 check 全部接地，正确选项含 >=6 汉字原文', () => {
  const body = M.shingles(M.doc, 6);
  const checks = M.quiz.questions.filter((q) => q.stage === 'check');
  assert.strictEqual(checks.length, 3);
  for (const q of checks) {
    assert.ok(M.grounded(q.options[q.correct]), '未接地：' + q.question);
    const segs = String(q.options[q.correct]).replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/);
    const hit = segs.some((seg) => {
      for (let i = 0; i + 6 <= seg.length; i += 1) if (body.has(seg.slice(i, i + 6))) return true;
      return false;
    });
    assert.ok(hit, '缺 6 字原文：' + q.question);
  }
});

test('summarize 判定达标，且 audit 与之一致', () => {
  assert.strictEqual(M.summarize().ok, true);
  assert.strictEqual(M.audit().quiz.ok, true);
});

test('quiz 与正文不含模板残留', () => {
  // 判据用码位写，避免测试文件本身带出旧词
  const bad = [/\u4e09\u8fa8/, /\u56db\u4f4d\u9762/, /\u5355\u5143\u89c4\u6a21/,
    /\u672c\u7ae0\u5b9e\u6d4b/, /\u672c\u8bfe\u7b2c\s*\d+\s*\u7ae0[（(]/,
    /\u89c1\s*code\/main\.js\s*\u8f93\u51fa/];
  const qraw = fs.readFileSync(M.QUIZ, 'utf8');
  for (const re of bad) {
    assert.ok(!re.test(qraw), 'quiz 命中 ' + re);
    assert.ok(!re.test(M.doc), '正文命中 ' + re);
  }
});

test('脚本可运行：退出 0，打印接地数与题量', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /接地 check 题 3\/3/);
  assert.match(r.stdout, /习题 6 题/);
  assert.match(r.stdout, /不构成诊疗建议/);
});
