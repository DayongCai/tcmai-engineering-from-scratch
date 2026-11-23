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
  assert.ok(DOC.endsWith(path.join('chapters', '08-duibi-jiegouhua', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
  assert.strictEqual(CHAPTER, 8);
  assert.ok(readDoc().startsWith(`# 第 ${CHAPTER} 章 · ${TITLE}`), '正文首行与章题不一致');
});

test('三列量逐派复算：词表命中 / 证候覆盖 / 方源占位', () => {
  assert.deepStrictEqual(A.rows.map((r) => r.hits), [637, 1476, 68, 50, 7, 824, 803, 49]);
  assert.deepStrictEqual(A.rows.map((r) => r.zheng), [37, 39, 23, 35, 34, 37, 23, 43]);
  assert.deepStrictEqual(A.rows.map((r) => r.fang), [3, 0, 19, 0, 22, 2, 21, 0]);
  assert.strictEqual(A.total, 2792);
  assert.strictEqual(A.totalZheng, 132);
  assert.strictEqual(A.totalFamilies, 14);
});

test('三个排序三个答案：词频张从正、证候张锡纯、方源张景岳', () => {
  const top = (k) => [...A.rows].sort((x, y) => y[k] - x[k])[0].label;
  assert.strictEqual(top('hits'), '张从正');
  assert.strictEqual(top('zheng'), '张锡纯');
  assert.strictEqual(top('fang'), '张景岳');
});

test('三个秩相关：0.190 / −0.357 / −0.714，全部未过 n = 8 的临界 0.738', () => {
  assert.ok(Math.abs(A.rho.hitZheng - 0.190) < 0.001, String(A.rho.hitZheng));
  assert.ok(Math.abs(A.rho.hitFang + 0.357) < 0.001, String(A.rho.hitFang));
  assert.ok(Math.abs(A.rho.zhengFang + 0.714) < 0.001, String(A.rho.zhengFang));
  for (const v of Object.values(A.rho)) assert.ok(Math.abs(v) < CRITICAL_8, String(v));
});

test('方源 370 条方条，364 条带出处', () => {
  assert.strictEqual(A.fangTotal, 370);
  assert.strictEqual(A.fangWithSrc, 364);
});

test('正文矩阵表与 ρ 表逐格复算无一处不符', () => {
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

test('脚本可运行，输出带三个 ρ 与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.length > 400);
  assert.match(out, /ρ\(词频, 证候\) = 0\.190/);
  assert.match(out, /ρ\(证候, 方源\) = -0\.714/);
  assert.match(out, /临界 0\.738/);
  assert.match(out, /不构成诊疗建议/);
});
