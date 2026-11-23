'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, readDoc, analyze, nineteen } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const A = analyze();
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

test('正文就在本章目录下，章号与首行章题一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '02-liuwansu-huore', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
  assert.strictEqual(CHAPTER, 2);
  assert.ok(readDoc().startsWith(`# 第 ${CHAPTER} 章 · ${TITLE}`), '正文首行与章题不一致');
});

test('病机十九条：火 5、热 4、寒 1、湿 1、风 1、上下 2、五脏 5', () => {
  assert.strictEqual(A.n.total, 19);
  assert.deepStrictEqual(A.n.count, { 五脏: 5, 火: 5, 上下: 2, 湿: 1, 热: 4, 风: 1, 寒: 1 });
  assert.strictEqual(A.n.count.火 + A.n.count.热, 9);
});

test('三部底本 2,792 条：寒 650、热 493、火 96，寒是火的 6.77 倍', () => {
  assert.strictEqual(A.total, 2792);
  assert.deepStrictEqual(A.word, { 寒: 650, 热: 493, 火: 96 });
  assert.ok(Math.abs(A.ratios.coldOverFire - 6.77) < 0.005, String(A.ratios.coldOverFire));
});

test('刘完素词表命中 637 条：伤寒 219 · 金匮 122 · 温病 296', () => {
  assert.deepStrictEqual(A.schoolHits, { total: 637, shanghan: 219, jingui: 122, wenbing: 296 });
});

test('《伤寒论》可发汗 55 · 不可发汗 38，禁令/许可 = 0.69', () => {
  assert.strictEqual(A.permit, 55);
  assert.strictEqual(A.forbid, 38);
  assert.ok(Math.abs(A.ratios.forbidShare - 0.69) < 0.005, String(A.ratios.forbidShare));
});

test('每条病机都归到了一个已知类别，没有「?」', () => {
  const bad = A.n.parsed.filter((x) => x.category === '?');
  assert.deepStrictEqual(bad.map((x) => x.clause), []);
  assert.strictEqual(nineteen(readDoc()).parsed.length, 19);
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

test('脚本可运行，输出带十九条、6.77 倍与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.length > 400);
  assert.match(out, /病机十九条：19 条/);
  assert.match(out, /6\.77 倍/);
  assert.match(out, /不构成诊疗建议/);
});
