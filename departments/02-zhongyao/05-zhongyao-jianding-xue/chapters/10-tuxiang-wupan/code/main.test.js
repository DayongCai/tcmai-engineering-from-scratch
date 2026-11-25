#!/usr/bin/env node
/**
 * 第 10 章 图像识别错得最有规律的地方，正是药材最相像的地方 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：正文规模、三组清单的条目与词频、条目对账与占比、
 * 置信度/正确率的表述对账，以及「脚本能跑通并 exit 0」。
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
const G = m.groups(MD);
const V = m.verdicts(MD);
const Q = m.quizCheck(QUIZ);

// 脚手架概念词拆成单字拼接：本文件自身不得成为被扫描的命中项
const BAD = [['三', '辨'].join(''), ['四', '位面'].join(''), ['单元', '规模'].join(''), ['本章', '实测'].join('')];

const row = (k) => G.rows.find((r) => r.key === k);

function shingles(text, n = 4) {
  const clean = String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ');
  const out = new Set();
  for (const seg of clean.split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('规模：汉字 3660、段 31（正文段 21）、二级节 6', () => {
  assert.strictEqual(S.hanzi, 3660);
  assert.strictEqual(S.blocks, 31);
  assert.strictEqual(S.body, 21);
  assert.strictEqual(S.sections, 6);
  assert.strictEqual(S.subsections, 0);
});

test('表格行列现算：本章正文无表格，索引不得虚报', () => {
  assert.strictEqual(S.tables, 0);
  assert.strictEqual(S.rows, 0);
  assert.strictEqual(S.cols, 0);
  assert.strictEqual(S.cells, 0);
});

test('引书：2 部 4 次，首位为中国药典', () => {
  assert.strictEqual(C.books, 2);
  assert.strictEqual(C.total, 4);
  assert.strictEqual(C.top[0][0], '中国药典');
  assert.strictEqual(C.top[0][1], 3);
});

test('四步流水线 4/4 命中，词频 6（图像采集 3 · 预处理 1 · 特征提取 1 · 分类识别 1）', () => {
  const r = row('四步流水线');
  assert.strictEqual(r.present, 4);
  assert.strictEqual(r.freq, 6);
  assert.deepStrictEqual(r.items.map((i) => [i.key, i.n]), [
    ['图像采集', 3], ['预处理', 1], ['特征提取', 1], ['分类识别', 1],
  ]);
});

test('三类易错样本 3/3 · 四条边界 4/4，词频各 4', () => {
  assert.deepStrictEqual([row('三类易错样本').present, row('三类易错样本').freq], [3, 4]);
  assert.deepStrictEqual([row('四条边界').present, row('四条边界').freq], [4, 4]);
  assert.deepStrictEqual(row('四条边界').items.map((i) => i.key), ['功能边界', '证据边界', '风险边界', '伦理边界']);
});

test('条目对账：4 + 3 + 4 = 11 项，命中 11（100.0%），词频合计 14', () => {
  assert.strictEqual(G.itemsTotal, 11);
  assert.strictEqual(G.itemsFound, 11);
  assert.strictEqual((G.itemShare * 100).toFixed(1), '100.0');
  assert.strictEqual(G.freq, 14);
  assert.strictEqual(G.freq, G.rows.reduce((a, r) => a + r.freq, 0), '词频合计与分组必须闭合');
});

test('分组占比：42.9 / 28.6 / 28.6，相加为 100.0%', () => {
  assert.deepStrictEqual(G.rows.map((r) => (r.share * 100).toFixed(1)), ['42.9', '28.6', '28.6']);
  const sum = G.rows.reduce((a, r) => a + r.share, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9, `占比合计 ${sum}`);
});

test('置信度 / 正确率对账：两者被分开写，且都写了人工复核', () => {
  assert.deepStrictEqual(V, { conf: 6, acc: 3, review: 3, quick: 1 });
  assert.ok(V.conf > V.acc, '置信度出现次数应多于正确率——本章的论点正是「别把前者当后者」');
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

test('脚本可运行、exit 0，输出不含准确率与阈值口径', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout);
  assert.match(out, /规模：汉字 3660 · 段 31（正文段 21）· 二级节 6/);
  assert.match(out, /条目对账 11\/11（100\.0%）· 词频合计 14/);
  assert.match(out, /置信度 6 · 正确率 3 · 人工复核 3/);
  assert.match(out, /✓ 规模、三组清单条目、置信度对账与 quiz 结构/);
  assert.match(out, /可辅助参考/);
  assert.ok(!/准确率\s*[:：]?\s*\d|误判率\s*[:：]?\s*\d|\d+%[/／]?的?准确/.test(out), '输出不得夹带模型性能数值');
  assert.ok(out.length > 400, `输出过短（${out.length} 字符）`);
});
