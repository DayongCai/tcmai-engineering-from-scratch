'use strict';

/**
 * 第 1 章 代码自检：正文现算的每个数都要独立复算一遍，quiz 必须与正文同源。
 * 运行：node --test chapters/01-s1/code/main.test.js
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

test('正文存在，汉字数达到补实门槛（≥2,500）', () => {
  assert.ok(main.stats(RAW()).hanzi >= 2500, `本章汉字只有 ${main.stats(RAW()).hanzi}`);
});

test('汉字数与独立重算一致', () => {
  assert.strictEqual(main.stats(RAW()).hanzi, (RAW().match(HANZI) || []).length);
});

test('节数与表数可独立复算，且结构齐备', () => {
  const text = RAW();
  const s = main.stats(text);
  const heads = text.split(/\r?\n/).filter((l) => /^##\s+/.test(l));
  assert.strictEqual(s.sections, heads.length);
  assert.ok(heads.length >= 5, `只有 ${heads.length} 节`);
  assert.ok(heads.some((h) => h.includes('代价与边界')), '缺「代价与边界」节');
  const tbl = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => /^\|[\s:|-]*---[\s:|-]*\|$/.test(l));
  assert.strictEqual(s.tables, tbl.length);
  assert.ok(s.tables >= 2, `只有 ${s.tables} 张表`);
});

test('F1 由正文的 P／R 独立复算，且与正文写法一致', () => {
  const text = RAW();
  const pr = [...text.matchAll(/精确率\s*([\d.]+)、召回\s*([\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
  assert.strictEqual(pr.length, 3, '正文应给出三层 P／R');
  const c = main.compute(text);
  pr.forEach(([p, r], i) => {
    const independent = (2 * p * r) / (p + r);
    assert.ok(Math.abs(c.layers[i].f1 - independent) < 1e-12, `第 ${i + 1} 层 F1 复算不一致`);
  });
  assert.ok(Math.abs(c.layers[1].f1 - 0.905) < 2e-3, '药名层 F1 应约为 0.905');
  assert.ok(Math.abs(c.layers[2].f1 - 0.795) < 2e-3, '证候层 F1 应约为 0.795');
  assert.ok(text.includes('0.905') && text.includes('0.795'), '正文未写出两层 F1');
});

test('剂量换算与偏差由正文常数独立复算', () => {
  const text = RAW();
  const unit = Number(text.match(/1 钱 ≈ ([\d.]+) g/)[1]);
  assert.ok(Math.abs(unit - 3.73) < 1e-9, '正文换算常数应为 3.73');
  const grams = 3 * unit;
  assert.strictEqual(grams.toFixed(1), '11.2');
  assert.ok(Math.abs((grams - 9) / 9 * 100 - 24.3) < 0.5, '偏差应约 24%');
  assert.ok(text.includes('单味偏差 24%'), '正文未写偏差 24%');
  assert.doesNotThrow(() => main.verify(text));
});

test('截断纵轴的柱高比由正文两率与起点独立复算', () => {
  const text = RAW();
  const m = text.match(/治愈率从\s*(\d+)%\s*升到\s*(\d+)%，若 y 轴从\s*(\d+)\s*起/);
  assert.ok(m, '正文缺截断算例');
  const ratio = (Number(m[2]) - Number(m[3])) / (Number(m[1]) - Number(m[3]));
  assert.strictEqual(ratio, 2);
  assert.ok(text.includes('2:1'));
});

test('正文边界声明齐备：演算设定与免责声明', () => {
  const s = main.stats(RAW());
  assert.ok(s.drills >= 1, '正文没有「演算设定」标注');
  assert.ok(s.disclaimer, '正文缺免责声明');
});

test('quiz：≥5 题，覆盖 pre／check／post，4 选项，explain ≥30 汉字', () => {
  const qs = JSON.parse(fs.readFileSync(QUIZ, 'utf8')).questions;
  assert.ok(qs.length >= 5, `只有 ${qs.length} 题`);
  const stages = new Set(qs.map((q) => q.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), `缺 ${s} 段`);
  for (const q of qs) {
    assert.strictEqual(q.options.length, 4, `选项不是 4 个：${q.question}`);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4, `correct 非法：${q.question}`);
    assert.ok((String(q.explain).match(HANZI) || []).length >= 30, `explain 过短：${q.question}`);
  }
});

test('quiz：答案打散，正确选项不集中在同一位置', () => {
  const qs = JSON.parse(fs.readFileSync(QUIZ, 'utf8')).questions;
  const used = new Set(qs.map((q) => q.correct));
  assert.ok(used.size >= 3, `正确项只落在 ${used.size} 个位置`);
  assert.ok(!qs.every((q, i) => i === 0 || q.correct !== qs[i - 1].correct), '相邻两题答案不应完全相同');
});

test('quiz：至少 2 道 check 题的正确选项含正文原词（≥4 汉字）', () => {
  const qs = JSON.parse(fs.readFileSync(QUIZ, 'utf8')).questions;
  const body = new Set();
  for (const seg of RAW().replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + 4 <= seg.length; i += 1) body.add(seg.slice(i, i + 4));
  }
  const hit = (s) =>
    String(s)
      .replace(/[^\u4e00-\u9fff]/g, ' ')
      .split(/\s+/)
      .some((seg) => {
        for (let i = 0; i + 4 <= seg.length; i += 1) if (body.has(seg.slice(i, i + 4))) return true;
        return false;
      });
  const grounded = qs.filter((q) => q.stage === 'check' && hit(q.options[q.correct])).length;
  assert.ok(grounded >= 2, `只有 ${grounded} 道 check 题接地`);
});

test('quiz 与 code 都不含脚手架指纹', () => {
  const bad = [/三辨/, /四位面/, /单元规模/, /本章实测/, /本课第\s*\d+\s*章/, /见\s*code\/main\.js\s*输出/];
  for (const p of bad) {
    assert.ok(!p.test(fs.readFileSync(QUIZ, 'utf8')), `quiz 含脚手架指纹 ${p}`);
    assert.ok(!p.test(fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8')), `code 含脚手架指纹 ${p}`);
  }
});

test('脚本可运行，输出含现算数字与边界声明', () => {
  const c = main.verify(RAW());
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(c.layers[1].f1.toFixed(3)), '输出未打印药名层 F1');
  assert.ok(out.includes('现算'), '输出未声明数字来源');
  assert.ok(out.includes('演算设定'), '输出未提示数值为演算设定');
});
