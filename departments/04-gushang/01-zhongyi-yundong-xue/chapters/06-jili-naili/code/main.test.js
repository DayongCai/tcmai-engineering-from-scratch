'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, analyze } = require('./main.js');

const A = analyze(read());
const MAIN = path.join(__dirname, 'main.js');

test('正文就在本章目录下，章号与标题取自正文', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '06-jili-naili', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC), '正文文件不存在');
  assert.strictEqual(CHAPTER, 6);
  assert.strictEqual(TITLE, '力量练的是能不能做，耐力练的是能做多久');
  assert.ok(read().startsWith('# 第 ' + CHAPTER + ' 章'), '正文首行不是本章章题');
});

test('汉字数与正文快照一致', () => {
  assert.strictEqual(A.hanzi, 2900);
});

test('节数、表格数、引文条数与正文快照一致', () => {
  assert.strictEqual(A.sections.length, 7);
  assert.strictEqual(A.tables, 0);
  assert.strictEqual(A.citeCount, 6);
  assert.strictEqual(A.cites.length, 4);
});

test('每节都有字，各节相加不超过全篇（标题行不计入小节）', () => {
  for (const s of A.sections) assert.ok(s.hanzi > 0, s.title + ' 一节为空');
  const sum = A.sections.reduce((a, s) => a + s.hanzi, 0);
  assert.ok(sum > 0 && sum <= A.hanzi, `${sum} vs ${A.hanzi}`);
});

test('引文清单含本章据以立论的古籍', () => {
  assert.ok(A.cites.includes('素问·上古天真论'), A.cites.join('、'));
});

test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /均从本章 docs\/zh\.md 现算/);
  assert.match(out, /不构成诊疗意见/);
  assert.ok(out.includes('汉字 ' + 2855 + ' 字'), '输出里的汉字数与快照不一致');
});
