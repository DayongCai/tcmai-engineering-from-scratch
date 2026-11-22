'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  DOC, CHAPTER, TITLE, read, analyze,
  threeGates, financingModes, comparisonPits, transplantGates, indicators,
} = require('./main.js');

const BODY = read();
const A = analyze(BODY);

function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('正文文件就在本章目录下', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '08-w8', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
});

test('章号与标题取自本章正文', () => {
  assert.strictEqual(CHAPTER, 8);
  assert.strictEqual(TITLE, '并重写在方针里，落在编制与支付上');
  assert.match(BODY.split('\n')[0], /^# 第 8 章 · /);
  assert.ok(BODY.split('\n')[0].includes(TITLE));
});

test('正文统计可复算：汉字、节、表、引文', () => {
  assert.ok(A.hanzi > 2500 && A.hanzi < 5000, String(A.hanzi));
  assert.strictEqual(A.sections.length, 6);
  assert.strictEqual(A.tableCount, 2);
  assert.strictEqual(A.cites.length, 1);
  const sum = A.sections.reduce((s, x) => s + x.hanzi, 0);
  assert.ok(sum > 0 && sum <= A.hanzi, `${sum} vs ${A.hanzi}`);
});

test('三道窄门：编制、价格、支付', () => {
  assert.deepStrictEqual(threeGates(BODY), ['编制给不给', '价格调不调', '支付认不认']);
});

test('三种筹资模式与四个比较指标都能从表里数出', () => {
  assert.deepStrictEqual(financingModes(A.tables), ['税收筹资', '社会保险', '商业保险为主']);
  assert.deepStrictEqual(indicators(A.tables), ['预期寿命', '婴儿死亡率', '卫生费用占经济总量比', '可避免死亡']);
});

test('比较四坑与移植四坎，正文点名能力最易低估', () => {
  const pits = comparisonPits(BODY);
  assert.strictEqual(pits.length, 4);
  assert.deepStrictEqual(pits.map((p) => p.n), ['一', '二', '三', '四']);
  const tg = transplantGates(BODY);
  assert.deepStrictEqual(tg.gates, ['语境', '激励相容', '能力', '路径依赖']);
  assert.strictEqual(tg.weakest, '能力');
});

test('quiz 的 check 题正确选项落在本章正文里（≥2 道）', () => {
  const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));
  const body = shingles(BODY);
  const checks = quiz.questions.filter((q) => q.stage === 'check');
  const grounded = checks.filter((q) => {
    const right = String(q.options[q.correct] || '');
    return [...shingles(right)].some((g) => body.has(g));
  });
  assert.ok(checks.length >= 2);
  assert.ok(grounded.length >= 2, `只有 ${grounded.length} 道接地`);
});

test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /均从本章 docs\/zh\.md 现算/);
  assert.match(r.stdout, /不构成对任何国家制度优劣的最终判断/);
  assert.match(r.stdout, /要过 3 道窄门/);
});
