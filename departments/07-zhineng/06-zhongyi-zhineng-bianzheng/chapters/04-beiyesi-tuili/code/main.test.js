'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { DOC, loadDoc, sections, fullJointParams, linearParams, audit } = require('./main.js');

test('正文存在且已补实', () => {
  assert.ok(fs.existsSync(DOC));
  const md = loadDoc();
  assert.ok((md.match(/[\u4e00-\u9fff]/g) || []).length > 2000);
  assert.ok(!/TODO|待补|占位稿/.test(md));
});

test('参数量级是现算的，不是抄正文的数字', () => {
  assert.strictEqual(fullJointParams(10), 1023);
  assert.strictEqual(fullJointParams(30), 1073741823);
  assert.ok(fullJointParams(30) > 1e9, '三十个二值变量的联合分布应超过十亿');
  assert.strictEqual(linearParams(30), 61);
  assert.ok(fullJointParams(30) / linearParams(30) > 1e6, '两种结构的量级应相差六个数量级以上');
});

test('正文的「超过十亿」这一句能被重算验证', () => {
  const md = loadDoc();
  assert.match(md, /三十个变量，这个数字就超过了十亿/);
  assert.ok(fullJointParams(30) > 1e9);
});

test('四张结构表的行数与正文主张对齐', () => {
  const a = audit();
  assert.strictEqual(a.structRows, 4, '结构对比应四行：全连接、朴素、树增强、分层');
  assert.strictEqual(a.priorRows, 3, '先验应三来源');
  assert.strictEqual(a.usageRows, 3, '推理应三用法');
  assert.strictEqual(a.pitRows, 4, '结构学习应四坑');
});

test('三来源、三用法、四坑逐项在正文里出现', () => {
  const a = audit();
  assert.deepStrictEqual(a.priors, ['条文', '专家', '病历']);
  assert.deepStrictEqual(a.usages, ['诊断推理', '预测推理', '解释推理']);
  assert.deepStrictEqual(a.pitfalls, ['结构不稳', '隐藏混杂', '因果误读', '时齐']);
});

test('独立性假设被写明，并被指出违反后的后果', () => {
  const md = loadDoc();
  assert.strictEqual(audit().independence, true);
  assert.match(md, /重复计算同一份证据/);
  assert.match(md, /相关证据被重复计权/);
});

test('体检结论无缺口', () => {
  assert.deepStrictEqual(audit().missing, []);
});

test('脚本可运行，输出不作模型成绩', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /2\^10 − 1 = 1023/);
  assert.match(out, /超过十亿/);
  assert.match(out, /不构成诊断或治疗建议/);
  assert.doesNotMatch(out, /准确率|F1|AUC/, '不应出现任何模型跑分');
});
