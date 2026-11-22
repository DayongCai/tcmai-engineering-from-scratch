'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { DOC, CHAPTER, TITLE, read, cnInt, facts, share, peerAverage } = require('./main.js');

const TEXT = read();
const F = facts(TEXT);

test('正文就在本章目录下，章号与标题对得上', () => {
  assert.ok(fs.existsSync(DOC), DOC);
  assert.ok(DOC.endsWith(path.join('chapters', '15-m15', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 15);
  assert.strictEqual(TITLE, '伦理不是不做坏事，是在没人看见且有好处时还选择不做');
  assert.match(TEXT, /^# 第 15 章/);
});

test('汉字整数换算：二百一十四、四十七', () => {
  assert.strictEqual(cnInt('二百一十四'), 214);
  assert.strictEqual(cnInt('四十七'), 47);
});

test('投诉结构与收入结构都取自正文', () => {
  assert.strictEqual(F.complaints, 214);
  assert.strictEqual(F.overService, 47);
  assert.strictEqual(F.overSharePct, 22);
  assert.strictEqual(F.examRevenuePct, 31.8);
  assert.strictEqual(F.gapPoints, 6.4);
  assert.strictEqual(F.pressurePct, 78);
  assert.strictEqual(F.selfCleanPct, 91);
});

test('过度检查类投诉占 22%，与正文一致', () => {
  const rate = share(F.overService, F.complaints);
  assert.ok(Math.abs(rate - F.overSharePct) < 0.05, String(rate));
  assert.strictEqual(rate.toFixed(0), '22');
});

test('同级均值由占比与差值反推为 25.4%', () => {
  const peer = peerAverage(F.examRevenuePct, F.gapPoints);
  assert.ok(Math.abs(peer - 25.4) < 1e-9, String(peer));
  assert.ok(Math.abs(peer + F.gapPoints - F.examRevenuePct) < 1e-9);
});

test('两个认知比例同时成立，差 13 个百分点', () => {
  assert.ok(F.selfCleanPct > F.pressurePct);
  assert.strictEqual(F.selfCleanPct - F.pressurePct, 13);
  assert.ok(F.selfCleanPct > 90 && F.pressurePct > 75);
});

test('非法参数报错，不返回负值', () => {
  assert.throws(() => share(47, 0), /总量必须为正/);
  assert.throws(() => share(215, 214), /分子不能大于总量/);
});

test('脚本可运行，输出份额与三问连用', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /过度检查/);
  assert.match(out, /三问连用/);
  assert.match(out, /现算/);
  assert.match(out, /不构成法律意见、合规审查结论或对任何机构与个人的评价/);
});
