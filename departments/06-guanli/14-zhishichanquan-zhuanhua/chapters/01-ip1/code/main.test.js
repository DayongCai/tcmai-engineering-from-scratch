'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const MAIN = path.join(__dirname, 'main.js');
const {
  parseLayerTable,
  tradableLayers,
  chooseProtection,
  isPublicLayer,
  LAYER_NAMES,
  DOC,
} = require('./main.js');

const DOC_TEXT = fs.readFileSync(DOC, 'utf8');
const ROWS = parseLayerTable(DOC_TEXT);

test('六层表从本章正文读出六行', () => {
  assert.strictEqual(ROWS.length, 6);
  assert.deepStrictEqual(ROWS.map((r) => r.layer).sort(), [...LAYER_NAMES].sort());
});

test('六层每行四栏都有内容，不是空壳', () => {
  for (const r of ROWS) {
    assert.ok(r.content.length > 1, r.layer + ' 的内容栏为空');
    assert.ok(r.disclosure.length > 1, r.layer + ' 的公开状态栏为空');
    assert.ok(r.rights.length > 1, r.layer + ' 的权利栏为空');
  }
});

test('可独立交易的三层是配比、工艺、用途', () => {
  assert.deepStrictEqual(tradableLayers(ROWS), ['配比与剂量', '制备工艺', '用途与适应症']);
});

test('组成层在正文里被标为公开，拿不回来', () => {
  const zu = ROWS.find((r) => r.layer === '组成');
  assert.ok(zu.disclosure.includes('公开'), '组成层应标为公开');
  assert.ok(!isPublicLayer(ROWS.find((r) => r.layer === '制备工艺')), '工艺层不应标为公开');
});

test('专利与商业秘密的取舍跟着反向工程走', () => {
  assert.strictEqual(chooseProtection(true), '专利');
  assert.strictEqual(chooseProtection(false), '商业秘密');
});

test('正文保留了互斥与判据的原话', () => {
  assert.ok(DOC_TEXT.includes('专利与商业秘密在同一层上互斥'));
  assert.ok(DOC_TEXT.includes('反向工程的可行性'));
  assert.ok(DOC_TEXT.includes('排他权'));
});

test('脚本可运行且打印六层与取舍结论', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /六层切分表读出 6 行/);
  assert.match(out, /配比与剂量、制备工艺、用途与适应症/);
  assert.match(out, /工艺参数与火候难测 → 商业秘密/);
});
