'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const MAIN = path.join(__dirname, 'main.js');
const { readDoc, settings, sources, compute, checks, CHAPTER } = require('./main.js');

test('正文存在，且读得出各向异性体素与标记点分配', () => {
  const text = readDoc();
  assert.ok(text.length > 2500, '正文过短，是否指错了文件');
  const s = settings(text);
  assert.deepStrictEqual(s.voxel, [0.5, 0.5, 1.0]);
  assert.strictEqual(s.fitPoints + s.holdPoints, s.points);
  assert.ok(s.heldoutRms > s.trainRms, '留出点残差应大于训练残差');
});

test('体素体积与采样密度比按尺寸现算', () => {
  const c = compute(readDoc());
  assert.strictEqual(c.volume, 0.25);
  assert.strictEqual(c.densityRatio, 2);
  assert.strictEqual(c.resampleFactor, 8);
});

test('三点配准的方程数与刚体自由度相等', () => {
  const c = compute(readDoc());
  assert.strictEqual(c.rigidDof, 6);
  assert.strictEqual(c.eqForSixDof, 6);
  assert.strictEqual(c.eqAll, 24);
});

test('留出点与训练残差的比值约等于二', () => {
  const c = compute(readDoc());
  assert.ok(Math.abs(c.ratio - 2) < 0.05, `比值应约 2，实得 ${c.ratio}`);
});

test('四类数据源表逐行读出，各带物理上限', () => {
  const S = sources(readDoc());
  assert.deepStrictEqual(S.map((x) => x.name), ['断层影像', '体表形貌', '功能信号', '先验模型']);
  for (const x of S) assert.ok(x.limit.length >= 4, `${x.name} 缺上限描述`);
});

test('六条对照全部通过', () => {
  const bad = checks(readDoc()).filter((k) => !k.ok);
  assert.deepStrictEqual(bad.map((k) => k.name), [], '有对照未通过：' + bad.map((k) => k.note).join('；'));
});

test('脚本可运行，输出含复算与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.length > 400, '输出过短');
  assert.match(out, /比值 2\.00/);
  assert.match(out, /教学样例：体素尺寸与标记点分配按正文设定现算/);
  assert.match(out, /须经伦理审查与知情同意/);
  assert.doesNotMatch(out, /三辨|四位面|单元规模|本课第/);
});

test('章号与正文标题里的章号一致', () => {
  const first = readDoc().split('\n')[0];
  assert.ok(first.startsWith(`# 第 ${CHAPTER} 章`), '标题章号对不上：' + first);
});
