'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, read, grab, splitList, parseFields, coverage, compute, verify } = require('./main.js');

const TEXT = read();
const R = compute(TEXT);
const MAIN = path.join(__dirname, 'main.js');

test('正文在本章目录下，章号与首行一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '08-e48', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 8);
  assert.ok(TEXT.startsWith('# 第 8 章'));
  assert.ok(fs.existsSync(DOC));
});

test('十二项字段从头解析出来，编号从一到十二连续', () => {
  const nums = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
  assert.strictEqual(R.fields.length, 12);
  assert.deepStrictEqual(R.fields.map((f) => f.no), nums);
  assert.strictEqual(R.fields[0].name, '身份与时间');
  assert.strictEqual(R.fields[11].name, '复查记录');
  assert.deepStrictEqual(parseFields('**一、甲。** **二、乙。**').map((f) => f.name), ['甲', '乙']);
});

test('四行对十二项：覆盖率三分之一，缺口八项', () => {
  assert.deepStrictEqual(coverage(4, 12), { rowCount: 4, fieldCount: 12, missing: 8, ratio: 1 / 3 });
  assert.strictEqual(R.cov.missing, 8);
  assert.ok(Math.abs(R.cov.ratio * 100 - 33.3333) < 1e-3);
});

test('三查、五个卡点、五类纠纷、三种抗辩力，条数与正文说法一致', () => {
  assert.strictEqual(R.checks, 3);
  assert.strictEqual(R.gates.length, 5);
  assert.ok(R.gates[0].includes('柱镜轴位'), R.gates.join('、'));
  assert.strictEqual(R.disputes.length, 5);
  assert.ok(R.disputes.includes('漏诊'), R.disputes.join('、'));
  assert.deepStrictEqual(R.defenses, ['时间戳', '原始数据', '告知痕迹']);
});

test('「不写等于没做」：四处少了某项的举例与复查四项', () => {
  assert.strictEqual(R.missingExamples, 4);
  assert.strictEqual(R.reviewItems.length, 4);
  assert.deepStrictEqual(R.reviewItems, ['视力', '依从性', '有无不适', '方案是否调整']);
  assert.deepStrictEqual(splitList('甲、乙、丙。'), ['甲', '乙', '丙']);
});

test('verify 通过；删掉一项字段即被拦下', () => {
  assert.strictEqual(verify(R), true);
  const forged = Object.assign({}, R, { fields: R.fields.slice(0, 11) });
  assert.throws(() => verify(forged), /不自洽/);
});

test('脚本可运行，输出含字段清单与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /清单与条数从正文解析/);
  assert.match(out, /均取自本章 docs\/zh\.md/);
  assert.match(out, /不构成法律意见/);
  assert.ok(out.includes('十一、签名与日期'), '输出里没有签名栏');
  assert.ok(out.includes('33.3%'), '输出里没有覆盖率');
});
