'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { DOC, CHAPTER, TITLE, read, cnInt, facts, gap, hoursPerHead } = require('./main.js');

const TEXT = read();
const F = facts(TEXT);

test('正文就在本章目录下，章号与标题对得上', () => {
  assert.ok(fs.existsSync(DOC), DOC);
  assert.ok(DOC.endsWith(path.join('chapters', '10-m10', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 10);
  assert.strictEqual(TITLE, '领导不是让人听话，是让人在没有你的时候也肯多走一步');
  assert.match(TEXT, /^# 第 10 章/);
});

test('汉字整数换算：三十一、九十六', () => {
  assert.strictEqual(cnInt('三十一'), 31);
  assert.strictEqual(cnInt('九十六'), 96);
  assert.strictEqual(cnInt('九'), 9);
  assert.strictEqual(cnInt('十二'), 12);
  assert.throws(() => cnInt('31'), /认不出的中文数字/);
});

test('两次测评的四个分数与学时都取自正文', () => {
  assert.strictEqual(F.directors, 31);
  assert.strictEqual(F.abilityScore, 4.6);
  assert.strictEqual(F.stayScore, 3.1);
  assert.strictEqual(F.trainingHours, 96);
  assert.strictEqual(F.afterAbility, 4.7);
  assert.strictEqual(F.afterStay, 3.2);
});

test('培训前后的落差都是 1.5，结构没有改变', () => {
  assert.ok(Math.abs(gap(F.abilityScore, F.stayScore) - 1.5) < 1e-9);
  assert.ok(Math.abs(gap(F.afterAbility, F.afterStay) - 1.5) < 1e-9);
  assert.strictEqual(gap(F.abilityScore, F.stayScore), gap(F.afterAbility, F.afterStay));
  assert.ok(F.afterStay > F.stayScore && F.afterAbility > F.abilityScore, '两项应同时略升');
});

test('人均学时约 3.1，工时投入可复算', () => {
  assert.ok(Math.abs(hoursPerHead(F.trainingHours, F.directors) - 3.1) < 0.05, String(hoursPerHead(96, 31)));
  assert.strictEqual(hoursPerHead(96, 31) * 31, 96);
  assert.throws(() => hoursPerHead(96, 0), /人数必须为正/);
});

test('脚本可运行，输出两次评分与人均学时', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /两次评分/);
  assert.match(out, /人均/);
  assert.match(out, /现算/);
  assert.match(out, /不构成人事评价意见、干部任免建议或管理咨询意见/);
});
