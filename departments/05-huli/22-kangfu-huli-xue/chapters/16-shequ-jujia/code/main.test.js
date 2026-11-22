'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const main = require('./main.js');

const { DOC, CHAPTER, SLUG } = main;
const MAIN = path.join(__dirname, 'main.js');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const doc = fs.readFileSync(DOC, 'utf8');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

test('正文可读，汉字数与实测一致', () => {
  assert.strictEqual(main.countHanzi(doc), 2824);
  assert.strictEqual(main.summarize().hanzi, 2824);
});

test('小节数与实测一致', () => {
  assert.strictEqual(main.sections(doc).length, 6);
});

test('表格数与实测一致', () => {
  assert.strictEqual(main.tables(doc).blocks, 4);
  assert.strictEqual(main.tables(doc).rows, 26);
});

test('病房与家五差异、居家六项必查由正文读出', () => {
  assert.deepStrictEqual(main.tableShape(doc, '| 差异 |'), { rows: 5, cols: 4 });
  assert.deepStrictEqual(main.tableShape(doc, '| 服务类别 |'), { rows: 5, cols: 4 });
  assert.deepStrictEqual(main.tableShape(doc, '| 照护者负担的信号 |'), { rows: 4, cols: 3 });
  assert.strictEqual(main.homeChecklist(doc), 6);
  assert.strictEqual(main.caregiverNeeds(doc), 3);
});

test('脚本可运行，输出实测值与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /正文汉字 2824 个/);
  assert.match(out, /小节 6 节/);
  assert.match(out, /不构成/);
});

test('quiz 结构：≥5 题、pre/check/post 齐、4 选项、explain ≥30 汉字', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  assert.strictEqual(q.chapter, CHAPTER);
  assert.ok(q.questions.length >= 5, `只有 ${q.questions.length} 题`);
  const stages = new Set(q.questions.map((x) => x.stage));
  for (const st of ['pre', 'check', 'post']) assert.ok(stages.has(st), `缺 ${st}`);
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
  assert.strictEqual(CHAPTER, 16);
  assert.strictEqual(SLUG, '16-shequ-jujia');
  assert.ok(fs.existsSync(QUIZ));
});
