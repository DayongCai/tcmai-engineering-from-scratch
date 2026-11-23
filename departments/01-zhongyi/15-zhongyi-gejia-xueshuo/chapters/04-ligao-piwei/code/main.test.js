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
  assert.ok(DOC.endsWith(path.join('chapters', '04-ligao-piwei', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
  assert.strictEqual(CHAPTER, 4);
  assert.ok(readDoc().startsWith(`# 第 ${CHAPTER} 章 · ${TITLE}`), '正文首行与章题不一致');
});

test('底本旧题存量：胃气 60 条 · 虚 235 条', () => {
  assert.strictEqual(A.corpusSize, 2792);
  assert.strictEqual(A.legacy.get('胃气'), 60);
  assert.strictEqual(A.legacy.get('虚'), 235);
});

test('李杲词表逐词：脾胃 6 · 中气 12 · 升阳 0 · 饮食 50 · 劳倦 5 · 阴火 0', () => {
  assert.deepStrictEqual([...A.perWord], [['脾胃', 6], ['中气', 12], ['升阳', 0], ['饮食', 50], ['劳倦', 5], ['阴火', 0]]);
  assert.strictEqual(A.perWord.get('升阳'), 0);
  assert.strictEqual(A.perWord.get('阴火'), 0);
});

test('词表合计 68 条（占 2.4%），小于逐词相加 73 —— 有重叠，不能当和', () => {
  const sum = [...A.perWord.values()].reduce((a, b) => a + b, 0);
  assert.strictEqual(sum, 73);
  assert.strictEqual(A.total, 68);
  assert.ok(Math.abs(A.total / A.corpusSize - 0.0243) < 0.001);
});

test('证候 23 证 = 气虚 14 + 痰湿 9，占 132 的 17.4%', () => {
  assert.deepStrictEqual(A.families, ['气虚', '痰湿']);
  assert.strictEqual(A.zhengN, 23);
  assert.ok(Math.abs(A.zhengShare - 0.174) < 0.001);
});

test('这 23 证里的方，出自《脾胃论》的 12 方', () => {
  assert.strictEqual(A.fangFromPiwei, 12);
});

test('正文对照表逐格复算无一处不符', () => {
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

test('脚本可运行，输出带 60/68/23/12 与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.length > 200);
  assert.match(out, /胃气 60 条/);
  assert.match(out, /合计命中 68 条/);
  assert.match(out, /= 23 证/);
  assert.match(out, /有 12 方/);
  assert.match(out, /不构成诊疗建议/);
});
