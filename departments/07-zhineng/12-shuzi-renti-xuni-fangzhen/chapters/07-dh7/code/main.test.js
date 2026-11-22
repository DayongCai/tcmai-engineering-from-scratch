'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const MAIN = path.join(__dirname, 'main.js');
const { readDoc, settings, compute, checks, CHAPTER } = require('./main.js');

test('正文存在，读得出体数据尺寸、帧率与 CT 值范围', () => {
  const text = readDoc();
  assert.ok(text.length > 2500, '正文过短，是否指错了文件');
  const s = settings(text);
  assert.deepStrictEqual(s.grid, [512, 512, 512]);
  assert.strictEqual(s.fps, 60);
  assert.deepStrictEqual([s.huLow, s.huHigh], [-1024, 3071]);
  assert.strictEqual(s.displayBits, 8);
});

test('体数据存贮量与单帧预算按尺寸现算', () => {
  const c = compute(readDoc());
  assert.strictEqual(c.voxels, 512 ** 3);
  assert.strictEqual(c.bytes, 512 ** 3 * 2);
  assert.ok(Math.abs(c.mib - 256) < 1);
  assert.ok(Math.abs(c.frameMs - 16.67) < 0.02);
});

test('灰阶落差：4096 级装在 256 级显示器上，每级 16 HU', () => {
  const c = compute(readDoc());
  assert.strictEqual(c.huSpan, 4096);
  assert.strictEqual(c.displayLevels, 256);
  assert.strictEqual(c.perLevel, 16);
});

test('触觉循环比视觉快十几倍，所以必须解耦', () => {
  const c = compute(readDoc());
  assert.strictEqual(c.hapticMs, 1);
  assert.ok(c.hapticToVisual > 10 && c.hapticToVisual < 25);
  assert.strictEqual(c.latencyBreakMs, 200);
  assert.strictEqual(c.latencyLagMs, 100);
});

test('单帧采样次数在亿次量级，足以判定 CPU 不可能实时', () => {
  const c = compute(readDoc());
  assert.strictEqual(c.samplesPerFrame, 512 ** 3);
  assert.ok(c.samplesPerFrame >= 1e8);
});

test('七条对照全部通过', () => {
  const bad = checks(readDoc()).filter((k) => !k.ok);
  assert.deepStrictEqual(bad.map((k) => k.name), [], '有对照未通过：' + bad.map((k) => k.note).join('；'));
});

test('脚本可运行，输出含复算与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.length > 450, '输出过短');
  assert.match(out, /每级承担 16 个 HU/);
  assert.match(out, /教学样例：尺寸、帧率与灰阶按正文量级估算现算/);
  assert.match(out, /属医疗器械范畴/);
  assert.doesNotMatch(out, /三辨|四位面|单元规模|本课第/);
});

test('章号与正文标题里的章号一致', () => {
  const first = readDoc().split('\n')[0];
  assert.ok(first.startsWith(`# 第 ${CHAPTER} 章`), '标题章号对不上：' + first);
});
