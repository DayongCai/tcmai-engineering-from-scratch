'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, readDoc, books, analyze, ORDER, WORDS } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const A = analyze();
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

test('正文就在本章目录下，章号与首行章题一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '07-yetianshi-wenbing', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
  assert.strictEqual(CHAPTER, 7);
  assert.ok(readDoc().startsWith(`# 第 ${CHAPTER} 章 · ${TITLE}`), '正文首行与章题不一致');
});

test('温病三书 630 条：温疫论 303 · 温病条辨 290 · 温热论 37', () => {
  assert.deepStrictEqual(A.counts.map((c) => [c.book, c.n]), [['温疫论', 303], ['温病条辨', 290], ['温热论', 37]]);
  assert.strictEqual(A.total, 630);
  assert.strictEqual(books().length, 3);
});

test('坐标词逐书分布（顺序：温疫论 · 温病条辨 · 温热论）', () => {
  const m = Object.fromEntries(A.matrix.map((r) => [r.word, r.per]));
  assert.deepStrictEqual(m['膜原'], [24, 0, 2]);
  assert.deepStrictEqual(m['三焦'], [4, 10, 2]);
  assert.deepStrictEqual(m['卫'], [12, 0, 5]);
  assert.deepStrictEqual(m['营'], [13, 5, 7]);
  assert.deepStrictEqual(m['血'], [54, 26, 16]);
  assert.deepStrictEqual(m['逆传'], [0, 0, 1]);
  assert.deepStrictEqual(m['舌'], [30, 64, 18]);
});

test('「卫」在《温病条辨》0 命中、「三焦」在《温疫论》只有 4 条 —— 没有共同语言', () => {
  const m = Object.fromEntries(A.matrix.map((r) => [r.word, r.per]));
  assert.strictEqual(m['卫'][1], 0);
  assert.strictEqual(m['三焦'][0], 4);
  assert.strictEqual(m['逆传'].reduce((a, b) => a + b, 0), 1);
});

test('舌全库 112 条（17.8%），逐书 30/64/18', () => {
  assert.strictEqual(A.tongue.total, 112);
  assert.deepStrictEqual(A.tongue.per, [30, 64, 18]);
  assert.ok(Math.abs(A.tongueShare - 0.1778) < 0.001);
  const by = Object.fromEntries(A.tongueByBook.map((t) => [t.book, Number((t.share * 100).toFixed(1))]));
  assert.deepStrictEqual(by, { 温疫论: 9.9, 温病条辨: 22.1, 温热论: 48.6 });
});

test('正文坐标表逐格复算无一处不符', () => {
  assert.deepStrictEqual(A.mismatches, []);
  assert.deepStrictEqual(ORDER, ['温疫论', '温病条辨', '温热论']);
  assert.strictEqual(WORDS.length, 7);
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

test('脚本可运行，输出带 630/三书条数与 17.8%，并含边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.length > 400);
  assert.match(out, /= 630 条/);
  assert.match(out, /112 条（17\.8%）/);
  assert.match(out, /不构成诊疗建议/);
});
