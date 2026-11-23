'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  DOC, CHAPTER, SLUG, readDoc, sections, block, numbered, chapterTitle,
  cardFields, failureModes, judgeForms, passiveSteps, preposeConditions,
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
  assert.ok(doc.length > 4000);
});

test('段落结构：五个问题节 + 代价与边界', () => {
  const t = sections(doc).map((s) => s.title);
  assert.strictEqual(t.length, 7);
  assert.ok(t.some((x) => x.includes('前置有三条件')));
});

test('判断句读出五式', () => {
  assert.deepStrictEqual(judgeForms(doc), ['一', '二', '三', '四', '五']);
});

test('被动判据读出两步，第一是标志词，第二是施受关系', () => {
  const s = passiveSteps(doc);
  assert.strictEqual(s.length, 2);
  assert.match(s[0], /标志词/);
  assert.match(s[1], /施受关系/);
});

test('宾语前置读出三条件，且逐条对得上正文', () => {
  const c = preposeConditions(doc);
  assert.strictEqual(c.length, 3);
  assert.match(c[0], /疑问代词作宾语/);
  assert.match(c[1], /否定句中代词作宾语/);
  assert.match(c[2], /以「之」「是」为标志/);
});

test('析句记录卡读出六字段，④是判据、⑥是结论与置信', () => {
  const f = cardFields(doc);
  assert.strictEqual(f.length, 6);
  assert.match(f[3].name, /判据/);
  assert.match(f[5].name, /置信/);
});

test('三种失效模式与正文一致', () => {
  assert.deepStrictEqual(failureModes(block(doc, '失效')), ['以今律古', '孤证立说', '训释脱离上下文']);
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
