'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { DOC, CHAPTER, TITLE, read, cnInt, facts, arrivalRate, rootShare } = require('./main.js');

const TEXT = read();
const F = facts(TEXT);

test('正文就在本章目录下，章号与标题对得上', () => {
  assert.ok(fs.existsSync(DOC), DOC);
  assert.ok(DOC.endsWith(path.join('chapters', '12-m12', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 12);
  assert.strictEqual(TITLE, '说过了不等于传到了，传到了不等于懂了');
  assert.match(TEXT, /^# 第 12 章/);
});

test('汉字整数换算：四十二、一百二十、七十八、三十一', () => {
  assert.strictEqual(cnInt('四十二'), 42);
  assert.strictEqual(cnInt('一百二十'), 120);
  assert.strictEqual(cnInt('七十八'), 78);
  assert.strictEqual(cnInt('三十一'), 31);
});

test('抽查的数字全部取自正文', () => {
  assert.strictEqual(F.policies, 42);
  assert.strictEqual(F.nurses, 120);
  assert.strictEqual(F.receivedPct, 81);
  assert.strictEqual(F.recallPct, 37);
  assert.strictEqual(F.events, 78);
  assert.strictEqual(F.handoverEvents, 31);
  assert.ok(Math.abs(F.handoverSharePct - 39.7) < 1e-9);
});

test('从收到到说得出只剩约 45.7%', () => {
  const rate = arrivalRate(F.receivedPct, F.recallPct);
  assert.ok(Math.abs(rate - 45.7) < 0.1, String(rate));
  assert.ok(rate < 50, '过半损耗');
  assert.strictEqual(arrivalRate(100, 37), 37);
});

test('交接缺失占 39.7%，与正文一致', () => {
  assert.ok(Math.abs(rootShare(F.events, F.handoverEvents) - F.handoverSharePct) < 0.05);
  assert.strictEqual(rootShare(78, 31).toFixed(1), '39.7');
});

test('非法参数报错，不返回负值', () => {
  assert.throws(() => arrivalRate(0, 37), /收到比例必须为正/);
  assert.throws(() => arrivalRate(50, 60), /不应多于/);
  assert.throws(() => rootShare(0, 31), /事件总数必须为正/);
});

test('脚本可运行，输出到达率与四道断点', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /说得出/);
  assert.match(out, /四道断点/);
  assert.match(out, /现算/);
  assert.match(out, /不构成医患沟通规范、法律意见或管理咨询意见/);
});
