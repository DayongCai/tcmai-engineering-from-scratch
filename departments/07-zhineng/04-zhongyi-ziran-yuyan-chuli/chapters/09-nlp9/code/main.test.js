'use strict';

/**
 * 第 9 章 自检：计数从正文代码块解析，P/R/F1 与宏微平均复算后与正文声明逐项对账。
 * 运行：node --test departments/07-zhineng/04-zhongyi-ziran-yuyan-chuli/chapters/09-nlp9/code/main.test.js
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const main = require('./main.js');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const RAW = () => fs.readFileSync(DOC, 'utf8');
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

test('正文汉字数达到补实门槛', () => {
  assert.ok(main.stats().hanzi >= 2500, `只有 ${main.stats().hanzi}`);
});

test('每类 tp/fp/fn 从正文代码块解析出来', () => {
  const rows = main.parseRows(RAW());
  assert.deepStrictEqual(Object.keys(rows), ['症', '方', '穴']);
  assert.deepStrictEqual(rows['症'], { tp: 100, fp: 20, fn: 14 });
  assert.deepStrictEqual(rows['穴'], { tp: 2, fp: 3, fn: 4 });
});

test('P／R／F1 的公式在边界上不崩：分母为零返回 0', () => {
  assert.deepStrictEqual(main.prf(0, 0, 0), { p: 0, r: 0, f: 0 });
  assert.deepStrictEqual(main.prf(1, 0, 0), { p: 1, r: 1, f: 1 });
});

test('复算结果与正文声明的逐类数值一致', () => {
  const s = main.stats();
  for (const [k, v] of Object.entries(s.claims.perClass)) {
    const x = s.avg.per[k];
    assert.deepStrictEqual(
      [main.round3(x.p), main.round3(x.r), main.round3(x.f)],
      [v[0], v[1], v[2]],
      `${k} 与正文不一致`,
    );
  }
});

test('微平均 0.807、宏平均 0.628，差额约 0.18', () => {
  const s = main.stats();
  assert.strictEqual(main.round3(s.avg.micro.f), 0.807);
  assert.strictEqual(main.round3(s.avg.macroF), 0.628);
  assert.strictEqual(s.claims.micro, 0.807);
  assert.strictEqual(s.claims.macro, 0.628);
  assert.ok(s.gap > 0.15 && s.gap < 0.2, `差额 ${s.gap}`);
});

test('宏平均低于微平均：低频类在宏平均里才有话语权', () => {
  const s = main.stats();
  assert.ok(s.avg.macroF < s.avg.micro.f);
  // 穴的支持数最小，微平均里几乎不起作用
  assert.ok(s.avg.support['穴'] < s.avg.support['症']);
  assert.ok(s.avg.per['穴'].f < s.avg.per['症'].f);
});

test('Wilson 区间包含点估计且落在 [0,1]', () => {
  const [lo, hi] = main.wilson(0.5, 20);
  assert.ok(lo >= 0 && hi <= 1 && lo < hi);
  const s = main.stats();
  assert.ok(s.wilson[0] <= s.avg.per['症'].p && s.avg.per['症'].p <= s.wilson[1]);
});

test('三个切分维度按严格程度排列', () => {
  assert.deepStrictEqual(main.splitKinds(RAW()), ['按条切', '按书切', '按文体与年代切']);
});

test('quiz：≥5 题，覆盖 pre／check／post，4 选项，explain ≥30 汉字', () => {
  const qs = JSON.parse(fs.readFileSync(QUIZ, 'utf8')).questions;
  assert.ok(qs.length >= 5);
  const stages = new Set(qs.map((q) => q.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), `缺 ${s} 段`);
  for (const q of qs) {
    assert.strictEqual(q.options.length, 4, `选项不是 4 个：${q.question}`);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4, `correct 越界：${q.question}`);
    assert.ok((String(q.explain).match(HANZI) || []).length >= 30, `explain 过短：${q.question}`);
  }
});

test('quiz：check 题至少 2 道的正确选项含正文原词', () => {
  const qs = JSON.parse(fs.readFileSync(QUIZ, 'utf8')).questions.filter((q) => q.stage === 'check');
  const body = new Set();
  for (const seg of RAW().replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + 4 <= seg.length; i += 1) body.add(seg.slice(i, i + 4));
  }
  let grounded = 0;
  for (const q of qs) {
    const hit = String(q.options[q.correct])
      .replace(/[^\u4e00-\u9fff]/g, ' ')
      .split(/\s+/)
      .some((seg) => {
        for (let i = 0; i + 4 <= seg.length; i += 1) if (body.has(seg.slice(i, i + 4))) return true;
        return false;
      });
    if (hit) grounded += 1;
  }
  assert.ok(grounded >= 2, `只有 ${grounded} 道接地`);
});

test('脚本可运行，打印宏微差额与对账结果', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes('微平均 F1  0.807'));
  assert.ok(out.includes('宏平均 F1  0.628'));
  assert.ok(out.includes('长尾的可见度'));
  assert.match(out, /不是任何系统的实测/);
});
