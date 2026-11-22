'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { DOC, loadDoc, stats, proseMatrices, kappaTable, audit } = require('./main.js');

const near = (a, b) => Math.abs(a - b) < 1e-9;

test('正文存在且已补实', () => {
  assert.ok(fs.existsSync(DOC));
  const md = loadDoc();
  assert.ok((md.match(/[\u4e00-\u9fff]/g) || []).length > 2000);
  assert.ok(!/TODO|待补|占位稿/.test(md));
});

test('两个例子的矩阵从正文句子还原，口径与正文一致', () => {
  const m = proseMatrices(loadDoc());
  assert.strictEqual(m.length, 2);
  assert.deepStrictEqual(m[0].matrix, [[40, 10], [10, 40]]);
  assert.deepStrictEqual(m[1].matrix, [[90, 10], [0, 0]]);
  const a = stats(m[0].matrix);
  assert.ok(near(a.po, 0.8) && near(a.pe, 0.5) && near(a.kappa, 0.6));
  const b = stats(m[1].matrix);
  assert.ok(near(b.po, 0.9) && near(b.pe, 0.9) && near(b.kappa, 0));
});

test('正文 κ 表每一行都能被 (p_o − p_e)/(1 − p_e) 重算出来', () => {
  const rows = kappaTable(loadDoc());
  assert.ok(rows.length >= 2);
  for (const r of rows) {
    const recomputed = (r.po - r.pe) / (1 - r.pe);
    assert.ok(near(recomputed, r.kappa), `${r.name}：报 ${r.kappa}，重算 ${recomputed}`);
  }
});

test('一致率高而 κ 为零：极偏例就是这个反例', () => {
  const m = proseMatrices(loadDoc());
  const skew = stats(m[1].matrix);
  assert.ok(skew.po > 0.85, '一致率看起来很高');
  assert.strictEqual(skew.kappa, 0, '扣掉碰巧之后没有信息');
  assert.ok(skew.pabak > 0.7, 'PABAK 不扣碰巧，所以它看不出这个坑');
});

test('混淆矩阵必须是方阵，否则报错而不是静默给数', () => {
  assert.throws(() => stats([[1, 2], [3]]), /方阵/);
  assert.throws(() => stats([[0, 0], [0, 0]]), /为空/);
});

test('正文写明一致性只能支持可替代，且给出四类外部锚', () => {
  const md = loadDoc();
  assert.match(md, /一致性研究只能支持/);
  for (const anchor of ['治疗结局', '独立检查', '专家共识', '随访转归']) assert.ok(md.includes(anchor), `缺锚 ${anchor}`);
});

test('体检结论无缺口', () => {
  const a = audit();
  assert.deepStrictEqual(a.missing, []);
  assert.ok(a.sensitivity.pe05 > a.sensitivity.pe09, '同一 p_o 下 p_e 变大会压低 κ');
});

test('脚本可运行，输出把两个例子的口径讲清', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /κ=0\.600/);
  assert.match(out, /κ=0\.000/);
  assert.match(out, /kappa 悖论/);
  assert.match(out, /不构成诊断或治疗建议/);
  assert.match(out, /不是任何真实评估数据/);
});
