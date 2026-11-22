'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, analyze, figures } = require('./main.js');

const TEXT = read();
const A = analyze(TEXT);
const FIG = figures(TEXT);
const MAIN = path.join(__dirname, 'main.js');

test('正文就在本章目录下，章号与标题取自正文', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '02-jiyin-de-jiegou-zuzhi', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC), '正文文件不存在');
  assert.strictEqual(CHAPTER, 2);
  assert.strictEqual(TITLE, '基因不是「一段编码」，是一套带开关的坐标系');
  assert.ok(TEXT.startsWith('# 第 2 章'), '正文首行不是本章章题');
});

test('结构量与正文快照一致', () => {
  assert.strictEqual(A.hanzi, 2608);
  assert.strictEqual(A.sections.length, 6);
  assert.strictEqual(A.tables, 2);
});

test('每节都有字，逐节相加不超过全篇', () => {
  for (const s of A.sections) assert.ok(s.hanzi > 0, s.title + ' 一节为空');
  const sum = A.sections.reduce((n, s) => n + s.hanzi, 0);
  assert.ok(sum > 0 && sum <= A.hanzi, `${sum} vs ${A.hanzi}`);
});

test('算例的三个结果都能对上正文写下的同一个数', () => {
  for (const f of FIG) {
    assert.ok(f.ok, `${f.name}：算得 ${f.got}，正文写 ${f.token}`);
    assert.ok(TEXT.includes(f.token), `正文里找不到 ${f.token}（${f.name}）`);
  }
});

test('平均外显子长度由 CDS 与外显子数除得，不是另给的数字', () => {
  const avg = FIG.find((f) => f.name === '平均外显子长度');
  assert.strictEqual(Math.round(avg.got), 150);
  assert.ok(avg.got * 20 === 3000, '20 个外显子 × 平均长度应回到 CDS 全长');
});

test('三条判读线索在正文里都有对应表述', () => {
  for (const s of ['整段外显子跳跃', '拓扑结构域边界', '无义介导的降解', '可复核的证据']) {
    assert.ok(TEXT.includes(s), `正文里找不到「${s}」`);
  }
});

test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /均从本章 docs\/zh\.md 现算/);
  assert.match(out, /不构成变异致病性判定/);
  assert.ok(out.includes('汉字 ' + A.hanzi + ' 字'), '输出里的汉字数与快照不一致');
});
