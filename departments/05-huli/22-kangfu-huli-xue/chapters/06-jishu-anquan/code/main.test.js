'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, SLUG, summarize, tableShape, turnPoints, sections, tables, countHanzi } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const doc = fs.readFileSync(DOC, 'utf8');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

test('正文可读，汉字数与实测一致', () => {
  assert.strictEqual(countHanzi(doc), 2906);
  assert.strictEqual(summarize().hanzi, 2906);
});

test('小节数与实测一致', () => {
  assert.strictEqual(sections(doc).length, 6);
});

test('表格数与实测一致', () => {
  assert.strictEqual(tables(doc).blocks, 3);
  assert.strictEqual(tables(doc).rows, 17);
});

test('体位与转移方式从正文读出', () => {
  assert.deepStrictEqual(tableShape(doc, '| 体位 |'), { rows: 4, cols: 5 });
  assert.deepStrictEqual(tableShape(doc, '| 方式 |'), { rows: 3, cols: 5 });
  assert.strictEqual(turnPoints(doc), 4);
  assert.strictEqual(summarize().combinations, 12);
});

test('脚本可运行，输出实测值与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /正文汉字 2906 个/);
  assert.match(out, /四个体位表 4 行 × 4 项内容 = 16 格/);
  assert.match(out, /转移方式 3 种 × 四个步骤 = 12 处动作要求/);
  assert.match(out, /不替代治疗师处方/);
});

test('quiz 结构：≥5 题、pre/check/post 齐、4 选项、explain ≥30 汉字', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  assert.strictEqual(q.chapter, CHAPTER);
  assert.ok(q.questions.length >= 5, `只有 ${q.questions.length} 题`);
  const stages = new Set(q.questions.map((x) => x.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), `缺 ${s}`);
  for (const item of q.questions) {
    assert.strictEqual(item.options.length, 4);
    assert.ok(Number.isInteger(item.correct) && item.correct >= 0 && item.correct < 4);
    assert.ok(hanzi(item.explain) >= 30, `explain 过短：${item.explain.slice(0, 20)}`);
  }
});

test('quiz 与正文同源：≥2 道 check 题的正确选项含正文四字原词', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const body = new Set();
  for (const seg of doc.replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + 4 <= seg.length; i += 1) body.add(seg.slice(i, i + 4));
  }
  let grounded = 0;
  for (const item of q.questions.filter((x) => x.stage === 'check')) {
    const right = item.options[item.correct];
    if ([...body].some((g) => right.includes(g))) grounded += 1;
  }
  assert.ok(grounded >= 2, `只有 ${grounded} 道 check 题接地`);
});

test('quiz 正确选项打散：不集中在同一位置', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  assert.ok(new Set(q.questions.map((x) => x.correct)).size >= 3);
});

test('quiz 与代码都不含旧脚手架话术', () => {
  const raw = fs.readFileSync(QUIZ, 'utf8') + fs.readFileSync(MAIN, 'utf8');
  for (const re of [/三辨/, /四位面/, /单元规模/, /本章实测/, /本课第\s*\d+\s*章/, /见\s*code\/main\.js\s*输出/]) {
    assert.ok(!re.test(raw), `残留：${re}`);
  }
});

test('章节号与目录一致', () => {
  assert.strictEqual(CHAPTER, 6);
  assert.strictEqual(SLUG, '06-jishu-anquan');
  assert.ok(fs.existsSync(QUIZ));
});
