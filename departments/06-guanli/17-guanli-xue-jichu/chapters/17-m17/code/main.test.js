'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { DOC, CHAPTER, TITLE, read, cnInt, facts, visitsPerUse, restPct, rxWithoutHerbal } = require('./main.js');

const TEXT = read();
const F = facts(TEXT);

test('正文就在本章目录下，章号与标题对得上', () => {
  assert.ok(fs.existsSync(DOC), DOC);
  assert.ok(DOC.endsWith(path.join('chapters', '17-m17', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 17);
  assert.strictEqual(TITLE, '中医院的难题不是要不要特色，是特色怎么被计量和付钱');
  assert.match(TEXT, /^# 第 17 章/);
});

test('汉字整数换算：二百一十七', () => {
  assert.strictEqual(cnInt('二百一十七'), 217);
});

test('六个结构数都取自正文', () => {
  assert.strictEqual(F.tcmDoctorPct, 54.3);
  assert.strictEqual(F.herbalRxPct, 41.2);
  assert.strictEqual(F.nonDrugPct, 18.7);
  assert.strictEqual(F.sliceRevenuePct, 22.4);
  assert.strictEqual(F.surplusWan, 217);
});

test('非药物疗法的密度：约每 5.35 人次一次', () => {
  const per = visitsPerUse(F.nonDrugPct);
  assert.ok(Math.abs(per - 5.35) < 0.01, String(per));
  assert.strictEqual(per, 100 / 18.7);
  assert.ok(visitsPerUse(25) === 4);
});

test('处方与收入的两侧结构可复算', () => {
  assert.ok(Math.abs(rxWithoutHerbal(F.herbalRxPct) - 58.8) < 1e-9);
  assert.ok(Math.abs(restPct(F.sliceRevenuePct) - 77.6) < 1e-9);
  assert.strictEqual(rxWithoutHerbal(F.herbalRxPct) + F.herbalRxPct, 100);
});

test('非法使用率报错，不返回 Infinity', () => {
  assert.throws(() => visitsPerUse(0), /使用率应在 0–100 之间/);
  assert.throws(() => visitsPerUse(120), /使用率应在 0–100 之间/);
});

test('脚本可运行，输出特色密度与收入结构', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /特色密度/);
  assert.match(out, /收入结构/);
  assert.match(out, /现算/);
  assert.match(out, /不构成执业准入意见、价格与医保政策解读或管理咨询意见/);
});
