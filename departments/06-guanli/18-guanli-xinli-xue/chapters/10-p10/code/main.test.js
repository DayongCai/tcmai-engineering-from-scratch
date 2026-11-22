'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { DOC, CHAPTER, TITLE, read, sections, tables, roles, lines, scaleCurve, landing, boundaryCheck, interpretReports, concepts, BOUNDARIES, EMPOWER_STEPS } = require('./main.js');

const TEXT = read();

test('正文文件就在本章目录下', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '10-p10', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
  assert.strictEqual(CHAPTER, 10);
  assert.strictEqual(TITLE, '团队不是把能人凑齐，是把互依关系设计出来');
  assert.strictEqual(sections(TEXT).length, 7);
});

test('贝尔宾九角色从正文表格解析，三类各三人', () => {
  const r = roles(TEXT);
  assert.strictEqual(r.list.length, 9);
  assert.deepStrictEqual(r.byOrientation, { 行动: 3, 人际: 3, 思维: 3 });
  assert.deepStrictEqual(r.list.map((x) => x.role), ['塑造者', '执行者', '完美主义者', '协调者', '团队工作者', '资源调查者', '智多星', '监控评估者', '专业师']);
  assert.match(r.list[0].gap, /没人推进度/);
  assert.strictEqual(tables(TEXT).length, 1);
});

test('沟通线公式：5/10/20 人 = 10/45/190 条', () => {
  assert.strictEqual(lines(5), 10);
  assert.strictEqual(lines(10), 45);
  assert.strictEqual(lines(20), 190);
  assert.strictEqual(lines(9), 36);
  const c = scaleCurve(20);
  assert.strictEqual(c.length, 19);
  assert.strictEqual(c.find((x) => x.n === 10).added, 9);
});

test('会诊落地率 11/47 = 23.4%，判为停在纸面', () => {
  const l = landing(47, 11);
  assert.strictEqual(l.rate, 23.4);
  assert.match(l.verdict, /停在纸面/);
  assert.match(landing(47, 20).verdict, /落地率尚可/);
});

test('授权三条边界缺一条就报缺口', () => {
  const ok = boundaryCheck(BOUNDARIES);
  assert.strictEqual(ok.ok, true);
  const bad = boundaryCheck(['目标与绩效边界', '权限与资源边界']);
  assert.deepStrictEqual(bad.missing, ['伦理与合规边界']);
  assert.match(bad.verdict, /退化成/);
});

test('上报量读法：安全提升／流程效应／真问题三种', () => {
  assert.strictEqual(interpretReports({ reportedUp: true, actualDown: true, formSimplified: false }).read, '心理安全提升');
  assert.strictEqual(interpretReports({ reportedUp: true, actualDown: false, formSimplified: true }).read, '流程效应');
  assert.strictEqual(interpretReports({ reportedUp: true, actualDown: false, formSimplified: false }).read, '真问题暴露');
  assert.strictEqual(interpretReports({ reportedUp: false, actualDown: false, formSimplified: false }).read, '可能被压制');
});

test('五条件与授权四步顺序在正文里', () => {
  const c = concepts(TEXT);
  assert.strictEqual(c.conditions.length, 5);
  assert.deepStrictEqual(EMPOWER_STEPS, ['信息与资源', '方法与决策空间', '责任与后果', '辅导与反馈']);
  for (const k of ['互依性', '心理安全', '快速信任', '在线时长不得替代绩效评价']) {
    assert.ok(TEXT.includes(k), k);
  }
});

test('脚本可运行，输出沟通线与边界声明', () => {
  const r = require('node:child_process').spawnSync(process.execPath, [path.join(__dirname, 'main.js')], {
    encoding: 'utf8',
    timeout: 60000,
  });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /20 人 → 190 条/);
  assert.match(out, /11\/47 = 23\.4%/);
  assert.match(out, /管条件，不是管人/);
});
