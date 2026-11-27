'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, KEYWORDS, read, analyze } = require('./main.js');

const A = analyze(read());
const MAIN = path.join(__dirname, 'main.js');

test('正文就在本章目录下，章号与标题取自正文', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '06-jizhu-jiepou', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC), '正文文件不存在');
  assert.strictEqual(CHAPTER, 6);
  assert.strictEqual(TITLE, '脊柱的稳定是三根柱子的事，不是一块骨头的事');
  assert.ok(read().startsWith('# 第 ' + CHAPTER + ' 章'), '正文首行不是本章章题');
});

test('汉字数与正文快照一致', () => {
  assert.strictEqual(A.hanzi, 3114);
});

test('节数、表格数、引文条数与正文快照一致', () => {
  assert.strictEqual(A.sections.length, 6);
  assert.strictEqual(A.tables, 2);
  assert.strictEqual(A.citeCount, 1);
  assert.deepStrictEqual(A.cites, ["灵枢·海论"]);
});

test('判据词计数与正文快照一致，说明本章的判据落在句子上', () => {
  const map = Object.fromEntries(A.keywords.map((k) => [k.word, k.hits]));
  assert.deepStrictEqual(map, {"三柱":5,"椎弓根":8,"椎间孔":7,"侧隐窝":3,"马尾":7,"椎间盘":15});
  assert.strictEqual(A.keywords.length, KEYWORDS.length);
  for (const k of A.keywords) assert.ok(k.hits > 0, k.word + ' 在正文里一次都没出现');
});

test('每节都有字，各节相加不超过全篇（标题行不计入小节）', () => {
  for (const s of A.sections) assert.ok(s.hanzi > 0, s.title + ' 一节为空');
  const sum = A.sections.reduce((a, s) => a + s.hanzi, 0);
  assert.ok(sum > 0 && sum <= A.hanzi, sum + ' vs ' + A.hanzi);
});

test('加粗判断与引言行数取自正文', () => {
  assert.strictEqual(A.claims, 23);
  assert.strictEqual(A.quote, 2);
});

test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes('均从本章 docs/zh.md 现算'), '缺少现算口径声明');
  assert.ok(out.includes('不构成诊断或治疗意见'), '缺少边界声明');
  assert.ok(out.includes('汉字 3114 字'), '输出里的汉字数与快照不一致');
  assert.ok(out.includes('引文 1 条'), '输出里的引文条数与快照不一致');
  assert.ok(out.includes('命中最多的词'), '输出里没有判据词汇总');
});
