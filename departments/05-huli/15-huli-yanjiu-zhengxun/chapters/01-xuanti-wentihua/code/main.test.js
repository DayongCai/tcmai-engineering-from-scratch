'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, analyze, docText, tables, problemArithmetic } = require('./main.js');

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

test('六节齐，节序与正文一致', () => {
  const a = analyze();
  assert.strictEqual(a.sections.length, 6, `节数变了：${a.sections.join(' / ')}`);
  assert.ok(a.sections[0].includes('四槽位表'), a.sections[0]);
  assert.ok(a.sections[5].includes('代价与边界'), a.sections[5]);
});

test('三张表，四槽位表恰好四格', () => {
  const a = analyze();
  assert.strictEqual(a.tables, 3);
  assert.deepStrictEqual(a.slotRows, ['人群', '干预或暴露', '对照', '结局']);
});

test('题面算术可复算：三档人数相加等于总份数', () => {
  const p = analyze().problem;
  assert.strictEqual(p.total, 14);
  assert.strictEqual(p.full, 3);
  assert.strictEqual(p.one, 6);
  assert.strictEqual(p.two, 5);
  assert.ok(p.sumOk, `三档相加 ${p.full}+${p.one}+${p.two} 不等于 ${p.total}`);
  assert.strictEqual(p.missing, 11);
});

test('算术解析不靠写死：换一组数也算得对', () => {
  const fake = '**PROBLEM:** 交上来的 20 份选题表逐份点槽位：四格全部写实的有 8 份，缺一格的 7 份，缺两格及以上的 5 份。\n\n尾巴';
  const p = problemArithmetic(fake);
  assert.strictEqual(p.total, 20);
  assert.strictEqual(p.missing, 12);
  assert.ok(p.sumOk);
});

test('失效模式五条，三条判据都在正文里有分量', () => {
  const a = analyze();
  assert.strictEqual(a.failModes.length, 5, a.failModes.join('、'));
  assert.ok(a.failModes[0].includes('齐全但不可测'), a.failModes[0]);
  assert.ok(a.criteria.可检索 >= 3, `可检索 ${a.criteria.可检索}`);
  assert.ok(a.criteria.可测 >= 2, `可测 ${a.criteria.可测}`);
  assert.ok(a.criteria.可复现 >= 1, `可复现 ${a.criteria.可复现}`);
});

test('引文取自正文，不是手填', () => {
  const a = analyze();
  assert.deepStrictEqual(a.citations, ['灵枢·师传']);
  assert.ok(docText().includes('《灵枢·师传》'));
});

test('脚本可运行，输出不含教材单元层', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /正文 [\d,]+ 汉字，6 节，3 张表/);
  assert.match(out, /14 − 3 = 11/);
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
  assert.ok(code.includes('01-xuanti-wentihua/docs/zh.md'));
});
