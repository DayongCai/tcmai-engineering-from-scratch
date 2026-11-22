'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  readDoc,
  nucleosome,
  tiers,
  chromatinKinds,
  reversibleKinds,
  ranGradient,
  telomereLogic,
  nucleolusZones,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');

test('正文是本章那一份', () => {
  const doc = readDoc();
  assert.ok(doc.includes('核小体') && doc.includes('染色质'));
  assert.ok((doc.match(/[\u4e00-\u9fff]/g) || []).length > 2000);
});

test('核小体两个数从正文取出，一圈的碱基对数现算', () => {
  const n = nucleosome(readDoc());
  assert.strictEqual(n.basePairs, 147);
  assert.strictEqual(n.wraps, 1.7);
  assert.strictEqual(n.perTurn, 86.47);
});

test('三级折叠依次是核小体、30 纳米纤维、环与域', () => {
  const t = tiers(readDoc());
  assert.strictEqual(t.length, 3);
  assert.deepStrictEqual(t.map((x) => x.level), ['一级', '二级', '三级']);
  assert.match(t[0].name, /核小体/);
  assert.match(t[1].name, /30 纳米纤维/);
  assert.match(t[2].name, /环与域/);
});

test('三种染色质状态，只有兼性异染色质是可逆的关闭', () => {
  const ks = chromatinKinds(readDoc());
  assert.strictEqual(ks.length, 3);
  assert.deepStrictEqual(reversibleKinds(readDoc()), ['兼性异染色质']);
  const consti = ks.find((k) => k.kind.includes('组成型'));
  assert.match(consti.reversible, /不可逆/);
  assert.match(consti.mark, /H3K9/);
});

test('Ran 梯度给方向，不靠推', () => {
  const r = ranGradient(readDoc());
  assert.strictEqual(r.gtpInNucleus, true);
  assert.strictEqual(r.gdpInCytoplasm, true);
  assert.strictEqual(r.releasesCargo, true);
});

test('端粒是复制缺陷的补偿装置，不是寿命时钟', () => {
  const t = telomereLogic(readDoc());
  assert.strictEqual(t.notThis, '寿命时钟');
  assert.match(t.cause, /复制机制缺陷/);
  assert.strictEqual(t.patch, '补偿装置');
});

test('核仁三层按转录、加工、装配排开', () => {
  const z = nucleolusZones(readDoc());
  assert.strictEqual(z.length, 3);
  assert.match(z[0].duty, /转录/);
  assert.match(z[1].duty, /加工/);
  assert.match(z[2].duty, /装配/);
});

test('脚本可跑，输出含换算与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /86\.47 个碱基对/);
  assert.match(out, /现抓现算/);
  assert.match(out, /不构成临床判断依据/);
});

test('代码头部指向本章正文', () => {
  assert.ok(fs.readFileSync(MAIN, 'utf8').includes('/07-xibaohe-yu-ransezhi/docs/zh.md'));
});
