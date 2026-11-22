'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const MAIN = path.join(__dirname, 'main.js');
const { parseFormTable, mustDisclose, isIndefinite, isScoped, candidateForms, FORMS, DOC } = require('./main.js');

const DOC_TEXT = fs.readFileSync(DOC, 'utf8');
const ROWS = parseFormTable(DOC_TEXT);

test('五形态对照表读出五种，且顺序与正文一致', () => {
  assert.strictEqual(ROWS.length, 5);
  assert.deepStrictEqual(ROWS.map((r) => r.form), FORMS);
});

test('每行的保护对象、取得方式、期限、代价都不是空栏', () => {
  for (const r of ROWS) {
    for (const k of ['object', 'acquire', 'term', 'strength', 'cost']) {
      assert.ok(r[k] && r[k].length >= 2, r.form + ' 的 ' + k + ' 栏过短');
    }
  }
});

test('只有专利以公开技术内容为代价', () => {
  assert.strictEqual(mustDisclose('专利'), true);
  for (const f of ['商业秘密', '著作权', '商标', '地理标志']) assert.strictEqual(mustDisclose(f), false);
});

test('商业秘密在正文里记为无期限，其余不是', () => {
  const m = ROWS.find((r) => r.form === '商业秘密');
  assert.ok(isIndefinite(m));
  assert.strictEqual(ROWS.filter(isIndefinite).length, 1);
});

test('范围受限的形态能在强度栏读出限制语', () => {
  const scoped = ROWS.filter(isScoped).map((r) => r.form);
  assert.deepStrictEqual(scoped, ['商业秘密', '著作权', '商标', '地理标志']);
  assert.ok(!scoped.includes('专利'));
});

test('已公开的信息不能回到专利与商业秘密', () => {
  const open = candidateForms({ publiclyKnown: true });
  assert.ok(!open.includes('商业秘密'));
  assert.deepStrictEqual(candidateForms({ publiclyKnown: false }), FORMS);
});

test('正文点名行政保护不是知识产权', () => {
  assert.ok(DOC_TEXT.includes('不能许可、不能转让、不能质押'));
  assert.ok(DOC_TEXT.includes('公开是不可逆的'));
});

test('脚本可运行并打印五种形态与选型结论', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /商业秘密.*无须公开/);
  assert.match(out, /已进入公有领域的信息，可选形态：著作权、商标、地理标志/);
});
