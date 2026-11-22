'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, SPECTACLE, MISREADS, read, analyze, auditTranslatability, auditMedia, verify } = require('./main.js');

const BODY = read();
const A = analyze(BODY);

function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('正文文件就在本章目录下', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '06-z56', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
});

test('章号与标题取自本章正文', () => {
  assert.strictEqual(CHAPTER, 6);
  assert.strictEqual(TITLE, '把中医讲成奇迹，是最快也最贵的一种传播');
  assert.match(BODY.split('\n')[0], new RegExp('^# 第 6 章 · ' + TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

test('正文统计可复算：汉字、节、表', () => {
  assert.ok(A.hanzi > 2500 && A.hanzi < 6000, String(A.hanzi));
  assert.strictEqual(A.sections.length, 6);
  assert.strictEqual(A.tableCount, 2);
  const sum = A.sections.reduce((s, x) => s + x.hanzi, 0);
  assert.ok(sum > 0 && sum <= A.hanzi, `${sum} vs ${A.hanzi}`);
});

test('可译性表：3 行，气／经络／证都写了范畴错误与更稳处理', () => {
  const tr = auditTranslatability(A.tables);
  assert.strictEqual(tr.rows, 3);
  assert.strictEqual(tr.columns, 4);
  assert.deepStrictEqual(tr.concepts, ['气', '经络', '证']);
  assert.strictEqual(tr.complete, 3);
});

test('媒介表：4 行，短视频必然删掉全部限定条件', () => {
  const md = auditMedia(A.tables);
  assert.strictEqual(md.rows, 4);
  assert.strictEqual(md.columns, 4);
  assert.deepStrictEqual(md.media, ['长文', '图文', '短视频', '直播']);
  assert.strictEqual(md.shortDrop, '全部限定条件');
  assert.doesNotThrow(() => verify(auditTranslatability(A.tables), md, A));
});

test('奇观三件套与四类误读都在正文里', () => {
  assert.deepStrictEqual(A.spectacle, SPECTACLE);
  assert.deepStrictEqual(A.misreads, MISREADS);
});

test('quiz 的 check 题正确选项落在本章正文里（≥2 道）', () => {
  const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));
  const body = shingles(BODY);
  const checks = quiz.questions.filter((q) => q.stage === 'check');
  const grounded = checks.filter((q) => {
    const right = String(q.options[q.correct] || '');
    return [...shingles(right)].some((s) => body.has(s));
  });
  assert.ok(checks.length >= 2);
  assert.ok(grounded.length >= 2, `只有 ${grounded.length} 道接地`);
});

test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /均从本章 docs\/zh\.md 现算/);
  assert.match(r.stdout, /短视频必然删掉：全部限定条件/);
  assert.match(r.stdout, /不构成诊疗意见/);
});
