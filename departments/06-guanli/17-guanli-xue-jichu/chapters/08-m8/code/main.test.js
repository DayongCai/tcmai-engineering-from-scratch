'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { DOC, CHAPTER, TITLE, read, facts, retention, overall } = require('./main.js');

const TEXT = read();
const F = facts(TEXT);

test('正文就在本章目录下，章号与标题对得上', () => {
  assert.ok(fs.existsSync(DOC), DOC);
  assert.ok(DOC.endsWith(path.join('chapters', '08-m8', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 8);
  assert.strictEqual(TITLE, '变革死在半路，文化活在细节');
  assert.match(TEXT, /^# 第 8 章/);
});

test('变革次数、断层比例都取自正文', () => {
  assert.strictEqual(F.reforms, 4);
  assert.strictEqual(F.revertMonths, 3);
  assert.strictEqual(F.knowPct, 87);
  assert.strictEqual(F.actionPct, 31);
  assert.strictEqual(F.benefitPct, 12);
  assert.strictEqual(F.kotterFailShare, 70);
});

test('断层逐层变窄，保留比例可复算', () => {
  assert.ok(Math.abs(retention(87, 31) - 35.6) < 0.1, String(retention(87, 31)));
  assert.ok(Math.abs(retention(31, 12) - 38.7) < 0.1, String(retention(31, 12)));
  assert.ok(retention(87, 31) < 40);
  assert.ok(retention(31, 12) < 40);
});

test('从知道到愿意只剩约 13.8%', () => {
  const o = overall(F);
  assert.ok(Math.abs(o - 13.8) < 0.1, String(o));
  assert.strictEqual(o, (F.benefitPct / F.knowPct) * 100);
  assert.ok(o * 7 < 100, '不足七分之一');
});

test('零基期报错，不返回 Infinity', () => {
  assert.throws(() => retention(0, 12), /前一层比例必须为正/);
});

test('脚本可运行，输出漏斗与失败率提示', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /漏斗/);
  assert.match(out, /保留/);
  assert.match(out, /现算/);
  assert.match(out, /不构成管理咨询意见或改革实施方案/);
});
