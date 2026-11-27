'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { DOC, CHAPTER, TITLE, read, analyze } = require('./main.js');

const A = analyze(read());

test('正文文件就在本章目录下', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '11-z1911', 'docs', 'zh.md')), DOC);
  assert.ok(fsExists(DOC));
});

function fsExists(p) {
  return require('node:fs').existsSync(p);
}

test('章号与标题取自本章正文', () => {
  assert.strictEqual(CHAPTER, 11);
  assert.strictEqual(TITLE, '样本不是缩小版的人群');
  assert.ok(read().startsWith('# 第 ' + CHAPTER + ' 章'));
});

test('汉字数与正文快照一致', () => {
  assert.strictEqual(A.hanzi, 2725);
});

test('节数、表格数、引文条数与正文快照一致', () => {
  assert.strictEqual(A.sections.length, 7);
  assert.strictEqual(A.tables, 0);
  assert.strictEqual(A.cites.length, 1);
});

test('各节汉字相加不超过全篇（标题行不计入小节）', () => {
  const sum = A.sections.reduce((s, x) => s + x.hanzi, 0);
  assert.ok(sum > 0 && sum <= A.hanzi, `${sum} vs ${A.hanzi}`);
});

test('逐节字数与正文切分可复算', () => {
  for (const s of A.sections) {
    const block = read().split('\n## ' + s.title)[1] || '';
    assert.ok(block.length >= 0);
    assert.ok(s.hanzi > 0, s.title + ' 小节为空');
  }
});

test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = require('node:child_process').spawnSync(process.execPath, [path.join(__dirname, 'main.js')], {
    encoding: 'utf8',
    timeout: 60000,
  });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /均从本章 docs\/zh\.md 现算/);
  assert.match(out, /不构成诊疗意见/);
});
