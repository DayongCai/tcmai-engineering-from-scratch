'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { DOC, CHAPTER, TITLE, read, sections, tables, mps, levers, resistance, bypass, concepts, LOSSES, KOTTER } = require('./main.js');

const TEXT = read();
const BASE = { variety: 5, identity: 5, significance: 5, autonomy: 2, feedback: 3 };

test('正文文件就在本章目录下', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '17-p17', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
  assert.strictEqual(CHAPTER, 17);
  assert.strictEqual(TITLE, '人抗拒的不是变化，是变化里的损失');
  assert.strictEqual(sections(TEXT).length, 8);
});

test('四类损失、科特八步、三个理论名都在正文里', () => {
  const c = concepts(TEXT);
  assert.deepStrictEqual(c.losses, LOSSES);
  assert.deepStrictEqual(c.kotter, KOTTER);
  assert.strictEqual(c.hasJCM, true);
  assert.strictEqual(c.hasRIASEC, true);
  assert.strictEqual(c.hasCrafting, true);
});

test('MPS：5,5,5 + 自主 2 + 反馈 3 = 30', () => {
  const m = mps(BASE);
  assert.strictEqual(m.meaning, 5);
  assert.strictEqual(m.score, 30);
  assert.strictEqual(m.weakest, '自主性');
  assert.strictEqual(mps({ ...BASE, autonomy: 4 }).score, 60);
  assert.strictEqual(mps({ ...BASE, feedback: 4 }).score, 40);
});

test('乘法结构：任一项接近 1，整体接近该量级', () => {
  assert.strictEqual(mps({ ...BASE, feedback: 1 }).score, 10);
  assert.strictEqual(mps({ variety: 1, identity: 1, significance: 1, autonomy: 1, feedback: 7 }).score, 7);
});

test('补短板与加强项：抬自主增益 30，抬反馈增益 10', () => {
  const lv = levers(BASE);
  const byAutonomy = lv.out.find((x) => x.lever === 'autonomy');
  const byFeedback = lv.out.find((x) => x.lever === 'feedback');
  assert.strictEqual(byAutonomy.gain, 30);
  assert.strictEqual(byFeedback.gain, 10);
});

test('抗拒四来源从正文表格解析，表现与应对齐', () => {
  const r = resistance(TEXT);
  assert.deepStrictEqual(r.map((x) => x.source), ['信息不足', '能力不足', '利益受损', '身份受威胁']);
  assert.match(r[0].action, /说清/);
  assert.match(r[2].sign, /算账/);
  assert.match(r[3].action, /专业身份/);
  assert.ok(tables(TEXT).length >= 2);
});

test('上线账：损失 58% 大于产品 22%，判为加培训解决不了', () => {
  const b = bypass({ trainedRate: 96, manualShare: 41, usabilityComplaints: 22, lossShare: 58 });
  assert.strictEqual(b.remainder, 20);
  assert.match(b.verdict, /损失/);
  assert.match(bypass({ trainedRate: 96, manualShare: 41, usabilityComplaints: 70, lossShare: 20 }).verdict, /产品/);
});

test('脚本可运行，输出乘法结构与边界声明', () => {
  const r = require('node:child_process').spawnSync(process.execPath, [path.join(__dirname, 'main.js')], {
    encoding: 'utf8',
    timeout: 60000,
  });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /MPS 30/);
  assert.match(out, /MPS 60（翻倍）/);
  assert.match(out, /演示性算式/);
});
