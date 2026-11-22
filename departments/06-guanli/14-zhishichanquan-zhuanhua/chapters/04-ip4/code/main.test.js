'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const MAIN = path.join(__dirname, 'main.js');
const { parsePathTable, retainsOwnership, isVerifiableMilestone, diligenceQuestions, contractPoints, PATHS, DOC } = require('./main.js');

const DOC_TEXT = fs.readFileSync(DOC, 'utf8');
const ROWS = parsePathTable(DOC_TEXT);

test('四条路径从正文读出，顺序不变', () => {
  assert.deepStrictEqual(ROWS.map((r) => r.path), PATHS);
});

test('每条路径的五栏都有内容', () => {
  for (const r of ROWS) {
    for (const k of ['object', 'payment', 'control', 'exit']) {
      assert.ok(r[k] && r[k].length >= 2, r.path + ' 的 ' + k + ' 栏过短');
    }
  }
});

test('许可与自行实施保留权利，转让已交出', () => {
  const by = Object.fromEntries(ROWS.map((r) => [r.path, r]));
  assert.ok(retainsOwnership(by['许可']));
  assert.ok(retainsOwnership(by['自行实施']));
  assert.ok(retainsOwnership(by['作价入股']));
  assert.strictEqual(retainsOwnership(by['转让']), false);
});

test('里程碑只认可验证事件', () => {
  assert.strictEqual(isVerifiableMilestone('取得批件后支付'), true);
  assert.strictEqual(isVerifiableMilestone('达到约定销量后支付'), true);
  assert.strictEqual(isVerifiableMilestone('项目进展顺利时支付'), false);
  assert.strictEqual(isVerifiableMilestone('双方按计划推进即可'), false);
});

test('尽调六问恰好六项，括号内的顿号没有被切开', () => {
  const qs = diligenceQuestions(DOC_TEXT);
  assert.strictEqual(qs.length, 6);
  assert.ok(qs[0].startsWith('权利是否有效（年费、期限）'), '第一问被切断：' + qs[0]);
  assert.ok(qs[5].includes('历史纠纷'));
});

test('合同七问从正文编号读出', () => {
  const ps = contractPoints(DOC_TEXT);
  assert.deepStrictEqual(ps.map((p) => p.n), [1, 2, 3, 4, 5, 6, 7]);
  assert.ok(ps.some((p) => p.title.includes('改进成果归属')));
  assert.ok(ps.some((p) => p.title.includes('付款结构')));
});

test('脚本可运行并打印路径与判据', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /尽调六问（6 项）/);
  assert.match(out, /合同七问（7 项）/);
  assert.match(out, /进展顺利时支付」→ 不可执行/);
});
