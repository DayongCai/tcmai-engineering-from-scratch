'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { readDoc, parseFrequencyTable, compute, DOC_PATH } = require('./main.js');

test('正文可读，脚本头部指向本章正文', () => {
  assert.ok(fs.existsSync(DOC_PATH));
  const body = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
  assert.ok(body.includes('/chapters/02-miaoshu-fenbu/docs/zh.md'));
});

test('频数表从正文解析出 10 个组段，合计 30 例', () => {
  const rows = parseFrequencyTable(readDoc());
  assert.strictEqual(rows.length, 10);
  assert.strictEqual(rows.reduce((a, r) => a + r.freq, 0), 30);
  assert.strictEqual(rows[9].high, 9.9);
});

test('累积频数逐行自洽，末行等于总例数', () => {
  const rows = parseFrequencyTable(readDoc());
  let acc = 0;
  for (const row of rows) { acc += row.freq; assert.strictEqual(row.cum, acc); }
  assert.strictEqual(acc, 30);
});

test('组中值加权均数与正文均数接近', () => {
  const r = compute(readDoc());
  assert.ok(Math.abs(r.groupedMean - r.mean) < 0.1, `分组均数 ${r.groupedMean}`);
  assert.strictEqual(r.mean, 5.71);
  assert.strictEqual(r.sd, 1.29);
});

test('均数减标准差的下限为 4.42，且正文引用了这个数', () => {
  const doc = readDoc();
  const r = compute(doc);
  assert.ok(Math.abs(r.lower - 4.42) < 1e-9);
  assert.ok(doc.includes('5.71−1.29=4.42'));
});

test('标准误与标准差之比约为 0.18', () => {
  const r = compute(readDoc());
  assert.ok(Math.abs(r.seRatio - 0.18) < 0.005, `实际 ${r.seRatio}`);
});

test('均数大于中位数，形状判为右偏', () => {
  const r = compute(readDoc());
  assert.ok(r.skewSign > 0);
  assert.strictEqual(r.median, 5.30);
});

test('脚本可运行，输出含对账与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /样本 30 例，频数表 10 个组段/);
  assert.match(out, /标准误 \/ 标准差 = 0\.183/);
  assert.match(out, /不构成诊断标准/);
});
