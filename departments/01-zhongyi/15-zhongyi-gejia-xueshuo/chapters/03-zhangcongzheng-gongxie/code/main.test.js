'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, readDoc, shanghan, analyze } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const A = analyze();
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

test('正文就在本章目录下，章号与首行章题一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '03-zhangcongzheng-gongxie', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
  assert.strictEqual(CHAPTER, 3);
  assert.ok(readDoc().startsWith(`# 第 ${CHAPTER} 章 · ${TITLE}`), '正文首行与章题不一致');
});

test('《伤寒论》1,760 条：许可 120 · 禁令 80，比值 0.67', () => {
  assert.strictEqual(A.total, 1760);
  assert.strictEqual(shanghan().length, 1760);
  assert.deepStrictEqual(A.rows.map((r) => [r.permitN, r.forbidN]), [[55, 38], [58, 37], [7, 5]]);
  assert.strictEqual(A.permitTotal, 120);
  assert.strictEqual(A.forbidTotal, 80);
  assert.ok(Math.abs(A.totalRatio - 0.67) < 0.005, String(A.totalRatio));
});

test('三个方向的比值都在 0.64 到 0.71 之间', () => {
  assert.deepStrictEqual(A.rows.map((r) => Number(r.ratio.toFixed(2))), [0.69, 0.64, 0.71]);
  for (const r of A.rows) assert.ok(r.ratio > 0.63 && r.ratio < 0.72, `${r.key} = ${r.ratio}`);
});

test('单字命中：下 940 · 汗 696 · 吐 232', () => {
  assert.deepStrictEqual(A.rows.map((r) => r.wordN), [696, 940, 232]);
});

test('可攻诸篇：可下 126/76（60.3%）、可发汗 178/65、发汗后 148/60', () => {
  assert.deepStrictEqual(
    A.pianStats.map((p) => [p.name, p.total, p.contain]),
    [
      ['辨可下病脉证并治', 126, 76],
      ['辨可发汗病脉证并治', 178, 65],
      ['辨发汗后病脉证并治', 148, 60],
    ],
  );
  assert.ok(Math.abs(A.pianStats[0].share - 0.603) < 0.001);
});

test('张从正词表 1,476 条，占 2,792 的 52.9%', () => {
  assert.strictEqual(A.schoolHits.total, 1476);
  assert.ok(Math.abs(A.schoolHits.share - 0.5287) < 0.001, String(A.schoolHits.share));
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
  for (const seg of body.split(/\s+/)) for (let i = 0; i + 4 <= seg.length; i += 1) grams.add(seg.slice(i, i + 4));
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

test('脚本可运行，输出带 120/80 与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.length > 400);
  assert.match(out, /合计\s+120\s+80\s+0\.67/);
  assert.match(out, /不构成诊疗建议/);
});
