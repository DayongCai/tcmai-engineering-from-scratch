'use strict';

/**
 * 第 6 章自检：角色膨胀、日志量与恢复窗口都从正文现算。
 * 运行：node --test chapters/06-e6/code/main.test.js
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

test('授权参数取自正文：40 岗位、12 域、380 角色、41% 闲置', () => {
  const p = main.params(RAW());
  assert.strictEqual(p.posts, 40);
  assert.strictEqual(p.domains, 12);
  assert.strictEqual(p.roles, 380);
  assert.strictEqual(p.unusedPct, 41);
  assert.strictEqual(p.sample, 100);
});

test('理论组合与角色摊派复算：480 个组合、每岗位 9.5 个角色', () => {
  const m = main.model(RAW());
  assert.strictEqual(m.combos, 480);
  assert.ok(Math.abs(m.perPost - 9.5) < 1e-9);
  assert.strictEqual(m.idle, 41);
  assert.ok(m.roles > m.combos * 0.7, '角色数应接近组合上限，才谈得上蔓延');
});

test('日志量：720 万条、2.88 GB，与正文一致', () => {
  const m = main.model(RAW());
  assert.strictEqual(m.records, 7200000);
  assert.ok(Math.abs(m.gb - 2.88) < 1e-9);
  assert.ok(m.recordsMatch && m.gbMatch, '日志量复算与正文不符');
});

test('备份恢复窗口：5,243 秒 ≈ 87 分钟，与正文一致', () => {
  const r = main.recovery(RAW());
  assert.strictEqual(r.tb, 1);
  assert.strictEqual(r.speed, 200);
  assert.strictEqual(Math.round(r.seconds), 5243);
  assert.ok(Math.abs(r.minutes - 87.4) < 0.2, `分钟数 ${r.minutes}`);
  assert.strictEqual(r.statedMinutes, 87);
  assert.ok(r.minutes > 60, '纯拷贝就超过一小时，2 小时 RTO 无法靠还原达成');
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
  assert.ok(out.includes('480 个理论授权组合'), '输出未打印组合数');
  assert.ok(out.includes('7,200,000'), '输出未打印日志条数');
  assert.ok(out.includes('5,243 秒'), '输出未打印恢复秒数');
  assert.ok(out.includes('现算'), '输出未声明数字来源');
  assert.ok(out.includes('演算设定'), '输出未提示数值为演算设定');
});
