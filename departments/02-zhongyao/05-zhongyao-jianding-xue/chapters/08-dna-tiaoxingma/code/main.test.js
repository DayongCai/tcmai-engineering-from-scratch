#!/usr/bin/env node
/**
 * 第 8 章 条形码定名、图谱定成分、效价定活性 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：正文规模、三条证据链的词频与占比、检出/未检出对账、
 * quiz 的题量与分段，以及「脚本能跑通并 exit 0」。
 * 数字为本机实跑值；正文或随堂题改动后，测试失败即提醒重新对账。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const m = require('./main.js');

const MD = fs.readFileSync(m.DOC, 'utf8');
const QUIZ = JSON.parse(fs.readFileSync(m.QUIZ, 'utf8'));
const SRC = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
const S = m.shape(MD);
const C = m.citations(MD);
const CH = m.chains(MD);
const COV = m.coverage(MD, m.CHAINS);
const V = m.verdicts(MD);
const Q = m.quizCheck(QUIZ);

// 脚手架指纹拆成单字拼接：本文件自身不得成为被扫描的命中项
const BAD = [['三', '辨'].join(''), ['四', '位面'].join(''), ['单元', '规模'].join(''), ['本章', '实测'].join('')];

const pctOf = (r) => (r.share * 100).toFixed(1);

function shingles(text, n = 4) {
  const clean = String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ');
  const out = new Set();
  for (const seg of clean.split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('规模：汉字 3916、段 28（正文段 18）、二级节 6', () => {
  assert.strictEqual(S.hanzi, 3916);
  assert.strictEqual(S.blocks, 28);
  assert.strictEqual(S.body, 18);
  assert.strictEqual(S.sections, 6);
  assert.strictEqual(S.subsections, 0);
});

test('表格行列现算：本章正文无表格，索引不得虚报', () => {
  assert.strictEqual(S.tables, 0);
  assert.strictEqual(S.rows, 0);
  assert.strictEqual(S.cols, 0);
  assert.strictEqual(S.cells, 0);
});

test('引书：4 部 8 次，首位为中国药典', () => {
  assert.strictEqual(C.books, 4);
  assert.strictEqual(C.total, 8);
  assert.strictEqual(C.top[0][0], '中国药典');
  assert.strictEqual(C.top[0][1], 3);
});

test('三条证据链词频：分子 115 · 图谱 21 · 效价 16，合计 152', () => {
  const n = Object.fromEntries(CH.rows.map((r) => [r.key, r.n]));
  assert.strictEqual(n['分子：是什么物种'], 115);
  assert.strictEqual(n['图谱：含什么成分'], 21);
  assert.strictEqual(n['效价：多大活性'], 16);
  assert.strictEqual(CH.total, 152);
  assert.strictEqual(CH.rows.reduce((a, r) => a + r.n, 0), CH.total, '合计与分项必须闭合');
});

test('占比：75.7 / 13.8 / 10.5，三项相加为 100.0%', () => {
  const p = CH.rows.map(pctOf);
  assert.deepStrictEqual(p, ['75.7', '13.8', '10.5']);
  const sum = CH.rows.reduce((a, r) => a + r.share, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9, `占比合计 ${sum}`);
  assert.ok(CH.rows[0].share > 0.7, '分子一条链应占绝对多数（本章的论点）');
});

test('覆盖：三条链落在 24/28 个段落上', () => {
  assert.strictEqual(COV.covered, 24);
  assert.strictEqual(COV.blocks, 28);
  assert.strictEqual((COV.share * 100).toFixed(1), '85.7');
});

test('检出 / 未检出对账：3 + 1 = 4，「未检出」不被两栏重复计', () => {
  assert.strictEqual(V.yes, 3);
  assert.strictEqual(V.no, 1);
  assert.strictEqual(V.total, 4);
  assert.strictEqual(V.yes + V.no, V.total);
  assert.strictEqual((V.noShare * 100).toFixed(1), '25.0');
  assert.ok(V.fail >= 1, '正文必须把扩增失败单列，不能并入「未检出」');
  assert.ok(V.controls >= 3, `对照只提到 ${V.controls} 次`);
});

test('方法词 12/12 全部在正文出现', () => {
  const hit = m.METHODS.filter((w) => MD.includes(w));
  assert.strictEqual(hit.length, m.METHODS.length);
  assert.deepStrictEqual(hit, m.METHODS);
});

test('quiz 结构：6 题 · pre 1 / check 3 / post 2 · 四选项齐 · 解析 ≥30 汉字', () => {
  assert.strictEqual(Q.count, 6);
  assert.deepStrictEqual(Q.stageCount, { pre: 1, check: 3, post: 2 });
  assert.strictEqual(Q.optionBad, 0);
  assert.strictEqual(Q.explainShort, 0);
  assert.deepStrictEqual(Q.dist, [1, 2, 2, 1]);
  assert.strictEqual(Q.problems.length, 0, Q.problems.join('；'));
});

test('quiz 接地：check 题的正确选项能在正文找到 4 字原词', () => {
  const body = shingles(MD);
  const grounded = QUIZ.questions.filter((q) => {
    if (q.stage !== 'check') return false;
    return [...shingles(q.options[q.correct])].some((g) => body.has(g));
  });
  assert.ok(grounded.length >= 2, `只有 ${grounded.length} 道 check 题接地`);
});

test('脚本只读本章正文与随堂题，不碰 standards/', () => {
  assert.ok(!/standards\//.test(SRC), 'main.js 不应引用 standards/');
  assert.ok(!/units\.json|chapter-map/.test(SRC), 'main.js 不应引用单元层数据');
  const reads = SRC.match(/readFileSync\(/g) || [];
  assert.strictEqual(reads.length, 2, 'main.js 只允许两处 readFileSync');
  assert.ok(SRC.includes("'..', 'docs', 'zh.md'") && SRC.includes("'..', 'quiz.json'"));
});

test('代码与随堂题都不含旧脚手架概念词', () => {
  for (const w of BAD) {
    assert.ok(!SRC.includes(w), `main.js 含「${w}」`);
    assert.ok(!JSON.stringify(QUIZ).includes(w), `quiz 含「${w}」`);
  }
  assert.ok(!/本课第\s*\d+\s*章/.test(SRC));
});

test('脚本可运行、exit 0，并输出规模与对账两行', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout);
  assert.match(out, /规模：汉字 3916 · 段 28（正文段 18）· 二级节 6/);
  assert.match(out, /合计 152 次/);
  assert.match(out, /检出 3 · 未检出 1 · 合计 4/);
  assert.match(out, /✓ 规模、证据链合计、检出对账与 quiz 结构/);
  assert.match(out, /不构成任何药材的真伪结论/);
  assert.ok(out.length > 400, `输出过短（${out.length} 字符）`);
});
