'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { DOC, LAYERS, BLIND_LAYERS, BLIND_MINIMUM, loadDoc, endpointPairs, audit } = require('./main.js');

test('正文存在且已补实', () => {
  assert.ok(fs.existsSync(DOC));
  const md = loadDoc();
  assert.ok((md.match(/[\u4e00-\u9fff]/g) || []).length > 2000);
  assert.ok(!/TODO|待补|占位稿/.test(md));
});

test('终点三层，跨层回答一律不成立', () => {
  assert.deepStrictEqual(LAYERS, ['过程', '结果', '结局']);
  const p = endpointPairs(LAYERS);
  assert.strictEqual(p.same, 3, '同层三个问题可各自回答');
  assert.strictEqual(p.cross, 6, '三层之间六种跨层推断都不成立');
});

test('「效率提升」不能支持「诊疗质量提高」这一句是正文的判断', () => {
  const md = loadDoc();
  assert.match(md, /「效率提升」是过程指标/);
  assert.match(md, /这两句之间隔着两层证据/);
});

test('四种对照与四种假设各带偏倚或事先声明', () => {
  const a = audit();
  assert.strictEqual(a.designRows, 4);
  assert.strictEqual(a.assumptionRows, 4);
  const md = loadDoc();
  for (const k of ['空白对照', '平行对照', '自身前后对照', '历史对照']) assert.ok(md.includes(k), `缺 ${k}`);
  for (const k of ['优效', '非劣效', '等效', '可行性']) assert.ok(md.includes(k), `缺 ${k}`);
});

test('盲法四层都在，且写明底线是判读者盲与分配隐藏', () => {
  const a = audit();
  assert.deepStrictEqual(a.blindPresent, BLIND_LAYERS);
  assert.deepStrictEqual(BLIND_MINIMUM, ['判读者盲', '分配隐藏']);
  assert.strictEqual(a.blindMinimumMet, true);
  assert.match(loadDoc(), /至少做到判读者盲/);
});

test('报告清单六项齐全，缺一项就无法复现', () => {
  const a = audit();
  assert.strictEqual(a.reportRows, 6);
  assert.deepStrictEqual(a.reportItems.sort(), ['不良事件', '缺失处理', '终点定义', '纳排标准', '方案偏离', '版本号'].sort());
});

test('体检结论无缺口', () => {
  assert.deepStrictEqual(audit().missing, []);
});

test('脚本可运行，输出不编造试验结果', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /同层回答成立 3 种/);
  assert.match(out, /缺口 0 处/);
  assert.match(out, /不含任何试验数据/);
  assert.doesNotMatch(out, /p\s*[<=>]\s*0\.0\d|效应量\s*[:：]|平均提升/, '不应编造试验结果');
});
