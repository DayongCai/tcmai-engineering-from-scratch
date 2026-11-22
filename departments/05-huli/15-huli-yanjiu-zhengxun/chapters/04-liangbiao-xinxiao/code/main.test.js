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
  assert.ok(a.hanzi > 3000, `汉字过少：${a.hanzi}`);
});

test('六节齐，起于构念、收于代价与边界', () => {
  const a = analyze();
  assert.strictEqual(a.sections.length, 6, `节数变了：${a.sections.join(' / ')}`);
  assert.ok(a.sections[0].includes('你要测'), a.sections[0]);
  assert.ok(a.sections[5].includes('代价与边界'), a.sections[5]);
});

test('四张表，信度三种、效度五种按强度递增', () => {
  const a = analyze();
  assert.strictEqual(a.tables, 4);
  assert.deepStrictEqual(a.reliability, ['内部一致性', '重测信度', '评定者间信度']);
  assert.deepStrictEqual(a.validity, ['表面效度', '内容效度', '结构效度', '效标效度', '已知组效度']);
});

test('题面算术可复算：40 − 11 = 29，5 分是乙表刻度的十分之一', () => {
  const p = analyze().problem;
  assert.strictEqual(p.people, 40);
  assert.strictEqual(p.disagreed, 11);
  assert.strictEqual(p.agreed, 29);
  assert.strictEqual(p.maxGap, 13);
  assert.strictEqual(p.gapThreshold, 5);
  assert.ok(p.gapIsTenth, '相差分数不等于乙表刻度的十分之一');
  assert.strictEqual(p.scale.factor, 2);
});

test('反向条目与信度变化可复算', () => {
  const p = analyze().problem;
  assert.strictEqual(p.items, 9);
  assert.strictEqual(p.reverse, 3);
  assert.strictEqual(Math.round(p.reverseShare * 1000) / 1000, 0.333);
  assert.strictEqual(p.alphaBefore, 0.6);
  assert.strictEqual(p.alphaAfter, 0.8);
  assert.strictEqual(Math.round(p.alphaDelta * 100) / 100, 0.2);
});

test('算术解析不靠写死：换一组数也算得对', () => {
  const fake = '**PROBLEM:** 同一批 30 人，同一天，先后填两个量表：甲表总分 0 至 60，乙表总分 0 至 30。按换算把甲表对齐到乙表刻度后，30 人里有 6 人两表相差 3 分及以上，最大差 9 分。12 个条目里有 4 条是反向计分，内部一致性系数从不足 0.50 升到 0.75 以上。\n\n尾巴';
  const p = problemArithmetic(fake);
  assert.strictEqual(p.people, 30);
  assert.strictEqual(p.agreed, 24);
  assert.strictEqual(p.gapThreshold, 3);
  assert.ok(p.gapIsTenth);
  assert.strictEqual(p.reverseShare, 4 / 12);
});

test('失效模式六条，含换算与分界值两类', () => {
  const a = analyze();
  assert.strictEqual(a.failModes.length, 6, a.failModes.join('、'));
  assert.ok(a.failModes.some((f) => f.includes('换算跨工具比较')), a.failModes.join('、'));
  assert.ok(a.failModes.some((f) => f.includes('分界值')), a.failModes.join('、'));
});

test('引文取自正文，不是手填', () => {
  const a = analyze();
  assert.deepStrictEqual(a.citations, ['脉经·序']);
  assert.ok(docText().includes('《脉经·序》'));
});

test('脚本可运行，输出不含教材单元层', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /正文 [\d,]+ 汉字，6 节，4 张表/);
  assert.match(out, /40 − 11 = 29/);
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
  assert.ok(code.includes('04-liangbiao-xinxiao/docs/zh.md'));
});
