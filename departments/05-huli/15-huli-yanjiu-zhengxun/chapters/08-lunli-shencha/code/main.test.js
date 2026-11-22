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

test('六节齐，起于四问、收于代价与边界', () => {
  const a = analyze();
  assert.strictEqual(a.sections.length, 6, `节数变了：${a.sections.join(' / ')}`);
  assert.ok(a.sections[0].includes('四个问题'), a.sections[0]);
  assert.ok(a.sections[5].includes('代价与边界'), a.sections[5]);
});

test('三张表，同意书八项', () => {
  const a = analyze();
  assert.strictEqual(a.tables, 3);
  assert.strictEqual(a.consentItems.length, 8, a.consentItems.join(' / '));
  assert.ok(a.consentItems.includes('替代方案'), a.consentItems.join(' / '));
});

test('题面算术可复算：四类意见相加等于首轮意见数', () => {
  const p = analyze().problem;
  assert.strictEqual(p.pages, 18);
  assert.strictEqual(p.comments, 11);
  assert.deepStrictEqual(p.buckets, { consent: 5, riskBenefit: 3, privacy: 2, vulnerable: 1 });
  assert.strictEqual(p.sum, 11);
  assert.ok(p.sumOk, `${p.sum} 不等于 ${p.comments}`);
  assert.strictEqual(p.sameIssue, 7);
  assert.strictEqual(Math.round(p.sameIssueShare * 1000) / 1000, 0.636);
});

test('篇幅对比可复算：意义 11 句对风险 3 句', () => {
  const p = analyze().problem;
  assert.strictEqual(p.riskParas, 2);
  assert.strictEqual(p.riskSentences, 3);
  assert.strictEqual(p.meaningParas, 5);
  assert.strictEqual(p.meaningSentences, 11);
  assert.strictEqual(Math.round(p.sentenceRatio * 100) / 100, 3.67);
  assert.strictEqual(Math.round(p.riskShare * 1000) / 1000, 0.214);
});

test('算术解析不靠写死：换一组数也算得对', () => {
  const fake = '**PROBLEM:** 一份 24 页的方案送审，首轮反馈 9 条：知情同意 3 条，风险与受益 2 条，隐私与数据 3 条，弱势人群 1 条。9 条里有 4 条指向同一处：同意书把可能的不适写成「可能会有轻微不适」。再看方案全文，涉及风险描述的只有 1 段，合计 2 句话；而涉及研究意义的段落有 4 段，合计 12 句。\n\n尾巴';
  const p = problemArithmetic(fake);
  assert.strictEqual(p.pages, 24);
  assert.strictEqual(p.sum, 9);
  assert.ok(p.sumOk);
  assert.strictEqual(p.sameIssueShare, 4 / 9);
  assert.strictEqual(p.sentenceRatio, 6);
});

test('四问与失效模式都在正文里', () => {
  const a = analyze();
  for (const q of a.questions) assert.ok(q.hits >= 1, `${q.name} 在正文里没出现`);
  assert.strictEqual(a.failModes.length, 6, a.failModes.join('、'));
  assert.ok(a.failModes.some((f) => f.includes('偏离不报')), a.failModes.join('、'));
});

test('引文取自正文，不是手填', () => {
  const a = analyze();
  assert.deepStrictEqual(a.citations, ['备急千金要方·大医精诚']);
  assert.ok(docText().includes('《备急千金要方·大医精诚》'));
});

test('脚本可运行，输出不含教材单元层', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /正文 [\d,]+ 汉字，6 节，3 张表/);
  assert.match(out, /知情同意 5 \+ 风险与受益 3 \+ 隐私与数据 2 \+ 弱势人群 1 = 11/);
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
  assert.ok(code.includes('08-lunli-shencha/docs/zh.md'));
});
