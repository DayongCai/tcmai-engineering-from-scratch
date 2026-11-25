#!/usr/bin/env node
/**
 * 第 9 章 报告的效力，藏在取样件数与留样倍数的算术里 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：正文规模、常规检查四维的词频与占比、报告字段计数、
 * 取样档位与程序步数、结论用语对账，以及「脚本能跑通并 exit 0」。
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
const D = m.dims(MD);
const F = m.fields(MD);
const V = m.verdicts(MD);
const Q = m.quizCheck(QUIZ);

// 脚手架概念词拆成单字拼接：本文件自身不得成为被扫描的命中项
const BAD = [['三', '辨'].join(''), ['四', '位面'].join(''), ['单元', '规模'].join(''), ['本章', '实测'].join('')];

function shingles(text, n = 4) {
  const clean = String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ');
  const out = new Set();
  for (const seg of clean.split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('规模：汉字 3790、段 33（正文段 23）、二级节 6', () => {
  assert.strictEqual(S.hanzi, 3790);
  assert.strictEqual(S.blocks, 33);
  assert.strictEqual(S.body, 23);
  assert.strictEqual(S.sections, 6);
  assert.strictEqual(S.subsections, 0);
});

test('表格行列现算：本章正文无表格，索引不得虚报', () => {
  assert.strictEqual(S.tables, 0);
  assert.strictEqual(S.rows, 0);
  assert.strictEqual(S.cols, 0);
  assert.strictEqual(S.cells, 0);
});

test('引书：2 部 3 次', () => {
  assert.strictEqual(C.books, 2);
  assert.strictEqual(C.total, 3);
  assert.strictEqual(C.top[0][0], '中国药典');
});

test('常规检查四维：8 / 12 / 7 / 6，合计 33，四维齐', () => {
  const n = Object.fromEntries(D.rows.map((r) => [r.key, r.n]));
  assert.deepStrictEqual(n, { 水分: 8, 灰分: 12, 浸出物: 7, 含量测定: 6 });
  assert.strictEqual(D.total, 33);
  assert.strictEqual(D.total, D.rows.reduce((a, r) => a + r.n, 0), '合计与分项必须闭合');
  assert.strictEqual(D.present, 4);
});

test('四维占比：24.2 / 36.4 / 21.2 / 18.2，合计 100.0%', () => {
  assert.deepStrictEqual(D.rows.map((r) => (r.share * 100).toFixed(1)), ['24.2', '36.4', '21.2', '18.2']);
  const sum = D.rows.reduce((a, r) => a + r.share, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9, `占比合计 ${sum}`);
  assert.ok(D.rows[1].share > D.rows[0].share, '灰分（纯净度）应是本章词频最高的维度');
});

test('报告字段 11/11 命中，缺 0，字段词合计 33 次', () => {
  assert.strictEqual(F.total, 11);
  assert.strictEqual(F.found, 11);
  assert.deepStrictEqual(F.miss, []);
  assert.strictEqual(F.mentions, 33);
});

test('取样档位 4/4、程序六步 6/6', () => {
  assert.deepStrictEqual(m.covers(MD, m.TIERS), { total: 4, found: 4, miss: [] });
  assert.deepStrictEqual(m.covers(MD, m.STEPS), { total: 6, found: 6, miss: [] });
});

test('结论用语对账：7 + 1 = 8，「不符合规定」不被两栏重复计', () => {
  assert.strictEqual(V.yes, 7);
  assert.strictEqual(V.no, 1);
  assert.strictEqual(V.total, 8);
  assert.strictEqual(V.yes + V.no, V.total);
  assert.strictEqual((V.noShare * 100).toFixed(1), '12.5');
  assert.strictEqual(V.retain, 7, '留样三分法的表述处数');
});

test('quiz 结构：6 题 · pre 1 / check 3 / post 2 · 四选项齐 · 解析 ≥30 汉字', () => {
  assert.strictEqual(Q.count, 6);
  assert.deepStrictEqual(Q.stageCount, { pre: 1, check: 3, post: 2 });
  assert.strictEqual(Q.optionBad, 0);
  assert.strictEqual(Q.explainShort, 0);
  assert.deepStrictEqual(Q.dist, [2, 2, 1, 1]);
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

test('脚本只读本章正文与随堂题，不碰上游数据层', () => {
  assert.ok(!/standards\//.test(SRC), 'main.js 不应引用数据层目录');
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

test('脚本可运行、exit 0，输出不含具体限度与用量口径', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout);
  assert.match(out, /规模：汉字 3790 · 段 33（正文段 23）· 二级节 6/);
  assert.match(out, /合计 33 次 · 四维齐 4\/4/);
  assert.match(out, /报告字段：11\/11 命中/);
  assert.match(out, /符合规定 7 · 不符合规定 1 · 合计 8/);
  assert.match(out, /✓ 规模、四维合计、报告字段、结论用语与 quiz 结构/);
  assert.ok(!/不得过|不得少于|含量不得|g\b|\bmg\b/.test(out.replace(/汉字|字\/单元/g, '')), '输出不得夹带具体限度或剂量');
  assert.ok(out.length > 400, `输出过短（${out.length} 字符）`);
});
