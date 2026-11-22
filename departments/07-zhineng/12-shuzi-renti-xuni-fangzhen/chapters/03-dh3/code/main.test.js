'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const MAIN = path.join(__dirname, 'main.js');
const { readDoc, settings, axes, additivity, layers, compute, checks, CHAPTER } = require('./main.js');

test('正文存在，读得出标签条数与失败率区间', () => {
  const text = readDoc();
  assert.ok(text.length > 2500, '正文过短，是否指错了文件');
  const s = settings(text);
  assert.strictEqual(s.labels, 1000);
  assert.deepStrictEqual([s.lowPct, s.highPct], [5, 15]);
});

test('静默消失的条数按标签总数现算', () => {
  const c = compute(readDoc());
  assert.strictEqual(c.lowLost, 50);
  assert.strictEqual(c.highLost, 150);
  assert.strictEqual(c.highLost / c.labels, 0.15);
});

test('三条关系轴：邻接不传递，部分与分类传递', () => {
  const A = axes(readDoc());
  assert.strictEqual(A.length, 3);
  assert.match(A[0].transitive, /传递/);
  assert.match(A[1].transitive, /传递/);
  assert.match(A[2].transitive, /不传递/);
  assert.strictEqual(A[2].name, '空间邻接（adjacent-to）');
});

test('可加性表：体积可加、模量不可加', () => {
  const B = additivity(readDoc());
  assert.strictEqual(B.length, 4);
  assert.strictEqual(B[0].additive, '可加');
  assert.strictEqual(B[1].additive, '部分可加');
  assert.strictEqual(B[2].additive, '不可加');
});

test('三层标注都在正文里出现', () => {
  for (const l of layers(readDoc())) assert.ok(l.count >= 1, `${l.name} 未出现`);
});

test('五条对照全部通过', () => {
  const bad = checks(readDoc()).filter((k) => !k.ok);
  assert.deepStrictEqual(bad.map((k) => k.name), [], '有对照未通过：' + bad.map((k) => k.note).join('；'));
});

test('脚本可运行，输出含复算与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.length > 400, '输出过短');
  assert.match(out, /× 15% = 150 条/);
  assert.match(out, /教学样例：标签数与失败率按正文演算设定现算/);
  assert.match(out, /不裁定经络或穴位的存在性/);
  assert.doesNotMatch(out, /三辨|四位面|单元规模|本课第/);
});

test('章号与正文标题里的章号一致', () => {
  const first = readDoc().split('\n')[0];
  assert.ok(first.startsWith(`# 第 ${CHAPTER} 章`), '标题章号对不上：' + first);
});
