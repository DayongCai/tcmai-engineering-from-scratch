'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { DOC, CHAPTER, TITLE, TERMS, MODALS, read, analyze } = require('./main.js');

const TEXT = read();
const A = analyze(TEXT);

test('正文文件就在本章目录下', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '11-f11', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC), '缺席: ' + DOC);
});

test('章号、标题与正文一级标题一致', () => {
  assert.strictEqual(CHAPTER, 11);
  assert.strictEqual(TITLE, '防疫是拿自由换时间：四种措施强度与一条比例线');
  assert.ok(TEXT.startsWith('# 第 11 章 · ' + TITLE), TEXT.slice(0, 60));
});

test('汉字数是现算的，与正文逐字重数一致', () => {
  const recount = (TEXT.match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
  assert.strictEqual(A.hanzi, recount);
  assert.strictEqual(A.hanzi, 3536);
});

test('节、表格、引文数量与正文快照一致', () => {
  assert.strictEqual(A.sections.length, 6);
  assert.strictEqual(A.tables, 1);
  assert.strictEqual(A.cites.length, 1);
  assert.deepStrictEqual(A.cites, ['诗经·豳风·鸱鸮']);
});

test('逐节字数相加不超过全篇，且每节非空', () => {
  const sum = A.sections.reduce((s, x) => s + x.hanzi, 0);
  assert.ok(sum > 0 && sum <= A.hanzi, `${sum} vs ${A.hanzi}`);
  for (const s of A.sections) assert.ok(s.hanzi > 50, s.title + ' 过短：' + s.hanzi);
});

test('五个判据词都在正文出现，且与独立重数一致', () => {
  assert.deepStrictEqual(Object.keys(A.terms).sort(), [...TERMS].sort());
  for (const t of TERMS) {
    const recount = TEXT.split(t).length - 1;
    assert.strictEqual(A.terms[t], recount, t);
    assert.ok(A.terms[t] > 0, `判据词未出现: ${t}`);
  }
    assert.strictEqual(A.terms['报告'], 18);
  assert.strictEqual(A.terms['隔离'], 12);
  assert.strictEqual(A.terms['封锁'], 6);
  assert.strictEqual(A.terms['征用'], 10);
  assert.strictEqual(A.terms['监测'], 19);
});

test('三类句式计数取自正文，且都是非负整数', () => {
  for (const k of Object.keys(MODALS)) {
    assert.ok(Number.isInteger(A.modals[k]), k);
    assert.ok(A.modals[k] >= 0, k);
  }
  assert.strictEqual(A.modals.义务句, 5);
  assert.strictEqual(A.modals.宣示句, 0);
});

test('脚本可运行，输出标明现算口径与边界', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /均从本章 docs\/zh\.md 现算/);
  assert.match(out, /本章判据词频/);
  assert.match(out, /不构成法律意见/);
  assert.ok(out.includes(String(A.hanzi)), '输出未含现算汉字数');
});

test('quiz 与本章正文同源：无脚手架字样，题量达标', () => {
  const q = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));
  const raw = JSON.stringify(q);
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测', '本课第']) assert.ok(!raw.includes(bad), bad);
  assert.ok(q.questions.length >= 5);
  const stages = new Set(q.questions.map((x) => x.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), '缺 ' + s);
  for (const item of q.questions) {
    assert.strictEqual(item.options.length, 4);
    assert.ok(item.correct >= 0 && item.correct < 4);
    assert.ok((item.explain.match(/[\u4e00-\u9fff]/g) || []).length >= 30, item.question);
  }
});
