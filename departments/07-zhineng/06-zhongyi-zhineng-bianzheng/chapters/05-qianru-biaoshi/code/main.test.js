'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { DOC, CORPORA, loadDoc, audit, judgeNeighbor, thresholdDiscriminates } = require('./main.js');

test('正文存在且已补实', () => {
  assert.ok(fs.existsSync(DOC));
  const md = loadDoc();
  assert.ok((md.match(/[\u4e00-\u9fff]/g) || []).length > 2000);
  assert.ok(!/TODO|待补|占位稿/.test(md));
});

test('跨语料判据按正文口径执行：≥2 种语料才算语义关系', () => {
  assert.strictEqual(judgeNeighbor(['病历', '古籍']).verdict, '语义关系');
  assert.strictEqual(judgeNeighbor(['教材']).verdict, '语料伪影');
  assert.strictEqual(judgeNeighbor([]).verdict, '无依据');
  assert.deepStrictEqual(judgeNeighbor(['教材']).support, ['教材']);
});

test('阈值不鉴别：正文给的两个余弦值在 0.6 下都过阈', () => {
  const a = audit();
  assert.strictEqual(a.pairs.length, 2, '应能从正文取到两个余弦值');
  assert.deepStrictEqual(a.pairs.map((p) => p.cosine), [0.6, 0.75]);
  assert.strictEqual(a.disc.passed, 2);
  assert.strictEqual(a.disc.discriminates, false, '两个候选都过阈，阈值没有区分作用');
  const strict = thresholdDiscriminates(a.pairs, 0.7).discriminates;
  assert.strictEqual(strict, true, '换到 0.7 才勉强分开，说明结论对阈值极敏感');
});

test('三类语料与三个失效在正文里逐条列出', () => {
  const md = loadDoc();
  for (const c of CORPORA) assert.ok(md.includes(c + '语料'), `缺 ${c}语料`);
  for (const f of ['各向异性', '反义相邻', '长尾塌陷']) assert.ok(md.includes(f), `缺失效 ${f}`);
  const a = audit();
  assert.strictEqual(a.failRows, 3);
  assert.strictEqual(a.corpusRows, 3);
});

test('四种用途各带可用性与前提', () => {
  const a = audit();
  assert.strictEqual(a.useRows, 4);
  const md = loadDoc();
  for (const u of ['相似病例检索', '下游特征', '解释依据', '跨库对齐']) assert.ok(md.includes(u), `缺用途 ${u}`);
});

test('体检结论无缺口', () => {
  assert.deepStrictEqual(audit().missing, []);
});

test('脚本可运行，两个判据都写进输出', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /语义关系/);
  assert.match(out, /语料伪影/);
  assert.match(out, /阈值不提供鉴别/);
  assert.match(out, /不构成诊断或治疗建议/);
  assert.doesNotMatch(out, /准确率|F1|AUC/, '不应出现模型跑分');
});
