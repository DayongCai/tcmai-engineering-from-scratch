'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { DOC, MODES, loadDoc, sections, proseRules, resolve, audit } = require('./main.js');

test('正文存在且已补实', () => {
  assert.ok(fs.existsSync(DOC));
  const md = loadDoc();
  assert.ok((md.match(/[\u4e00-\u9fff]/g) || []).length > 2000);
  assert.ok(!/TODO|待补|占位稿/.test(md));
});

test('两条冲突规则是从正文原句取出的，不是另编的', () => {
  const rules = proseRules(loadDoc());
  assert.strictEqual(rules.length, 2);
  assert.deepStrictEqual(rules[0].cond, ['脉沉细', '畏寒']);
  assert.strictEqual(rules[0].then, '阳虚');
  assert.deepStrictEqual(rules[1].cond, ['脉沉细', '口干']);
  assert.strictEqual(rules[1].then, '阴虚');
});

test('同一批事实、只换规则顺序，结论就翻转', () => {
  const a = audit();
  assert.strictEqual(a.forward, '阳虚');
  assert.strictEqual(a.backward, '阴虚');
  assert.strictEqual(a.unstable, true, '交换律测试应复现顺序依赖');
});

test('零条命中返回未覆盖，不落默认证型', () => {
  const rules = proseRules(loadDoc());
  assert.strictEqual(resolve(rules, ['舌淡', '脉弱']), '未覆盖');
  assert.strictEqual(resolve(rules, ['脉沉细']), '未覆盖', '前件不全不应命中');
  assert.strictEqual(resolve(rules, ['脉沉细', '畏寒', '口干']), '阳虚', '按给定顺序取第一条命中');
});

test('四种 mode 都在正文声明，示例块里 veto 与 all_of 各有用法', () => {
  const a = audit();
  assert.deepStrictEqual(a.declared.sort(), MODES.slice().sort());
  assert.ok(a.usedModes.includes('all_of') && a.usedModes.includes('veto'), '示例规则块应示范合取与否决');
  assert.match(loadDoc(), /否决就是否决/, '否决的优先级要写成硬约束');
});

test('空洞的三种默认行为都被点名否定', () => {
  const a = audit();
  assert.deepStrictEqual(a.holeDefaults.sort(), ['返回空', '返回第一条规则', '返回最常见的证型'].sort());
  assert.strictEqual(a.coverageRows, 4, '覆盖表应四行（单条/多条/零条/否决）');
});

test('体检结论无缺口', () => {
  assert.deepStrictEqual(audit().missing, []);
});

test('脚本可运行，输出只谈这一条规则的重排结果', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /结论是否翻转：是/);
  assert.match(out, /缺口 0 处/);
  assert.match(out, /不构成诊断或治疗建议/);
  assert.doesNotMatch(out, /准确率\s*\d|F1\s*=\s*0\.\d|AUC/, '不应出现模型跑分');
});
