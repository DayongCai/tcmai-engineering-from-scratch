'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { readDoc, restingReasons, synapseSteps, receptors, diameterFor, speedUp, myelinLogic } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');

test('正文是本章那一份', () => {
  const doc = readDoc();
  assert.ok(doc.includes('动作电位') && doc.includes('突触'));
  assert.ok((doc.match(/[\u4e00-\u9fff]/g) || []).length > 2000);
});

test('静息电位三条成因，主项是钾漏通道', () => {
  const r = restingReasons(readDoc());
  assert.strictEqual(r.length, 3);
  assert.match(r[0], /钾漏通道/);
  assert.match(r[1], /通透/);
  assert.match(r[2], /泵/);
});

test('突触五环节，第二环是钙内流', () => {
  const s = synapseSteps(readDoc());
  assert.strictEqual(s.length, 5);
  assert.deepStrictEqual(s.map((x) => x.step), ['到达', '钙内流', '囊泡融合', '受体结合', '递质清除']);
  assert.match(s[1].blocked, /无释放/);
  assert.match(s[2].event, /SNARE/);
});

test('三类受体，时程依次变长', () => {
  const rs = receptors(readDoc());
  assert.strictEqual(rs.length, 3);
  assert.match(rs[0].type, /离子通道型/);
  assert.match(rs[0].detail, /毫秒级/);
  assert.match(rs[1].type, /G 蛋白偶联型/);
  assert.match(rs[1].detail, /秒级到分钟级/);
  assert.match(rs[2].type, /酶联型/);
  assert.match(rs[2].detail, /分钟到小时/);
});

test('平方根换算：速度翻倍要直径四倍，直径四倍只换来速度两倍', () => {
  assert.strictEqual(diameterFor(2), 4);
  assert.strictEqual(diameterFor(3), 9);
  assert.strictEqual(speedUp(4), 2);
  assert.strictEqual(speedUp(9), 3);
  assert.throws(() => diameterFor(0));
  assert.throws(() => speedUp(-1));
});

test('髓鞘的三条工程解在正文里成立', () => {
  const m = myelinLogic(readDoc());
  assert.strictEqual(m.fewerRegenerations, true);
  assert.strictEqual(m.noWiderAxon, true);
  assert.strictEqual(m.saltatory, true);
});

test('脚本可跑，输出含换算与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /直径要加粗到 4 倍/);
  assert.match(out, /不含任何测得的速度值/);
  assert.match(out, /不构成临床判断依据/);
});

test('代码头部指向本章正文', () => {
  assert.ok(fs.readFileSync(MAIN, 'utf8').includes('/06-shenjingyuan-xinxi-chuandi/docs/zh.md'));
});
