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
  assert.ok(DOC.endsWith(path.join('chapters', '05-zhuzhenheng-ziyin', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
  assert.strictEqual(CHAPTER, 5);
  assert.ok(readDoc().startsWith(`# 第 ${CHAPTER} 章 · ${TITLE}`), '正文首行与章题不一致');
});

test('相火 0 条、阴虚 4 条，两个核心词合计 4 条（占 0.14%）', () => {
  assert.strictEqual(A.wordHits.get('相火'), 0);
  assert.strictEqual(A.wordHits.get('阴虚'), 4);
  assert.strictEqual(A.wordHits.get('君火'), 0);
  assert.strictEqual(A.core, 4);
  assert.ok(Math.abs(A.coreShare - 0.001433) < 0.00001, String(A.coreShare));
});

test('四种虚：血虚 16 · 气虚 15 · 阳虚 7 · 阴虚 4，阴虚垫底', () => {
  assert.deepStrictEqual(A.fourVoid.map((x) => [x.w, x.n]), [['血虚', 16], ['气虚', 15], ['阳虚', 7], ['阴虚', 4]]);
  assert.strictEqual(A.least.w, '阴虚');
});

test('证候 35 证 = 阴虚 13 + 湿热 13 + 痰湿 9，占 132 的 26.5%', () => {
  assert.deepStrictEqual(A.families, ['阴虚', '湿热', '痰湿']);
  assert.deepStrictEqual([...A.familySize], [['阴虚', 13], ['湿热', 13], ['痰湿', 9]]);
  assert.strictEqual(A.zhengN, 35);
  assert.ok(Math.abs(A.zhengShare - 0.2652) < 0.001);
});

test('两个比例相除约 189 倍（按正文两位百分数取整口径）', () => {
  assert.strictEqual(Math.round(A.ratioCore), 189);
});

test('正文命中表逐格复算无一处不符', () => {
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

test('脚本可运行，输出带 0/4/35 与 189 倍，并含边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.length > 250);
  assert.match(out, /相火\s+0 条/);
  assert.match(out, /= 35 证/);
  assert.match(out, /≈ 189 倍/);
  assert.match(out, /不构成诊疗建议/);
});
