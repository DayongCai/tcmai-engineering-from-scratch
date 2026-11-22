'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { readDoc, potency, stemCells, criteria, combinatorics, locks, organSteps } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');

test('正文是本章那一份', () => {
  const doc = readDoc();
  assert.ok(doc.includes('分化') && doc.includes('干细胞'));
  assert.ok((doc.match(/[\u4e00-\u9fff]/g) || []).length > 2000);
});

test('潜能四层，顺序从全能到定向', () => {
  const p = potency(readDoc());
  assert.strictEqual(p.length, 4);
  assert.deepStrictEqual(p.map((x) => x.level), ['全能', '多能', '多潜（单能）', '定向']);
  assert.match(p[0].wholeOrganism, /能/);
  assert.match(p[1].wholeOrganism, /不能/);
});

test('分化三条判据，功能排在最后一条', () => {
  const c = criteria(readDoc());
  assert.strictEqual(c.length, 3);
  assert.match(c[0], /形态/);
  assert.match(c[1], /标志物/);
  assert.match(c[2], /功能/);
});

test('算术：类型数少于基因数，比值约 100', () => {
  const c = combinatorics(readDoc());
  assert.strictEqual(c.types, 200);
  assert.strictEqual(c.genes, 20000);
  assert.strictEqual(c.genesPerType, 100);
  assert.strictEqual(c.typesAreFewer, true);
});

test('干细胞三源，各有主要问题', () => {
  const s = stemCells(readDoc());
  assert.strictEqual(s.length, 3);
  assert.match(s[0].source, /胚胎干细胞/);
  assert.match(s[2].source, /诱导多能干细胞/);
  for (const x of s) assert.ok(x.problem.length >= 4, `问题缺失: ${x.source}`);
});

test('表观锁定四层叠成棘轮效应', () => {
  const l = locks(readDoc());
  assert.strictEqual(l.layers.length, 4);
  assert.strictEqual(l.ratchet, true);
});

test('器官发生四件事，凋亡是其中之一', () => {
  const o = organSteps(readDoc());
  assert.strictEqual(o.length, 4);
  assert.match(o[0], /分支与腔化/);
  assert.match(o[2], /程序性死亡/);
  assert.match(o[3], /血管与神经/);
});

test('脚本可跑，输出含比值与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /多约 100 倍/);
  assert.match(out, /只是除法/);
  assert.match(out, /不构成临床判断依据/);
});

test('代码头部指向本章正文', () => {
  assert.ok(fs.readFileSync(MAIN, 'utf8').includes('/11-xibao-fenhua-yu-qiguan-fasheng/docs/zh.md'));
});
