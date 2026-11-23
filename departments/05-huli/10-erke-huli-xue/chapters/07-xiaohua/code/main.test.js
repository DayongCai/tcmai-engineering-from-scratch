'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { analyze, CHAPTER, SLUG, TITLE, FOCUS } = require('./main.js');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const MAIN = path.join(__dirname, 'main.js');
const EXPECT = {
  "hanzi": 3181,
  "sections": 5,
  "paragraphs": 30,
  "tables": 1,
  "tableDataRows": 5,
  "listItems": 0,
  "boldTerms": 44,
  "citations": 1,
  "books": 1,
  "focus": {
    "精神状态": 1,
    "眼窝": 2,
    "皮肤弹性": 2,
    "末梢循环": 2
  }
};

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

function shingles(text, n = 4) {
  const clean = String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ');
  const out = new Set();
  for (const seg of clean.split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('正文篇幅与结构实测值', () => {
  const s = analyze();
  assert.strictEqual(s.hanzi, EXPECT.hanzi, '汉字数变了，需重核正文或更新实测值');
  assert.strictEqual(s.sections, EXPECT.sections);
  assert.strictEqual(s.paragraphs, EXPECT.paragraphs);
  assert.strictEqual(s.tables, EXPECT.tables);
  assert.strictEqual(s.tableDataRows, EXPECT.tableDataRows);
  assert.strictEqual(s.listItems, EXPECT.listItems);
  assert.strictEqual(s.boldTerms, EXPECT.boldTerms);
  assert.ok(s.hanzi > 2500, `汉字过少：${s.hanzi}`);
});

test('重点词频钉住实测值', () => {
  const s = analyze();
  for (const term of FOCUS) {
    assert.ok(Number.isInteger(s.focus[term]), `缺少词频项：${term}`);
    assert.strictEqual(s.focus[term], EXPECT.focus[term], `${term} 词频变了`);
  }
});

test('quiz 结构：题量、三段、四选项、解释长度', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const qs = q.questions;
  assert.ok(Array.isArray(qs) && qs.length >= 5, `题量不足：${qs.length}`);
  const stages = new Set(qs.map((x) => x.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), `缺 ${s} 段`);
  for (const item of qs) {
    assert.strictEqual(item.options.length, 4, '有题不是 4 选项');
    assert.ok(Number.isInteger(item.correct) && item.correct >= 0 && item.correct < 4, 'correct 下标非法');
    assert.ok(hanzi(item.explain) >= 30, `explain 过短：${hanzi(item.explain)}`);
  }
});

test('quiz 与代码无脚手架、无禁用口径', () => {
  const raw = fs.readFileSync(QUIZ, 'utf8');
  const code = fs.readFileSync(MAIN, 'utf8');
  const tpl = /三辨|四位面|单元规模|本章实测|本课第\s*\d+\s*章|见\s*code\/main\.js\s*输出|这一章要回答什么/;
  const banned = /剂量|疗程|发生率|页码/;
  assert.doesNotMatch(raw, tpl, 'quiz 仍含脚手架');
  assert.doesNotMatch(code, tpl, 'main.js 仍含脚手架');
  assert.doesNotMatch(raw, banned, 'quiz 含禁用口径');
  assert.doesNotMatch(code, banned, 'main.js 含禁用口径');
});

test('至少两道 check 题正确选项接地正文', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const body = shingles(fs.readFileSync(DOC, 'utf8'));
  let grounded = 0;
  for (const item of q.questions) {
    if (item.stage !== 'check') continue;
    const right = String(item.options[item.correct] || '');
    if ([...shingles(right)].some((g) => body.has(g))) grounded += 1;
  }
  assert.ok(grounded >= 2, `接地题只有 ${grounded} 道`);
});

test('答案分布被打散', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const used = new Set(q.questions.map((x) => x.correct));
  assert.ok(used.size >= 3, `正确答案只落在 ${used.size} 个位置`);
});

test('脚本可运行且输出含边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(TITLE), '输出未含章标题');
  assert.ok(out.includes('正文自检'), '输出未含自检标记');
  assert.ok(out.includes('不构成'), '输出缺边界声明');
  assert.ok(out.includes('现行规范'), '输出缺规范口径');
});

test('章节号与目录一致', () => {
  assert.ok(Number.isInteger(CHAPTER) && CHAPTER > 0);
  assert.strictEqual(SLUG, path.basename(path.join(__dirname, '..')));
});
