'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  DOC, CHAPTER, SLUG, readDoc, sections, block, numbered, chapterTitle,
  cardFields, failureModes, fourHouses, twoConditions,
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
  assert.ok(doc.length > 3000);
});

test('段落结构：五个问题节（第五节含考核项）+ 代价与边界', () => {
  const t = sections(doc).map((s) => s.title);
  assert.strictEqual(t.length, 7);
  assert.ok(t.some((x) => x.includes('四家的对手')));
});

test('四家表读出 4 行，次序为刘完素、张从正、李杲、朱震亨', () => {
  const h = fourHouses(doc);
  assert.strictEqual(h.length, 4);
  assert.match(h[0].name, /刘完素/);
  assert.match(h[3].name, /朱震亨/);
});

test('刘完素一行的转化规则是「诸邪终化为火」', () => {
  const h = fourHouses(doc).find((x) => /刘完素/.test(x.name));
  assert.strictEqual(h.rule, '诸邪终化为火');
});

test('四家各自的对手行非空', () => {
  for (const h of fourHouses(doc)) assert.ok(h.against.length >= 4, `${h.name} 缺对手`);
});

test('新说的两个条件读出 2 条', () => {
  const c = twoConditions(doc);
  assert.strictEqual(c.length, 2);
  assert.match(c[0].text, /可以被反驳/);
  assert.match(c[1].text, /转化规则/);
});

test('条目卡读出六栏，③是可反驳命题、⑤是对手', () => {
  const f = cardFields(doc);
  assert.strictEqual(f.length, 6);
  assert.match(f[2].name, /可反驳命题/);
  assert.match(f[4].name, /对手/);
});

test('三种失效模式与正文一致', () => {
  assert.deepStrictEqual(failureModes(block(doc, '失效')), ['以传说代史实', '年代不清', '以今评古']);
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
