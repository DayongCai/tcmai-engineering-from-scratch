'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { DOC, CHAPTER, TITLE, read, cnInt, facts, readHoursBySpeed, studyRatio, behaviorGap } = require('./main.js');

const TEXT = read();
const F = facts(TEXT);

test('正文就在本章目录下，章号与标题对得上', () => {
  assert.ok(fs.existsSync(DOC), DOC);
  assert.ok(DOC.endsWith(path.join('chapters', '18-m18', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 18);
  assert.strictEqual(TITLE, '这门课真正的作业，是回去改一件你科室里的事');
  assert.match(TEXT, /^# 第 18 章/);
});

test('汉字整数换算：十八、一百九十八、二十八万二千八百八十八', () => {
  assert.strictEqual(cnInt('十八'), 18);
  assert.strictEqual(cnInt('一百九十八'), 198);
  assert.strictEqual(cnInt('二十八万二千八百八十八'), 282888);
  assert.strictEqual(cnInt('一千四百四十'), 1440);
});

test('课程规模与两组学习效果都取自正文', () => {
  assert.strictEqual(F.chapters, 18);
  assert.strictEqual(F.units, 198);
  assert.strictEqual(F.hanzi, 282888);
  assert.strictEqual(F.values, 1440);
  assert.strictEqual(F.readHours, 15);
  assert.strictEqual(F.studyHours, 60);
  assert.strictEqual(F.charsPerMinute, 300);
  assert.strictEqual(F.listenPct, 10);
  assert.strictEqual(F.practicePct, 40);
});

test('按每分钟 300 字折算，纯通读约 15.7 小时，与正文的约十五小时相符', () => {
  const hours = readHoursBySpeed(F.hanzi, F.charsPerMinute);
  assert.ok(Math.abs(hours - 15.72) < 0.02, String(hours));
  assert.ok(Math.abs(hours - F.readHours) < 1, '折算值与正文的约数应相差不到一小时');
});

test('研读是通读的四倍，行为改变率差三十个百分点', () => {
  assert.strictEqual(studyRatio(F.studyHours, F.readHours), 4);
  assert.strictEqual(behaviorGap(F.practicePct, F.listenPct), 30);
  assert.ok(behaviorGap(F.practicePct, F.listenPct) > 25);
});

test('非法参数报错，不返回 Infinity', () => {
  assert.throws(() => readHoursBySpeed(100, 0), /速度必须为正/);
  assert.throws(() => studyRatio(60, 0), /通读时长必须为正/);
});

test('脚本可运行，输出规模、学时差与六步练法', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /规模/);
  assert.match(out, /六步练法/);
  assert.match(out, /现算/);
  assert.match(out, /不构成教学效果承诺、技术评估意见或管理咨询意见/);
});
