/**
 * 中医临床护理学 · 第 10 章 练习与正文自查的回归测试
 * 两件事：正文现算的数字被钉住（正文一改就会报警）；quiz 结构满足教学约定。
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { measure, readDoc, CHAPTER, SLUG, TITLE } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const quiz = () => JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
const hanzi = (s) => (String(s || '').match(/[\u4e00-\u9fff]/g) || []).length;
const shingles = (text, n = 4) => {
  const clean = String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ');
  const out = new Set();
  for (const seg of clean.split(/\s+/)) for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  return out;
};

test('章号、标题与本章一致', () => {
  assert.strictEqual(CHAPTER, 10);
  assert.strictEqual(SLUG, '10-waike');
  assert.ok(TITLE.length > 0);
});

test('正文规模与结构被钉住', () => {
  const m = measure(readDoc());
  assert.strictEqual(m.hanzi, 2835);
  assert.strictEqual(m.sections.length, 6);
  assert.strictEqual(m.tables, 6);
  assert.strictEqual(m.tableRows, 31);
});

test('各探针表格/清单的实测条数', () => {
  const m = measure(readDoc());
  assert.deepStrictEqual(Object.fromEntries(m.probes.map((p) => [p.id, p.measured])), { 'yang-yin': 7, 'three-levels': 3, 'red-lines': 3, 'record-cols': 6, 'failures': 4 });
});

test('正文自称的结构数字与实测一致', () => {
  const m = measure(readDoc());
  const claims = m.probes.filter((p) => p.declared !== null);
  assert.ok(claims.length >= 1, '正文自称的结构数字应能被读出并对上');
  for (const p of claims) {
    assert.strictEqual(p.measured, p.declared, `${p.label}：正文称 ${p.declared}，实测 ${p.measured}`);
  }
});

test('关键术语在正文里确有出现', () => {
  const m = measure(readDoc());
  assert.deepStrictEqual(m.terms, { '波动感': 6, '危险三角区': 2, '红肿热痛': 8, '肠痈': 3, '尺寸': 6 });
});

test('脚本可运行并打印对账结论与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /结构对账（正文自称 vs 表格\/清单实测）/);
  assert.match(out, /项自称结构数字/);
  assert.match(out, /不构成临床判断依据/);
});

test('quiz 结构：至少 5 题，pre/check/post 齐，四选项，解释够长', () => {
  const q = quiz();
  const qs = q.questions;
  assert.ok(qs.length >= 5, `只有 ${qs.length} 题`);
  const stages = new Set(qs.map((x) => x.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), `缺 ${s} 段`);
  for (const item of qs) {
    assert.ok(item.question && item.question.length > 0);
    assert.strictEqual(item.options.length, 4);
    assert.ok(Number.isInteger(item.correct) && item.correct >= 0 && item.correct < 4);
    assert.ok(hanzi(item.explain) >= 30, `解释过短：${item.question}`);
  }
});

test('正确项下标被分散，不集中在一位', () => {
  const idx = new Set(quiz().questions.map((q) => q.correct));
  assert.ok(idx.size >= 3, `正确项只落在 ${[...idx].join('、')} 上`);
});

test('至少两道 check 题的正确选项能在正文找到原词', () => {
  const body = shingles(readDoc());
  let grounded = 0;
  const checks = quiz().questions.filter((q) => q.stage === 'check');
  for (const item of checks) {
    const right = shingles(item.options[item.correct]);
    if ([...right].some((g) => body.has(g))) grounded += 1;
  }
  assert.ok(grounded >= 2, `只有 ${grounded} 道 check 题接地（需 ≥2）`);
});

test('quiz 与代码不含脚手架字样', () => {
  const raw = fs.readFileSync(QUIZ, 'utf8') + fs.readFileSync(MAIN, 'utf8');
  for (const re of [/三辨/, /四位面/, /单元规模/, /本章实测/, /本课第\s*\d+\s*章/, /见\s*code\/main\.js\s*输出/]) {
    assert.ok(!re.test(raw), `出现脚手架字样：${re}`);
  }
});

test('代码头部指向本章正文', () => {
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes(`/chapters/${SLUG}/docs/zh.md`), '头部注释未指向本章正文');
});
