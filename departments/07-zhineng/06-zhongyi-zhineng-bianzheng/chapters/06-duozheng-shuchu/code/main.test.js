'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { DOC, RELATIONS, OUTPUT_BLOCKS, loadDoc, blocks, audit, independentCombos, exclusiveOutputs } = require('./main.js');

test('正文存在且已补实', () => {
  assert.ok(fs.existsSync(DOC));
  const md = loadDoc();
  assert.ok((md.match(/[\u4e00-\u9fff]/g) || []).length > 2000);
  assert.ok(!/TODO|待补|占位稿/.test(md));
});

test('互斥输出的表达力是真算出来的：2^k 对 k', () => {
  assert.strictEqual(independentCombos(5), 32);
  assert.strictEqual(exclusiveOutputs(5), 5);
  assert.ok(independentCombos(3) / exclusiveOutputs(3) > 2);
});

test('四种「多」各有时间结构与输出形态', () => {
  const t = (() => {
    const md = loadDoc();
    const rows = [...md.matchAll(/^\|\s*(合病|并病|兼夹|转化)\s*\|.*$/gm)].map((m) => m[1]);
    return [...new Set(rows)];
  })();
  assert.deepStrictEqual(t.sort(), RELATIONS.slice().sort());
  assert.strictEqual(audit().relationRows, 4);
});

test('输出结构四块齐全，且主证带反对项', () => {
  const a = audit();
  assert.strictEqual(a.parseError, '');
  for (const k of OUTPUT_BLOCKS) assert.ok(a.keys.includes(k), `缺 ${k}`);
  assert.ok(a.against >= 1, '只列支持项的输出是宣传，不是解释');
  assert.ok(a.support >= 3, '支持项太少，无法核对');
  assert.strictEqual(a.ordered, true, '兼证与备选的分数不应高于主证');
  assert.strictEqual(a.altHasWhyNot, true, '备选必须说明为什么不是它');
});

test('约束强度表把硬、软、有向分开', () => {
  const md = loadDoc();
  assert.match(md, /同义合并/);
  assert.match(md, /软约束/);
  assert.match(md, /有向约束/);
  assert.strictEqual(audit().constraintRows, 5);
});

test('多标签指标表覆盖五类口径', () => {
  const md = loadDoc();
  for (const k of ['子集准确率', '汉明损失', 'macro-F1', '平均精度', '主/兼分报']) {
    assert.ok(md.includes(k), `缺指标 ${k}`);
  }
  assert.strictEqual(audit().metricRows, 5);
});

test('体检结论无缺口', () => {
  assert.deepStrictEqual(audit().missing, []);
});

test('脚本可运行，输出区分组合空间与准确率', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /32 种并存组合/);
  assert.match(out, /不代表任何模型的准确率/);
  assert.match(out, /不构成诊断或治疗建议/);
  assert.doesNotMatch(out, /准确率\s*[:：=]?\s*\d/, '不应出现模型跑分');
});

test('示例 JSON 与正文代码块同源', () => {
  const md = loadDoc();
  const parsed = JSON.parse(blocks(md, 'json')[0]);
  assert.strictEqual(parsed.status, 'sufficient');
  assert.ok(Array.isArray(parsed.conflicts) && parsed.conflicts.length >= 1, '冲突说明不能省');
  assert.strictEqual(parsed.secondary[0].relation, '兼夹');
});
