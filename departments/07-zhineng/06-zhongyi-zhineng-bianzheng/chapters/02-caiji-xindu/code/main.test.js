'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { DOC, STATES, loadDoc, sections, blocks, tenQuestions, audit } = require('./main.js');

test('正文存在且已补实', () => {
  assert.ok(fs.existsSync(DOC));
  const md = loadDoc();
  assert.ok((md.match(/[\u4e00-\u9fff]/g) || []).length > 2000);
  assert.ok(!/TODO|待补|占位稿/.test(md));
});

test('十问是十项，且写在同一个排查语境里', () => {
  const ten = tenQuestions(loadDoc());
  assert.strictEqual(ten.length, 10, `拆出 ${ten.length} 项`);
  for (const must of ['寒热', '汗', '渴', '旧病', '病因']) assert.ok(ten.includes(must), `十问缺「${must}」`);
});

test('采集契约可直接解析，且取值全部是四值之一', () => {
  const a = audit();
  assert.strictEqual(a.contractError, '');
  assert.ok(a.items >= 3, `示例仅 ${a.items} 条`);
  assert.deepStrictEqual(a.badState, []);
  for (const s of STATES) assert.ok(a.stateCounts[s] >= 1, `四值缺 ${s}`);
});

test('阴性、未问、不适用三者互不混淆', () => {
  const a = audit();
  assert.ok(a.stateCounts.absent >= 1, '示例没有「已问、无」');
  assert.ok(a.stateCounts.not_asked >= 1, '示例没有「未问」');
  assert.ok(a.stateCounts.not_applicable >= 1, '示例没有「不适用」');
  assert.strictEqual(a.notAskedRate, a.stateCounts.not_asked / a.items, '未问率口径不对');
});

test('有/无条目必须带锚点与来源，避免「有」与「重」混成一个数', () => {
  const md = loadDoc();
  const a = audit(md);
  assert.deepStrictEqual(a.missingAnchor, [], '有/无条目缺锚点：' + a.missingAnchor.join('/'));
  const c = JSON.parse(blocks(md, 'json')[0]);
  const first = c.items[0];
  assert.notStrictEqual(first.state, first.grade, 'state 与 grade 应分成两个字段');
  assert.ok(typeof first.asked_by === 'string' && first.asked_by.length > 0, '缺少提问者字段');
});

test('信度指标表覆盖重测、加权 kappa、ICC、内部一致', () => {
  const a = audit();
  assert.strictEqual(a.relRows, 4, '信度表应四行');
  const md = loadDoc();
  for (const k of ['重测', '加权 kappa', 'ICC', 'KR-20']) assert.ok(md.includes(k), `正文缺 ${k}`);
});

test('体检结论无缺口', () => {
  assert.deepStrictEqual(audit().missing, []);
});

test('脚本可运行，输出给的是正文口径', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /十问清单：10 项/);
  assert.match(out, /四值覆盖：4\/4/);
  assert.match(out, /缺口 0 处/);
  assert.match(out, /不构成诊断或治疗建议/);
});
