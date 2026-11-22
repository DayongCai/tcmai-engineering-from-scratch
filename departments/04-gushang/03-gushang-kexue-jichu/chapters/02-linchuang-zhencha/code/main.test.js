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
  assert.ok(DOC.endsWith(path.join('chapters', '02-linchuang-zhencha', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC), '正文文件不存在');
  assert.strictEqual(CHAPTER, 2);
  assert.strictEqual(TITLE, '影像能看见骨折线，看不见病人是怎么伤的');
  assert.ok(read().startsWith('# 第 ' + CHAPTER + ' 章'), '正文首行不是本章章题');
});

test('规模与正文快照一致', () => {
  assert.strictEqual(A.hanzi, 2788);
  assert.strictEqual(A.sections.length, 6);
  assert.strictEqual(A.citeCount, 2);
});

test('特殊检查表读得出来：十项、每项四栏', () => {
  assert.strictEqual(A.tests.length, 10);
  assert.deepStrictEqual(A.badRows, [], '有行不是四栏: ' + A.badRows.join('、'));
  for (const r of A.tests) {
    assert.ok(r.test.length > 0, '动作列为空');
    assert.ok(r.positive.length > 0, r.test + ' 缺阳性提示');
    assert.ok(r.limit.length > 0, r.test + ' 缺局限');
  }
});

test('部位归类覆盖肩、膝、腕、髋四个高频部位', () => {
  for (const s of ['肩', '膝', '腕', '髋']) assert.ok(A.siteCount[s] >= 1, '缺部位: ' + s);
  assert.strictEqual(A.siteCount['膝'], 3);
  assert.strictEqual(A.siteCount['腕'], 2);
});

test('量诊三个同与神经血管两次检查都在正文里', () => {
  assert.deepStrictEqual(A.sameThree, ['同一解剖标志', '同一水平', '同一体位']);
  assert.ok(A.twice, '正文没有写「复位前一次、复位后一次」');
  assert.ok(A.falsPositive, '正文没有给出「验前概率」的定位');
});

test('影像次序与正文叙述一致：X 线先于 CT 先于 MRI 先于超声', () => {
  assert.ok(A.chainOrdered, JSON.stringify(A.chain));
  assert.deepStrictEqual(A.chain.map((c) => c.key), ['X 线', 'CT', 'MRI', '超声']);
});

test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /均从本章 docs\/zh\.md 现算/);
  assert.match(out, /不构成诊疗意见/);
  assert.ok(out.includes('特殊检查表：10 项'));
  assert.ok(out.includes('与正文叙述一致'));
});
