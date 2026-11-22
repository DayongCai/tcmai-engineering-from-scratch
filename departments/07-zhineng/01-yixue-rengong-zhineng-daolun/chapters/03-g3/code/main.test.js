'use strict';

/**
 * 第 3 章 代码自检：正文统计与习题结构都得从文件现算、逐项对账。
 * 运行：node --test chapters/03-g3/code/main.test.js
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

test('正文存在，且汉字数达到补实门槛（≥2,500）', () => {
  const s = main.stats();
  assert.ok(s.hanzi >= 2500, `本章汉字只有 ${s.hanzi}，低于补实门槛`);
});

test('汉字数与独立重算一致', () => {
  const independent = (RAW().match(HANZI) || []).length;
  assert.strictEqual(main.stats().hanzi, independent);
});

test('节数 = 编号节 + 「代价与边界」，且标题可枚举', () => {
  const text = RAW();
  const independent = text.split(/\r?\n/).filter((l) => /^##\s+/.test(l)).length;
  const s = main.stats();
  assert.strictEqual(s.sections, independent);
  assert.strictEqual(s.numbered, independent - 1, '编号节应比总节数少一节（末节为代价与边界）');
  assert.ok(main.headings(text).some((h) => h.includes('代价与边界')), '缺「代价与边界」节');
});

test('表数与独立重算一致，且至少 2 张', () => {
  const independent = RAW()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^\|[\s:|-]*---[\s:|-]*\|$/.test(l)).length;
  const s = main.stats();
  assert.strictEqual(s.tables, independent);
  assert.ok(s.tables >= 2, `本章只有 ${s.tables} 张表`);
});

test('引文条数与独立重算一致，书名去重后非空', () => {
  const independent = [...RAW().matchAll(/《([^》]+)》/g)].map((m) => m[1]);
  const c = main.citations(RAW());
  assert.strictEqual(c.total, independent.length);
  assert.strictEqual(c.books.length, new Set(independent).size);
  assert.ok(c.total >= 2, `引文只有 ${c.total} 处`);
});

test('正文自带的边界声明齐备：演算设定与免责声明', () => {
  const s = main.stats();
  assert.ok(s.drills >= 1, '正文没有任何「演算设定」标注');
  assert.ok(s.disclaimer, '正文缺免责声明');
});

test('quiz：≥5 题，覆盖 pre／check／post，每题 4 选项且 correct 合法', () => {
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const qs = quiz.questions;
  assert.ok(Array.isArray(qs) && qs.length >= 5, `只有 ${qs.length} 题`);
  const stages = new Set(qs.map((q) => q.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), `缺 ${s} 段`);
  for (const q of qs) {
    assert.strictEqual(q.options.length, 4, `选项不是 4 个：${q.question}`);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4, `correct 下标非法：${q.question}`);
    const hz = (String(q.explain).match(HANZI) || []).length;
    assert.ok(hz >= 30, `explain 只有 ${hz} 汉字：${q.question}`);
  }
});

test('quiz：check 题里至少有 2 道，正确选项含正文原词（≥4 汉字）', () => {
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const body = new Set();
  for (const seg of RAW().replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + 4 <= seg.length; i += 1) body.add(seg.slice(i, i + 4));
  }
  let grounded = 0;
  for (const q of quiz.questions.filter((x) => x.stage === 'check')) {
    const right = String(q.options[q.correct]);
    const hit = right
      .replace(/[^\u4e00-\u9fff]/g, ' ')
      .split(/\s+/)
      .some((seg) => {
        for (let i = 0; i + 4 <= seg.length; i += 1) if (body.has(seg.slice(i, i + 4))) return true;
        return false;
      });
    if (hit) grounded += 1;
  }
  assert.ok(grounded >= 2, `只有 ${grounded} 道 check 题的正确选项能在正文里找到原词`);
});

test('脚本可运行，输出与现算数字一致', () => {
  const s = main.stats();
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(String(s.hanzi.toLocaleString('en-US'))), '输出未打印汉字数');
  assert.ok(out.includes(`第 ${s.chapter} 章`), '输出未打印章号');
  assert.ok(out.includes('现算'), '输出未声明数字来源');
  assert.ok(out.includes('演算设定'), '输出未提示数值为演算设定');
});
