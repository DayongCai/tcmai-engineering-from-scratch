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
  assert.ok(body.includes('/chapters/08-k8/docs/zh.md'));
});

test('四类科室直接成本与两个比例从正文抓取', () => {
  const p = parseParams(readDoc());
  assert.strictEqual(p.admin, 2400);
  assert.strictEqual(p.aux, 1800);
  assert.strictEqual(p.tech, 3600);
  assert.strictEqual(p.clinic, 9000);
  assert.deepStrictEqual(p.adminRatio, [2, 3, 5]);
  assert.deepStrictEqual(p.auxRatio, [3, 7]);
});

test('分摊池 7,800 万元等于三类间接成本之和', () => {
  const p = parseParams(readDoc());
  assert.strictEqual(p.pool, 7800);
  assert.ok(compute(p).poolMatches);
});

test('三级分摊链逐级闭合', () => {
  const r = compute(parseParams(readDoc()));
  assert.ok(Math.abs(r.toAux1 - 480) < 1e-9);
  assert.ok(Math.abs(r.toTech1 - 720) < 1e-9);
  assert.ok(Math.abs(r.toClinic1 - 1200) < 1e-9);
  assert.ok(Math.abs(r.auxTotal - 2280) < 1e-9);
  assert.ok(Math.abs(r.toTech2 - 684) < 1e-9);
  assert.ok(Math.abs(r.toClinic2 - 1596) < 1e-9);
  assert.ok(Math.abs(r.techTotal - 5004) < 1e-9);
  assert.strictEqual(r.clinicTotal, 16800);
});

test('基数敏感性：312 万元，占 8.7%', () => {
  const r = compute(parseParams(readDoc()));
  assert.ok(Math.abs(r.headIndirect - 2098.2) < 0.01);
  assert.ok(Math.abs(r.revIndirect - 1786.2) < 0.01);
  assert.ok(Math.abs(r.diff - 312) < 0.01);
  assert.ok(Math.abs(r.diffRate - 8.7) < 0.06, `差额率 ${r.diffRate}`);
});

test('正文报告的结果都能在正文里找到', () => {
  const doc = readDoc();
  const p = parseParams(doc);
  assert.ok(assertDocNumbers(doc, p, compute(p)).length >= 9);
});

test('脚本可运行，输出含分摊链与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /一级　2,400 × 2:3:5 → 医辅 480、医技 720、临床 1,200/);
  assert.match(out, /临床总成本 = 9,000 \+ 1,200 \+ 1,596 \+ 5,004 = 16,800/);
  assert.match(out, /不构成价格测算结论/);
});
