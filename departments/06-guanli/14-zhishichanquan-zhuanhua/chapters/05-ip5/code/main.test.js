'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const MAIN = path.join(__dirname, 'main.js');
const { parseNonPatentable, subjectRoute, inventorIncluded, dataLegality, DOC } = require('./main.js');

const DOC_TEXT = fs.readFileSync(DOC, 'utf8');
const ROWS = parseNonPatentable(DOC_TEXT);

test('不可专利的客体从正文读出三类', () => {
  assert.strictEqual(ROWS.length, 3);
  assert.ok(ROWS[0].object.includes('诊断与治疗方法'));
});

test('每类都给出理由与替代路径', () => {
  for (const r of ROWS) {
    assert.ok(r.reason.length >= 4, r.object + ' 缺理由');
    assert.ok(r.alternative.length >= 2, r.object + ' 缺替代路径');
  }
});

test('算法与诊疗方法都进不了专利，系统与制药用途可以', () => {
  assert.ok(subjectRoute('算法').startsWith('不可专利'));
  assert.ok(subjectRoute('数学方法').startsWith('不可专利'));
  assert.ok(subjectRoute('诊疗方法').startsWith('不可专利'));
  assert.ok(subjectRoute('系统').startsWith('可专利'));
  assert.ok(subjectRoute('数据处理方法').startsWith('可专利'));
  assert.ok(subjectRoute('制药用途').startsWith('可专利'));
});

test('发明人判据跟着创造性贡献走，不跟着参与度走', () => {
  assert.strictEqual(inventorIncluded('老中医_经验构成关键特征'), true);
  assert.strictEqual(inventorIncluded('老中医_仅提供数据'), false);
  assert.strictEqual(inventorIncluded('工程师_设计模型结构'), true);
  assert.strictEqual(inventorIncluded('工程师_按既定方案实现'), false);
  assert.strictEqual(inventorIncluded('研究生_完成标注'), false);
});

test('数据三关任一断裂都会被点出来', () => {
  assert.deepStrictEqual(dataLegality({ consentCoversTraining: false, deidentified: true, transferApproved: true }), ['来源合法']);
  assert.deepStrictEqual(dataLegality({ consentCoversTraining: true, deidentified: false, transferApproved: false }), ['处理合法', '流转合法']);
  assert.deepStrictEqual(dataLegality({ consentCoversTraining: true, deidentified: true, transferApproved: true }), []);
});

test('正文保留了去标识与匿名化的区分', () => {
  assert.ok(DOC_TEXT.includes('去标识化不等于匿名化'));
  assert.ok(DOC_TEXT.includes('责任仍在医师'));
});

test('脚本可运行并打印三类结论', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /写成诊疗方法 → 不可专利/);
  assert.match(out, /研究生完成标注 → 不列入/);
  assert.match(out, /断在 处理合法/);
});
