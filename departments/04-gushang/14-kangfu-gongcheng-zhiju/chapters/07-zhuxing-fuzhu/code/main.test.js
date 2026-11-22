'use strict';

/**
 * 第 7 章 代码自检：助行谱系、轮椅参数、居家检查六处、转移三条件与习题结构，全部现算对账。
 * 运行：node --test chapters/07-zhuxing-fuzhu/code/main.test.js
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

test('正文汉字数达到补实门槛（≥2,500），且与独立重算一致', () => {
  const s = main.stats();
  assert.ok(s.hanzi >= 2500, `本章汉字只有 ${s.hanzi}`);
  assert.strictEqual(s.hanzi, (RAW().match(HANZI) || []).length);
});

test('节数 = 编号节 + 「代价与边界」', () => {
  const heads = main.headings(RAW());
  const s = main.stats();
  assert.strictEqual(s.sections, heads.length);
  assert.strictEqual(s.numbered, heads.length - 1);
  assert.ok(heads.some((h) => h.includes('代价与边界')));
});

test('助行谱系 6 档、轮椅参数 4 项，均与表行数重算一致', () => {
  const independent = RAW()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^\|[\s:|-]*-{3}[\s:|-]*\|$/.test(l)).length;
  const s = main.stats();
  assert.strictEqual(s.tables, independent);
  assert.strictEqual(s.walkerRows, 6, `助行谱系应有 6 档，实为 ${s.walkerRows}`);
  assert.strictEqual(s.chairRows, 4, `轮椅参数应有 4 项，实为 ${s.chairRows}`);
});

test('居家检查六处与辅具三问齐备', () => {
  const s = main.stats();
  assert.deepStrictEqual(s.homeSpots, main.HOME_SPOTS);
  assert.strictEqual(s.homeSpots.length, 6);
  assert.strictEqual(s.aidQuestions, 3, `辅具三问应为 3 条，实为 ${s.aidQuestions}`);
  assert.strictEqual(s.aidQuestions, main.items(main.section(RAW(), '辅具是桥')));
});

test('转移三条件（高度匹配、支撑点、路径清空）在正文立目', () => {
  const s = main.stats();
  assert.deepStrictEqual(s.transfer, main.TRANSFER);
});

test('「代价与边界」条目、引文与免责声明齐备', () => {
  const s = main.stats();
  assert.strictEqual(s.boundaries, main.bullets(main.section(RAW(), '代价与边界')));
  assert.ok(s.boundaries >= 4);
  assert.ok(s.cites >= 1);
  assert.ok(s.disclaimer, '缺免责声明');
});

test('quiz：≥5 题，覆盖 pre／check／post，每题 4 选项且 correct 合法', () => {
  const qs = JSON.parse(fs.readFileSync(QUIZ, 'utf8')).questions;
  assert.ok(Array.isArray(qs) && qs.length >= 5, `只有 ${qs.length} 题`);
  const stages = new Set(qs.map((q) => q.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), `缺 ${s} 段`);
  for (const q of qs) {
    assert.strictEqual(q.options.length, 4, `选项不是 4 个：${q.question}`);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4, `correct 非法：${q.question}`);
    const hz = (String(q.explain).match(HANZI) || []).length;
    assert.ok(hz >= 30, `explain 只有 ${hz} 汉字：${q.question}`);
  }
});

test('quiz：答案位置分散（至少落在 3 个不同下标）', () => {
  const qs = JSON.parse(fs.readFileSync(QUIZ, 'utf8')).questions;
  assert.ok(new Set(qs.map((q) => q.correct)).size >= 3);
});

test('quiz：check 题里至少 2 道的正确选项含正文原词（≥4 汉字）', () => {
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const body = new Set();
  for (const seg of RAW().replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + 4 <= seg.length; i += 1) body.add(seg.slice(i, i + 4));
  }
  let grounded = 0;
  for (const q of quiz.questions.filter((x) => x.stage === 'check')) {
    const right = String(q.options[q.correct]).replace(/[^\u4e00-\u9fff]/g, ' ');
    if (right.split(/\s+/).some((seg) => {
      for (let i = 0; i + 4 <= seg.length; i += 1) if (body.has(seg.slice(i, i + 4))) return true;
      return false;
    })) grounded += 1;
  }
  assert.ok(grounded >= 2, `只有 ${grounded} 道 check 题接地`);
});

test('脚本可运行，输出与现算数字一致', () => {
  const s = main.stats();
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(s.hanzi.toLocaleString('en-US')));
  assert.ok(out.includes(`第 ${s.chapter} 章`));
  assert.ok(out.includes('现算'));
  assert.ok(out.includes(`${s.walkerRows} 档`), '输出未打印助行谱系档数');
});
