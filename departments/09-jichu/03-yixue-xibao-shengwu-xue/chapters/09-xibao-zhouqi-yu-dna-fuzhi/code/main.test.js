'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  readDoc,
  phases,
  complexes,
  gates,
  gateFor,
  complexFor,
  g1Length,
  replication,
  p53Decision,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');

test('正文是本章那一份', () => {
  const doc = readDoc();
  assert.ok(doc.includes('细胞周期') && doc.includes('cyclin'));
  assert.ok((doc.match(/[\u4e00-\u9fff]/g) || []).length > 2000);
});

test('四个时期，G1 最可变、M 最短', () => {
  const p = phases(readDoc());
  assert.deepStrictEqual(p.map((x) => x.phase), ['G1', 'S', 'G2', 'M']);
  assert.match(p[0].length, /最可变/);
  assert.match(p[3].length, /短/);
});

test('CDK–cyclin 四个复合物，各自的作用与抑制因子都在', () => {
  const cs = complexes(readDoc());
  assert.strictEqual(cs.length, 4);
  assert.match(cs[0].complex, /cyclin D/);
  assert.match(cs[0].inhibitedBy, /p16/);
  assert.match(cs[1].complex, /cyclin E/);
  assert.match(cs[2].complex, /cyclin A/);
  assert.match(cs[3].complex, /cyclin B/);
  assert.match(cs[3].substrate, /核纤层/);
});

test('按作用反查复合物', () => {
  const doc = readDoc();
  assert.match(complexFor('启动 G1', doc).complex, /cyclin D/);
  assert.match(complexFor('进入 M 期', doc).complex, /cyclin B/);
  assert.throws(() => complexFor('修复端粒', doc));
});

test('三道闸门，问题各不相同', () => {
  const g = gates(readDoc());
  assert.strictEqual(g.length, 3);
  assert.match(g[0].question, /环境允许|损伤/);
  assert.match(g[1].question, /复制完整|修好/);
  assert.match(g[2].question, /双向连接/);
  assert.match(g[2].failure, /丢失|错分/);
});

test('给一句话能找到对应闸门', () => {
  const doc = readDoc();
  assert.match(gateFor('G1/S', doc).gate, /G1\/S/);
  assert.match(gateFor('G2/M', doc).gate, /G2\/M/);
  assert.match(gateFor('中期', doc).gate, /纺锤体/);
  assert.throws(() => gateFor('G0 退出', doc));
});

test('G1 用减法算，可调部分全在这里', () => {
  assert.deepStrictEqual(g1Length(24, 13), { total: 24, nonG1: 13, g1: 11 });
  assert.strictEqual(g1Length(18, 13).g1, 5);
  assert.throws(() => g1Length(10, 12));
  assert.throws(() => g1Length(0, 0));
});

test('复制的三条事实与两个后果在正文里成立', () => {
  const r = replication(readDoc());
  assert.strictEqual(r.facts.length, 3);
  assert.strictEqual(r.leadingContinuous, true);
  assert.strictEqual(r.laggingFragmented, true);
  assert.strictEqual(r.okazaki, true);
  assert.strictEqual(r.endProblem, true);
});

test('p53 的两种输出是相反的决定', () => {
  const p = p53Decision(readDoc());
  assert.match(p.mild, /G1/);
  assert.match(p.severe, /凋亡/);
  assert.strictEqual(p.switchLike, true);
});

test('脚本可跑，输出含 G1 减法与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /则 G1 = 11 h/);
  assert.match(out, /只是减法/);
  assert.match(out, /不构成临床判断依据/);
});

test('代码头部指向本章正文', () => {
  assert.ok(fs.readFileSync(MAIN, 'utf8').includes('/09-xibao-zhouqi-yu-dna-fuzhi/docs/zh.md'));
});
