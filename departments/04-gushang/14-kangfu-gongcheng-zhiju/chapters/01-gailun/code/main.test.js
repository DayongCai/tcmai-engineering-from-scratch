'use strict';

/**
 * 第 1 章 代码自检：正文统计、本章可数对象与习题结构，全部从文件现算后逐项对账。
 * 运行：node --test chapters/01-gailun/code/main.test.js
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

test('节数 = 编号节 + 「代价与边界」', () => {
  const heads = main.headings(RAW());
  const s = main.stats();
  assert.strictEqual(s.sections, heads.length);
  assert.strictEqual(s.numbered, heads.length - 1, '编号节应比总节数少一节');
  assert.ok(heads.some((h) => h.includes('代价与边界')), '缺「代价与边界」节');
});

test('表数与独立重算一致，且责任链表有 4 个环节', () => {
  const independent = RAW()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^\|[\s:|-]*-{3}[\s:|-]*\|$/.test(l)).length;
  const s = main.stats();
  assert.strictEqual(s.tables, independent);
  assert.ok(s.tables >= 2, `本章只有 ${s.tables} 张表`);
  assert.strictEqual(s.chainRows, 4, `责任链应为处方/制作/适配/随访四行，实为 ${s.chainRows}`);
  assert.ok(s.chainCols >= 3, '责任链表应含环节/负责人/须写下的内容三列');
});

test('四种作用齐备：限制、替代、矫正、代偿', () => {
  const s = main.stats();
  assert.deepStrictEqual(s.roles, ['限制', '替代', '矫正', '代偿']);
});

test('三点固定成立条件 4 条、约束度实现手段 3 种，均与正文条目一致', () => {
  const s = main.stats();
  const indepRules = main.bullets(main.section(RAW(), '三点固定'));
  const indepMeans = main.items(main.section(RAW(), '约束度'));
  assert.strictEqual(s.threePointRules, indepRules);
  assert.strictEqual(s.constraintMeans, indepMeans);
  assert.strictEqual(s.threePointRules, 4);
  assert.strictEqual(s.constraintMeans, 3);
});

test('「代价与边界」条目与正文一致，引文与免责声明齐备', () => {
  const s = main.stats();
  assert.strictEqual(s.boundaries, main.bullets(main.section(RAW(), '代价与边界')));
  assert.ok(s.boundaries >= 4, `代价条目只有 ${s.boundaries} 条`);
  assert.ok(s.cites >= 1, '本章应至少引一部书');
  assert.ok(s.books.includes('吕氏春秋·尽数'), `引书为 ${s.books.join('／')}`);
  assert.ok(s.disclaimer, '缺免责声明');
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

test('quiz：答案位置分散，不集中在同一个下标', () => {
  const qs = JSON.parse(fs.readFileSync(QUIZ, 'utf8')).questions;
  const used = new Set(qs.map((q) => q.correct));
  assert.ok(used.size >= 3, `正确选项只落在 ${used.size} 个位置上`);
});

test('quiz：check 题里至少 2 道的正确选项含正文原词（≥4 汉字）', () => {
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
  assert.ok(grounded >= 2, `只有 ${grounded} 道 check 题的正确选项能在正文里找到原词`);
});

test('脚本可运行，输出与现算数字一致', () => {
  const s = main.stats();
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(s.hanzi.toLocaleString('en-US')), '输出未打印汉字数');
  assert.ok(out.includes(`第 ${s.chapter} 章`), '输出未打印章号');
  assert.ok(out.includes('现算'), '输出未声明数字来源');
  assert.ok(out.includes(`${s.chainRows} 个环节`), '输出未打印责任链环节数');
});
