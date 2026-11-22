'use strict';

/**
 * 第 7 章自检：抽查的点估计、置信区间与主索引碰撞都从正文现算。
 * 运行：node --test chapters/07-e7/code/main.test.js
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
const hanzi = (s) => (String(s).match(HANZI) || []).length;

test('正文存在，汉字数达到补实门槛', () => {
  const s = main.stats(RAW());
  assert.ok(s.hanzi >= 2000, `本章汉字只有 ${s.hanzi}`);
  assert.strictEqual(s.hanzi, hanzi(RAW()));
});

test('抽检参数取自正文：8 万人次、12 万次调阅、3% 无代码', () => {
  const p = main.params(RAW());
  assert.strictEqual(p.discharges, 80000);
  assert.strictEqual(p.requests, 120000);
  assert.strictEqual(p.noCodePct, 3);
  assert.strictEqual(p.sample, 200);
  assert.strictEqual(p.defects, 7);
});

test('无代码调阅数与正文写的 3,600 次一致', () => {
  const m = main.model(RAW());
  assert.strictEqual(m.noCode, 3600);
  assert.strictEqual(m.noCodeStated, 3600);
});

test('点估计 3.5% 与二项区间 0.95%–6.05% 可复算', () => {
  const m = main.model(RAW());
  assert.ok(Math.abs(m.pointPct - 3.5) < 1e-9);
  assert.ok(m.pointMatches, '点估计与正文不符');
  assert.ok(Math.abs(m.ci[0] - 0.95) < 0.06, `下界 ${m.ci[0]}`);
  assert.ok(Math.abs(m.ci[1] - 6.05) < 0.06, `上界 ${m.ci[1]}`);
  assert.deepStrictEqual(m.ciStated, [0.95, 6.05]);
});

test('区间折算全年落在正文写的 760 到 4,838 份附近', () => {
  const m = main.model(RAW());
  assert.ok(Math.abs(m.annual[0] - 760) <= 5, `下界 ${m.annual[0]}`);
  assert.ok(Math.abs(m.annual[1] - 4838) <= 5, `上界 ${m.annual[1]}`);
  assert.deepStrictEqual(m.annualStated, [760, 4838]);
});

test('区间收窄一半需约四倍样本', () => {
  const m = main.model(RAW());
  assert.strictEqual(m.sample * 4, 800);
  const wide = m.ci[1] - m.ci[0];
  assert.ok(wide > 5 && wide < 5.2, `区间宽度 ${wide}`);
});

test('主索引键空间与碰撞对数复算：360,000 与 3,472 对', () => {
  const e = main.empi(RAW());
  assert.strictEqual(e.n, 50000);
  assert.deepStrictEqual(e.keys, [3000, 60, 2]);
  const m = main.model(RAW());
  assert.strictEqual(m.empi.keySpace, 360000);
  assert.strictEqual(Math.round(m.empi.combos), 1249975000);
  assert.ok(Math.abs(m.empi.perCell - 3472) < 2, `每格 ${m.empi.perCell}`);
  assert.strictEqual(m.empi.statedPairs, 3472);
});

test('正文的边界声明齐备', () => {
  const s = main.stats(RAW());
  assert.ok(s.drills >= 1, '正文没有「演算设定」标注');
  assert.ok(s.disclaimer, '正文缺免责声明');
  assert.ok(s.tables >= 3, `本章只有 ${s.tables} 张表`);
});

test('quiz：≥5 题，覆盖 pre／check／post，每题 4 选项且 correct 合法', () => {
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const qs = quiz.questions;
  assert.ok(Array.isArray(qs) && qs.length >= 5, `只有 ${qs.length} 题`);
  const stages = new Set(qs.map((q) => q.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), `缺 ${s} 段`);
  for (const q of qs) {
    assert.strictEqual(q.options.length, 4, `选项不是 4 个：${q.question}`);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4, `correct 非法：${q.question}`);
    assert.ok(hanzi(q.explain) >= 30, `explain 只有 ${hanzi(q.explain)} 汉字：${q.question}`);
  }
  const used = new Set(qs.map((q) => q.correct));
  assert.ok(used.size >= 3, `答案只落在 ${used.size} 个位置，未打散`);
});

test('quiz：check 题里至少 2 道，正确选项含正文原词（≥4 汉字）', () => {
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const body = new Set();
  for (const seg of RAW().replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + 4 <= seg.length; i += 1) body.add(seg.slice(i, i + 4));
  }
  let grounded = 0;
  for (const q of quiz.questions.filter((x) => x.stage === 'check')) {
    const right = String(q.options[q.correct]).replace(/[^\u4e00-\u9fff]/g, ' ');
    const hit = right.split(/\s+/).some((seg) => {
      for (let i = 0; i + 4 <= seg.length; i += 1) if (body.has(seg.slice(i, i + 4))) return true;
      return false;
    });
    if (hit) grounded += 1;
  }
  assert.ok(grounded >= 2, `只有 ${grounded} 道 check 题的正确选项能在正文找到原词`);
});

test('quiz 不含脚手架名目', () => {
  const raw = fs.readFileSync(QUIZ, 'utf8');
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测']) assert.ok(!raw.includes(bad), `quiz 仍含「${bad}」`);
});

test('脚本可运行，输出与现算数字一致', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes('3,600'), '输出未打印无代码调阅数');
  assert.ok(out.includes('3,472'), '输出未打印碰撞对数');
  assert.ok(out.includes('现算'), '输出未声明数字来源');
  assert.ok(out.includes('演算设定'), '输出未提示数值为演算设定');
});
