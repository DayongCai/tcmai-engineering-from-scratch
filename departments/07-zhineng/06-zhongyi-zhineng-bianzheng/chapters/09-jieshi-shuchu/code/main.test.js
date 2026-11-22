'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { DOC, FIELDS, loadDoc, blocks, missingFields, audit } = require('./main.js');

test('正文存在且已补实', () => {
  assert.ok(fs.existsSync(DOC));
  const md = loadDoc();
  assert.ok((md.match(/[\u4e00-\u9fff]/g) || []).length > 2000);
  assert.ok(!/TODO|待补|占位稿/.test(md));
});

test('示例证据逐条带齐字段：item 加值、来源、时间、可信度、关系', () => {
  assert.deepStrictEqual(FIELDS, ['item', 'value', 'source', 'time', 'reliability', 'relation']);
  const md = loadDoc();
  const parsed = JSON.parse(blocks(md, 'json')[0]);
  assert.ok(parsed.evidence.length >= 3);
  for (const ev of parsed.evidence) {
    assert.deepStrictEqual(missingFields(ev), [], `${ev.item} 缺字段`);
    assert.ok(['support', 'against'].includes(ev.relation));
    assert.ok(ev.time.length > 0 && ev.source.length > 0);
  }
});

test('字段缺失会被算出来，而不是靠肉眼', () => {
  const broken = { item: '纳差', value: '减半', source: 'patient' };
  assert.deepStrictEqual(missingFields(broken), ['time', 'reliability', 'relation']);
});

test('解释必须含反对项，否则只是单方面论证', () => {
  const a = audit();
  assert.strictEqual(a.completeness, 1);
  assert.ok(a.support >= 3, '支持项过少');
  assert.ok(a.against >= 1, '没有反对项');
  assert.ok(a.sources.includes('patient') && a.sources.includes('physician'), '来源要区分自述与医生所见');
});

test('三种解释、四种归因失真、三种反事实、四个评估维度都在', () => {
  const a = audit();
  assert.deepStrictEqual(a.rows, { types: 3, fields: 4, attribution: 4, counterfactual: 3, evaluation: 4 });
  const md = loadDoc();
  for (const k of ['判据解释', '归因解释', '反事实解释']) assert.ok(md.includes(k), `缺 ${k}`);
  for (const k of ['忠实度', '稳定性', '可读性', '一致性']) assert.ok(md.includes(k), `缺评估维度 ${k}`);
});

test('反事实写进了示例，且说明「去掉会翻案」的用途', () => {
  const a = audit();
  assert.strictEqual(a.hasCounterfactual, true);
  assert.match(loadDoc(), /若纳差为化疗所致而非脾失健运/);
});

test('体检结论无缺口', () => {
  assert.deepStrictEqual(audit().missing, []);
});

test('脚本可运行，输出不给解释打分', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /字段完整率 100%/);
  assert.match(out, /反对项 1 条/);
  assert.match(out, /可被反驳/);
  assert.match(out, /不构成诊断或治疗建议/);
  assert.doesNotMatch(out, /忠实度\s*[:：=]\s*0\.\d|准确率/, '不应给解释或模型打分');
});
