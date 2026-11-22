'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, SLUG, read, num, cn, cnIn, section, rowsIn, analyze, checks } = require('./main.js');

const A = analyze(read());

test('正文就在本章目录下，且是第 8 章', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '08-r8', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC), '正文文件不存在');
  assert.strictEqual(CHAPTER, 8);
  assert.strictEqual(SLUG, path.basename(path.join(__dirname, '..')));
  assert.ok(read().startsWith('# 第 8 章 · ' + TITLE), '正文标题与章号/标题不符: ' + read().slice(0, 40));
});

test('结构快照与正文一致（汉字、节、表格、加粗判断、引书）', () => {
  assert.strictEqual(A.hanzi, 2703);
  assert.strictEqual(A.sections.length, 6);
  assert.strictEqual(A.tables, 1);
  assert.strictEqual(A.claims, 31);
  assert.strictEqual(A.cites.length, 1);
});

test('逐节字数相加不超过全篇（标题行不计入小节）', () => {
  const sum = A.sections.reduce((s, x) => s + x.hanzi, 0);
  assert.ok(sum > 0 && sum <= A.hanzi, sum + ' vs ' + A.hanzi);
});

test('每项换算都与正文写下的数对得上', () => {
  const cs = checks(read());
  assert.ok(cs.length >= 2, '换算项过少');
  for (const c of cs) {
    assert.ok(c.name && c.unit, '换算项缺名称或单位');
    const ok = c.cmp === 'lte' ? c.computed <= c.stated : Math.abs(c.computed - c.stated) <= c.tol;
    assert.ok(ok, c.name + '：算得 ' + c.computed + '，正文写 ' + c.stated);
  }
});

test('取数与切片函数取不到就报错，不静默兜底', () => {
  assert.throws(() => num('这段文本里没有那个关键词', '某医药集团'), /找不到关键词/);
  assert.throws(() => num('某医药集团 后面没有数字', '某医药集团'), /没有数字/);
  assert.throws(() => cnIn('没有数词的短语'), /没有中文数词/);
});

test('正文可切片、可数表行', () => {
  assert.ok(section(read(), '代价与边界').length > 100, '代价与边界一节切不出来');
  assert.strictEqual(rowsIn(read(), '代价与边界'), 0);
});

test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /均从本章 docs\/zh\.md 现算/);
  assert.match(out, /不构成/);
  assert.ok(!/✗/.test(out), '脚本输出里出现了对不上的换算');
});
