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
  assert.ok(body.includes('/chapters/06-k6/docs/zh.md'));
});

test('净资产与负债结构从正文抓取，且合计等于负债总额', () => {
  const p = parseParams(readDoc());
  assert.strictEqual(p.netAssets, 74400);
  assert.strictEqual(p.assets, 120000);
  assert.strictEqual(p.liab, 45600);
  assert.strictEqual(p.curLiab, 40000);
  assert.strictEqual(p.nonCurLiab, 5600);
  assert.strictEqual(p.curLiab + p.nonCurLiab, p.liab);
});

test('长期缺口与流动缺口相等，都是 4,000 万元', () => {
  const r = compute(parseParams(readDoc()));
  assert.strictEqual(r.longFund, 80000);
  assert.strictEqual(r.longGap, 4000);
  assert.strictEqual(r.shortGap, 4000);
  assert.strictEqual(r.longGap, r.shortGap);
});

test('三条债务线与正文一致', () => {
  const r = compute(parseParams(readDoc()));
  assert.ok(Math.abs(r.debtRatio - 38.0) < 1e-9);
  assert.ok(Math.abs(r.interestRatio - 10.0) < 1e-9);
  assert.ok(Math.abs(r.coverRatio - 2.46875) < 1e-9);
});

test('两项基金提取可复算', () => {
  const r = compute(parseParams(readDoc()));
  assert.strictEqual(r.welfareFund, 720);
  assert.ok(Math.abs(r.riskFund - 166) < 1e-9);
});

test('正文报告的缺口与比率都能在正文里找到', () => {
  const doc = readDoc();
  const p = parseParams(doc);
  assert.ok(assertDocNumbers(doc, p, compute(p)).length >= 10);
});

test('脚本可运行，输出含两条缺口与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /非流动资产 84,000 − 长期资金 80,000 = 4,000/);
  assert.match(out, /偿债备付率　\(1,800 \+ 6,100\) ÷ 3,200 = 2\.47/);
  assert.match(out, /不构成融资建议/);
});
