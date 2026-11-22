'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, analyze, figures, chapterDirs, firstTableRows, listAfter, citeTitles } = require('./main.js');

const TEXT = read();
const A = analyze(TEXT);
const FIG = figures(TEXT);
const MAIN = path.join(__dirname, 'main.js');

test('正文就在本章目录下，章号与标题取自正文', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '12-zhongyi-yichuan-xue', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC), '正文文件不存在');
  assert.strictEqual(CHAPTER, 12);
  assert.strictEqual(TITLE, '「禀赋」不是遗传学的同义词，它是一套描述系统，价值在提问而不在术语对接');
  assert.ok(TEXT.startsWith('# 第 12 章'), '正文首行不是本章章题');
});

test('结构量与正文快照一致', () => {
  assert.strictEqual(A.hanzi, 3025);
  assert.strictEqual(A.sections.length, 7);
  assert.strictEqual(A.tables, 1);
});

test('每节都有字，逐节相加不超过全篇', () => {
  for (const s of A.sections) assert.ok(s.hanzi > 0, s.title + ' 一节为空');
  const sum = A.sections.reduce((n, s) => n + s.hanzi, 0);
  assert.ok(sum > 0 && sum <= A.hanzi, `${sum} vs ${A.hanzi}`);
});

test('每个算式的结果都能对上正文写下的同一个数', () => {
  assert.ok(FIG.length >= 3, '算式太少：' + FIG.length);
  for (const f of FIG) {
    assert.ok(f.ok, `${f.name}：算得 ${f.got}，正文写 ${f.token}`);
    assert.ok(TEXT.includes(f.token), `正文里找不到 ${f.token}（${f.name}）`);
  }
});

test('本课章数与章节目录一致，本章为最后一章', () => {
  const dirs = chapterDirs();
  assert.strictEqual(dirs.length, 12);
  assert.ok(dirs[dirs.length - 1].startsWith('12-'), dirs.join('、'));
});

test('首表正是禀赋三层，且三处可/不可对接各为三条', () => {
  assert.strictEqual(firstTableRows(TEXT).length, 3);
  assert.strictEqual(listAfter(TEXT, '可对接的三处').length, 3);
  assert.strictEqual(listAfter(TEXT, '不可对接的三处').length, 3);
});

test('引书只到篇名，且不是现代遗传学文献', () => {
  const cites = citeTitles(TEXT);
  assert.ok(cites.length >= 2, cites.join('、'));
  for (const c of cites) assert.ok(/灵枢|素问/.test(c), `引文 ${c} 不在内经篇名之列`);
});

test('本章的边界声明在正文里都有对应', () => {
  for (const s of ['功能模型', '没有比数', '把模型读成了地图', '不能互相换算']) {
    assert.ok(TEXT.includes(s), `正文里找不到「${s}」`);
  }
});


test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /均从本章 docs\/zh\.md 与章节目录现算/);
  assert.match(out, /不构成医学意见/);
  assert.ok(out.includes('汉字 ' + A.hanzi + ' 字'), '输出里的汉字数与快照不一致');
});
