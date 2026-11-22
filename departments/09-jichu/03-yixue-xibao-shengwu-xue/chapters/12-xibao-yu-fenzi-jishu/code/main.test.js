'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  readDoc,
  imaging,
  molecular,
  models,
  pitfalls,
  grade,
  threeQuestions,
  antibodyRule,
  CONTROL_KINDS,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');

test('正文是本章那一份', () => {
  const doc = readDoc();
  assert.ok(doc.includes('共聚焦') && doc.includes('对照'));
  assert.ok((doc.match(/[\u4e00-\u9fff]/g) || []).length > 2000);
});

test('成像表七行，各有假象一栏', () => {
  const im = imaging(readDoc());
  assert.strictEqual(im.length, 7);
  for (const x of im) assert.ok(x.artifact.length >= 3, `假象缺失: ${x.method}`);
  const conf = im.find((x) => x.method.includes('共聚焦'));
  assert.match(conf.answers, /三维/);
});

test('分子四层（含相互作用与编辑），关键对照都非空', () => {
  const m = molecular(readDoc());
  assert.strictEqual(m.length, 5);
  const layers = m.map((x) => x.layer).join('｜');
  assert.match(layers, /DNA/);
  assert.match(layers, /RNA/);
  assert.match(layers, /蛋白/);
  assert.match(layers, /相互作用/);
  assert.match(layers, /编辑/);
  for (const x of m) assert.ok(x.controls.length >= 4, `关键对照缺失: ${x.layer}`);
});

test('模型五类，类器官丢血管与免疫', () => {
  const md = models(readDoc());
  assert.strictEqual(md.length, 5);
  const organoid = md.find((x) => x.model.includes('类器官'));
  assert.match(organoid.loses, /血管/);
  assert.match(organoid.loses, /免疫/);
});

test('陷阱表六条，含「太漂亮」的图', () => {
  const pf = pitfalls(readDoc());
  assert.strictEqual(pf.length, 6);
  assert.ok(pf.some((x) => x.symptom.includes('漂亮')));
});

test('定级：单一方法→相关，两种独立方法→稳健，加因果干预→因果', () => {
  assert.strictEqual(grade({ methods: 1, controls: CONTROL_KINDS }).level, '相关');
  assert.strictEqual(grade({ methods: 2, controls: CONTROL_KINDS }).level, '稳健');
  assert.strictEqual(grade({ methods: 2, causal: true, controls: CONTROL_KINDS }).level, '因果');
  assert.throws(() => grade({ methods: 0 }));
});

test('对照缺一类就降一级，且不降到相关以下', () => {
  const full = grade({ methods: 2, causal: true, controls: CONTROL_KINDS });
  assert.strictEqual(full.missingControls, 0);
  const noNeg = grade({ methods: 2, causal: true, controls: ['阳性', '内参', '无关对照'] });
  assert.strictEqual(noNeg.level, '稳健');
  assert.deepStrictEqual(noNeg.missingNames, ['阴性']);
  const bare = grade({ methods: 1, controls: [] });
  assert.strictEqual(bare.level, '相关');
  assert.strictEqual(bare.missingControls, 4);
});

test('三问定级齐', () => {
  const q = threeQuestions(readDoc());
  assert.strictEqual(q.length, 3);
  assert.match(q[0], /方法/);
  assert.match(q[1], /系统/);
  assert.match(q[2], /对照/);
});

test('抗体是最大不确定源，且要敲除样本验证', () => {
  const a = antibodyRule(readDoc());
  assert.strictEqual(a.biggestUncertainty, true);
  assert.strictEqual(a.knockoutCheck, true);
  assert.strictEqual(a.corollary, true);
});

test('脚本可跑，输出含定级例子与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /→ 因果/);
  assert.match(out, /缺 阴性/);
  assert.match(out, /不构成临床判断依据/);
});

test('代码头部指向本章正文', () => {
  assert.ok(fs.readFileSync(MAIN, 'utf8').includes('/12-xibao-yu-fenzi-jishu/docs/zh.md'));
});
