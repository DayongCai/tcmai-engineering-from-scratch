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
  assert.ok(a.hanzi > 2900, `汉字过少：${a.hanzi}`);
});

test('六节齐，起于两维不可压缩、收于代价与边界', () => {
  const a = analyze();
  assert.strictEqual(a.sections.length, 6, `节数变了：${a.sections.join(' / ')}`);
  assert.ok(a.sections[0].includes('两个维度'), a.sections[0]);
  assert.ok(a.sections[5].includes('代价与边界'), a.sections[5]);
});

test('三张表，四格与五条降级来路', () => {
  const a = analyze();
  assert.strictEqual(a.tables, 3);
  assert.strictEqual(a.quadrants.length, 4);
  assert.ok(a.quadrants[2].includes('低/强'), a.quadrants[2]);
  assert.deepStrictEqual(a.downgrades, ['研究局限', '不一致', '不直接', '不精确', '发表偏倚']);
});

test('题面算术可复算：四格之和 27，强推荐 9 条', () => {
  const p = analyze().problem;
  assert.strictEqual(p.total, 27);
  assert.deepStrictEqual(p.cells, { hiStrong: 5, hiWeak: 2, loStrong: 4, loWeak: 16 });
  assert.strictEqual(p.sum, 27);
  assert.ok(p.sumOk);
  assert.strictEqual(p.strong, 9);
  assert.strictEqual(p.weak, 18);
  assert.ok(p.marginsOk, '行合计与列合计不一致');
  assert.strictEqual(p.high, 7);
  assert.strictEqual(p.low, 20);
});

test('强推荐中靠低确定性支撑的比例可复算', () => {
  const p = analyze().problem;
  assert.strictEqual(p.strongOnLowEvidence, 4);
  assert.strictEqual(Math.round(p.strongOnLowShare * 1000) / 1000, 0.444);
  assert.strictEqual(Math.round(p.lowWeakShare * 1000) / 1000, 0.593);
});

test('算术解析不靠写死：换一组数也算得对', () => {
  const fake = '**PROBLEM:** 把一份材料里的 20 条推荐按两个维度摊成四格：证据确定性高而推荐强度强 6 条，确定性高而强度弱 3 条，确定性低而强度强 1 条，确定性低而强度弱 10 条。\n\n尾巴';
  const p = problemArithmetic(fake);
  assert.strictEqual(p.total, 20);
  assert.ok(p.sumOk);
  assert.strictEqual(p.strong, 7);
  assert.strictEqual(p.low, 11);
  assert.ok(p.marginsOk);
});

test('失效模式六条', () => {
  const a = analyze();
  assert.strictEqual(a.failModes.length, 6, a.failModes.join('、'));
  assert.ok(a.failModes.some((f) => f.includes('弱推荐执行成强推荐')), a.failModes.join('、'));
});

test('引文取自正文，不是手填', () => {
  const a = analyze();
  assert.deepStrictEqual(a.citations, ['素问·至真要大论']);
  assert.ok(docText().includes('《素问·至真要大论》'));
});

test('脚本可运行，输出不含教材单元层', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /正文 [\d,]+ 汉字，6 节，3 张表/);
  assert.match(out, /5 \+ 2 \+ 4 \+ 16 = 27/);
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
  assert.ok(code.includes('05-xunzheng-fenji/docs/zh.md'));
});
