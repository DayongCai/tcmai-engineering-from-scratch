'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, cutoff, analyze } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const BODY = read();
const X = analyze(BODY);

test('正文就在本章目录下，首行章题与章节元数据一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '07-rob7', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 7);
  assert.ok(BODY.startsWith('# 第 7 章 · ' + TITLE), '正文首行与章题不一致');
  assert.strictEqual(X.hasTitle, true);
});

test('延迟预算逐行读出：五项不含抱闸共 65 ms，加抱闸 35 ms 到 100 ms', () => {
  assert.strictEqual(X.budget.length, 6);
  assert.deepStrictEqual(
    X.budget.filter((b) => !b.isBrake).map((b) => b.ms),
    [20, 4, 1, 15, 25],
  );
  assert.strictEqual(X.totalWithoutBrake, 65);
  assert.strictEqual(X.brakeMs, 35);
  assert.strictEqual(X.totalWithBrake, 100);
  assert.ok(X.budget[0].stage.includes('滤波窗'));
  assert.ok(X.budget[X.budget.length - 1].isBrake);
});

test('滤波窗 20 ms 对应约 25 Hz 截止，减半到 10 ms 得 50 Hz', () => {
  assert.strictEqual(X.winMs, 20);
  assert.strictEqual(X.winCutDoc, 25);
  assert.ok(Math.abs(X.winCutModel - 25) < 1e-9, `f_c=${X.winCutModel}`);
  assert.strictEqual(X.halfMs, 10);
  assert.ok(Math.abs(X.halfCut - 50) < 1e-9);
  assert.strictEqual(cutoff(20), 25);
});

test('FMEA 八条，报 0 与通信中断都在清单里', () => {
  assert.strictEqual(X.fmea.length, 8);
  assert.ok(X.fmea.some((e) => e.mode.includes('恒为 0')));
  assert.ok(X.fmea.some((e) => e.mode.includes('通信中断')));
  const zero = X.fmea.find((e) => e.mode.includes('恒为 0'));
  assert.match(zero.response, /退让并停机/);
  assert.match(zero.wrong, /持续下压/);
  // 第三列与第四列都在：检测到 ≠ 处理对
  assert.ok(X.fmea.every((e) => e.detect && e.response && e.wrong));
});

test('停止类别三类，只有 1 类是最常用的受控退让', () => {
  assert.strictEqual(X.stops.length, 3);
  assert.deepStrictEqual(X.stops.map((s) => s.cls), ['0 类', '1 类', '2 类']);
  assert.match(X.stops[0].consequence, /重力下落/);
  assert.match(X.stops[1].consequence, /平稳退让/);
  assert.match(X.stops[2].consequence, /压着不动/);
});

test('冗余判据与三句不该出现的表述都在正文里', () => {
  assert.strictEqual(X.redundancyRule, true);
  assert.ok(BODY.includes('共因失效'));
  assert.ok(BODY.includes('测试脉冲'));
  assert.strictEqual(X.badPhrases.length, 3);
  assert.ok(X.badPhrases.some((p) => p.includes('确保安全')));
  assert.ok(X.badPhrases.some((p) => p.includes('无副作用')));
});

test('脚本可运行，输出带现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /均从本章 docs\/zh\.md 现算/);
  assert.match(out, /不构成安全标准或合规意见/);
  assert.ok(out.includes('= 65 ms'));
  assert.ok(out.includes('= 100 ms'));
});
