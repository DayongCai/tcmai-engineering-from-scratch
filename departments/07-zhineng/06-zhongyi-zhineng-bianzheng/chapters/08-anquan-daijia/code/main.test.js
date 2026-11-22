'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { DOC, loadDoc, cnToInt, costThreshold, expectedCost, costClaim, audit } = require('./main.js');

test('正文存在且已补实', () => {
  assert.ok(fs.existsSync(DOC));
  const md = loadDoc();
  assert.ok((md.match(/[\u4e00-\u9fff]/g) || []).length > 2000);
  assert.ok(!/TODO|待补|占位稿/.test(md));
});

test('中文数字解析够用（一倍到二十倍）', () => {
  assert.strictEqual(cnToInt('一'), 1);
  assert.strictEqual(cnToInt('九'), 9);
  assert.strictEqual(cnToInt('十'), 10);
  assert.strictEqual(cnToInt('十二'), 12);
  assert.strictEqual(cnToInt('二十'), 20);
});

test('正文的「九倍 → 0.1」能被重算验证', () => {
  const claim = costClaim(loadDoc());
  assert.ok(claim, '正文应写出这条判据');
  assert.strictEqual(claim.ratio, 9);
  assert.ok(Math.abs(costThreshold(1, 9) - claim.threshold) < 1e-9, '1/(1+9) 应等于 0.1');
  assert.strictEqual(audit().agrees, true);
});

test('漏判越贵阈值越低，且对称代价给出 0.5', () => {
  const ladder = [1, 3, 9, 20].map((r) => costThreshold(1, r));
  assert.strictEqual(ladder[0], 0.5, '对称代价的阈值才是 0.5');
  for (let i = 1; i < ladder.length; i += 1) assert.ok(ladder[i] < ladder[i - 1], '阈值应随代价比单调下降');
});

test('期望代价：在阈值两侧各判一侧更便宜', () => {
  const cfp = 1;
  const cfn = 9;
  const theta = costThreshold(cfp, cfn);
  const above = expectedCost(theta + 0.01, cfp, cfn);
  const below = expectedCost(theta - 0.01, cfp, cfn);
  assert.ok(above.positive < above.negative, '高于阈值判正类更便宜');
  assert.ok(below.negative < below.positive, '低于阈值判负类更便宜');
});

test('三类高危错误、四种失效、五个监测数、四条红线都在正文里', () => {
  const a = audit();
  assert.strictEqual(a.highRiskRows, 3);
  assert.strictEqual(a.failRows, 4);
  assert.strictEqual(a.monitorItems.length, 5, a.monitorItems.join('；'));
  assert.strictEqual(a.redLines.length, 4);
  assert.ok(a.monitorItems.some((x) => /高危证型的召回/.test(x)));
  assert.ok(a.redLines.some((x) => /处方必须由有资质的医师签发/.test(x)));
});

test('体检结论无缺口', () => {
  assert.deepStrictEqual(audit().missing, []);
});

test('脚本可运行，输出只谈阈值推导', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /1\/\(1\+9\) = 0\.1/);
  assert.match(out, /缺口 0 处/);
  assert.match(out, /不构成诊断或治疗建议/);
  assert.doesNotMatch(out, /灵敏度\s*[:：=]?\s*0\.\d|准确率\s*[:：=]?\s*0\.\d/, '不应出现模型或系统跑分');
});
