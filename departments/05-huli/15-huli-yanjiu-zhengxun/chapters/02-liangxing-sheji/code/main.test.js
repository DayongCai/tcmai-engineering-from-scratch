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

test('六节齐，起于错误清单、收于代价与边界', () => {
  const a = analyze();
  assert.strictEqual(a.sections.length, 6, `节数变了：${a.sections.join(' / ')}`);
  assert.ok(a.sections[0].includes('错误清单'), a.sections[0]);
  assert.ok(a.sections[5].includes('代价与边界'), a.sections[5]);
});

test('四张表，四类设计与四档口径都能从表里切出', () => {
  const a = analyze();
  assert.strictEqual(a.tables, 4);
  assert.deepStrictEqual(a.designs, ['横断面', '队列（前瞻）', '单组前后测', '随机对照']);
  assert.deepStrictEqual(a.grades, ['甲', '乙', '丙', '丁']);
});

test('题面算术可复算：7 项拆成 5 + 2，跨度 6 − 2', () => {
  const p = analyze().problem;
  assert.strictEqual(p.total, 7);
  assert.strictEqual(p.single, 5);
  assert.strictEqual(p.controlled, 2);
  assert.ok(p.sumOk, `${p.single}+${p.controlled} 不等于 ${p.total}`);
  assert.strictEqual(p.spanWeeks, 4);
  assert.strictEqual(p.singleWithoutCaveat, 1);
});

test('算术解析不靠写死：换一组数也算得对', () => {
  const fake = '**PROBLEM:** 把 9 项已结题研究按设计类型点数：单组前后测 6 项，同期对照 3 项。6 项里有 2 项在结论段用了「有效」……最长 10 周，最短 3 周。\n\n尾巴';
  const p = problemArithmetic(fake);
  assert.strictEqual(p.total, 9);
  assert.ok(p.sumOk);
  assert.strictEqual(p.spanWeeks, 7);
  assert.strictEqual(p.singleWithoutCaveat, 4);
});

test('四类偏倚都在正文里出现，失效模式五条', () => {
  const a = analyze();
  for (const b of a.bias) assert.ok(b.hits >= 1, `${b.name} 在正文里没出现`);
  assert.strictEqual(a.failModes.length, 5, a.failModes.join('、'));
  assert.ok(a.failModes.some((f) => f.includes('样本量倒推')), a.failModes.join('、'));
});

test('引文取自正文，不是手填', () => {
  const a = analyze();
  assert.deepStrictEqual(a.citations, ['素问·徵四失论']);
  assert.ok(docText().includes('《素问·徵四失论》'));
});

test('脚本可运行，输出不含教材单元层', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /正文 [\d,]+ 汉字，6 节，4 张表/);
  assert.match(out, /7 项已结题研究 = 单组前后测 5 \+ 同期对照 2/);
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
  assert.ok(code.includes('02-liangxing-sheji/docs/zh.md'));
});
