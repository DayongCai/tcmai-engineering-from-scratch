'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { analyze, docText, problemArithmetic } = require('./main.js');

const QUIZ = path.join(__dirname, '..', 'quiz.json');
const hanzi = (s) => (String(s || '').match(/[\u4e00-\u9fff]/g) || []).length;

function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text).replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('正文可读，规模与章题相称', () => {
  const a = analyze();
  assert.ok(a.hanzi > 2800, `汉字过少：${a.hanzi}`);
});

test('六节齐，起于四块积木、收于代价与边界', () => {
  const a = analyze();
  assert.strictEqual(a.sections.length, 6, `节数变了：${a.sections.join(' / ')}`);
  assert.ok(a.sections[0].includes('四块积木'), a.sections[0]);
  assert.ok(a.sections[5].includes('代价与边界'), a.sections[5]);
});

test('三张表，五类来源', () => {
  const a = analyze();
  assert.strictEqual(a.tables, 3);
  assert.strictEqual(a.sources.length, 5);
  assert.ok(a.sources.includes('临床试验注册平台'), a.sources.join('、'));
  assert.ok(a.sources.includes('学位论文与会议摘要库'), a.sources.join('、'));
});

test('筛选链首尾相接：三步都能复算', () => {
  const p = analyze().problem;
  assert.strictEqual(p.found, 1247);
  assert.strictEqual(p.deduped, 344);
  assert.strictEqual(p.afterDedup, 903);
  assert.strictEqual(p.taExcluded, 835);
  assert.strictEqual(p.afterTa, 68);
  assert.strictEqual(p.ftExcluded, 59);
  assert.strictEqual(p.included, 9);
  assert.deepStrictEqual(p.steps, [903, 68, 9]);
  assert.ok(p.chainOk, '筛选链断开');
});

test('去重数可拆成两个来源，重复率接近三成', () => {
  const p = analyze().problem;
  assert.strictEqual(p.dupLib, 212);
  assert.strictEqual(p.dupPre, 132);
  assert.strictEqual(p.dupSum, 344);
  assert.ok(p.dupOk);
  assert.strictEqual(Math.round(p.dedupRate * 1000) / 1000, 0.276);
});

test('算术解析不靠写死：换一组数也能判链条断开', () => {
  const broken = '**PROBLEM:** 一条检索式在两个来源里跑出 500 条记录。去重去掉 100 条，剩 400 条；题名与摘要筛排除 300 条，剩 90 条；全文筛排除 50 条，纳入 40 条。其中 60 条来自两个综合库的重叠，40 条来自同一篇文献的预印本与正式发表版。\n\n尾巴';
  const p = problemArithmetic(broken);
  assert.strictEqual(p.found, 500);
  assert.strictEqual(p.deduped, 100);
  assert.ok(!p.chainOk, '60−50 应得 10，链条应判为断开');
  assert.strictEqual(p.dupSum, 100);
  assert.ok(p.dupOk);
});

test('四块积木都在正文出现，失效模式六条', () => {
  const a = analyze();
  for (const x of a.anchors) assert.ok(x.hits >= 1, `${x.name} 在正文里没出现`);
  assert.strictEqual(a.failModes.length, 6, a.failModes.join('、'));
  assert.ok(a.failModes.some((f) => f.includes('一库到底')), a.failModes.join('、'));
});

test('引文取自正文，不是手填', () => {
  const a = analyze();
  assert.deepStrictEqual(a.citations, ['伤寒论·序']);
  assert.ok(docText().includes('《伤寒论·序》'));
});

test('脚本可运行，输出不含教材单元层', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /正文 [\d,]+ 汉字，6 节，3 张表/);
  assert.match(out, /1,247 − 344 = 903/);
  assert.doesNotMatch(out, /standards|units\.json|三辨|四位面|单元规模/);
});

test('quiz 结构：段齐、四选项、答案下标合法、解释够长', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  assert.ok(q.questions.length >= 5);
  const stages = new Set(q.questions.map((x) => x.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), `缺 ${s}`);
  for (const item of q.questions) {
    assert.strictEqual(item.options.length, 4);
    assert.ok(Number.isInteger(item.correct) && item.correct >= 0 && item.correct < 4);
    assert.ok(hanzi(item.explain) >= 30, `解释过短：${item.question}`);
  }
});

test('quiz 的判断题能在正文里找到原词', () => {
  const body = shingles(docText());
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const checks = q.questions.filter((x) => x.stage === 'check');
  assert.ok(checks.length >= 2);
  let grounded = 0;
  for (const item of checks) {
    const grams = [...shingles(item.options[item.correct])];
    if (grams.some((g) => body.has(g))) grounded += 1;
  }
  assert.ok(grounded >= 2, `只有 ${grounded} 道题接地`);
});

test('答案不挤在同一个下标', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const spread = new Set(q.questions.map((x) => x.correct));
  assert.ok(spread.size >= 3, `正确项只用了 ${spread.size} 个下标`);
});

test('quiz 与正文同源：不含旧脚手架名目', () => {
  const raw = fs.readFileSync(QUIZ, 'utf8');
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测', '见 code/main.js 输出']) {
    assert.ok(!raw.includes(bad), `quiz 仍含 ${bad}`);
  }
  const code = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
  assert.ok(!/三辨|四位面|单元规模|本章实测/.test(code));
  assert.ok(code.includes('06-jiansuo-xitong/docs/zh.md'));
});
