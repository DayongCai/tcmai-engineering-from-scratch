'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  DOC, CHAPTER, SLUG, readDoc, sections, block, numbered, chapterTitle,
  cardFields, relationRows, proofGates, collationOrder,
} = require('./main.js');

const doc = readDoc();
const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));

function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('正文可读且规模合理', () => {
  assert.ok(fs.existsSync(DOC), 'docs/zh.md 不存在');
  assert.ok(doc.length > 4000, '正文过短');
});

test('章题从 H1 读出，且是第 2 章', () => {
  assert.match(chapterTitle(doc), /^第 2 章/);
});

test('段落结构：五个问题节 + 代价与边界', () => {
  const t = sections(doc).map((s) => s.title);
  assert.strictEqual(t.length, 7);
  assert.ok(t.some((x) => x.includes('代价与边界')));
});

test('四类用字关系表读出 4 行，次序为通假、古今、异体、讹字', () => {
  const rows = relationRows(doc);
  assert.strictEqual(rows.length, 4);
  assert.deepStrictEqual(rows.map((r) => r.name), ['通假', '古今字', '异体字', '讹字']);
});

test('通假行的证明要求是「本字可考、声音可通、文义可安」', () => {
  const tx = relationRows(doc).find((r) => r.name === '通假');
  assert.strictEqual(tx.proof, '本字可考、声音可通、文义可安');
  assert.strictEqual(tx.linked, '无');
});

test('通假三门槛拆出 3 项', () => {
  assert.deepStrictEqual(proofGates(doc), ['本字可考', '声音可通', '文义可安']);
});

test('校勘四法按正文排序：对校 > 本校 > 他校 > 理校', () => {
  assert.deepStrictEqual(collationOrder(doc), ['对校', '本校', '他校', '理校']);
});

test('辨字记录卡读出六字段，⑤是版本依据', () => {
  const f = cardFields(doc);
  assert.strictEqual(f.length, 6);
  assert.match(f[4].name, /版本依据/);
});

test('考核项为 6 条', () => {
  assert.strictEqual(numbered(block(doc, '考核项')).length, 6);
});

test('quiz 六题、三段齐、四选项、correct 合法、explain 够长', () => {
  const qs = quiz.questions;
  assert.strictEqual(qs.length, 6);
  const stages = new Set(qs.map((q) => q.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), `缺 ${s} 段`);
  for (const q of qs) {
    assert.strictEqual(q.options.length, 4);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4);
    assert.ok((q.explain.match(/[\u4e00-\u9fff]/g) || []).length >= 30, 'explain 过短');
  }
});

test('quiz 至少两道 check 题接地，且答案分散', () => {
  const body = shingles(doc);
  const grounded = quiz.questions.filter((q) => q.stage === 'check' &&
    [...shingles(q.options[q.correct])].some((g) => body.has(g)));
  assert.ok(grounded.length >= 2, `只有 ${grounded.length} 道接地`);
  assert.ok(new Set(quiz.questions.map((q) => q.correct)).size >= 3);
});

test('脚本可运行，输出含现算声明与临床边界', () => {
  const r = spawnSync(process.execPath, [require.resolve('./main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.length > 200);
  assert.match(out, /现算/);
  assert.match(out, /不构成/);
  assert.match(out, new RegExp(SLUG));
  assert.match(out, new RegExp(`第 ${CHAPTER} 章`));
});
