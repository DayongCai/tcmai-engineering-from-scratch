'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, readDoc, analyze } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const A = analyze();
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

test('正文就在本章目录下，章号与首行章题一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '06-zhangjingyue-wenbu', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
  assert.strictEqual(CHAPTER, 6);
  assert.ok(readDoc().startsWith(`# 第 ${CHAPTER} 章 · ${TITLE}`), '正文首行与章题不一致');
});

test('词表 7 条，逐词：命门 1 · 元阳 0 · 真阴 3 · 温补 2 · 水火 1', () => {
  assert.deepStrictEqual([...A.perWord], [['命门', 1], ['元阳', 0], ['真阴', 3], ['温补', 2], ['水火', 1]]);
  assert.strictEqual(A.total, 7);
  assert.ok(Math.abs(A.textShare - 0.002507) < 0.00001, String(A.textShare));
});

test('7 条全部落在温病；伤寒与金匮各 0 条', () => {
  assert.deepStrictEqual(A.byCorpus, { shanghan: 0, jingui: 0, wenbing: 7 });
});

test('证候 34 证 = 阳虚 7 + 阴虚 13 + 气虚 14，占 132 的 25.8%', () => {
  assert.deepStrictEqual(A.families, ['阳虚', '阴虚', '气虚']);
  assert.deepStrictEqual([...A.familySize], [['阳虚', 7], ['阴虚', 13], ['气虚', 14]]);
  assert.strictEqual(A.zhengN, 34);
  assert.ok(Math.abs(A.zhengShare - 0.2576) < 0.001);
});

test('方源：《景岳全书》22 方 / 370 条（带出处 364），占 5.9%', () => {
  assert.strictEqual(A.fangTotal, 370);
  assert.strictEqual(A.fangWithSrc, 364);
  assert.strictEqual(A.jingyueFang, 22);
  assert.ok(Math.abs(A.fangShare - 0.0595) < 0.001);
});

test('正文方法论总表逐格复算无一处不符', () => {
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

test('脚本可运行，输出带 7/34/22 与 0.25%，并含边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.length > 250);
  assert.match(out, /占 2792 条的 0\.25%/);
  assert.match(out, /= 34 证/);
  assert.match(out, /22 方/);
  assert.match(out, /不构成诊疗建议/);
});
