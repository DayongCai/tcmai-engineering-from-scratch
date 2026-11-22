'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, analyze, sectionOf, auditOrganisation, verify, STRUCTURES, SCENES, RIGHTS } = require('./main.js');

const BODY = read();
const A = analyze(BODY);

function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

test('正文文件就在本章目录下', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '02-y2', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
});

test('章号与标题取自本章正文', () => {
  assert.strictEqual(CHAPTER, 2);
  assert.strictEqual(TITLE, '组织图画的不是权力，是签字与担责的错位');
  assert.match(BODY.split('\n')[0], new RegExp('^# 第 2 章 · ' + TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

test('正文统计可复算：汉字、节、加粗判断、引文', () => {
  assert.strictEqual(A.hanzi, 2836);
  assert.strictEqual(A.sections.length, 6);
  assert.strictEqual(A.claims, 37);
  assert.strictEqual(A.quotes.length, 1);
});

test('组织结构账：四种结构、矩阵三件事、双头指挥四场景、三本账', () => {
  const o = auditOrganisation(A.sections);
  assert.doesNotThrow(() => verify(o));
  assert.deepStrictEqual(o.structures, STRUCTURES);
  assert.deepStrictEqual(o.matrixItems, ['项目负责人有没有考核权重', '成员的工时怎么算', '项目结束后人回哪里']);
  assert.deepStrictEqual(o.scenes, SCENES);
  assert.deepStrictEqual(o.rights, RIGHTS);
  assert.strictEqual(o.books.length, 3);
});

test('矩阵前置条件与调配三权取自正文原句', () => {
  const s1 = sectionOf(A.sections, '四种结构');
  assert.match(s1.text, /必须事先写清楚三件事/);
  assert.match(s1.text, /这个项目出问题时，第一个被问责的人是谁/);
  const s2 = sectionOf(A.sections, '双头指挥');
  assert.match(s2.text, /调出的人力在科室成本与绩效中相应扣减/);
  assert.match(s2.text, /一次上报、双向引用/);
});

test('quiz：≥5 题、三段齐、四选项、解释够长、答案打散', () => {
  const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));
  const qs = quiz.questions;
  assert.ok(qs.length >= 5, `只有 ${qs.length} 题`);
  for (const s of ['pre', 'check', 'post']) assert.ok(qs.some((q) => q.stage === s), `缺 ${s} 段`);
  for (const q of qs) {
    assert.strictEqual(q.options.length, 4);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4);
    assert.ok(hanzi(q.explain) >= 30, `explain 只有 ${hanzi(q.explain)} 汉字`);
  }
  assert.ok(new Set(qs.map((q) => q.correct)).size >= 3, '正确答案过于集中');
});

test('quiz 的 check 题正确选项落在本章正文里（≥2 道）', () => {
  const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));
  const body = shingles(BODY);
  const checks = quiz.questions.filter((q) => q.stage === 'check');
  const grounded = checks.filter((q) => [...shingles(q.options[q.correct])].some((s) => body.has(s)));
  assert.ok(checks.length >= 3);
  assert.ok(grounded.length >= 2, `只有 ${grounded.length} 道接地`);
});

test('脚本可运行，输出含现算口径与职责声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /均从本章 docs\/zh\.md 现算/);
  assert.match(r.stdout, /组织结构 4\/4/);
  assert.match(r.stdout, /不构成管理咨询或人事处理依据/);
});
