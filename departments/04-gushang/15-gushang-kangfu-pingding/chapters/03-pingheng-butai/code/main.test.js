'use strict';

/**
 * 第 3 章 代码自检：正文统计、本章可数对象与习题结构，全部从文件现算后逐项对账。
 * 运行：node --test chapters/03-pingheng-butai/code/main.test.js
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

test('正文存在，且汉字数达到补实门槛（≥2,000）', () => {
  const s = main.stats();
  assert.ok(s.hanzi >= 2000, `本章汉字只有 ${s.hanzi}，低于补实门槛`);
});

test('汉字数与独立重算一致', () => {
  assert.strictEqual(main.stats().hanzi, (RAW().match(HANZI) || []).length);
});

test('节数 = 编号节 + 「代价与边界」', () => {
  const heads = main.headings(RAW());
  const s = main.stats();
  assert.strictEqual(s.sections, heads.length);
  assert.strictEqual(s.numbered, heads.length - 1, '编号节应比总节数少一节');
  assert.ok(heads.some((h) => h.includes('代价与边界')), '缺「代价与边界」节');
});

test('平衡分级表为静态／动态／反应性三级四列', () => {
  const s = main.stats();
  assert.strictEqual(s.levels, 3, `平衡分级表应为 3 行，实为 ${s.levels}`);
  assert.strictEqual(s.levelCols, 4, '分级表应含级别／测什么／常用工具／局限四列');
});

test('三路感觉输入与步态观察条目均可在正文查到', () => {
  const s = main.stats();
  assert.strictEqual(s.sensory, 3, `感觉输入应为 3 路，实为 ${s.sensory}`);
  assert.strictEqual(s.gaitObs, 5, `步态观察条目应为 5 条，实为 ${s.gaitObs}`);
  assert.strictEqual(s.gaitObs, main.bullets(main.section(RAW(), '步态：先看分期')));
});

test('结论三个判断齐备：能不能独自行走、能不能应对扰动、需要什么', () => {
  const s = main.stats();
  assert.strictEqual(s.decisions, 3, `结论判断应为 3 个，实为 ${s.decisions}`);
});

test('「代价与边界」条目与正文一致，引文与免责声明齐备', () => {
  const s = main.stats();
  assert.strictEqual(s.boundaries, main.bullets(main.section(RAW(), '代价与边界')));
  assert.ok(s.boundaries >= 4, `代价条目只有 ${s.boundaries} 条`);
  assert.ok(s.cites >= 1, '本章应至少引一部书');
  assert.ok(s.books.includes('素问·脉要精微论'), `引书为 ${s.books.join('／')}`);
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

test('quiz：标题与 chapters.json 一致', () => {
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const cm = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'chapters.json'), 'utf8'));
  const meta = cm.chapters.find((c) => c.n === main.CHAPTER);
  assert.strictEqual(quiz.title, meta.title);
});

test('脚本可运行，输出与现算数字一致', () => {
  const s = main.stats();
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(s.hanzi.toLocaleString('en-US')), '输出未打印汉字数');
  assert.ok(out.includes(`第 ${s.chapter} 章`), '输出未打印章号');
  assert.ok(out.includes('现算'), '输出未声明数字来源');
  assert.ok(out.includes(`${s.levels} 级`), '输出未打印平衡分级数');
});
