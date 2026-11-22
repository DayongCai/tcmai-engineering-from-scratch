'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const MAIN = path.join(__dirname, 'main.js');
const { parseDefectTable, screen, noveltyLost, claimLayers, DEFECT_NAMES, DOC } = require('./main.js');

const DOC_TEXT = fs.readFileSync(DOC, 'utf8');
const ROWS = parseDefectTable(DOC_TEXT);

test('缺陷表读出三类，且与正文同名', () => {
  assert.deepStrictEqual(ROWS.map((r) => r.defect), DEFECT_NAMES);
});

test('每类缺陷都有表面症状与症结两栏', () => {
  for (const r of ROWS) {
    assert.ok(r.symptom.length >= 4, r.defect + ' 缺症状');
    assert.ok(r.cause.length >= 4, r.defect + ' 缺症结');
  }
});

test('工艺参数缺失命中公开不充分', () => {
  const hits = screen({ hasProcessParams: false, claimRangeWiderThanExamples: false, hasControlledData: true });
  assert.deepStrictEqual(hits, ['公开不充分']);
});

test('范围大于实施例命中得不到支持，且三项可同时命中', () => {
  assert.deepStrictEqual(
    screen({ hasProcessParams: true, claimRangeWiderThanExamples: true, hasControlledData: true }),
    ['得不到支持'],
  );
  assert.deepStrictEqual(
    screen({ hasProcessParams: false, claimRangeWiderThanExamples: true, hasControlledData: false }),
    ['公开不充分', '得不到支持', '缺效果证据'],
  );
});

test('三问都答上则无缺陷', () => {
  assert.deepStrictEqual(
    screen({ hasProcessParams: true, claimRangeWiderThanExamples: false, hasControlledData: true }),
    [],
  );
});

test('申请日前的公开只要不在宽限情形内，新颖性即已丧失', () => {
  assert.strictEqual(noveltyLost({ monthsBeforeFiling: 1, coveredByGrace: false }), true);
  assert.strictEqual(noveltyLost({ monthsBeforeFiling: 1, coveredByGrace: true }), false);
  assert.strictEqual(noveltyLost({ monthsBeforeFiling: 0, coveredByGrace: false }), false);
});

test('正文能读出权利要求的四个层次说法', () => {
  assert.deepStrictEqual(claimLayers(DOC_TEXT), ['独立', '从属', '方法', '用途']);
  assert.ok(DOC_TEXT.includes('不得超出原说明书与权利要求书记载的范围'));
});

test('脚本可运行并打印自查结论', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /公开不充分、得不到支持、缺效果证据/);
  assert.match(out, /三问都答上）命中：无/);
});
