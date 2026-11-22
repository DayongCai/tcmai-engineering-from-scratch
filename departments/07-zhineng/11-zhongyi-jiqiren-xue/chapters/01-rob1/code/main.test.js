'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, stoppingDistance, analyze } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const X = analyze(read());

test('正文就在本章目录下，首行章题与章节元数据一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '01-rob1', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC), '正文文件不存在');
  assert.strictEqual(CHAPTER, 1);
  assert.ok(read().startsWith('# 第 1 章 · ' + TITLE), '正文首行与章题不一致');
  assert.strictEqual(X.hasTitle, true);
});

test('延迟预算与减速度取自正文演算设定：100 + 50 ms、2 m/s²', () => {
  assert.strictEqual(X.tr, 100);
  assert.strictEqual(X.tb, 50);
  assert.strictEqual(X.a, 2);
  assert.strictEqual(X.delayBudget, 150);
  assert.ok(read().includes('150 ms'), '正文应写明 150 ms 的链路延迟');
});

test('停止距离表逐行读出且与模型互相对得上', () => {
  assert.strictEqual(X.rows.length, 4);
  assert.deepStrictEqual(X.rows.map((r) => r.v), [0.05, 0.1, 0.2, 0.5]);
  assert.deepStrictEqual(X.rows.map((r) => r.doc.total), [8.1, 17.5, 40, 137.5]);
  for (const r of X.rows) {
    assert.ok(r.residual <= 0.15, `v=${r.v} 处模型与表内不符：${r.model.total} vs ${r.doc.total}`);
  }
});

test('模型的每一段都对得上：延迟段 v(t_r+t_b)，制动段 v²/2a', () => {
  for (const r of X.rows) {
    const m = stoppingDistance(r.v, X.tr, X.tb, X.a);
    assert.ok(Math.abs(m.delay - r.doc.delay) <= 0.06, `v=${r.v} 延迟段 ${m.delay} vs ${r.doc.delay}`);
    assert.ok(Math.abs(m.brake - r.doc.brake) <= 0.06, `v=${r.v} 制动段 ${m.brake} vs ${r.doc.brake}`);
  }
  // 0.2 m/s 是正文 PROBLEM 里那一档：延迟 30 mm、合计 40 mm
  const mid = X.rows.find((r) => r.v === 0.2);
  assert.strictEqual(mid.model.delay, 30);
  assert.strictEqual(mid.model.total, 40);
});

test('速度涨 10 倍，停止距离涨 16.9 倍（延迟线性 + 制动平方）', () => {
  const slow = X.rows[0];
  const fast = X.rows[X.rows.length - 1];
  const ratio = fast.model.total / slow.model.total;
  assert.ok(ratio > 10 && ratio < 20, `倍增比 ${ratio}`);
  assert.ok(Math.abs(ratio - 16.86) < 0.2, `倍增比 ${ratio}`);
  // 延迟段严格线性：0.5/0.05 = 10
  assert.ok(Math.abs(fast.model.delay / slow.model.delay - 10) < 1e-9);
});

test('低速档里延迟是主导项：0.05 m/s 时延迟占九成以上', () => {
  const slow = X.rows[0];
  assert.ok(slow.model.delay > slow.model.brake, '延迟段应大于制动段');
  assert.ok(slow.delayShare > 0.9, `延迟占比 ${slow.delayShare}`);
  assert.ok(Math.abs(slow.model.delay - 7.5) < 1e-9);
});

test('四级分级表与验收五问都在正文里', () => {
  assert.strictEqual(X.levels.length, 4);
  assert.deepStrictEqual(
    X.levels.map((l) => l.level.split('：')[0]),
    ['一级', '二级', '三级', '四级'],
  );
  assert.match(X.levels[3].level, /自主执行体/);
  assert.strictEqual(X.questions.length, 5);
  assert.ok(X.questions.some((q) => q.includes('停止距离')));
  assert.ok(X.questions.some((q) => q.includes('谁有权')));
  assert.strictEqual(X.misread, 3);
});

test('脚本可运行，输出带现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /均从本章 docs\/zh\.md 现算/);
  assert.match(out, /不构成医疗器械设计规范/);
  assert.ok(out.includes('150 ms'), '输出里应出现延迟预算');
  assert.ok(out.includes('137.5 mm'), '输出里应出现最不利档的停止距离');
});
