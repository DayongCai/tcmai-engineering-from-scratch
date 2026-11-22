'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  readDoc, parseParams, compute, assertDocNumbers, DOC_PATH,
} = require('./main.js');

test('正文可读，且脚本头部指向本章正文', () => {
  assert.ok(fs.existsSync(DOC_PATH));
  const body = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
  assert.ok(body.includes('/chapters/01-k1/docs/zh.md'));
});

test('六个基础参数从正文抓取', () => {
  const p = parseParams(readDoc());
  assert.deepStrictEqual(p, {
    medical: 81800, fiscal: 4200, expense: 89000,
    depreciation: 6100, receivable: 3200, welfare: 2700,
  });
});

test('四种口径各自可复算', () => {
  const r = compute(parseParams(readDoc()));
  assert.strictEqual(r.income, 86000);
  assert.strictEqual(r.surplus, -3000);
  assert.strictEqual(r.cashAbility, 3100);
  assert.strictEqual(r.operatingCash, -100);
  assert.strictEqual(r.operating, -300);
});

test('收支缺口与折旧倍数与正文一致', () => {
  const r = compute(parseParams(readDoc()));
  assert.ok(Math.abs(r.gapRate - 3.488) < 0.01, `缺口率 ${r.gapRate}`);
  assert.ok(Math.abs(r.depMultiple - 2.033) < 0.01, `折旧倍数 ${r.depMultiple}`);
});

test('正文报告的每个结果都能在正文里找到', () => {
  const doc = readDoc();
  const p = parseParams(doc);
  const lines = assertDocNumbers(doc, p, compute(p));
  assert.ok(lines.length >= 7, `对账项 ${lines.length}`);
});

test('脚本可运行，输出含四个口径与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /会计结余　　　　[\d,]+ \+ [\d,]+ − [\d,]+ = −3,000/);
  assert.match(out, /扣除应收增加　　3,100 − 3,200 = −100/);
  assert.match(out, /不构成对任何机构的财务评价/);
});
