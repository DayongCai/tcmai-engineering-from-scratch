'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const MAIN = path.join(__dirname, 'main.js');
const {
  readDoc,
  tableRows,
  numberedList,
  parseProblem,
  parseProtocol,
  parseGates,
  analyze,
} = require('./main.js');

const doc = readDoc();

test('立项问题段：12,000 例、0.91 与 0.86、噪声 0.03、看 17 次', () => {
  const p = parseProblem(doc);
  assert.strictEqual(p.cases, 12000);
  assert.strictEqual(p.aucA, 0.91);
  assert.strictEqual(p.aucB, 0.86);
  assert.strictEqual(p.seedNoise, 0.03);
  assert.strictEqual(p.peeks, 17);
  assert.strictEqual(p.trainHours, 6);
});

test('两个 AUC 的差与噪声倍数现算', () => {
  const a = analyze(doc);
  assert.strictEqual(a.gap, 0.05);
  assert.ok(Math.abs(a.gapInSigma - 0.05 / 0.03) < 1e-9);
  assert.ok(a.gapInSigma > 1.6 && a.gapInSigma < 1.7);
  assert.strictEqual(a.ciCoversGap, true, '0.05 应落在 0.04–0.06 的区间宽度内');
});

test('区间宽度符合 1/√n', () => {
  const proto = parseProtocol(doc);
  assert.strictEqual(proto.largeN, 1200);
  assert.strictEqual(proto.smallN, 300);
  assert.strictEqual(proto.smallWidth, 0.12);
  assert.strictEqual(proto.bootstrap, 1000);
  assert.strictEqual(proto.subgroupMin, 50);
  const a = analyze(doc);
  assert.strictEqual(a.sampleRatio, 4);
  assert.strictEqual(a.rootSampleRatio, 2);
  assert.ok(Math.abs(a.widthRatio - 2) < 1e-9, `宽度比 ${a.widthRatio}`);
});

test('17 次比较的假阳性累积概率现算', () => {
  const a = analyze(doc);
  assert.ok(Math.abs(a.familywise - (1 - 0.95 ** 17)) < 1e-12);
  assert.ok(a.familywise > 0.58 && a.familywise < 0.59, `累积概率 ${a.familywise}`);
  assert.strictEqual(a.peekComputeHours, 102);
});

test('流水线五段、四把锁、清单与登记表行数', () => {
  const a = analyze(doc);
  assert.strictEqual(a.stages.length, 5);
  assert.strictEqual(a.locks.length, 4);
  assert.strictEqual(a.manifest.length, 9);
  assert.strictEqual(a.registry.length, 8);
  assert.strictEqual(a.leaks.length, 8);
  assert.strictEqual(a.promote.length, 5);
  assert.ok(a.leaks[0].includes('患者级分组'));
  assert.strictEqual(tableRows(doc, '锁').length, 4);
  assert.strictEqual(numberedList(doc, '下面八条做成清单', '第 4 条最容易被放过').length, 8);
});

test('回滚判据三个数取自正文', () => {
  const g = parseGates(doc);
  assert.strictEqual(g.rollbackHours, 72);
  assert.strictEqual(g.subgroupDrop, 5);
  assert.strictEqual(g.emptyRate, 1);
  assert.strictEqual(g.overrideRate, 40);
  assert.strictEqual(g.tolerance, 0.01);
});

test('脚本可运行，输出含现算结论与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /差值 0\.05/);
  assert.match(out, /1 − 0\.95\^17/);
  assert.match(out, /宽度比 2\.00/);
  assert.match(out, /回滚 72 小时/);
  assert.match(out, /不对应任何实测模型或数据集/);
});
