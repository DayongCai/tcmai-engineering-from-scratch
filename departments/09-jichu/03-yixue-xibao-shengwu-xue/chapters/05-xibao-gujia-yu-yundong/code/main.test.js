'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { readDoc, fibers, canBeTrack, diameterOf, diameterRatio, migration, byTurnover } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');

test('正文是本章那一份', () => {
  const doc = readDoc();
  assert.ok(doc.includes('中间丝') && doc.includes('肌动蛋白'));
  assert.ok((doc.match(/[\u4e00-\u9fff]/g) || []).length > 2000);
});

test('三种纤维解析正确，极性一列有差别', () => {
  const list = fibers(readDoc());
  assert.strictEqual(list.length, 3);
  const slim = list.find((f) => f.name.includes('微丝'));
  const tube = list.find((f) => f.name.includes('微管'));
  const mid = list.find((f) => f.name.includes('中间丝'));
  assert.match(slim.polarity, /有/);
  assert.match(tube.polarity, /有/);
  assert.match(mid.polarity, /无/);
  assert.match(mid.nucleotide, /不结合/);
  assert.strictEqual(mid.motor.trim(), '无');
});

test('能否当轨道：微丝微管可以，中间丝不行', () => {
  const doc = readDoc();
  assert.strictEqual(canBeTrack('微丝', doc), true);
  assert.strictEqual(canBeTrack('微管', doc), true);
  assert.strictEqual(canBeTrack('中间丝', doc), false);
  assert.throws(() => canBeTrack('胶原纤维', doc));
});

test('直径从正文取出：7 / 25 / 10 nm', () => {
  const doc = readDoc();
  assert.strictEqual(diameterOf('微丝', doc), 7);
  assert.strictEqual(diameterOf('微管', doc), 25);
  assert.strictEqual(diameterOf('中间丝', doc), 10);
});

test('粗细比现算，且不等于「最粗的力最大」', () => {
  const r = diameterRatio(readDoc());
  assert.strictEqual(r.ratio, 3.57);
  assert.ok(r.tube > r.filament);
});

test('迁移四步顺序正确', () => {
  const m = migration(readDoc());
  assert.strictEqual(m.length, 4);
  assert.deepStrictEqual(m.map((x) => x.step), ['前伸', '黏附', '收缩', '尾部解离']);
  assert.match(m[0].molecule, /Arp2\/3/);
  assert.match(m[1].molecule, /整合素|talin/);
  assert.match(m[2].molecule, /肌球蛋白/);
});

test('按周转分组：快慢各归其位', () => {
  const t = byTurnover(readDoc());
  assert.deepStrictEqual(t.fast, ['微丝', '微管']);
  assert.deepStrictEqual(t.slow, ['中间丝']);
});

test('脚本可跑，输出含判据与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /中间丝 → false/);
  assert.match(out, /现抓现算/);
  assert.match(out, /不构成临床判断依据/);
});

test('代码头部指向本章正文', () => {
  assert.ok(fs.readFileSync(MAIN, 'utf8').includes('/05-xibao-gujia-yu-yundong/docs/zh.md'));
});
