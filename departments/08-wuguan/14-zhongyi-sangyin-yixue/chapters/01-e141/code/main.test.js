'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');

const {
  DOC,
  CHAPTER,
  SLUG,
  readDoc,
  declaredRingCount,
  splitChannels,
  routeComplaint,
  rings,
  ringOf,
  meridians,
  roots,
  triad,
} = require('./main.js');

const doc = readDoc();

test('正文可读且规模合理', () => {
  assert.ok(fs.existsSync(DOC), 'docs/zh.md 不存在');
  assert.ok(doc.length > 2000, '正文过短');
});

test('七环表读出的环数等于正文自述的环数', () => {
  assert.strictEqual(rings(doc).length, declaredRingCount(doc));
});

test('每一环都有古义与可问的一句话，没有空环', () => {
  for (const r of rings(doc)) {
    assert.ok(r.name, '有环没有名字');
    assert.ok(r.classic.length >= 3, `${r.name} 缺古义`);
    assert.ok(r.ask.length >= 3, `${r.name} 缺问句`);
  }
});

test('「音声之户」落在会厌，且会厌这一环的听感是闭合不严', () => {
  const hui = rings(doc).find((r) => r.classic === '音声之户');
  assert.ok(hui, '表里没有「音声之户」');
  assert.strictEqual(hui.name, '会厌');
  assert.ok(/漏气|耳语|声虚/.test(hui.symptom), '会厌的听感应指向漏气/耳语');
});

test('听感可反查回环：每一环的听感都能落回它自己', () => {
  for (const r of rings(doc)) {
    const back = ringOf(r.symptom);
    assert.ok(back, `听感「${r.symptom}」查不到环`);
    assert.strictEqual(back.name, r.name);
  }
});

test('主诉分叉：表里的每个咽侧词都归咽，每个喉侧词都归喉', () => {
  const ch = splitChannels(doc);
  assert.ok(ch.yan.length >= 2 && ch.hou.length >= 2);
  for (const w of ch.yan) assert.strictEqual(routeComplaint(w), '咽', `${w} 应归咽`);
  for (const w of ch.hou) assert.strictEqual(routeComplaint(w), '喉', `${w} 应归喉`);
});

test('咽喉两列挂着不同的辨证入口，没有被并成一个', () => {
  const ch = splitChannels(doc);
  assert.notStrictEqual(ch.entryYan, ch.entryHou);
  assert.ok(/胃/.test(ch.entryYan), '咽侧入口应含胃');
  assert.ok(/肺/.test(ch.entryHou), '喉侧入口应含肺');
});

test('经脉表覆盖七条经，且每条都写了循行与临床所指', () => {
  const j = meridians(doc);
  assert.strictEqual(j.length, 7);
  for (const m of j) {
    assert.match(m.name, /经/);
    assert.ok(m.route.length >= 3, `${m.name} 缺循行`);
    assert.ok(m.sign.length >= 3, `${m.name} 缺临床所指`);
  }
});

test('三本读到三条，且第一条是心', () => {
  const r = roots(doc);
  assert.strictEqual(r.length, 3);
  assert.ok(/^心/.test(r[0]), `第一条应是心，实为 ${r[0]}`);
});

test('处置次序明写为气道优先，不是声音优先', () => {
  const t = triad(doc);
  assert.ok(t, '正文未找到处置次序');
  assert.match(t, /先保气道/);
  assert.ok(t.indexOf('保气道') < t.indexOf('声音'));
});

test('脚本可运行，输出含现算声明与临床边界', () => {
  const r = spawnSync(process.execPath, [require.resolve('./main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.length > 200, '输出过短');
  assert.match(out, /现算/);
  assert.match(out, /不构成/);
  assert.match(out, new RegExp(SLUG));
  assert.match(out, new RegExp(`第 ${CHAPTER} 章`));
});
