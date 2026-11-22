'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, FOCUS, read, analyze, rank } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const TPL = [/三辨/, /四位面/, /单元规模/, /本章实测/, /本课第\s*\d+\s*章/, /见\s*code\/main\.js\s*输出/];
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

/** 与习题对齐门同一口径：正文里的 4 字连续汉字片段。 */
function shingles(text, n = 4) {
  const clean = String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ');
  const out = new Set();
  for (const seg of clean.split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

const BODY = read();
const A = analyze(BODY);

test('正文就在本章目录下，章号与标题与正文一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '08-zainan-zhuanyun', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC), '正文文件不存在');
  assert.strictEqual(CHAPTER, 8);
  assert.strictEqual(TITLE, "灾难现场最稀缺的不是技术，是\"谁先走\"的决定");
  assert.ok(BODY.startsWith('# 第 8 章'), '正文首行不是本章章题');
});

test('汉字数与正文现算一致', () => {
  assert.strictEqual(A.hanzi, 3044);
  assert.ok(A.hanzi > 1500, `汉字过少：${A.hanzi}`);
});

test('节数、表格数、引文数与正文现算一致', () => {
  assert.strictEqual(A.sections.length, 6);
  assert.strictEqual(A.tables, 1);
  assert.strictEqual(A.citeCount, 1);
  assert.strictEqual(A.cites.length, 1);
});

test('每节都有字，逐节字数相加不超过全篇', () => {
  for (const s of A.sections) assert.ok(s.hanzi > 0, s.title + ' 一节为空');
  const sum = A.sections.reduce((x, s) => x + s.hanzi, 0);
  assert.ok(sum > 0 && sum <= A.hanzi, `${sum} vs ${A.hanzi}`);
});

test('引文清单含本章据以立论的古籍', () => {
  assert.ok(A.cites.includes('备急千金要方·大医精诚'), A.cites.join('、'));
});

test('判断词词频与正文现算一致，且每个词都在正文出现过', () => {
  assert.deepStrictEqual(A.focus, {"检伤分类":4,"转运":15,"交接":10,"复盘":11,"秩序":4});
  for (const t of FOCUS) assert.ok(A.focus[t] > 0, t + ' 在正文里没出现');
  const sorted = rank(A.focus);
  assert.ok(sorted[0][1] >= sorted[sorted.length - 1][1], '排序口径不一致');
});

test('quiz 结构齐：≥5 题、pre／check／post 齐、4 选项、解释够长、无脚手架字样', () => {
  const raw = fs.readFileSync(QUIZ, 'utf8');
  const q = JSON.parse(raw);
  assert.ok(!TPL.some((re) => re.test(raw)), 'quiz 仍含脚手架字样');
  const qs = q.questions;
  assert.ok(Array.isArray(qs) && qs.length >= 5, '题量不足');
  const stages = new Set(qs.map((x) => x.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), '缺 ' + s + ' 段');
  for (const item of qs) {
    assert.strictEqual(item.options.length, 4, '有题不是 4 选项：' + item.question);
    assert.ok(Number.isInteger(item.correct) && item.correct >= 0 && item.correct < 4, 'correct 下标非法');
    assert.ok(hanzi(item.explain) >= 30, `explain 过短（${hanzi(item.explain)} 字）`);
  }
  const keys = new Set(qs.map((x) => x.correct));
  assert.ok(keys.size >= 3, '正确答案过于集中，未打散');
});

test('quiz 接地：check 题的正确选项能在本章正文里找到原词（≥2 题）', () => {
  const body = shingles(BODY);
  const qs = JSON.parse(fs.readFileSync(QUIZ, 'utf8')).questions.filter((x) => x.stage === 'check');
  const hit = qs.filter((x) => [...shingles(x.options[x.correct])].some((g) => body.has(g)));
  assert.ok(hit.length >= 2, `只有 ${hit.length} 道 check 题接地`);
});

test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /均从本章 docs\/zh\.md 现算/);
  assert.match(out, /不构成急救操作指南/);
  assert.ok(out.includes('汉字 ' + A.hanzi + ' 字'), '输出里的汉字数与现算不一致');
  assert.ok(out.includes('第 8 章'), '输出里没有章号');
});
