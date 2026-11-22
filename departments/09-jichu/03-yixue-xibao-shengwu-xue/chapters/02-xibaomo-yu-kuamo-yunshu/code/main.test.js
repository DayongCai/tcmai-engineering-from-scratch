'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  readDoc,
  permeability,
  carriers,
  identify,
  pumpStoichiometry,
  pumpBudget,
  epithelialRoute,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');

test('正文是本章那一份', () => {
  const doc = readDoc();
  assert.ok(doc.includes('脂双层') && doc.includes('钠钾泵'));
  const hanzi = (doc.match(/[\u4e00-\u9fff]/g) || []).length;
  assert.ok(hanzi > 2000, `汉字过少: ${hanzi}`);
});

test('通透性排序解析出 4 级，最快的是小分子气体', () => {
  const p = permeability(readDoc());
  assert.strictEqual(p.length, 4);
  assert.match(p[0].kind, /小分子气体/);
  assert.match(p[p.length - 1].kind, /离子/);
  assert.strictEqual(p[p.length - 1].direct, false, '离子不应被算作可直接过');
});

test('三类转运蛋白解析出 3 行，通道不饱和、载体饱和', () => {
  const cs = carriers(readDoc());
  assert.strictEqual(cs.length, 3);
  const channel = cs.find((c) => c.type.startsWith('通道'));
  const carrier = cs.find((c) => c.type.includes('载体'));
  const pump = cs.find((c) => c.type.startsWith('泵'));
  assert.match(channel.saturation, /不明显/);
  assert.match(carrier.saturation, /明显/);
  assert.match(pump.dir, /逆梯度/);
});

test('两个问题定一类：三个探针各回本行', () => {
  const doc = readDoc();
  assert.strictEqual(identify({ dir: '顺', consumesEnergy: false, saturating: false }, doc).type, '通道');
  assert.match(identify({ dir: '顺', consumesEnergy: false, saturating: true }, doc).type, /载体/);
  assert.match(identify({ dir: '逆', consumesEnergy: true, saturating: true }, doc).type, /泵/);
});

test('凑不成一类的探针直接报错', () => {
  assert.throws(() => identify({ dir: '逆', consumesEnergy: false, saturating: false }, readDoc()));
});

test('化学计量从正文读出：3 出 2 入 1 个 ATP，净 +1', () => {
  const s = pumpStoichiometry(readDoc());
  assert.deepStrictEqual({ na: s.na, k: s.k, atp: s.atp, netCharge: s.netCharge }, { na: 3, k: 2, atp: 1, netCharge: 1 });
});

test('泵的账按轮数现算，余数进位', () => {
  const b = pumpBudget(1000, readDoc());
  assert.strictEqual(b.cycles, 334);
  assert.strictEqual(b.atpSpent, 334);
  assert.strictEqual(b.kIn, 668);
  assert.strictEqual(b.charge, 334);
  const exact = pumpBudget(9, readDoc());
  assert.strictEqual(exact.cycles, 3);
  assert.strictEqual(exact.atpSpent, 3);
});

test('上皮极性：泵必须在基底侧', () => {
  const r = epithelialRoute(readDoc());
  assert.strictEqual(r.pumpOnBasal, true);
  assert.strictEqual(r.steps.length, 3);
});

test('脚本可跑，输出含示例与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /净移走 1 个正电荷/);
  assert.match(out, /现抓现算/);
  assert.match(out, /不构成临床判断依据/);
});

test('代码头部指向本章正文', () => {
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes('/02-xibaomo-yu-kuamo-yunshu/docs/zh.md'));
});
