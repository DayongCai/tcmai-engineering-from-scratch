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
  assert.ok(DOC.endsWith(path.join('chapters', '01-yichuanxue-gailun', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC), '正文文件不存在');
  assert.strictEqual(CHAPTER, 1);
  assert.strictEqual(TITLE, '遗传学的医学价值不在「找到那个基因」，在「把个体风险从人群平均里拆出来」');
  assert.ok(TEXT.startsWith('# 第 1 章'), '正文首行不是本章章题');
});

test('结构量与正文快照一致', () => {
  assert.strictEqual(A.hanzi, 2968);
  assert.strictEqual(A.sections.length, 6);
  assert.strictEqual(A.tables, 1);
  assert.ok(A.claims > 0);
});

test('每一节都有字，逐节相加不超过全篇', () => {
  for (const s of A.sections) assert.ok(s.hanzi > 0, s.title + ' 一节为空');
  const sum = A.sections.reduce((n, s) => n + s.hanzi, 0);
  assert.ok(sum > 0 && sum <= A.hanzi, `${sum} vs ${A.hanzi}`);
});

test('三道换算的每个结果都能对上正文写下的同一个数', () => {
  for (const f of FIG) {
    assert.ok(f.ok, `${f.name}：算得 ${f.got}，正文写 ${f.token}`);
    assert.ok(TEXT.includes(f.token), `正文里找不到 ${f.token}（${f.name}）`);
  }
});

test('阴性后的残余风险落在 1/490 量级，且不为零', () => {
  const r = FIG.find((f) => f.name === '阴性后的残余携带概率');
  assert.ok(r.got > 0.0015 && r.got < 0.0025, String(r.got));
  const prior = FIG.find((f) => f.name === '携带者频率 2pq');
  assert.ok(r.got < prior.got / 5, '一次阴性应把风险压低一个量级');
});

test('脚本可运行，输出含现算口径与免责边界', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /均从本章 docs\/zh\.md 现算/);
  assert.match(out, /不构成医学意见/);
  assert.ok(out.includes('汉字 ' + A.hanzi + ' 字'), '输出里的汉字数与快照不一致');
  assert.ok(out.includes('200∶1'), '输出里应列出 200∶1 这一对照');
});
