'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { DOC, parseDoc, analyze, errorBudget } = require('./main.js');

const text = () => fs.readFileSync(DOC, 'utf8');
const doc = () => parseDoc(text());

test('正文可解析：章号、标题、结构齐', () => {
  const d = doc();
  assert.strictEqual(d.chapterNo, 2);
  assert.match(d.title, /采集链上掉一次时钟/);
  assert.ok(d.sections.length >= 4);
  assert.ok(d.tables.length >= 4);
  assert.ok(d.hanzi > 2000, `汉字过少：${d.hanzi}`);
});

test('整链合格率由环节数与单环合格率现算', () => {
  const a = analyze(doc());
  assert.strictEqual(a.stages, 6);
  assert.strictEqual(a.passRate, 95);
  assert.ok(Math.abs(a.chainYield - Math.pow(0.95, 6)) < 1e-12);
  assert.ok(a.chainYield > 0.73 && a.chainYield < 0.74);
  assert.strictEqual(a.wastePerThousand, 265);
});

test('可补救段数取自链路表，三类合计等于段数', () => {
  const a = analyze(doc());
  assert.strictEqual(a.unrecoverable, 3);
  assert.strictEqual(a.recoverable, 2);
  assert.strictEqual(a.partial, 1);
  assert.strictEqual(a.unrecoverable + a.recoverable + a.partial, a.stages);
  assert.ok(a.unrecoverable > a.recoverable);
});

test('质控指标数与正文表格一致', () => {
  const a = analyze(doc());
  assert.strictEqual(a.qc, 5);
});

test('脉图误差预算：200 Hz 一点 5 ms，20 ms 跨 4 点', () => {
  const e = errorBudget(doc());
  assert.strictEqual(e.rate, 200);
  assert.strictEqual(e.periodMs, 5);
  assert.strictEqual(e.spreadPoints, 4);
});

test('改单环合格率，整链随之变化（证明确实现算）', () => {
  const mutated = text().replace('合格率都是 95%', '合格率都是 90%');
  assert.notStrictEqual(mutated, text(), '替换未命中，正文表述可能已改');
  const a = analyze(parseDoc(mutated));
  assert.strictEqual(a.passRate, 90);
  assert.ok(Math.abs(a.chainYield - Math.pow(0.9, 6)) < 1e-12);
  assert.ok(a.wastePerThousand > 400);
});

test('脚本可运行且输出含边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], {
    encoding: 'utf8',
    timeout: 60000,
  });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /整链 = 0\.95\^6/);
  assert.match(out, /不可事后补救/);
  assert.match(out, /不构成设备操作规范或临床建议/);
});
