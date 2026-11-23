'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  DOC, CHAPTER, SLUG, readDoc, sections, block, numbered,
  cardFields, failureModes, citations, cn2num, radicalCounts,
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
  assert.ok(doc.length > 4000, '正文过短，工具书一章应有实质篇幅');
});

test('段落结构：五个问题节 + 代价与边界', () => {
  const titles = sections(doc).map((s) => s.title);
  assert.strictEqual(titles.length, 7);
  assert.ok(titles.some((t) => t.includes('代价与边界')));
});

test('考核项为 6 条，且每条都能落到操作', () => {
  const items = numbered(block(doc, '考核项'));
  assert.strictEqual(items.length, 6);
  assert.ok(items.every((t) => t.length > 10));
});

test('查检记录卡读出六字段，首尾分别是字头与复核结论', () => {
  const f = cardFields(doc);
  assert.strictEqual(f.length, 6);
  assert.strictEqual(f[0].name, '字头');
  assert.match(f[5].name, /复核结论/);
});

test('三种失效模式的名字与正文一致', () => {
  const modes = failureModes(block(doc, '失效'));
  assert.deepStrictEqual(modes, ['以今律古', '孤证立说', '训释脱离上下文']);
});

test('部首三数从正文原句取出，且单调递减', () => {
  const r = radicalCounts(doc);
  assert.deepStrictEqual(r, [540, 214, 201]);
  assert.ok(r.every((n, i) => i === 0 || n < r[i - 1]));
});

test('汉字数转换器：五百四十 / 二百十四 / 二百零一', () => {
  assert.strictEqual(cn2num('五百四十'), 540);
  assert.strictEqual(cn2num('二百十四'), 214);
  assert.strictEqual(cn2num('二百零一'), 201);
});

test('引书统计非空，且包含本章的三种字书', () => {
  const c = citations(doc);
  assert.ok(c.unique.length >= 8);
  for (const b of ['说文解字', '尔雅', '康熙字典']) assert.ok(c.unique.includes(b), `缺 ${b}`);
});

test('quiz 六题、三段齐、四选项、correct 合法', () => {
  const qs = quiz.questions;
  assert.strictEqual(qs.length, 6);
  const stages = new Set(qs.map((q) => q.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), `缺 ${s} 段`);
  for (const q of qs) {
    assert.strictEqual(q.options.length, 4);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4);
    const hz = (q.explain.match(/[\u4e00-\u9fff]/g) || []).length;
    assert.ok(hz >= 30, `explain 只有 ${hz} 汉字`);
  }
});

test('quiz 至少两道 check 题的正确选项能在正文找到原词', () => {
  const body = shingles(doc);
  const grounded = quiz.questions.filter((q) => q.stage === 'check' &&
    [...shingles(q.options[q.correct])].some((g) => body.has(g)));
  assert.ok(grounded.length >= 2, `只有 ${grounded.length} 道接地`);
});

test('quiz 答案分散，不集中在同一个下标', () => {
  const idx = new Set(quiz.questions.map((q) => q.correct));
  assert.ok(idx.size >= 3, `correct 只用了 ${idx.size} 个下标`);
});

test('脚本可运行，输出含现算声明与临床边界', () => {
  const r = spawnSync(process.execPath, [require.resolve('./main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.length > 200, '输出过短');
  assert.match(out, /现算/);
  assert.match(out, /不构成/);
  assert.match(out, new RegExp(SLUG));
  assert.match(out, new RegExp(`第 ${CHAPTER} 章`));
});
