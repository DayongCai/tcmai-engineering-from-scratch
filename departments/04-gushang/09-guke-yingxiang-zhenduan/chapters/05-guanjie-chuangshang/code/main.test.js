/**
 * 骨科影像诊断学 · 第 5 章 判据现算的回归测试
 * 全部以本章 docs/zh.md 为唯一数据源：正文改了，快照就要跟着改，否则测试先红。
 */
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
  assert.ok(DOC.endsWith(path.join('chapters', '05-guanjie-chuangshang', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC), '正文文件不存在');
  assert.strictEqual(CHAPTER, 5);
  assert.strictEqual(TITLE, '关节的伤，看不见的那一半才是麻烦');
  assert.ok(read().startsWith('# 第 ' + CHAPTER + ' 章'), '正文首行不是本章章题');
});

test('汉字数与正文快照一致，且不是占位稿', () => {
  assert.strictEqual(A.hanzi, 2580);
  assert.ok(A.hanzi > 2000, '本章正文过短：' + A.hanzi);
});

test('节数、表格数与引文取自正文', () => {
  assert.strictEqual(A.sections.length, 6);
  assert.strictEqual(A.tables, 0);
  assert.strictEqual(A.citeCount, 2);
  assert.deepStrictEqual(A.cites, ["素问·阴阳应象大论"]);
});

test('判据词计数与正文快照一致，说明本章的判据落在句子上', () => {
  const map = Object.fromEntries(A.keywords.map((k) => [k.word, k.hits]));
  assert.deepStrictEqual(map, {"韧带":30,"骨髓水肿":5,"半月板":12,"关节面":6,"积液":6});
  assert.strictEqual(A.keywords.length, KEYWORDS.length);
  for (const k of A.keywords) assert.ok(k.hits > 0, k.word + ' 在正文里一次都没出现');
});

test('每节都有字，各节相加不超过全篇；边界条数可复算', () => {
  for (const s of A.sections) assert.ok(s.hanzi > 0, s.title + ' 一节为空');
  const sum = A.sections.reduce((a, s) => a + s.hanzi, 0);
  assert.ok(sum > 0 && sum <= A.hanzi, sum + ' vs ' + A.hanzi);
  assert.strictEqual(A.bounds, 5);
  const boundary = A.sections.filter((s) => s.title === '代价与边界');
  assert.strictEqual(boundary.length, 1);
});

test('加粗判断与引言行数取自正文', () => {
  assert.strictEqual(A.claims, 31);
  assert.strictEqual(A.quote, 2);
});

test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes('均从本章 docs/zh.md 现算'), '缺少现算口径声明');
  assert.ok(out.includes('不构成诊断或治疗意见'), '缺少边界声明');
  assert.ok(out.includes('汉字 2580 字'), '输出里的汉字数与快照不一致');
  assert.ok(out.includes('节 6 节'), '输出里的节数与快照不一致');
  assert.ok(out.includes('代价与边界 5 条'), '输出里的边界条数与快照不一致');
  assert.ok(out.includes('命中最多的词'), '输出里没有判据词汇总');
});
