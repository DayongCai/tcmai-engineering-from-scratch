'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { readDoc, geneticCode, ribosomeSites, sorting, signalFor, fidelity, degradation } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');

test('正文是本章那一份', () => {
  const doc = readDoc();
  assert.ok(doc.includes('密码') && doc.includes('信号肽'));
  assert.ok((doc.match(/[\u4e00-\u9fff]/g) || []).length > 2000);
});

test('密码分配：64 = 61 + 3，冗余 3.05 倍', () => {
  const gc = geneticCode(readDoc());
  assert.deepStrictEqual({ c: gc.codons, s: gc.sense, st: gc.stop, a: gc.aminoAcids }, { c: 64, s: 61, st: 3, a: 20 });
  assert.strictEqual(gc.redundancy, 3.05);
  assert.strictEqual(gc.stopShare, 4.69);
});

test('核糖体三位点，A 进 P 成键 E 出', () => {
  const s = ribosomeSites(readDoc());
  assert.strictEqual(s.length, 3);
  assert.match(s[0].site, /A 位/);
  assert.match(s[0].event, /校对/);
  assert.match(s[1].site, /P 位/);
  assert.match(s[1].event, /肽键/);
  assert.match(s[2].site, /E 位/);
  assert.match(s[2].event, /释放/);
});

test('分选表：六个目的地，各有地址信号', () => {
  const t = sorting(readDoc());
  assert.strictEqual(t.length, 6);
  for (const row of t) assert.ok(row.signal.length >= 2, `地址信号缺失: ${row.destination}`);
  assert.match(signalFor('线粒体', readDoc()).signal, /前导序列/);
  assert.match(signalFor('内质网', readDoc()).signal, /信号肽/);
  assert.match(signalFor('溶酶体', readDoc()).signal, /甘露糖/);
  assert.match(signalFor('核', readDoc()).signal, /核定位/);
  assert.throws(() => signalFor('叶绿体', readDoc()));
});

test('保真度在合成酶，信号肽会被切除', () => {
  const f = fidelity(readDoc());
  assert.strictEqual(f.atSynthetase, true);
  assert.strictEqual(f.secondCode, true);
  assert.strictEqual(f.ribozyme, true);
  assert.strictEqual(f.signalPeptideCleaved, true);
});

test('两条降解路，自噬在基础状态也在跑', () => {
  const d = degradation(readDoc());
  assert.strictEqual(d.proteasome, true);
  assert.strictEqual(d.autophagy, true);
  assert.strictEqual(d.autophagyBasal, true);
});

test('脚本可跑，输出含冗余比与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /= 3\.05 倍/);
  assert.match(out, /只是除法/);
  assert.match(out, /不构成临床判断依据/);
});

test('代码头部指向本章正文', () => {
  assert.ok(fs.readFileSync(MAIN, 'utf8').includes('/10-danbaizhi-hecheng-yu-xibao-gongneng/docs/zh.md'));
});
