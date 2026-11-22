'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, read, grab, splitList, decide, compute, verify } = require('./main.js');

const TEXT = read();
const R = compute(TEXT);
const MAIN = path.join(__dirname, 'main.js');
const GOOD = { stable: true, bcvaGood: true, needClear: true };

test('正文在本章目录下，章号与首行一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '07-e47', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 7);
  assert.ok(TEXT.startsWith('# 第 7 章'));
  assert.ok(fs.existsSync(DOC));
});

test('绝对禁忌七条、可等五项、转诊五个方向，都从正文解析', () => {
  assert.strictEqual(R.absolute.length, 7);
  assert.ok(R.absolute.includes('未成年'), R.absolute.join('、'));
  assert.ok(R.absolute.some((x) => x.includes('地形图')), R.absolute.join('、'));
  assert.strictEqual(R.waiting.length, 5);
  assert.ok(R.waiting.some((x) => x.includes('干眼')), R.waiting.join('、'));
  assert.strictEqual(R.transfers.length, 5);
});

test('三条腿、三类风险、四句话的条数一致', () => {
  assert.strictEqual(R.legs, 3);
  assert.strictEqual(R.riskClasses, 3);
  assert.strictEqual(R.sentences, 4);
  assert.deepStrictEqual(splitList('甲、乙、丙。'), ['甲', '乙', '丙']);
});

test('时间账：二十几岁做，二十年后四十几岁', () => {
  assert.strictEqual(R.surgeryAge, 20);
  assert.strictEqual(R.decadesAfter, 20);
  assert.ok(R.surgeryAge + R.decadesAfter >= 40 && R.surgeryAge + R.decadesAfter < 50);
});

test('判定顺序：绝对禁忌压过可等条件，可等压过三条腿', () => {
  assert.strictEqual(decide({ age: 28, legs: GOOD }).verdict, '做');
  assert.strictEqual(decide({ age: 28, wait: ['干眼未控制'], legs: GOOD }).verdict, '等');
  assert.strictEqual(decide({ age: 28, wait: ['干眼未控制'], abs: ['角膜地形图异常'], legs: GOOD }).verdict, '不做');
  assert.strictEqual(decide({ age: 17, legs: GOOD }).verdict, '不做');
  assert.strictEqual(decide({ age: 28, legs: { stable: false, bcvaGood: true, needClear: true } }).verdict, '不做');
  // 三条腿全缺，也不能变成「等」
  assert.strictEqual(decide({ age: 28, legs: { stable: false, bcvaGood: false, needClear: false } }).verdict, '不做');
});

test('「不做」的理由写清是哪一条', () => {
  const r = decide({ age: 28, abs: ['自身免疫病'], legs: GOOD });
  assert.match(r.why, /自身免疫病/);
  assert.match(decide({ age: 28, wait: ['接触镜停戴不足'], legs: GOOD }).why, /接触镜停戴不足/);
  assert.match(decide({ age: 28, legs: { stable: true, bcvaGood: false, needClear: true } }).why, /bcvaGood/);
});

test('verify 通过；把绝对禁忌改成六条即被拦下', () => {
  assert.strictEqual(verify(R), true);
  const forged = Object.assign({}, R, { absolute: R.absolute.slice(0, 6) });
  assert.throws(() => verify(forged), /不自洽/);
});

test('脚本可运行，输出含判定器与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /判定顺序即本章的判据顺序/);
  assert.match(out, /均取自本章 docs\/zh\.md/);
  assert.match(out, /不给手术参数、角膜厚度阈值与停药时长/);
  assert.ok(out.includes('判定器跑五个合成个例'), '输出里没有判定器');
  assert.ok(out.includes('未成年'), '输出里没有未成年这一条');
});
