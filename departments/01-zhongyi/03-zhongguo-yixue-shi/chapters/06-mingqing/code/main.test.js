'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  DOC, CHAPTER, SLUG, readDoc, sections, block, numbered, chapterTitle,
  cardFields, failureModes, layers, integrationPair,
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

test('段落结构：五个问题节 + 代价与边界', () => {
  const t = sections(doc).map((s) => s.title);
  assert.strictEqual(t.length, 7);
  assert.ok(t.some((x) => x.includes('层层保留')));
});

test('温病学说读出 5 层，首层是伏气温病之说', () => {
  const l = layers(doc);
  assert.strictEqual(l.length, 5);
  assert.match(l[0].name, /伏气温病之说/);
});

test('末层是明清诸家，含叶天士与吴鞠通', () => {
  const l = layers(doc);
  assert.match(l[4].name, /明清诸家/);
  const t = block(doc, '层层保留');
  assert.match(t, /叶天士/);
  assert.match(t, /吴鞠通/);
});

test('两种集成的差别在正文里写明', () => {
  const p = integrationPair(doc);
  assert.strictEqual(p.objectVsFormula, true);
  assert.strictEqual(p.personVsInstitution, true);
});

test('条目卡读出六栏，②是层位、⑥是时间表述', () => {
  const f = cardFields(doc);
  assert.strictEqual(f.length, 6);
  assert.match(f[1].name, /层位/);
  assert.match(f[5].name, /时间表述/);
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
