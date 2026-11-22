'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  DOC,
  CHAPTER,
  TITLE,
  read,
  facts,
  relations,
  growthRatio,
  layers,
} = require('./main.js');

const TEXT = read();
const F = facts(TEXT);

test('正文就在本章目录下，章号与标题对得上', () => {
  assert.ok(fs.existsSync(DOC), DOC);
  assert.ok(DOC.endsWith(path.join('chapters', '07-m7', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 7);
  assert.strictEqual(TITLE, '组织图上的每一根线，都要有人能被叫来问');
  assert.match(TEXT, /^# 第 7 章/);
});

test('机构画像的五个数都取自正文', () => {
  assert.strictEqual(F.leaders, 8);
  assert.strictEqual(F.clinicalDepts, 31);
  assert.strictEqual(F.functionalDepts, 14);
  assert.strictEqual(F.span, 11);
  assert.strictEqual(F.signatures, 7);
  assert.strictEqual(F.directives, 3);
});

test('格兰丘纳斯公式复算 44 与 1,080，与正文一致', () => {
  assert.strictEqual(relations(4), 44);
  assert.strictEqual(relations(8), 1080);
  assert.strictEqual(relations(4), F.relFour);
  assert.strictEqual(relations(8), F.relEight);
  assert.strictEqual(4 + 4 * 3 + 4 * (Math.pow(2, 3) - 1), 44);
});

test('人数翻倍，关系数增至约 24.5 倍', () => {
  const ratio = growthRatio(4, 8);
  assert.ok(Math.abs(ratio - 24.5) < 0.1, String(ratio));
  assert.ok(relations(8) > relations(4) * 20, '应远高于线性增长');
  assert.ok(relations(5) > relations(4));
});

test('幅度决定层级，单元数与幅度取正文值', () => {
  const total = F.clinicalDepts + F.functionalDepts;
  assert.strictEqual(total, 45);
  assert.strictEqual(layers(total, F.span), 2);
  assert.ok(layers(600, 4) > layers(600, 8), '幅度越大层级越少');
  assert.strictEqual(layers(1, 5), 1);
});

test('非法输入报错，不返回 NaN', () => {
  assert.throws(() => relations(0), /必须是正整数/);
  assert.throws(() => relations(2.5), /必须是正整数/);
  assert.throws(() => layers(45, 1), /幅度需大于 1/);
  assert.throws(() => layers(0, 5), /单元数与幅度必须为正/);
});

test('脚本可运行，输出关系数与层级结论', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /关系数/);
  assert.match(out, /幅度与层级/);
  assert.match(out, /现算/);
  assert.match(out, /不构成管理咨询意见或机构设置方案/);
});
