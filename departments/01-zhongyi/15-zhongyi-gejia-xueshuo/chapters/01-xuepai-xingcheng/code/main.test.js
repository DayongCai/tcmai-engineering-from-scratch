'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, CRITICAL_8, readDoc, analyze } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const A = analyze();
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

test('正文就在本章目录下，章号与首行章题一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '01-xuepai-xingcheng', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
  assert.strictEqual(CHAPTER, 1);
  assert.ok(readDoc().startsWith(`# 第 ${CHAPTER} 章 · ${TITLE}`), '正文首行与章题不一致');
});

test('语料规模 = 伤寒 1,760 + 金匮 402 + 温病 630 = 2,792 条', () => {
  const c = require('./main.js').corpus();
  assert.strictEqual(c.shanghan.length, 1760);
  assert.strictEqual(c.jingui.length, 402);
  assert.strictEqual(c.wenbing.length, 630);
  assert.strictEqual(A.total, 2792);
  assert.strictEqual(A.totalZheng, 132);
});

test('八派词表命中：从 1,476 到 7，极值差 210.9 倍', () => {
  assert.deepStrictEqual(A.rows.map((r) => r.hits), [637, 1476, 68, 50, 7, 824, 803, 49]);
  assert.strictEqual(A.span.hitMax, 1476);
  assert.strictEqual(A.span.hitMin, 7);
  assert.ok(Math.abs(A.span.hitRatio - 210.86) < 0.05, String(A.span.hitRatio));
});

test('证候占位按族规模相加：从 23 到 43，只差 1.9 倍', () => {
  assert.deepStrictEqual(A.rows.map((r) => r.zheng), [37, 39, 23, 35, 34, 37, 23, 43]);
  assert.strictEqual(A.span.zhengMin, 23);
  assert.strictEqual(A.span.zhengMax, 43);
  assert.ok(Math.abs(A.span.zhengRatio - 1.87) < 0.01, String(A.span.zhengRatio));
});

test('秩相关 ρ = 0.190，未过 n = 8 的临界值 0.738', () => {
  assert.ok(Math.abs(A.rho - 0.190) < 0.001, `ρ = ${A.rho}`);
  assert.ok(Math.abs(A.rho) < CRITICAL_8);
});

test('词龄：基本动词在高位，概念词在 0 与 1 之间', () => {
  const w = Object.fromEntries(A.wordHits);
  assert.deepStrictEqual(
    ['下', '汗', '寒', '热', '火', '瘀', '痰', '中气', '真阴', '命门', '相火', '阴火', '升阳'].map((k) => w[k]),
    [940, 696, 650, 493, 96, 37, 31, 12, 3, 1, 0, 0, 0],
  );
});

test('正文两张表逐格复算无一处不符', () => {
  assert.deepStrictEqual(A.mismatches, []);
});

test('quiz 结构：≥5 题、三段齐、4 选项、解释够长、check 接地、答案分散', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const qs = q.questions;
  assert.ok(qs.length >= 5, `只有 ${qs.length} 题`);
  const stages = new Set(qs.map((x) => x.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), `缺 ${s} 段`);
  assert.strictEqual(new Set(qs.map((x) => x.correct)).size, 4, '正确答案没有打散');

  const body = readDoc().replace(/[^一-龥]/g, ' ');
  const grams = new Set();
  for (const seg of body.split(/\s+/)) {
    for (let i = 0; i + 4 <= seg.length; i += 1) grams.add(seg.slice(i, i + 4));
  }
  let grounded = 0;
  for (const x of qs) {
    assert.strictEqual(x.options.length, 4, `选项数：${x.question}`);
    assert.ok(Number.isInteger(x.correct) && x.correct >= 0 && x.correct < 4);
    assert.ok((x.explain.match(HANZI) || []).length >= 30, `解释过短：${x.question}`);
    if (x.stage === 'check') {
      const right = x.options[x.correct];
      let hit = false;
      for (let i = 0; i + 4 <= right.length; i += 1) if (grams.has(right.slice(i, i + 4))) hit = true;
      if (hit) grounded += 1;
    }
  }
  assert.ok(grounded >= 2, `只有 ${grounded} 道 check 题接地`);
});

test('脚本可运行，输出带 ρ、临界值与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.length > 400);
  assert.match(out, /ρ\(词频, 证候\) = 0\.190/);
  assert.match(out, /临界 0\.738/);
  assert.match(out, /不构成诊疗建议/);
});
